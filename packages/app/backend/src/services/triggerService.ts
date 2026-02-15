/**
 * Trigger Service - Business Logic Layer
 * Provides high-level operations for trigger management
 * Integrates with existing event-trigger services
 */

import { query } from '../config/database';
import { EventTrigger, TriggerAction, ActionExecution } from '../types/event-trigger';

/**
 * Get trigger with all related data (actions, statistics)
 */
export async function getTriggerWithDetails(triggerId: string, organizationId: string) {
  // Get trigger
  const triggers = await query<EventTrigger>(
    `SELECT * FROM event_triggers WHERE id = $1 AND organization_id = $2`,
    [triggerId, organizationId]
  );

  if (triggers.length === 0) {
    return null;
  }

  const trigger = triggers[0];

  // Get actions
  const actions = await query<TriggerAction>(
    `SELECT * FROM trigger_actions WHERE trigger_id = $1 ORDER BY "order" ASC`,
    [triggerId]
  );

  // Get execution statistics
  const stats = await query(
    `SELECT
      COUNT(*) as total_executions,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_executions,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
      MAX(created_at) as last_execution
     FROM action_executions
     WHERE trigger_id = $1`,
    [triggerId]
  );

  return {
    ...trigger,
    actions,
    statistics: {
      totalExecutions: parseInt(stats[0]?.total_executions || '0'),
      successfulExecutions: parseInt(stats[0]?.successful_executions || '0'),
      failedExecutions: parseInt(stats[0]?.failed_executions || '0'),
      lastExecution: stats[0]?.last_execution || null,
      successRate: stats[0]?.total_executions > 0
        ? (stats[0].successful_executions / stats[0].total_executions) * 100
        : 0,
    },
  };
}

/**
 * Validate trigger configuration before creation/update
 */
