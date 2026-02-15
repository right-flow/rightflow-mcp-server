/**
 * Executions Service
 * Business logic for action executions, analytics, and monitoring
 */

import { query } from '../config/database';
import { ActionExecution } from '../types/event-trigger';

/**
 * Get execution statistics for a trigger
 */
export async function getTriggerExecutionStats(triggerId: string) {
  const stats = await query(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM action_executions
    WHERE trigger_id = $1`,
    [triggerId]
  );

  const result = stats[0];
  const total = parseInt(result.total as string) || 0;
  const successCount = parseInt(result.success as string) || 0;

  return {
    total,
    success: successCount,
    failed: parseInt(result.failed as string) || 0,
    pending: parseInt(result.pending as string) || 0,
    successRate: total > 0 ? (successCount / total) * 100 : 0,
  };
}

/**
 * Get execution statistics for an action
 */
export async function getActionExecutionStats(actionId: string) {
  const stats = await query(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
    FROM action_executions
    WHERE action_id = $1 AND completed_at IS NOT NULL`,
    [actionId]
  );

  const result = stats[0];
  const total = parseInt(result.total as string) || 0;
  const successCount = parseInt(result.success as string) || 0;

  return {
    total,
    success: successCount,
    failed: parseInt(result.failed as string) || 0,
    successRate: total > 0 ? (successCount / total) * 100 : 0,
    avgDurationSeconds: result.avg_duration_seconds ? parseFloat(result.avg_duration_seconds as string) : null,
  };
}

/**
 * Get organization-wide execution statistics
 */
export async function getOrganizationExecutionStats(organizationId: string) {
  const stats = await query(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN ae.status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN ae.status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN ae.status = 'pending' THEN 1 ELSE 0 END) as pending,
      COUNT(DISTINCT ae.trigger_id) as active_triggers
    FROM action_executions ae
    JOIN event_triggers et ON ae.trigger_id = et.id
    WHERE et.organization_id = $1`,
    [organizationId]
  );

  const result = stats[0];
  const total = parseInt(result.total as string) || 0;
  const successCount = parseInt(result.success as string) || 0;

  return {
    total,
    success: successCount,
    failed: parseInt(result.failed as string) || 0,
    pending: parseInt(result.pending as string) || 0,
    activeTriggers: parseInt(result.active_triggers as string) || 0,
    successRate: total > 0 ? (successCount / total) * 100 : 0,
  };
}

/**
 * Get execution timeline (hourly aggregation for last 24 hours)
 */
export async function getExecutionTimeline(organizationId: string, hours: number = 24) {
  const timeline = await query(
    `SELECT
      DATE_TRUNC('hour', ae.created_at) as hour,
      COUNT(*) as total,
      SUM(CASE WHEN ae.status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN ae.status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM action_executions ae
    JOIN event_triggers et ON ae.trigger_id = et.id
    WHERE et.organization_id = $1
      AND ae.created_at >= NOW() - INTERVAL '${hours} hours'
    GROUP BY DATE_TRUNC('hour', ae.created_at)
    ORDER BY hour DESC`,
    [organizationId]
  );

  return timeline.map(row => ({
    hour: row.hour,
    total: parseInt(row.total as string),
    success: parseInt(row.success as string),
    failed: parseInt(row.failed as string),
  }));
}

/**
 * Get slowest actions (by average execution time)
 */
export async function getSlowestActions(organizationId: string, limit: number = 10) {
  const slowest = await query(
    `SELECT
      ta.id,
      ta.action_type,
      ta.trigger_id,
      et.name as trigger_name,
      AVG(EXTRACT(EPOCH FROM (ae.completed_at - ae.started_at))) as avg_duration_seconds,
      COUNT(*) as execution_count
    FROM trigger_actions ta
    JOIN event_triggers et ON ta.trigger_id = et.id
    JOIN action_executions ae ON ta.id = ae.action_id
    WHERE et.organization_id = $1
      AND ae.completed_at IS NOT NULL
      AND ae.started_at IS NOT NULL
    GROUP BY ta.id, ta.action_type, ta.trigger_id, et.name
    ORDER BY avg_duration_seconds DESC
    LIMIT $2`,
    [organizationId, limit]
  );

  return slowest.map(row => ({
    actionId: row.id,
    actionType: row.action_type,
    triggerId: row.trigger_id,
    triggerName: row.trigger_name,
    avgDurationSeconds: parseFloat(row.avg_duration_seconds as string),
    executionCount: parseInt(row.execution_count as string),
  }));
}

/**
 * Get most failed actions
 */
export async function getMostFailedActions(organizationId: string, limit: number = 10) {
  const failed = await query(
    `SELECT
      ta.id,
      ta.action_type,
      ta.trigger_id,
      et.name as trigger_name,
      COUNT(*) as failure_count,
      SUM(CASE WHEN ae.status = 'success' THEN 1 ELSE 0 END) as success_count,
      COUNT(*) * 100.0 / NULLIF(SUM(CASE WHEN ae.status IN ('success', 'failed') THEN 1 ELSE 0 END), 0) as failure_rate
    FROM trigger_actions ta
    JOIN event_triggers et ON ta.trigger_id = et.id
    JOIN action_executions ae ON ta.id = ae.action_id
    WHERE et.organization_id = $1
      AND ae.status = 'failed'
    GROUP BY ta.id, ta.action_type, ta.trigger_id, et.name
    ORDER BY failure_count DESC
    LIMIT $2`,
    [organizationId, limit]
  );

  return failed.map(row => ({
    actionId: row.id,
    actionType: row.action_type,
    triggerId: row.trigger_id,
    triggerName: row.trigger_name,
    failureCount: parseInt(row.failure_count as string),
    successCount: parseInt(row.success_count as string),
    failureRate: row.failure_rate ? parseFloat(row.failure_rate as string) : 0,
  }));
}

/**
 * Get recent execution errors (for debugging)
 */
export async function getRecentExecutionErrors(
  organizationId: string,
  limit: number = 20
) {
  const errors = await query<ActionExecution>(
    `SELECT
      ae.id,
      ae.event_id,
      ae.trigger_id,
      ae.action_id,
      ae.status,
      ae.error,
      ae.attempt,
      ae.created_at,
      et.name as trigger_name,
      ta.action_type
    FROM action_executions ae
    JOIN event_triggers et ON ae.trigger_id = et.id
    JOIN trigger_actions ta ON ae.action_id = ta.id
    WHERE et.organization_id = $1
      AND ae.status = 'failed'
      AND ae.error IS NOT NULL
    ORDER BY ae.created_at DESC
    LIMIT $2`,
    [organizationId, limit]
  );

  return errors;
}

/**
 * Calculate execution health score (0-100)
 */
export async function calculateExecutionHealthScore(organizationId: string): Promise<number> {
  const stats = await getOrganizationExecutionStats(organizationId);

  if (stats.total === 0) {
    return 100; // No executions = healthy by default
  }

  // Health score based on success rate with exponential weighting
  // 95%+ success = 100 score
  // 90-95% success = 90 score
  // 80-90% success = 70 score
  // <80% success = declining score

  const successRate = stats.successRate;

  if (successRate >= 95) return 100;
  if (successRate >= 90) return 90 + ((successRate - 90) / 5) * 10;
  if (successRate >= 80) return 70 + ((successRate - 80) / 10) * 20;
  if (successRate >= 50) return 40 + ((successRate - 50) / 30) * 30;

  return Math.max(0, successRate / 50 * 40);
}
