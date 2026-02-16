/**
 * ActionChainExecutor Service
 * Executes action chains with retry logic, rollback, and error handling
 * Supports compensating transactions for critical actions
 */

import type { Knex } from 'knex';
import type {
  Event,
  EventTrigger,
  TriggerAction,
} from '../../types/event-trigger';

// Monitoring imports
import { actionMetrics, normalizeErrorType } from './monitoring/metrics';
import { logActionExecution, logError } from './monitoring/logger';
import {
  createActionExecuteSpan,
  setSpanSuccess,
  recordSpanException,
  endSpan,
  instrumentAsync,
} from './monitoring/tracing';

interface ActionChainExecutorConfig {
  db: Knex;
  actionExecutor: any; // Will be the existing ActionExecutor service
  integrationHub: any; // Will be the existing IntegrationHub service
  dlq: any; // DeadLetterQueue
}

interface ExecutionResult {
  success: boolean;
  data?: any;
  rollbackData?: any;
}

export class ActionChainExecutor {
  private db: Knex;
  private actionExecutor: any;
  private integrationHub: any;
  private dlq: any;

  constructor(config: ActionChainExecutorConfig) {
    this.db = config.db;
    this.actionExecutor = config.actionExecutor;
    this.integrationHub = config.integrationHub;
    this.dlq = config.dlq;
  }

  /**
   * Execute all actions for a trigger in order
   */
  async executeChain(event: Event, trigger: EventTrigger): Promise<void> {
    // 🔍 Tracing: Create span for entire action chain
    return await instrumentAsync(
      'action_chain_execution',
      {
        trigger_id: trigger.id,
        trigger_name: trigger.name,
        event_id: event.id,
        organization_id: event.organization_id,
      },
      async (span) => {
        // Fetch actions for this trigger, ordered by order field
        const actions = await this.db('trigger_actions')
          .where('trigger_id', trigger.id)
          .orderBy('order', 'asc');

        span.setAttribute('action_count', actions.length);

        const executedActions: Array<{ action: TriggerAction; result: ExecutionResult }> = [];

        for (const actionRow of actions) {
          const action: TriggerAction = {
            ...actionRow,
            config: JSON.parse(actionRow.config || '{}'),
            retry_config: JSON.parse(actionRow.retry_config || '{}'),
          };

          try {
            const result = await this.executeAction(action, event);
            executedActions.push({ action, result });
          } catch (error) {
            // Handle error based on trigger's error_handling strategy
            await this.handleActionError(
              error as Error,
              action,
              event,
              trigger,
              executedActions,
            );

            // Stop or continue based on strategy
            if (trigger.error_handling === 'stop_on_first_error') {
              throw error;
            }

            if (trigger.error_handling === 'rollback_on_error') {
              await this.rollbackExecutedActions(executedActions, event);
              throw error;
            }

            // continue_on_error: Keep going
          }
        }
      }
    );
  }

  /**
   * Execute a single action with retry logic
   */
  private async executeAction(
    action: TriggerAction,
    event: Event,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    const maxAttempts = action.retry_config.max_attempts || 3;

    // 🔍 Tracing: Create span for action execution
    const span = createActionExecuteSpan(
      action.id,
      action.action_type,
      event.organization_id
    );

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Record execution start
        const executionId = await this.recordExecutionStart(action, event, attempt);

        try {
          // Execute with timeout
          const result = await this.executeWithTimeout(action, event);

          // Record success
          await this.recordExecutionSuccess(executionId, result);

          // 📊 Metrics: Action execution succeeded
          const duration = (Date.now() - startTime) / 1000;
          actionMetrics.duration.observe(
            { action_type: action.action_type },
            duration
          );
          actionMetrics.executionsTotal.inc({
            action_type: action.action_type,
            status: 'success',
            organization_id: event.organization_id,
          });

          // 📝 Logging: Log successful execution
          logActionExecution({
            component: 'ActionChainExecutor',
            action_id: action.id,
            event_id: event.id,
            organization_id: event.organization_id,
            action_type: action.action_type,
            duration_ms: duration * 1000,
            attempt,
          });

          // 🔍 Tracing: Mark success
          setSpanSuccess(span);

          return result;
        } catch (error) {
          lastError = error as Error;

          // Check if error is retryable
          if (!this.isRetryableError(error as Error)) {
            // Non-retryable error - send to DLQ immediately
            await this.recordExecutionFailure(executionId, error as Error);
            await this.sendToDlq(action, event, error as Error, attempt);

            // 📊 Metrics: Action execution failed (non-retryable)
            actionMetrics.executionsTotal.inc({
              action_type: action.action_type,
              status: 'failure',
              organization_id: event.organization_id,
            });

            // 📝 Logging: Log error
            logError('Action execution failed (non-retryable)', error as Error, {
              component: 'ActionChainExecutor',
              action_id: action.id,
              event_id: event.id,
              organization_id: event.organization_id,
            });

            throw error;
          }

          // Record failure
          await this.recordExecutionFailure(executionId, error as Error);

          // 📊 Metrics: Retry attempt
          if (attempt < maxAttempts) {
            actionMetrics.retriesTotal.inc({
              action_type: action.action_type,
              organization_id: event.organization_id,
            });
          }

          // If not last attempt, wait before retry (exponential backoff)
          if (attempt < maxAttempts) {
            const delay = this.calculateBackoffDelay(action, attempt);
            await this.sleep(delay);
          }
        }
      }

