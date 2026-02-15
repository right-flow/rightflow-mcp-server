/**
 * Unit Tests for DLQ Service
 * Tests retry logic and failure analysis
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { query } from '../../config/database';
import {
  getDLQStats,
  calculateRetryDelay,
  retryDLQEntry,
  bulkRetryDLQEntries,
  markAsPermanentlyFailed,
  getEntriesReadyForRetry,
  analyzeDLQFailures,
  getDLQHealthScore,
  autoResolveOldEntries,
} from '../dlqService';

let testOrgId: string;
let testUserId: string;
let testTriggerId: string;
let testActionId: string;
let testEventId: string;
let testDlqId: string;

beforeAll(async () => {
  const org = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-dlq-service-org', 'DLQ Service Test Org'],
  );
  testOrgId = org[0].id;

  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_dlq_svc', 'clerk_dlq_svc', 'admin@dlqsvc.com', 'Test Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;
});

afterAll(async () => {
  await query('DELETE FROM dead_letter_queue WHERE event_id IN (SELECT id FROM events WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM users WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM organizations WHERE clerk_organization_id = $1', ['test-dlq-service-org']);
});

beforeEach(async () => {
  await query('DELETE FROM dead_letter_queue WHERE event_id IN (SELECT id FROM events WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);

  const trigger = await query<{ id: string }>(
    `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [testOrgId, 'Test Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
  );
  testTriggerId = trigger[0].id;

  const action = await query<{ id: string }>(
    `INSERT INTO trigger_actions (trigger_id, action_type, \"order\", config)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [testTriggerId, 'send_webhook', 1, JSON.stringify({ url: 'https://example.com' })],
  );
  testActionId = action[0].id;

  const event = await query<{ id: string }>(
    `INSERT INTO events (organization_id, event_type, entity_type, entity_id, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [testOrgId, 'form.submitted', 'form', testTriggerId, JSON.stringify({})],
  );
  testEventId = event[0].id;
});

describe('getDLQStats', () => {
  it('should return statistics for DLQ entries', async () => {
    // Create DLQ entries with different statuses
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Error', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'resolved'],
    );

    const stats = await getDLQStats(testOrgId);

    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.resolved).toBe(1);
  });

  it('should return zero stats when no DLQ entries', async () => {
    const stats = await getDLQStats(testOrgId);

    expect(stats.total).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.resolved).toBe(0);
  });
});

describe('calculateRetryDelay', () => {
  it('should return 1 minute for first failure', () => {
    const delay = calculateRetryDelay(1);
    expect(delay).toBe(1 * 60 * 1000);
  });

  it('should return 5 minutes for second failure', () => {
    const delay = calculateRetryDelay(2);
    expect(delay).toBe(5 * 60 * 1000);
  });

  it('should return 12 hours for 6+ failures', () => {
    const delay = calculateRetryDelay(10);
    expect(delay).toBe(12 * 60 * 60 * 1000);
  });
});

describe('retryDLQEntry', () => {
  beforeEach(async () => {
    const dlq = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );
    testDlqId = dlq[0].id;
  });

  it('should retry DLQ entry and update status', async () => {
    const result = await retryDLQEntry(testDlqId, testOrgId);

    expect(result.success).toBe(true);

    // Verify status updated
    const updated = await query(
      `SELECT status FROM dead_letter_queue WHERE id = $1`,
      [testDlqId]
    );
    expect(updated[0].status).toBe('processing');
  });

  it('should return error for non-existent entry', async () => {
    const result = await retryDLQEntry('00000000-0000-0000-0000-000000000000', testOrgId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('DLQ entry not found');
  });
});

describe('bulkRetryDLQEntries', () => {
  let dlqId1: string;
  let dlqId2: string;

  beforeEach(async () => {
    const dlq1 = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Error 1', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({})],
    );
    dlqId1 = dlq1[0].id;

    const dlq2 = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Error 2', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({})],
    );
    dlqId2 = dlq2[0].id;
  });

  it('should bulk retry valid entries', async () => {
    const result = await bulkRetryDLQEntries([dlqId1, dlqId2], testOrgId);

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should handle mix of valid and invalid entries', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const result = await bulkRetryDLQEntries([dlqId1, fakeId], testOrgId);

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });
});

describe('markAsPermanentlyFailed', () => {
  beforeEach(async () => {
    const dlq = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 5, JSON.stringify({}), JSON.stringify({}), JSON.stringify({})],
    );
    testDlqId = dlq[0].id;
  });

  it('should mark entry as permanently failed', async () => {
    const result = await markAsPermanentlyFailed(testDlqId, testOrgId, 'Max retries exceeded');

    expect(result.success).toBe(true);

    // Verify status updated
    const updated = await query(
      `SELECT status FROM dead_letter_queue WHERE id = $1`,
      [testDlqId]
    );
    expect(updated[0].status).toBe('failed');
  });
});

describe('getEntriesReadyForRetry', () => {
  it('should return entries ready for retry', async () => {
    // Create entry ready for retry (no retry_after or past timestamp)
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status, retry_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 2, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending', new Date(Date.now() - 60000).toISOString()],
    );

    const entries = await getEntriesReadyForRetry(testOrgId);

    expect(entries.length).toBe(1);
    expect(entries[0].status).toBe('pending');
  });

  it('should not return entries with future retry_after', async () => {
    // Create entry not ready for retry
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status, retry_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 2, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending', new Date(Date.now() + 60000).toISOString()],
    );

    const entries = await getEntriesReadyForRetry(testOrgId);

    expect(entries.length).toBe(0);
  });
});

describe('analyzeDLQFailures', () => {
  beforeEach(async () => {
    // Create multiple failures
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 2, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 3, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'failed'],
    );
  });

  it('should analyze failure patterns', async () => {
    const analysis = await analyzeDLQFailures(testOrgId);

    expect(analysis.byReason).toHaveLength(1);
    expect(analysis.byReason[0].reason).toBe('Timeout');
    expect(analysis.byReason[0].count).toBe(2);

    expect(analysis.byTrigger).toHaveLength(1);
    expect(analysis.byTrigger[0].triggerName).toBe('Test Trigger');

    expect(analysis.byActionType).toHaveLength(1);
    expect(analysis.byActionType[0].actionType).toBe('send_webhook');
  });
});

describe('getDLQHealthScore', () => {
  it('should return 100 for no DLQ entries', async () => {
    const score = await getDLQHealthScore(testOrgId);
    expect(score).toBe(100);
  });

  it('should return 100 for all resolved entries', async () => {
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Resolved', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'resolved'],
    );

    const score = await getDLQHealthScore(testOrgId);
    expect(score).toBe(100);
  });

  it('should return low score for many unresolved entries', async () => {
    // 5 pending, 5 resolved = 50% unresolved
    for (let i = 0; i < 5; i++) {
      await query(
        `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [testEventId, testTriggerId, testActionId, 'Pending', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
      );
      await query(
        `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [testEventId, testTriggerId, testActionId, 'Resolved', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'resolved'],
      );
    }

    const score = await getDLQHealthScore(testOrgId);
    expect(score).toBeLessThan(50);
  });
});

describe('autoResolveOldEntries', () => {
  it('should mark old entries as failed', async () => {
    // Create old entry (>30 days)
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '31 days')`,
      [testEventId, testTriggerId, testActionId, 'Old', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );

    const count = await autoResolveOldEntries(testOrgId);

    expect(count).toBeGreaterThan(0);
  });
});
