/**
 * Unit Tests for Trigger Service (TDD)
 * Tests business logic layer
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { query } from '../../config/database';
import {
  getTriggerWithDetails,
  validateTriggerConfig,
  validateActionConfig,
  getTriggerHealth,
  getOrganizationTriggerStats,
  cloneTrigger,
  bulkToggleTriggers,
} from '../triggerService';

let testOrgId: string;
let testUserId: string;
let testTriggerId: string;
let testActionId: string;
let testEventId: string;

beforeAll(async () => {
  const org = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-service-org', 'Service Test Org'],
  );
  testOrgId = org[0].id;

  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_svc_test', 'clerk_svc_test', 'admin@svc.com', 'Test Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;
});

afterAll(async () => {
  await query('DELETE FROM action_executions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM users WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM organizations WHERE clerk_organization_id = $1', ['test-service-org']);
});

beforeEach(async () => {
  await query('DELETE FROM action_executions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);
});

describe('getTriggerWithDetails', () => {
  beforeEach(async () => {
    const trigger = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Test Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    testTriggerId = trigger[0].id;

    const action = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
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

    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
       VALUES ($1, $2, $3, $4)`,
      [testEventId, testTriggerId, testActionId, 'success'],
    );
  });

  it('should return trigger with actions and statistics', async () => {
    const result = await getTriggerWithDetails(testTriggerId, testOrgId);

    expect(result).toBeDefined();
    expect(result?.name).toBe('Test Trigger');
    expect(result?.actions).toHaveLength(1);
    expect(result?.statistics).toBeDefined();
    expect(result?.statistics.totalExecutions).toBe(1);
  });

  it('should return null for non-existent trigger', async () => {
    const result = await getTriggerWithDetails('00000000-0000-0000-0000-000000000000', testOrgId);
    expect(result).toBeNull();
  });
});

describe('validateTriggerConfig', () => {
  it('should validate valid trigger config', () => {
    const config = {
      name: 'Valid Trigger',
      event_type: 'form.submitted' as const,
      priority: 100,
      conditions: [
        { field: 'event.data.email', operator: 'contains' as const, value: '@example.com' },
      ],
    };

    const result = validateTriggerConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject trigger name over 255 characters', () => {
    const config = {
      name: 'a'.repeat(256),
    };

    const result = validateTriggerConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Trigger name must be 255 characters or less');
  });

  it('should reject invalid priority', () => {
    const config = {
      priority: 1001,
    };

    const result = validateTriggerConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Priority must be between 0 and 1000');
  });

  it('should reject conditions missing required fields', () => {
    const config = {
      conditions: [
        { field: 'email', operator: undefined, value: 'test' },
      ],
    };

    const result = validateTriggerConfig(config as any);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateActionConfig', () => {
  it('should validate valid webhook action', () => {
    const config = {
      action_type: 'send_webhook',
      config: { url: 'https://example.com/webhook' },
    };

    const result = validateActionConfig(config as any);
    expect(result.valid).toBe(true);
  });

  it('should reject webhook without URL', () => {
    const config = {
      action_type: 'send_webhook',
      config: {},
    };

    const result = validateActionConfig(config as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Webhook action requires a URL');
  });

  it('should reject email without recipient', () => {
    const config = {
      action_type: 'send_email',
      config: { subject: 'Test' },
    };

    const result = validateActionConfig(config as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Email action requires a recipient (to)');
  });

  it('should reject timeout under 1 second', () => {
    const config = {
      timeout_ms: 500,
    };

    const result = validateActionConfig(config as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Timeout must be at least 1000ms (1 second)');
  });
});

describe('getTriggerHealth', () => {
  beforeEach(async () => {
    const trigger = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Health Test', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    testTriggerId = trigger[0].id;

    const action = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTriggerId, 'send_webhook', 1, JSON.stringify({})],
    );
    testActionId = action[0].id;

    const event = await query<{ id: string }>(
      `INSERT INTO events (organization_id, event_type, entity_type, entity_id, data)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [testOrgId, 'form.submitted', 'form', testTriggerId, JSON.stringify({})],
    );
    testEventId = event[0].id;
  });

  it('should return healthy for 100% success rate', async () => {
    // Create 10 successful executions
    for (let i = 0; i < 10; i++) {
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'success'],
      );
    }

    const health = await getTriggerHealth(testTriggerId);
    expect(health.status).toBe('healthy');
    expect(health.successRate).toBe(100);
    expect(health.recentFailures).toBe(0);
  });

  it('should return degraded for 85% success rate', async () => {
    // 17 successes, 3 failures = 85% success
    for (let i = 0; i < 17; i++) {
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

    const health = await getTriggerHealth(testTriggerId);
    expect(health.status).toBe('degraded');
    expect(health.successRate).toBe(85);
  });

  it('should return unhealthy for low success rate', async () => {
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

    const health = await getTriggerHealth(testTriggerId);
    expect(health.status).toBe('unhealthy');
  });

  it('should return unknown for no executions', async () => {
    const health = await getTriggerHealth(testTriggerId);
    expect(health.status).toBe('unknown');
  });
});

describe('cloneTrigger', () => {
  beforeEach(async () => {
    const trigger = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Original Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    testTriggerId = trigger[0].id;

    await query(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4)`,
      [testTriggerId, 'send_webhook', 1, JSON.stringify({ url: 'https://example.com' })],
    );
  });

  it('should clone trigger with new name', async () => {
    const cloned = await cloneTrigger(testTriggerId, testOrgId, testUserId, 'Cloned Trigger');

    expect(cloned).toBeDefined();
    expect(cloned?.name).toBe('Cloned Trigger');
    expect(cloned?.status).toBe('inactive'); // Starts inactive
    expect(cloned?.id).not.toBe(testTriggerId);
  });

  it('should clone trigger with default name', async () => {
    const cloned = await cloneTrigger(testTriggerId, testOrgId, testUserId);

    expect(cloned?.name).toBe('Original Trigger (Copy)');
  });

  it('should clone all actions', async () => {
    const cloned = await cloneTrigger(testTriggerId, testOrgId, testUserId);

    const actions = await query(
      `SELECT * FROM trigger_actions WHERE trigger_id = $1`,
      [cloned?.id]
    );

    expect(actions).toHaveLength(1);
  });
});

describe('bulkToggleTriggers', () => {
  let trigger1Id: string;
  let trigger2Id: string;

  beforeEach(async () => {
    const t1 = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Trigger 1', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    trigger1Id = t1[0].id;

    const t2 = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Trigger 2', 'user.created', 'active', 'user_defined', testUserId],
    );
    trigger2Id = t2[0].id;
  });

  it('should bulk disable triggers', async () => {
    const result = await bulkToggleTriggers([trigger1Id, trigger2Id], testOrgId, 'inactive');

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);

    const triggers = await query(
      `SELECT status FROM event_triggers WHERE id IN ($1, $2)`,
      [trigger1Id, trigger2Id]
    );

    triggers.forEach(t => expect(t.status).toBe('inactive'));
  });

  it('should handle non-existent triggers', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const result = await bulkToggleTriggers([trigger1Id, fakeId], testOrgId, 'inactive');

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });
});