      // Max retries exceeded - send to DLQ
      if (lastError) {
        await this.sendToDlq(action, event, lastError, maxAttempts);

        // 📊 Metrics: Action execution failed (max retries exceeded)
        actionMetrics.executionsTotal.inc({
          action_type: action.action_type,
          status: 'failure',
          organization_id: event.organization_id,
        });

        // 📝 Logging: Log error
        logError('Action execution failed (max retries exceeded)', lastError, {
          component: 'ActionChainExecutor',
          action_id: action.id,
          event_id: event.id,
          organization_id: event.organization_id,
          max_attempts: maxAttempts,
        });

        throw lastError;
      }

      throw new Error('Action execution failed');
    } catch (error) {
      // 🔍 Tracing: Record exception
      recordSpanException(span, error as Error);
      throw error;
    } finally {
      // 🔍 Tracing: End span
      endSpan(span);
    }
  }

  /**
   * Execute action with timeout protection
   */
  private async executeWithTimeout(
    action: TriggerAction,
    event: Event,
  ): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Action timeout after ${action.timeout_ms}ms`));
      }, action.timeout_ms);

      this.executeActionLogic(action, event)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Execute the actual action logic
   */
  private async executeActionLogic(
    action: TriggerAction,
    event: Event,
  ): Promise<ExecutionResult> {
    // Interpolate event data into action config
    const interpolatedConfig = this.interpolateTemplate(action.config, event);

    const actionWithInterpolatedConfig = {
      ...action,
      config: interpolatedConfig,
    };

    // Route to appropriate executor
    if (action.action_type === 'update_crm') {
      // Use IntegrationHub for CRM operations
      const result = await this.executeIntegrationAction(
        actionWithInterpolatedConfig,
        event,
      );
      return { success: true, data: result };
    }

    // Use ActionExecutor for other action types
    const result = await this.actionExecutor.execute(actionWithInterpolatedConfig, event);
    return result;
  }

  /**
   * Execute CRM integration action
   */
  private async executeIntegrationAction(
    action: TriggerAction,
    event: Event,
  ): Promise<any> {
    const { integration_id, operation, mapping } = action.config;

    // Check if token needs refresh
    try {
      return await this.integrationHub.executeIntegration(
        integration_id,
        operation,
        mapping,
        event,
      );
    } catch (error: any) {
      // Handle expired token
      if (error.code === 'TOKEN_EXPIRED') {
        await this.integrationHub.refreshToken(integration_id);
        // Retry after refresh
        return await this.integrationHub.executeIntegration(
          integration_id,
          operation,
          mapping,
          event,
        );
      }
      throw error;
    }
  }

  /**
   * Interpolate template variables in config
   * Supports {{event.data.field}} syntax
   */
  private interpolateTemplate(config: any, event: Event): any {
    const interpolate = (value: any): any => {
      if (typeof value === 'string') {
        return value.replace(/\{\{(.+?)\}\}/g, (match, path) => {
          const fieldValue = this.getNestedValue(event, path.trim());
          return fieldValue !== undefined ? String(fieldValue) : '';
        });
      }

      if (Array.isArray(value)) {
        return value.map(interpolate);
      }

      if (value && typeof value === 'object') {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = interpolate(val);
        }
        return result;
      }

      return value;
    };

    return interpolate(config);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(action: TriggerAction, attempt: number): number {
    const baseDelay = action.retry_config.initial_delay_ms || 1000;
    const multiplier = action.retry_config.backoff_multiplier || 2;
    return baseDelay * Math.pow(multiplier, attempt - 1);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // 4xx errors (client errors) are not retryable
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return false;
    }

    // Validation errors are not retryable
    if (error.isValidationError) {
      return false;
    }

    // 5xx errors, network errors, timeouts are retryable
    return true;
  }

  /**
   * Handle action error based on trigger strategy
   */
  private async handleActionError(
    error: Error,
    action: TriggerAction,
    event: Event,
    trigger: EventTrigger,
    _executedActions: Array<{ action: TriggerAction; result: ExecutionResult }>,
  ): Promise<void> {
    console.error(`ActionChainExecutor: Action ${action.id} failed`, error);

    if (trigger.error_handling === 'rollback_on_error') {
      // Will be handled by caller
      return;
    }

    if (trigger.error_handling === 'continue_on_error') {
      // Log error and continue
      return;
    }

    // stop_on_first_error - will be thrown by caller
  }

  /**
   * Rollback executed actions (compensating transactions)
   */
  private async rollbackExecutedActions(
    executedActions: Array<{ action: TriggerAction; result: ExecutionResult }>,
    event: Event,
  ): Promise<void> {
    // Rollback in reverse order
    for (let i = executedActions.length - 1; i >= 0; i--) {
      const { action, result } = executedActions[i];

      // Only rollback critical actions
      if (!action.is_critical) {
        continue;
      }

      try {
        await this.rollbackAction(action, event, result);
      } catch (error) {
        console.error(`ActionChainExecutor: Rollback failed for action ${action.id}`, error);

        // Send failed rollback to DLQ for manual intervention
        await this.dlq.addEntry({
          event,
          trigger: null,
          action,
          failureReason: `Rollback failed: ${(error as Error).message}`,
          lastError: error as Error,
        });
      }
    }
  }

  /**
   * Execute compensating transaction for an action
   */
  async rollbackAction(
    action: TriggerAction,
    event: Event,
    executionResult: ExecutionResult,
  ): Promise<void> {
    const rollbackConfig = {
      ...action.config,
      operation: action.config.rollback_operation,
      ...executionResult.rollbackData,
    };

    const rollbackAction = {
      ...action,
      action_type: 'rollback' as any,
      config: rollbackConfig,
    };

    // 📊 Metrics: Track compensating transaction
    actionMetrics.compensationsTotal.inc({
      action_type: action.action_type,
      organization_id: event.organization_id,
    });

    // 📝 Logging: Log rollback execution
    logActionExecution({
      component: 'ActionChainExecutor',
      action_id: action.id,
      event_id: event.id,
      organization_id: event.organization_id,
      action_type: 'rollback',
      message: `Executing compensating transaction for ${action.action_type}`,
    });

    await this.actionExecutor.execute(rollbackAction, event);
  }

  /**
   * Send failed action to Dead Letter Queue
   */
  private async sendToDlq(
    action: TriggerAction,
    event: Event,
    error: Error,
    attempts: number,
  ): Promise<void> {
    await this.dlq.addEntry({
      event,
      trigger: null, // Will be set by caller if needed
      action,
      failureReason: `Max retry attempts (${attempts}) exceeded`,
      lastError: {
        message: error.message,
        code: (error as any).code,
        statusCode: (error as any).statusCode,
        stack: error.stack,
      },
    });
  }

  /**
   * Record action execution start
   */
  private async recordExecutionStart(
    action: TriggerAction,
    event: Event,
    attempt: number,
  ): Promise<string> {
    const [execution] = await this.db('action_executions')
      .insert({
        event_id: event.id,
        trigger_id: action.trigger_id,
        action_id: action.id,
        status: 'running',
        attempt,
        started_at: new Date(),
        created_at: new Date(),
      })
      .returning('id');

    return execution.id;
  }

  /**
   * Record action execution success
   */
  private async recordExecutionSuccess(
    executionId: string,
    result: ExecutionResult,
  ): Promise<void> {
    await this.db('action_executions').where('id', executionId).update({
      status: 'success',
      completed_at: new Date(),
      response: JSON.stringify(result.data || result),
    });
  }

  /**
   * Record action execution failure
   */
  private async recordExecutionFailure(executionId: string, error: Error): Promise<void> {
    await this.db('action_executions').where('id', executionId).update({
      status: 'failed',
      completed_at: new Date(),
      error: JSON.stringify({
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
      }),
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