export function validateTriggerConfig(trigger: Partial<EventTrigger>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate name
  if (trigger.name && trigger.name.length > 255) {
    errors.push('Trigger name must be 255 characters or less');
  }

  // Validate conditions
  if (trigger.conditions && Array.isArray(trigger.conditions)) {
    trigger.conditions.forEach((condition, index) => {
      if (!condition.field || !condition.operator) {
        errors.push(`Condition ${index + 1} is missing required fields (field, operator)`);
      }
    });
  }

  // Validate priority
  if (trigger.priority !== undefined && (trigger.priority < 0 || trigger.priority > 1000)) {
    errors.push('Priority must be between 0 and 1000');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate action configuration before creation/update
 */
export function validateActionConfig(action: Partial<TriggerAction>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate config based on action type
  if (action.action_type && action.config) {
    switch (action.action_type) {
      case 'send_webhook':
        if (!action.config.url) {
          errors.push('Webhook action requires a URL');
        }
        break;
      case 'send_email':
        if (!action.config.to) {
          errors.push('Email action requires a recipient (to)');
        }
        break;
      case 'send_sms':
        if (!action.config.to) {
          errors.push('SMS action requires a phone number (to)');
        }
        break;
    }
  }

  // Validate timeout
  if (action.timeout_ms !== undefined && action.timeout_ms < 1000) {
    errors.push('Timeout must be at least 1000ms (1 second)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get trigger health status based on recent executions
 */
export async function getTriggerHealth(triggerId: string): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  successRate: number;
  recentFailures: number;
}> {
  // Get last 50 executions
  const executions = await query<ActionExecution>(
    `SELECT status FROM action_executions
     WHERE trigger_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [triggerId]
  );

  if (executions.length === 0) {
    return { status: 'unknown', successRate: 0, recentFailures: 0 };
  }

  const successCount = executions.filter((e) => e.status === 'success').length;
  const failureCount = executions.filter((e) => e.status === 'failed').length;
  const successRate = (successCount / executions.length) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (successRate >= 95) {
    status = 'healthy';
  } else if (successRate >= 80) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    successRate,
    recentFailures: failureCount,
  };
}

/**
 * Get organization-wide trigger statistics
 */
export async function getOrganizationTriggerStats(organizationId: string) {
  const triggers = await query(
    `SELECT
      COUNT(*) as total_triggers,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_triggers,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_triggers
     FROM event_triggers
     WHERE organization_id = $1`,
    [organizationId]
  );

  const executions = await query(
    `SELECT
      COUNT(*) as total_executions,
      SUM(CASE WHEN ae.status = 'success' THEN 1 ELSE 0 END) as successful_executions,
      SUM(CASE WHEN ae.status = 'failed' THEN 1 ELSE 0 END) as failed_executions
     FROM action_executions ae
     JOIN event_triggers et ON ae.trigger_id = et.id
     WHERE et.organization_id = $1`,
    [organizationId]
  );

  const dlqSize = await query(
    `SELECT COUNT(*) as dlq_size
     FROM dead_letter_queue dlq
     JOIN events e ON dlq.event_id = e.id
     WHERE e.organization_id = $1 AND dlq.status = 'pending'`,
    [organizationId]
  );

  return {
    totalTriggers: parseInt(triggers[0]?.total_triggers || '0'),
    activeTriggers: parseInt(triggers[0]?.active_triggers || '0'),
    inactiveTriggers: parseInt(triggers[0]?.inactive_triggers || '0'),
    totalExecutions: parseInt(executions[0]?.total_executions || '0'),
    successfulExecutions: parseInt(executions[0]?.successful_executions || '0'),
    failedExecutions: parseInt(executions[0]?.failed_executions || '0'),
    dlqSize: parseInt(dlqSize[0]?.dlq_size || '0'),
  };
}

/**
 * Clone trigger with all actions
 */
export async function cloneTrigger(
  triggerId: string,
  organizationId: string,
  userId: string,
  newName?: string
): Promise<EventTrigger | null> {
  // Get original trigger
  const originalTriggers = await query<EventTrigger>(
    `SELECT * FROM event_triggers WHERE id = $1 AND organization_id = $2`,
    [triggerId, organizationId]
  );

  if (originalTriggers.length === 0) {
    return null;
  }

  const original = originalTriggers[0];

  // Create new trigger
  const newTriggers = await query<EventTrigger>(
    `INSERT INTO event_triggers (
      organization_id,
      name,
      level,
      event_type,
      status,
      scope,
      form_ids,
      conditions,
      priority,
      error_handling,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      organizationId,
      newName || `${original.name} (Copy)`,
      original.level,
      original.event_type,
      'inactive', // Start as inactive
      original.scope,
      original.form_ids,
      JSON.stringify(original.conditions),
      original.priority,
      original.error_handling,
      userId,
    ]
  );

  const newTrigger = newTriggers[0];

  // Clone actions
  const actions = await query<TriggerAction>(
    `SELECT * FROM trigger_actions WHERE trigger_id = $1 ORDER BY "order"`,
    [triggerId]
  );

  for (const action of actions) {
    await query(
      `INSERT INTO trigger_actions (
        trigger_id,
        action_type,
        "order",
        config,
        retry_config,
        timeout_ms,
        is_critical
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newTrigger.id,
        action.action_type,
        action.order,
        JSON.stringify(action.config),
        JSON.stringify(action.retry_config),
        action.timeout_ms,
        action.is_critical,
      ]
    );
  }

  return newTrigger;
}

/**
 * Bulk enable/disable triggers
 */
export async function bulkToggleTriggers(
  triggerIds: string[],
  organizationId: string,
  newStatus: 'active' | 'inactive'
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const triggerId of triggerIds) {
    try {
      // Verify ownership
      const triggers = await query(
        `SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2`,
        [triggerId, organizationId]
      );

      if (triggers.length > 0) {
        await query(
          `UPDATE event_triggers SET status = $1 WHERE id = $2`,
          [newStatus, triggerId]
        );
        succeeded++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  return { succeeded, failed };
}
