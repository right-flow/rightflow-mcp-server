/**
 * Dead Letter Queue Service
 * Business logic for DLQ retry operations and failure analysis
 */

import { query } from '../config/database';
import { DeadLetterQueueEntry } from '../types/event-trigger';

/**
 * Get DLQ statistics for organization
 */
export async function getDLQStats(organizationId: string) {
  const stats = await query(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN dlq.status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN dlq.status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN dlq.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN dlq.status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM dead_letter_queue dlq
    JOIN events e ON dlq.event_id = e.id
    WHERE e.organization_id = $1`,
    [organizationId]
  );

  const result = stats[0];

  return {
    total: parseInt(result.total as string) || 0,
    pending: parseInt(result.pending as string) || 0,
    processing: parseInt(result.processing as string) || 0,
    resolved: parseInt(result.resolved as string) || 0,
    failed: parseInt(result.failed as string) || 0,
  };
}

/**
 * Calculate optimal retry delay based on failure count
 * Exponential backoff: 1min, 5min, 15min, 1hr, 4hr, 12hr
 */
export function calculateRetryDelay(failureCount: number): number {
  const delays = [
    1 * 60 * 1000,      // 1 minute
    5 * 60 * 1000,      // 5 minutes
    15 * 60 * 1000,     // 15 minutes
    60 * 60 * 1000,     // 1 hour
    4 * 60 * 60 * 1000, // 4 hours
    12 * 60 * 60 * 1000, // 12 hours
  ];

  const index = Math.min(failureCount - 1, delays.length - 1);
  return delays[index];
}

/**
 * Retry single DLQ entry
 */
export async function retryDLQEntry(
  dlqId: string,
  organizationId: string
): Promise<{ success: boolean; message: string }> {
  // Verify entry exists and belongs to organization
  const entries = await query(
    `SELECT dlq.id, dlq.failure_count
     FROM dead_letter_queue dlq
     JOIN events e ON dlq.event_id = e.id
     WHERE dlq.id = $1 AND e.organization_id = $2`,
    [dlqId, organizationId]
  );

  if (entries.length === 0) {
    return { success: false, message: 'DLQ entry not found' };
  }

  // Update status to processing
  await query(
    `UPDATE dead_letter_queue
     SET status = 'processing', updated_at = NOW()
     WHERE id = $1`,
    [dlqId]
  );

  return { success: true, message: 'Retry initiated' };
}

/**
 * Bulk retry DLQ entries
 */
export async function bulkRetryDLQEntries(
  dlqIds: string[],
  organizationId: string
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const id of dlqIds) {
    try {
      // Verify entry belongs to organization
      const entries = await query(
        `SELECT dlq.id
         FROM dead_letter_queue dlq
         JOIN events e ON dlq.event_id = e.id
         WHERE dlq.id = $1 AND e.organization_id = $2`,
        [id, organizationId]
      );

      if (entries.length > 0) {
        await query(
          `UPDATE dead_letter_queue
           SET status = 'processing', updated_at = NOW()
           WHERE id = $1`,
          [id]
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

/**
 * Mark DLQ entry as permanently failed
 */
export async function markAsPermanentlyFailed(
  dlqId: string,
  organizationId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  // Verify entry exists and belongs to organization
  const entries = await query(
    `SELECT dlq.id
     FROM dead_letter_queue dlq
     JOIN events e ON dlq.event_id = e.id
     WHERE dlq.id = $1 AND e.organization_id = $2`,
    [dlqId, organizationId]
  );

  if (entries.length === 0) {
    return { success: false, message: 'DLQ entry not found' };
  }

  // Update status to failed with reason
  await query(
    `UPDATE dead_letter_queue
     SET status = 'failed',
         last_error = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [dlqId, reason ? JSON.stringify({ message: reason }) : null]
  );

  return { success: true, message: 'Marked as permanently failed' };
}

/**
 * Get DLQ entries ready for retry (past retry_after timestamp)
 */
export async function getEntriesReadyForRetry(organizationId: string): Promise<DeadLetterQueueEntry[]> {
  const entries = await query<DeadLetterQueueEntry>(
    `SELECT
      dlq.id,
      dlq.event_id,
      dlq.trigger_id,
      dlq.action_id,
      dlq.failure_reason,
      dlq.failure_count,
      dlq.last_error,
      dlq.event_snapshot,
      dlq.action_snapshot,
      dlq.status,
      dlq.retry_after,
      dlq.created_at,
      dlq.updated_at
    FROM dead_letter_queue dlq
    JOIN events e ON dlq.event_id = e.id
    WHERE e.organization_id = $1
      AND dlq.status = 'pending'
      AND (dlq.retry_after IS NULL OR dlq.retry_after <= NOW())
      AND dlq.failure_count < 6
    ORDER BY dlq.created_at ASC
    LIMIT 100`,
    [organizationId]
  );

  return entries;
}

