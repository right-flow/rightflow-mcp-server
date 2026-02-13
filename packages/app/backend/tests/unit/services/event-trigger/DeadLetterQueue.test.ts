/**
 * Unit Tests for Dead Letter Queue (DLQ) Service
 * Tests failure capture, manual retry, and monitoring
 *
 * Coverage target: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeadLetterQueue } from '../../../../src/services/event-trigger/DeadLetterQueue';
import type { Event, EventTrigger, TriggerAction } from '../../../../src/types/event-trigger';
import {
  testEvents,
  testTriggers,
  testActions,
  testDlqEntries,
  createTestEvent
} from '../../../fixtures/event-trigger/events';

vi.mock('../../../../src/config/database');

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue;
  let mockDb: any;

  beforeEach(() => {
    mockDb = vi.fn(() => ({
      insert: vi.fn().mockResolvedValue([{ id: 'dlq-entry-id' }]),
      update: vi.fn().mockResolvedValue(1),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1),
      increment: vi.fn().mockReturnThis()
    }));

    dlq = new DeadLetterQueue(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addEntry() - Adding Failed Actions', () => {
    it('should add failed action to DLQ', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = testActions.sendWebhook;
      const error = new Error('Webhook timeout');

      await dlq.addEntry({
        event,
        trigger,
        action,
        failureReason: 'Max retry attempts exceeded',
        lastError: error
      });

      expect(mockDb).toHaveBeenCalledWith('dead_letter_queue');
      expect(mockDb().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: event.id,
          trigger_id: trigger.id,
          action_id: action.id,
          failure_reason: 'Max retry attempts exceeded',
          failure_count: 1,
          last_error: expect.objectContaining({
            message: 'Webhook timeout'
          }),
          event_snapshot: event,
          action_snapshot: action,
          status: 'pending',
          created_at: expect.any(Date)
        })
      );
    });

    it('should increment failure_count for existing DLQ entry', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = testActions.sendWebhook;

      // Mock existing DLQ entry
      mockDb().first.mockResolvedValueOnce({
        id: 'existing-dlq-id',
        failure_count: 2
      });

      await dlq.addEntry({
        event,
        trigger,
        action,
        failureReason: 'Still failing',
        lastError: new Error('Another failure')
      });

      expect(mockDb().increment).toHaveBeenCalledWith('failure_count', 1);
      expect(mockDb().update).toHaveBeenCalledWith(
        expect.objectContaining({
          failure_reason: 'Still failing',
          last_error: expect.any(Object),
          updated_at: expect.any(Date)
        })
      );
    });

    it('should capture full error stack trace', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = testActions.sendWebhook;
      const error = new Error('Detailed error');
      error.stack = 'Error: Detailed error\n  at line 1\n  at line 2';

      await dlq.addEntry({
        event,
        trigger,
        action,
        failureReason: 'Error with stack',
        lastError: error
      });

      expect(mockDb().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          last_error: expect.objectContaining({
            message: 'Detailed error',
            stack: expect.stringContaining('at line 1')
          })
        })
      );
    });

    it('should preserve event and action snapshots for replay', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent);
      const trigger = testTriggers.userTrigger;
      const action = testActions.updateCrm;

      await dlq.addEntry({
        event,
        trigger,
        action,
        failureReason: 'CRM API error',
        lastError: new Error('API timeout')
      });

      expect(mockDb().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_snapshot: event,
          action_snapshot: action
        })
      );
    });

    it('should set retry_after for delayed retry', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = testActions.sendWebhook;
      const retryAfter = new Date(Date.now() + 300000); // 5 minutes

      await dlq.addEntry({
        event,
        trigger,
        action,
        failureReason: 'Rate limit exceeded',
        lastError: new Error('429 Too Many Requests'),
        retryAfter
      });

      expect(mockDb().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          retry_after: retryAfter,
          status: 'pending'
        })
      );
    });
  });

  describe('retry() - Manual Retry', () => {
    it('should retry pending DLQ entry', async () => {
      const dlqEntry = testDlqEntries.webhookFailure;

      mockDb().first.mockResolvedValueOnce(dlqEntry);

      const mockActionExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      };

      await dlq.retry(dlqEntry.id, mockActionExecutor);

      expect(mockActionExecutor.execute).toHaveBeenCalledWith(
        dlqEntry.action_snapshot,
        dlqEntry.event_snapshot
      );

      expect(mockDb().update).toHaveBeenCalledWith({
        status: 'resolved',
        resolved_at: expect.any(Date)
      });
    });

    it('should update status to "processing" during retry', async () => {
      const dlqEntry = testDlqEntries.webhookFailure;

      mockDb().first.mockResolvedValueOnce(dlqEntry);

      const mockActionExecutor = {
        execute: vi.fn(
          () =>
            new Promise(resolve => {
              setTimeout(() => resolve({ success: true }), 100);
            })
        )
      };

      const retryPromise = dlq.retry(dlqEntry.id, mockActionExecutor);

      // Check status is set to processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDb().update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processing' })
      );

      await retryPromise;
    });

    it('should keep status as "pending" if retry fails', async () => {
      const dlqEntry = testDlqEntries.webhookFailure;

      mockDb().first.mockResolvedValueOnce(dlqEntry);

      const mockActionExecutor = {
        execute: vi.fn().mockRejectedValue(new Error('Still failing'))
      };

      await expect(dlq.retry(dlqEntry.id, mockActionExecutor)).rejects.toThrow(
        'Still failing'
      );

      expect(mockDb().update).toHaveBeenCalledWith({
        status: 'pending',
        failure_count: dlqEntry.failure_count + 1,
        last_error: expect.objectContaining({
          message: 'Still failing'
        }),
        updated_at: expect.any(Date)
      });
    });

    it('should throw error if DLQ entry not found', async () => {
      mockDb().first.mockResolvedValueOnce(null);

      const mockActionExecutor = { execute: vi.fn() };

      await expect(dlq.retry('nonexistent-id', mockActionExecutor)).rejects.toThrow(
        'DLQ entry not found'
      );
    });

    it('should throw error if DLQ entry already resolved', async () => {
      const resolvedEntry = {
        ...testDlqEntries.webhookFailure,
        status: 'resolved'
      };

      mockDb().first.mockResolvedValueOnce(resolvedEntry);

      const mockActionExecutor = { execute: vi.fn() };

      await expect(dlq.retry(resolvedEntry.id, mockActionExecutor)).rejects.toThrow(
        'already resolved'
      );
    });

    it('should respect retry_after timestamp', async () => {
      const futureRetry = new Date(Date.now() + 60000); // 1 minute in future
      const dlqEntry = {
        ...testDlqEntries.processing,
        retry_after: futureRetry
      };

      mockDb().first.mockResolvedValueOnce(dlqEntry);

      const mockActionExecutor = { execute: vi.fn() };

      await expect(dlq.retry(dlqEntry.id, mockActionExecutor)).rejects.toThrow(
        'Cannot retry before'
      );
    });
  });

  describe('getPendingEntries() - Retrieve Failures', () => {
    it('should retrieve all pending DLQ entries', async () => {
      const pendingEntries = [
        testDlqEntries.webhookFailure,
        testDlqEntries.processing
      ];

      mockDb().orderBy.mockResolvedValue(pendingEntries);

      const result = await dlq.getPendingEntries();

      expect(mockDb).toHaveBeenCalledWith('dead_letter_queue');
      expect(mockDb().where).toHaveBeenCalledWith('status', 'pending');
      expect(result).toEqual(pendingEntries);
    });

    it('should filter by organization_id', async () => {
      const orgId = testEvents.formSubmitted.organization_id;

      await dlq.getPendingEntries({ organizationId: orgId });

      // Should join with events table to filter by organization
      expect(mockDb().where).toHaveBeenCalledWith(
        expect.stringContaining('organization_id'),
        orgId
      );
    });

    it('should filter by event_type', async () => {
      await dlq.getPendingEntries({ eventType: 'form.submitted' });

      expect(mockDb().where).toHaveBeenCalledWith(
        expect.stringContaining('event_type'),
        'form.submitted'
      );
    });

    it('should order by created_at DESC (most recent first)', async () => {
      mockDb().orderBy.mockResolvedValue([]);

      await dlq.getPendingEntries();

      expect(mockDb().orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });

    it('should limit results', async () => {
      await dlq.getPendingEntries({ limit: 10 });

      expect(mockDb().limit).toHaveBeenCalledWith(10);
    });

    it('should support pagination with offset', async () => {
      await dlq.getPendingEntries({ limit: 10, offset: 20 });

      expect(mockDb().limit).toHaveBeenCalledWith(10);
      expect(mockDb().offset).toHaveBeenCalledWith(20);
    });
  });

  describe('getStats() - Monitoring', () => {
    it('should return DLQ statistics', async () => {
      mockDb().count.mockResolvedValueOnce([{ count: '15' }]); // Pending
      mockDb().count.mockResolvedValueOnce([{ count: '5' }]); // Processing
      mockDb().count.mockResolvedValueOnce([{ count: '100' }]); // Resolved
      mockDb().count.mockResolvedValueOnce([{ count: '3' }]); // Failed

      const stats = await dlq.getStats();

      expect(stats).toEqual({
        pending: 15,
        processing: 5,
        resolved: 100,
        failed: 3,
        total: 123
      });
    });

    it('should filter stats by organization_id', async () => {
      const orgId = testEvents.formSubmitted.organization_id;

      mockDb().count.mockResolvedValue([{ count: '0' }]);

      await dlq.getStats({ organizationId: orgId });

      // Should apply organization filter to all counts
      expect(mockDb().where).toHaveBeenCalledWith(
        expect.stringContaining('organization_id'),
        orgId
      );
    });

    it('should filter stats by date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-02-01');

      mockDb().count.mockResolvedValue([{ count: '0' }]);

      await dlq.getStats({ startDate, endDate });

      expect(mockDb().where).toHaveBeenCalledWith('created_at', '>=', startDate);
      expect(mockDb().where).toHaveBeenCalledWith('created_at', '<=', endDate);
    });
  });

  describe('markAsFailed() - Permanent Failure', () => {
    it('should mark DLQ entry as permanently failed', async () => {
      const dlqEntry = testDlqEntries.webhookFailure;

      await dlq.markAsFailed(dlqEntry.id, 'Manual investigation required');

      expect(mockDb).toHaveBeenCalledWith('dead_letter_queue');
      expect(mockDb().update).toHaveBeenCalledWith({
        status: 'failed',
        failure_reason: 'Manual investigation required',
        updated_at: expect.any(Date)
      });
    });

    it('should prevent further retry attempts on failed entries', async () => {
      const failedEntry = {
        ...testDlqEntries.webhookFailure,
        status: 'failed'
      };

      mockDb().first.mockResolvedValueOnce(failedEntry);

      const mockActionExecutor = { execute: vi.fn() };

      await expect(dlq.retry(failedEntry.id, mockActionExecutor)).rejects.toThrow(
        'Cannot retry failed entry'
      );
    });
  });

  describe('delete() - Remove Resolved Entries', () => {
    it('should delete resolved DLQ entry', async () => {
      const resolvedEntry = {
        ...testDlqEntries.webhookFailure,
        status: 'resolved'
      };

      mockDb().first.mockResolvedValueOnce(resolvedEntry);

      await dlq.delete(resolvedEntry.id);

      expect(mockDb).toHaveBeenCalledWith('dead_letter_queue');
      expect(mockDb().del).toHaveBeenCalled();
    });

    it('should NOT delete pending or processing entries', async () => {
      const pendingEntry = testDlqEntries.webhookFailure;

      mockDb().first.mockResolvedValueOnce(pendingEntry);

      await expect(dlq.delete(pendingEntry.id)).rejects.toThrow(
        'Cannot delete non-resolved entry'
      );

      expect(mockDb().del).not.toHaveBeenCalled();
    });

    it('should allow force delete with flag', async () => {
      const pendingEntry = testDlqEntries.webhookFailure;

      mockDb().first.mockResolvedValueOnce(pendingEntry);

      await dlq.delete(pendingEntry.id, { force: true });

      expect(mockDb().del).toHaveBeenCalled();
    });
  });

  describe('bulkRetry() - Batch Retry', () => {
    it('should retry multiple DLQ entries', async () => {
      const entries = [
        testDlqEntries.webhookFailure,
        { ...testDlqEntries.webhookFailure, id: 'dlq-2' }
      ];

      mockDb().whereIn.mockReturnThis();
      mockDb().orderBy.mockResolvedValue(entries);

      const mockActionExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      };

      const results = await dlq.bulkRetry(
        [entries[0].id, entries[1].id],
        mockActionExecutor
      );

      expect(results.succeeded).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk retry', async () => {
      const entries = [
        testDlqEntries.webhookFailure,
        { ...testDlqEntries.webhookFailure, id: 'dlq-2' },
        { ...testDlqEntries.webhookFailure, id: 'dlq-3' }
      ];

      mockDb().whereIn.mockReturnThis();
      mockDb().orderBy.mockResolvedValue(entries);

      const mockActionExecutor = {
        execute: vi
          .fn()
          .mockResolvedValueOnce({ success: true })
          .mockRejectedValueOnce(new Error('Failed'))
          .mockResolvedValueOnce({ success: true })
      };

      const results = await dlq.bulkRetry(
        entries.map(e => e.id),
        mockActionExecutor
      );

      expect(results.succeeded).toHaveLength(2);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0]).toMatchObject({
        id: 'dlq-2',
        error: expect.stringContaining('Failed')
      });
    });

    it('should respect max concurrent retries', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        ...testDlqEntries.webhookFailure,
        id: `dlq-${i}`
      }));

      mockDb().whereIn.mockReturnThis();
      mockDb().orderBy.mockResolvedValue(entries);

      let concurrentCount = 0;
      let maxConcurrent = 0;

      const mockActionExecutor = {
        execute: vi.fn().mockImplementation(async () => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          await new Promise(resolve => setTimeout(resolve, 50));
          concurrentCount--;
          return { success: true };
        })
      };

      await dlq.bulkRetry(
        entries.map(e => e.id),
        mockActionExecutor,
        { maxConcurrent: 3 }
      );

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle DLQ entry with null event_snapshot', async () => {
      const dlqEntry = {
        ...testDlqEntries.webhookFailure,
        event_snapshot: null
      };

      mockDb().first.mockResolvedValueOnce(dlqEntry);

      const mockActionExecutor = { execute: vi.fn() };

      await expect(dlq.retry(dlqEntry.id, mockActionExecutor)).rejects.toThrow(
        'Missing event snapshot'
      );
    });

    it('should handle large DLQ (100+ entries)', async () => {
      const largeList = Array.from({ length: 150 }, (_, i) => ({
        ...testDlqEntries.webhookFailure,
        id: `dlq-${i}`
      }));

      mockDb().orderBy.mockResolvedValue(largeList);

      const result = await dlq.getPendingEntries({ limit: 150 });

      expect(result).toHaveLength(150);
    });

    it('should handle Hebrew text in failure_reason', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent);
      const trigger = testTriggers.userTrigger;
      const action = testActions.sendEmail;

      await dlq.addEntry({
        event,
        trigger,
        action,
        failureReason: 'שגיאה בשליחת מייל - כתובת לא תקינה',
        lastError: new Error('Invalid email')
      });

      expect(mockDb().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          failure_reason: 'שגיאה בשליחת מייל - כתובת לא תקינה'
        })
      );
    });

    it('should handle concurrent addEntry calls', async () => {
      const entries = Array.from({ length: 5 }, () => ({
        event: createTestEvent(testEvents.formSubmitted),
        trigger: testTriggers.userTrigger,
        action: testActions.sendWebhook,
        failureReason: 'Test failure',
        lastError: new Error('Test')
      }));

      const results = await Promise.all(entries.map(e => dlq.addEntry(e)));

      expect(results).toHaveLength(5);
      expect(mockDb().insert).toHaveBeenCalledTimes(5);
    });

    it('should handle database errors gracefully', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = testActions.sendWebhook;

      mockDb().insert.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(
        dlq.addEntry({
          event,
          trigger,
          action,
          failureReason: 'Test',
          lastError: new Error('Test')
        })
      ).rejects.toThrow('DB connection lost');
    });
  });

  describe('Cleanup & Maintenance', () => {
    it('should delete resolved entries older than retention period', async () => {
      const retentionDays = 90;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      await dlq.cleanup({ retentionDays });

      expect(mockDb().where).toHaveBeenCalledWith('status', 'resolved');
      expect(mockDb().where).toHaveBeenCalledWith('resolved_at', '<', cutoffDate);
      expect(mockDb().del).toHaveBeenCalled();
    });

    it('should NOT delete pending or failed entries during cleanup', async () => {
      await dlq.cleanup({ retentionDays: 90 });

      expect(mockDb().where).toHaveBeenCalledWith('status', 'resolved');
      // Should only delete resolved entries
    });

    it('should return count of deleted entries', async () => {
      mockDb().del.mockResolvedValueOnce(42);

      const result = await dlq.cleanup({ retentionDays: 90 });

      expect(result.deletedCount).toBe(42);
    });
  });
});
