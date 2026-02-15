/**
 * Unit Tests for Executions Service
 * Tests analytics and monitoring logic
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { query } from '../../config/database';
import {
  getTriggerExecutionStats,
  getActionExecutionStats,
  getOrganizationExecutionStats,
  getExecutionTimeline,
  getSlowestActions,
  getMostFailedActions,
  getRecentExecutionErrors,
  calculateExecutionHealthScore,
} from '../executionsService';

let testOrgId: string;
let testUserId: string;
let testTriggerId: string;
let testActionId: string;
let testEventId: string;

beforeAll(async () => {
  const org = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-exec-service-org', 'Exec Service Test Org'],
  );
  testOrgId = org[0].id;

  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_exec_svc', 'clerk_exec_svc', 'admin@execsvc.com', 'Test Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;
});

afterAll(async () => {
  await query('DELETE FROM action_executions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM users WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM organizations WHERE clerk_organization_id = $1', ['test-exec-service-org']);
});

beforeEach(async () => {
  await query('DELETE FROM action_executions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
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

describe('getTriggerExecutionStats', () => {
  it('should return statistics for trigger with executions', async () => {
    // Create 7 successes, 3 failures
    for (let i = 0; i < 7; i++) {
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'success'],
      );
    }
    for (let i = 0; i < 3; i++) {
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'failed'],
      );
    }

    const stats = await getTriggerExecutionStats(testTriggerId);

    expect(stats.total).toBe(10);
    expect(stats.success).toBe(7);
    expect(stats.failed).toBe(3);
    expect(stats.pending).toBe(0);
    expect(stats.successRate).toBe(70);
  });

  it('should return zero stats for trigger with no executions', async () => {
    const stats = await getTriggerExecutionStats(testTriggerId);

    expect(stats.total).toBe(0);
    expect(stats.success).toBe(0);
    expect(stats.failed).toBe(0);
    expect(stats.successRate).toBe(0);
  });
});

describe('getActionExecutionStats', () => {
  it('should return statistics including average duration', async () => {
    // Create executions with timing
    const now = new Date();
    const twoSecondsAgo = new Date(now.getTime() - 2000);

    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testEventId, testTriggerId, testActionId, 'success', twoSecondsAgo.toISOString(), now.toISOString()],
    );

    const stats = await getActionExecutionStats(testActionId);

    expect(stats.total).toBe(1);
    expect(stats.success).toBe(1);
    expect(stats.avgDurationSeconds).toBeGreaterThan(1.5);
    expect(stats.avgDurationSeconds).toBeLessThan(2.5);
  });
});

describe('getOrganizationExecutionStats', () => {
  it('should aggregate stats across all triggers', async () => {
    // Create second trigger
    const trigger2 = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Trigger 2', 'user.created', 'active', 'user_defined', testUserId],
    );

    const action2 = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, \"order\", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [trigger2[0].id, 'send_email', 1, JSON.stringify({ to: 'test@example.com' })],
    );

    // Add executions for both triggers
    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
       VALUES ($1, $2, $3, $4)`,
      [testEventId, testTriggerId, testActionId, 'success'],
    );
    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
       VALUES ($1, $2, $3, $4)`,
      [testEventId, trigger2[0].id, action2[0].id, 'failed'],
    );

    const stats = await getOrganizationExecutionStats(testOrgId);

    expect(stats.total).toBe(2);
    expect(stats.success).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.activeTriggers).toBe(2);
    expect(stats.successRate).toBe(50);
  });
});

describe('getExecutionTimeline', () => {
  it('should return hourly aggregation', async () => {
    // Create executions
    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
       VALUES ($1, $2, $3, $4)`,
      [testEventId, testTriggerId, testActionId, 'success'],
    );

    const timeline = await getExecutionTimeline(testOrgId, 24);

    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0]).toHaveProperty('hour');
    expect(timeline[0]).toHaveProperty('total');
    expect(timeline[0]).toHaveProperty('success');
  });
});

describe('getSlowestActions', () => {
  it('should return actions sorted by duration', async () => {
    const now = new Date();
    const threeSecondsAgo = new Date(now.getTime() - 3000);

    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testEventId, testTriggerId, testActionId, 'success', threeSecondsAgo.toISOString(), now.toISOString()],
    );

    const slowest = await getSlowestActions(testOrgId, 10);

    expect(Array.isArray(slowest)).toBe(true);
    if (slowest.length > 0) {
      expect(slowest[0]).toHaveProperty('avgDurationSeconds');
      expect(slowest[0].avgDurationSeconds).toBeGreaterThan(2);
    }
  });
});

describe('getMostFailedActions', () => {
  it('should return actions with highest failure counts', async () => {
    // Create failures
    for (let i = 0; i < 5; i++) {
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'failed'],
      );
    }

    const failed = await getMostFailedActions(testOrgId, 10);

    expect(Array.isArray(failed)).toBe(true);
    if (failed.length > 0) {
      expect(failed[0]).toHaveProperty('failureCount');
      expect(failed[0].failureCount).toBe(5);
    }
  });
});

describe('getRecentExecutionErrors', () => {
  it('should return recent failed executions with error details', async () => {
    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status, error)
       VALUES ($1, $2, $3, $4, $5)`,
      [testEventId, testTriggerId, testActionId, 'failed', JSON.stringify({ message: 'Timeout' })],
    );

    const errors = await getRecentExecutionErrors(testOrgId, 20);

    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBe(1);
    expect(errors[0].status).toBe('failed');
    expect(errors[0].error).toBeTruthy();
  });
});

describe('calculateExecutionHealthScore', () => {
  it('should return 100 for 95%+ success rate', async () => {
    // 19 successes, 1 failure = 95%
    for (let i = 0; i < 19; i++) {
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'success'],
      );
    }
    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
       VALUES ($1, $2, $3, $4)`,
      [testEventId, testTriggerId, testActionId, 'failed'],
    );

    const score = await calculateExecutionHealthScore(testOrgId);

    expect(score).toBe(100);
  });

  it('should return 90 for 90% success rate', async () => {
    // 9 successes, 1 failure = 90%
    for (let i = 0; i < 9; i++) {
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'success'],
      );
    }
    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
       VALUES ($1, $2, $3, $4)`,
      [testEventId, testTriggerId, testActionId, 'failed'],
    );

    const score = await calculateExecutionHealthScore(testOrgId);

    expect(score).toBe(90);
  });

  it('should return 100 for no executions', async () => {
    const score = await calculateExecutionHealthScore(testOrgId);

    expect(score).toBe(100);
  });

  it('should return low score for poor success rate', async () => {
    // 5 successes, 5 failures = 50%
    for (let i = 0; i < 5; i++) {
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'success'],
      );
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'failed'],
      );
    }

    const score = await calculateExecutionHealthScore(testOrgId);

    expect(score).toBeLessThan(50);
  });
});