/**
 * Analyze DLQ failures to identify patterns
 */
export async function analyzeDLQFailures(organizationId: string) {
  // Get failure breakdown by reason
  const byReason = await query(
    `SELECT
      failure_reason,
      COUNT(*) as count,
      AVG(failure_count) as avg_attempts
    FROM dead_letter_queue dlq
    JOIN events e ON dlq.event_id = e.id
    WHERE e.organization_id = $1
      AND dlq.status IN ('pending', 'failed')
    GROUP BY failure_reason
    ORDER BY count DESC
    LIMIT 10`,
    [organizationId]
  );

  // Get failure breakdown by trigger
  const byTrigger = await query(
    `SELECT
      et.id,
      et.name,
      COUNT(*) as failure_count
    FROM dead_letter_queue dlq
    JOIN events e ON dlq.event_id = e.id
    JOIN event_triggers et ON dlq.trigger_id = et.id
    WHERE e.organization_id = $1
      AND dlq.status IN ('pending', 'failed')
    GROUP BY et.id, et.name
    ORDER BY failure_count DESC
    LIMIT 10`,
    [organizationId]
  );

  // Get failure breakdown by action type
  const byActionType = await query(
    `SELECT
      ta.action_type,
      COUNT(*) as count
    FROM dead_letter_queue dlq
    JOIN events e ON dlq.event_id = e.id
    JOIN trigger_actions ta ON dlq.action_id = ta.id
    WHERE e.organization_id = $1
      AND dlq.status IN ('pending', 'failed')
    GROUP BY ta.action_type
    ORDER BY count DESC`,
    [organizationId]
  );

  return {
    byReason: byReason.map(r => ({
      reason: r.failure_reason,
      count: parseInt(r.count as string),
      avgAttempts: parseFloat(r.avg_attempts as string),
    })),
    byTrigger: byTrigger.map(t => ({
      triggerId: t.id,
      triggerName: t.name,
      failureCount: parseInt(t.failure_count as string),
    })),
    byActionType: byActionType.map(a => ({
      actionType: a.action_type,
      count: parseInt(a.count as string),
    })),
  };
}

/**
 * Get DLQ health score (0-100)
 * Based on pending/failed ratio and resolution rate
 */
export async function getDLQHealthScore(organizationId: string): Promise<number> {
  const stats = await getDLQStats(organizationId);

  if (stats.total === 0) {
    return 100; // No DLQ entries = healthy
  }

  const unresolvedCount = stats.pending + stats.failed;
  const unresolvedRate = (unresolvedCount / stats.total) * 100;

  // Health score calculation:
  // 0-5% unresolved = 100 score
  // 5-10% unresolved = 90 score
  // 10-20% unresolved = 70 score
  // 20-50% unresolved = 40 score
  // >50% unresolved = declining score

  if (unresolvedRate <= 5) return 100;
  if (unresolvedRate <= 10) return 90 + ((10 - unresolvedRate) / 5) * 10;
  if (unresolvedRate <= 20) return 70 + ((10 - (unresolvedRate - 10)) / 10) * 20;
  if (unresolvedRate <= 50) return 40 + ((20 - (unresolvedRate - 20)) / 30) * 30;

  return Math.max(0, ((100 - unresolvedRate) / 50) * 40);
}

/**
 * Auto-resolve old DLQ entries (> 30 days with no retry)
 */
export async function autoResolveOldEntries(organizationId: string): Promise<number> {
  // First get count of matching entries
  const countResult = await query(
    `SELECT COUNT(*) as count
     FROM dead_letter_queue dlq
     JOIN events e ON dlq.event_id = e.id
     WHERE e.organization_id = $1
       AND dlq.status = 'pending'
       AND dlq.created_at < NOW() - INTERVAL '30 days'`,
    [organizationId]
  );

  const count = parseInt(countResult[0].count as string) || 0;

  if (count > 0) {
    // Update the entries
    await query(
      `UPDATE dead_letter_queue
       SET status = 'failed', updated_at = NOW()
       FROM events e
       WHERE dead_letter_queue.event_id = e.id
         AND e.organization_id = $1
         AND dead_letter_queue.status = 'pending'
         AND dead_letter_queue.created_at < NOW() - INTERVAL '30 days'`,
      [organizationId]
    );
  }

  return count;
}
