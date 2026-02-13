/**
 * Dead Letter Queue (DLQ) Service
 * Captures failed actions for manual intervention and retry
 * Provides monitoring and bulk operations
 */

import type { Knex } from 'knex';
import type {
  Event,
  EventTrigger,
  TriggerAction,
  DeadLetterQueueEntry,
  ErrorDetails,
} from '../../types/event-trigger';

interface AddEntryParams {
  event: Event;
  trigger: EventTrigger | null;
  action: TriggerAction;
  failureReason: string;
  lastError: Error | ErrorDetails;
  retryAfter?: Date;
}

interface GetPendingOptions {
  organizationId?: string;
  eventType?: string;
  limit?: number;
  offset?: number;
}

interface GetStatsOptions {
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface BulkRetryOptions {
  maxConcurrent?: number;
}

interface BulkRetryResult {
  succeeded: Array<{ id: string }>;
  failed: Array<{ id: string; error: string }>;
}

export class DeadLetterQueue {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  /**
   * Add failed action to DLQ
   */
  async addEntry(params: AddEntryParams): Promise<DeadLetterQueueEntry> {
    const { event, trigger, action, failureReason, lastError, retryAfter } = params;

    // Check if entry already exists
    const existingEntry = await this.db('dead_letter_queue')
      .where({
        event_id: event.id,
        action_id: action.id,
      })
      .first();

    if (existingEntry) {
      // Increment failure count
      await this.db('dead_letter_queue')
        .where('id', existingEntry.id)
        .increment('failure_count', 1)
        .update({
          failure_reason: failureReason,
          last_error: JSON.stringify(this.normalizeError(lastError)),
          updated_at: new Date(),
        });

      return this.db('dead_letter_queue').where('id', existingEntry.id).first();
    }

    // Create new entry
    const [entry] = await this.db('dead_letter_queue')
      .insert({
        event_id: event.id,
        trigger_id: trigger?.id || null,
        action_id: action.id,
        failure_reason: failureReason,
        failure_count: 1,
        last_error: JSON.stringify(this.normalizeError(lastError)),
        event_snapshot: JSON.stringify(event),
        action_snapshot: JSON.stringify(action),
        status: 'pending',
        retry_after: retryAfter || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.parseDlqEntry(entry);
  }

  /**
   * Manually retry a DLQ entry
   */
  async retry(dlqEntryId: string, actionExecutor: any): Promise<void> {
    const entry = await this.db('dead_letter_queue').where('id', dlqEntryId).first();

    if (!entry) {
      throw new Error('DLQ entry not found');
    }

    if (entry.status === 'resolved') {
      throw new Error('Cannot retry: entry already resolved');
    }

    if (entry.status === 'failed') {
      throw new Error('Cannot retry failed entry: requires manual intervention');
    }

    // Check retry_after timestamp
    if (entry.retry_after && new Date(entry.retry_after) > new Date()) {
      throw new Error(`Cannot retry before ${entry.retry_after}`);
    }

    const parsedEntry = this.parseDlqEntry(entry);

    if (!parsedEntry.event_snapshot) {
      throw new Error('Missing event snapshot in DLQ entry');
    }

    // Update status to processing
    await this.db('dead_letter_queue').where('id', dlqEntryId).update({
      status: 'processing',
      updated_at: new Date(),
    });

    try {
      // Retry the action
      await actionExecutor.execute(
        parsedEntry.action_snapshot,
        parsedEntry.event_snapshot,
      );

      // Mark as resolved
      await this.db('dead_letter_queue').where('id', dlqEntryId).update({
        status: 'resolved',
        resolved_at: new Date(),
        updated_at: new Date(),
      });
    } catch (error) {
      // Retry failed - increment failure count and reset to pending
      await this.db('dead_letter_queue')
        .where('id', dlqEntryId)
        .increment('failure_count', 1)
        .update({
          status: 'pending',
          last_error: JSON.stringify(this.normalizeError(error as Error)),
          updated_at: new Date(),
        });

      throw error;
    }
  }

  /**
   * Get pending DLQ entries
   */
  async getPendingEntries(options: GetPendingOptions = {}): Promise<DeadLetterQueueEntry[]> {
    let query = this.db('dead_letter_queue').where('status', 'pending');

    // Filter by organization
    if (options.organizationId) {
      query = query.whereRaw(
        `event_snapshot->>'organization_id' = ?`,
        options.organizationId,
      );
    }

    // Filter by event type
    if (options.eventType) {
      query = query.whereRaw(`event_snapshot->>'event_type' = ?`, options.eventType);
    }

    // Order by created_at DESC (most recent first)
    query = query.orderBy('created_at', 'desc');

    // Pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const entries = await query;

    return entries.map(this.parseDlqEntry);
  }

  /**
   * Get DLQ statistics
   */
  async getStats(options: GetStatsOptions = {}): Promise<{
    pending: number;
    processing: number;
    resolved: number;
    failed: number;
    total: number;
  }> {
    let baseQuery = this.db('dead_letter_queue');

    // Apply filters
    if (options.organizationId) {
      baseQuery = baseQuery.whereRaw(
        `event_snapshot->>'organization_id' = ?`,
        options.organizationId,
      );
    }

    if (options.startDate) {
      baseQuery = baseQuery.where('created_at', '>=', options.startDate);
    }

    if (options.endDate) {
      baseQuery = baseQuery.where('created_at', '<=', options.endDate);
    }

    // Get counts by status
    const [pending] = await baseQuery.clone().where('status', 'pending').count('* as count');
    const [processing] = await baseQuery
      .clone()
      .where('status', 'processing')
      .count('* as count');
    const [resolved] = await baseQuery.clone().where('status', 'resolved').count('* as count');
    const [failed] = await baseQuery.clone().where('status', 'failed').count('* as count');

    const pendingCount = parseInt(pending.count as string);
    const processingCount = parseInt(processing.count as string);
    const resolvedCount = parseInt(resolved.count as string);
    const failedCount = parseInt(failed.count as string);

    return {
      pending: pendingCount,
      processing: processingCount,
      resolved: resolvedCount,
      failed: failedCount,
      total: pendingCount + processingCount + resolvedCount + failedCount,
    };
  }

  /**
   * Mark DLQ entry as permanently failed (requires manual intervention)
   */
  async markAsFailed(dlqEntryId: string, reason: string): Promise<void> {
    await this.db('dead_letter_queue').where('id', dlqEntryId).update({
      status: 'failed',
      failure_reason: reason,
      updated_at: new Date(),
    });
  }

  /**
   * Delete resolved DLQ entry
   */
  async delete(dlqEntryId: string, options: { force?: boolean } = {}): Promise<void> {
    const entry = await this.db('dead_letter_queue').where('id', dlqEntryId).first();

    if (!entry) {
      throw new Error('DLQ entry not found');
    }

    if (entry.status !== 'resolved' && !options.force) {
      throw new Error('Cannot delete non-resolved entry without force flag');
    }

    await this.db('dead_letter_queue').where('id', dlqEntryId).del();
  }

  /**
   * Bulk retry multiple DLQ entries
   */
  async bulkRetry(
    dlqEntryIds: string[],
    actionExecutor: any,
    options: BulkRetryOptions = {},
  ): Promise<BulkRetryResult> {
    const maxConcurrent = options.maxConcurrent || 3;

    // Fetch all entries
    const entries = await this.db('dead_letter_queue').whereIn('id', dlqEntryIds).orderBy('created_at', 'asc');

    const results: BulkRetryResult = {
      succeeded: [],
      failed: [],
    };

    // Process in batches
    for (let i = 0; i < entries.length; i += maxConcurrent) {
      const batch = entries.slice(i, i + maxConcurrent);

      const batchResults = await Promise.allSettled(
        batch.map(entry => this.retry(entry.id, actionExecutor)),
      );

      batchResults.forEach((result, index) => {
        const entryId = batch[index].id;

        if (result.status === 'fulfilled') {
          results.succeeded.push({ id: entryId });
        } else {
          results.failed.push({
            id: entryId,
            error: result.reason.message,
          });
        }
      });
    }

    return results;
  }

  /**
   * Cleanup resolved entries older than retention period
   */
  async cleanup(options: { retentionDays: number }): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date(Date.now() - options.retentionDays * 24 * 60 * 60 * 1000);

    const deletedCount = await this.db('dead_letter_queue')
      .where('status', 'resolved')
      .where('resolved_at', '<', cutoffDate)
      .del();

    return { deletedCount };
  }

  /**
   * Parse DLQ entry from database row
   */
  private parseDlqEntry(row: any): DeadLetterQueueEntry {
    return {
      ...row,
      last_error: JSON.parse(row.last_error || '{}'),
      event_snapshot: JSON.parse(row.event_snapshot || 'null'),
      action_snapshot: JSON.parse(row.action_snapshot || 'null'),
    };
  }

  /**
   * Normalize error to ErrorDetails format
   */
  private normalizeError(error: Error | ErrorDetails): ErrorDetails {
    if ('message' in error && typeof error.message === 'string') {
      return {
        message: error.message,
        code: (error as any).code,
        statusCode: (error as any).statusCode,
        stack: (error as any).stack,
      };
    }

    return error as ErrorDetails;
  }
}
