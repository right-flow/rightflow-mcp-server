/**
 * Event Processing Worker
 * Processes events and executes matching triggers
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { EventJob } from '../queues/eventQueue';
import logger from '../utils/logger';

// Event worker
export const eventWorker = new Worker<EventJob>(
  'event-processing',
  async (job: Job<EventJob>) => {
    const { eventId, organizationId, eventType, data } = job.data;

    logger.info('Processing event', {
      jobId: job.id,
      eventId,
      eventType,
      attempt: job.attemptsMade + 1,
    });

    try {
      // Step 1: Find matching triggers
      const triggers = await query(
        `SELECT
          et.*,
          array_agg(
            json_build_object(
              'id', ta.id,
              'action_type', ta.action_type,
              'order', ta."order",
              'config', ta.config,
              'retry_config', ta.retry_config,
              'timeout_ms', ta.timeout_ms,
              'is_critical', ta.is_critical
            ) ORDER BY ta."order"
          ) as actions
        FROM event_triggers et
        LEFT JOIN trigger_actions ta ON et.id = ta.trigger_id
        WHERE et.organization_id = $1
          AND et.event_type = $2
          AND et.status = 'active'
        GROUP BY et.id
        ORDER BY et.priority DESC`,
        [organizationId, eventType]
      );

      logger.info(`Found ${triggers.length} matching triggers`, {
        eventId,
        eventType,
      });

      // Step 2: Evaluate conditions and execute actions for each trigger
      for (const trigger of triggers) {
        try {
          // Evaluate conditions
          const conditionsMet = evaluateConditions(trigger.conditions || [], data);

          if (!conditionsMet) {
            logger.debug('Trigger conditions not met', {
              triggerId: trigger.id,
              eventId,
            });
            continue;
          }

          // Execute actions
          const actions = trigger.actions || [];
          for (const action of actions) {
            if (!action || !action.id) continue;

            // Record execution start
            const executionId = await recordExecutionStart(
              eventId,
              trigger.id,
              action.id,
              organizationId
            );

            try {
              // Execute action based on type
              const result = await executeAction(action, data, trigger);

              // Record success
              await recordExecutionComplete(executionId, result);

              logger.info('Action executed successfully', {
                executionId,
                actionType: action.action_type,
              });
            } catch (actionError: any) {
              // Record failure
              await recordExecutionFailed(executionId, actionError);

              // Add to DLQ if critical or max retries exceeded
              if (action.is_critical || job.attemptsMade >= 2) {
                await addToDLQ(eventId, trigger.id, action.id, actionError, job.data, action);
              }

              // Stop chain if error handling strategy requires it
              if (trigger.error_handling === 'stop_on_first_error') {
                throw actionError;
              }
            }
          }
        } catch (triggerError: any) {
          logger.error('Trigger execution failed', {
            triggerId: trigger.id,
            eventId,
            error: triggerError.message,
          });
        }
      }

      // Mark event as processed
      await query(
        `UPDATE events SET processing_mode = 'processed' WHERE id = $1`,
        [eventId]
      );

      return { success: true, triggersProcessed: triggers.length };
    } catch (error: any) {
      logger.error('Event processing failed', {
        eventId,
        error: error.message,
      });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 1000,
    },
  }
);

// Evaluate trigger conditions
function evaluateConditions(conditions: any[], eventData: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    const actualValue = getNestedValue(eventData, condition.field);

    switch (condition.operator) {
      case 'equals':
        return actualValue === condition.value;
      case 'not_equals':
        return actualValue !== condition.value;
      case 'contains':
        return String(actualValue || '').includes(String(condition.value || ''));
      case 'greater_than':
        return Number(actualValue) > Number(condition.value);
      case 'less_than':
        return Number(actualValue) < Number(condition.value);
      case 'is_empty':
        return actualValue === null || actualValue === undefined || actualValue === '';
      case 'is_not_empty':
        return actualValue !== null && actualValue !== undefined && actualValue !== '';
      default:
        return true;
    }
  });
}

// Get nested value from object
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Execute action based on type
async function executeAction(
  action: any,
  eventData: Record<string, any>,
  trigger: any
): Promise<any> {
  const config = action.config || {};

  switch (action.action_type) {
    case 'send_webhook':
      return await executeWebhook(config, eventData);
    case 'send_email':
      return await executeEmail(config, eventData);
    case 'send_sms':
      return await executeSMS(config, eventData);
    case 'update_crm':
      return await executeUpdateCRM(config, eventData);
    case 'create_task':
      return await executeCreateTask(config, eventData);
    default:
      logger.warn(`Unknown action type: ${action.action_type}`);
      return { success: true, message: 'Action type not implemented' };
  }
}

// Action executors
async function executeWebhook(config: any, eventData: any): Promise<any> {
  const response = await fetch(config.url, {
    method: config.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: HTTP ${response.status}`);
  }

  return { status: response.status, body: await response.text() };
}

async function executeEmail(config: any, eventData: any): Promise<any> {
  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  logger.info('Would send email', { to: config.to, subject: config.subject });
  return { success: true, message: 'Email queued' };
}

async function executeSMS(config: any, eventData: any): Promise<any> {
  // In production, integrate with SMS service (Twilio, etc.)
  logger.info('Would send SMS', { to: config.to });
  return { success: true, message: 'SMS queued' };
}

async function executeUpdateCRM(config: any, eventData: any): Promise<any> {
  // In production, integrate with CRM service
  logger.info('Would update CRM', { crmType: config.crmType, operation: config.operation });
  return { success: true, message: 'CRM update queued' };
}

async function executeCreateTask(config: any, eventData: any): Promise<any> {
  // In production, create internal task
  logger.info('Would create task', { title: config.title });
  return { success: true, message: 'Task created' };
}

// Database helpers
async function recordExecutionStart(
  eventId: string,
  triggerId: string,
  actionId: string,
  organizationId: string
): Promise<string> {
  const result = await query(
    `INSERT INTO action_executions (
      event_id, trigger_id, action_id, status, attempt, started_at, created_at
    ) VALUES ($1, $2, $3, 'pending', 1, NOW(), NOW())
    RETURNING id`,
    [eventId, triggerId, actionId]
  );
  return result[0].id;
}

async function recordExecutionComplete(executionId: string, result: any): Promise<void> {
  await query(
    `UPDATE action_executions
     SET status = 'success', response = $1, completed_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(result), executionId]
  );
}

async function recordExecutionFailed(executionId: string, error: any): Promise<void> {
  await query(
    `UPDATE action_executions
     SET status = 'failed', error = $1, completed_at = NOW()
     WHERE id = $2`,
    [JSON.stringify({ message: error.message, stack: error.stack }), executionId]
  );
}

async function addToDLQ(
  eventId: string,
  triggerId: string,
  actionId: string,
  error: any,
  eventData: any,
  actionData: any
): Promise<void> {
  await query(
    `INSERT INTO dead_letter_queue (
      event_id, trigger_id, action_id,
      failure_reason, failure_count, last_error,
      event_snapshot, action_snapshot,
      status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 1, $5, $6, $7, 'pending', NOW(), NOW())
    ON CONFLICT (event_id, trigger_id, action_id) DO UPDATE
    SET failure_count = dead_letter_queue.failure_count + 1,
        last_error = $5,
        updated_at = NOW()`,
    [
      eventId,
      triggerId,
      actionId,
      'max_retries_exceeded',
      JSON.stringify({ message: error.message }),
      JSON.stringify(eventData),
      JSON.stringify(actionData),
    ]
  );
}

// Worker event listeners
eventWorker.on('completed', (job) => {
  logger.debug('Event job completed', { jobId: job.id, eventId: job.data.eventId });
});

eventWorker.on('failed', (job, error) => {
  if (job) {
    logger.error('Event job failed after all retries', {
      jobId: job.id,
      eventId: job.data.eventId,
      error: error.message,
    });
  }
});

eventWorker.on('error', (error) => {
  logger.error('Event worker error', { error: error.message });
});

export default eventWorker;
