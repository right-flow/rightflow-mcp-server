/**
 * Unit Tests for Trigger Actions API Routes (TDD - Red Phase)
 * Tests CRUD operations for trigger actions
 *
 * Test Coverage:
 * - List actions for a trigger
 * - Get single action
 * - Create action
 * - Update action
 * - Delete action
 * - Reorder actions
 * - Organization isolation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../../config/database';
import triggerActionsRouter from '../trigger-actions';

let app: Application;
let testOrgId: string;
let testOrgId2: string;
let testUserId: string;
let testTriggerId: string;
let testActionId: string;

beforeAll(async () => {
  // Create test Express app
  app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req, _res, next) => {
    req.user = {
      id: testUserId,
      organizationId: testOrgId,
      role: 'admin',
      email: 'test@actions.com',
      name: 'Test Admin',
    };
    next();
  });

  app.use('/api/v1/triggers/:triggerId/actions', triggerActionsRouter);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(
      err.toJSON ? err.toJSON() : { error: { message: err.message } }
    );
  });

  // Create test organizations
  const org1 = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-actions-org1', 'Actions Test Org 1'],
  );
  testOrgId = org1[0].id;

  const org2 = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-actions-org2', 'Actions Test Org 2'],
  );
  testOrgId2 = org2[0].id;

  // Create test user
  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_actions_test', 'clerk_actions_test', 'admin@actions.com', 'Test Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;
});

afterAll(async () => {
  // Cleanup in reverse order
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1 OR organization_id = $2)', [testOrgId, testOrgId2]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
  await query('DELETE FROM users WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
  await query('DELETE FROM organizations WHERE clerk_organization_id LIKE $1', ['test-actions-org%']);
});

beforeEach(async () => {
  // Clean actions and triggers before each test
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);

  // Create a test trigger
  const result = await query<{ id: string }>(
    `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [testOrgId, 'Test Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
  );
  testTriggerId = result[0].id;
});

describe('GET /api/v1/triggers/:triggerId/actions', () => {
  it('should return empty array when no actions', async () => {
    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/actions`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should return all actions for trigger sorted by order', async () => {
    // Create 3 actions with different orders
    await query(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4)`,
      [testTriggerId, 'send_webhook', 2, JSON.stringify({ url: 'https://example.com/2' })],
    );
    await query(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4)`,
      [testTriggerId, 'send_email', 1, JSON.stringify({ to: 'test@example.com' })],
    );
    await query(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4)`,
      [testTriggerId, 'send_sms', 3, JSON.stringify({ to: '+1234567890' })],
    );

    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/actions`)
      .expect(200);

    expect(response.body).toHaveLength(3);
    // Should be sorted by order ascending
    expect(response.body[0].action_type).toBe('send_email'); // order 1
    expect(response.body[1].action_type).toBe('send_webhook'); // order 2
    expect(response.body[2].action_type).toBe('send_sms'); // order 3
  });

  it('should return 404 for non-existent trigger', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .get(`/api/v1/triggers/${fakeId}/actions`)
      .expect(404);
  });

  it('should return 404 for trigger from different organization', async () => {
    // Create trigger for org2
    const result = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId2, 'Other Org Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );

    await request(app)
      .get(`/api/v1/triggers/${result[0].id}/actions`)
      .expect(404);
  });
});

describe('GET /api/v1/triggers/:triggerId/actions/:id', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTriggerId, 'send_webhook', 1, JSON.stringify({ url: 'https://example.com' })],
    );
    testActionId = result[0].id;
  });

  it('should return action by id', async () => {
    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/actions/${testActionId}`)
      .expect(200);

    expect(response.body.id).toBe(testActionId);
    expect(response.body.action_type).toBe('send_webhook');
    expect(response.body.config.url).toBe('https://example.com');
  });

  it('should return 404 for non-existent action', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/actions/${fakeId}`)
      .expect(404);
  });

  it('should return 404 for action from different trigger', async () => {
    // Create another trigger and action
    const otherTrigger = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Other Trigger', 'user.created', 'active', 'user_defined', testUserId],
    );
    const otherAction = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [otherTrigger[0].id, 'send_email', 1, JSON.stringify({ to: 'other@example.com' })],
    );

    await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/actions/${otherAction[0].id}`)
      .expect(404);
  });
});

describe('POST /api/v1/triggers/:triggerId/actions', () => {
  it('should create a new action', async () => {
    const newAction = {
      action_type: 'send_webhook',
      order: 1,
      config: {
        url: 'https://api.example.com/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    };

    const response = await request(app)
      .post(`/api/v1/triggers/${testTriggerId}/actions`)
      .send(newAction)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.trigger_id).toBe(testTriggerId);
    expect(response.body.action_type).toBe('send_webhook');
    expect(response.body.config.url).toBe('https://api.example.com/webhook');
  });

  it('should set default values', async () => {
    const minimalAction = {
      action_type: 'send_email',
      config: { to: 'test@example.com' },
    };

    const response = await request(app)
      .post(`/api/v1/triggers/${testTriggerId}/actions`)
      .send(minimalAction)
      .expect(201);

    expect(response.body.order).toBe(0); // default order
    expect(response.body.timeout_ms).toBe(30000); // default timeout
    expect(response.body.is_critical).toBe(false); // default is_critical
  });

  it('should validate required fields', async () => {
    const invalidAction = {
      // Missing action_type and config
      order: 1,
    };

    const response = await request(app)
      .post(`/api/v1/triggers/${testTriggerId}/actions`)
      .send(invalidAction)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it('should validate action_type enum', async () => {
    const invalidAction = {
      action_type: 'invalid_action_type',
      config: {},
    };

    const response = await request(app)
      .post(`/api/v1/triggers/${testTriggerId}/actions`)
      .send(invalidAction)
      .expect(400);

    expect(response.body.error.message).toContain('action_type');
  });

  it('should return 404 for non-existent trigger', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .post(`/api/v1/triggers/${fakeId}/actions`)
      .send({ action_type: 'send_webhook', config: {} })
      .expect(404);
  });
});

describe('PUT /api/v1/triggers/:triggerId/actions/:id', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTriggerId, 'send_webhook', 1, JSON.stringify({ url: 'https://example.com' })],
    );
    testActionId = result[0].id;
  });

  it('should update action config', async () => {
    const updates = {
      config: {
        url: 'https://updated.example.com/webhook',
        method: 'PUT',
      },
    };

    const response = await request(app)
      .put(`/api/v1/triggers/${testTriggerId}/actions/${testActionId}`)
      .send(updates)
      .expect(200);

    expect(response.body.config.url).toBe('https://updated.example.com/webhook');
    expect(response.body.config.method).toBe('PUT');
    expect(response.body.action_type).toBe('send_webhook'); // Unchanged
  });

  it('should update action order', async () => {
    const updates = { order: 5 };

    const response = await request(app)
      .put(`/api/v1/triggers/${testTriggerId}/actions/${testActionId}`)
      .send(updates)
      .expect(200);

    expect(response.body.order).toBe(5);
  });

  it('should return 404 for non-existent action', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .put(`/api/v1/triggers/${testTriggerId}/actions/${fakeId}`)
      .send({ config: {} })
      .expect(404);
  });
});

describe('DELETE /api/v1/triggers/:triggerId/actions/:id', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTriggerId, 'send_webhook', 1, JSON.stringify({ url: 'https://example.com' })],
    );
    testActionId = result[0].id;
  });

  it('should delete action', async () => {
    await request(app)
      .delete(`/api/v1/triggers/${testTriggerId}/actions/${testActionId}`)
      .expect(204);

    // Verify deleted
    await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/actions/${testActionId}`)
      .expect(404);
  });

  it('should return 404 for non-existent action', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .delete(`/api/v1/triggers/${testTriggerId}/actions/${fakeId}`)
      .expect(404);
  });
});

describe('POST /api/v1/triggers/:triggerId/actions/reorder', () => {
  let action1Id: string;
  let action2Id: string;
  let action3Id: string;

  beforeEach(async () => {
    const result1 = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTriggerId, 'send_email', 1, JSON.stringify({})],
    );
    action1Id = result1[0].id;

    const result2 = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTriggerId, 'send_webhook', 2, JSON.stringify({})],
    );
    action2Id = result2[0].id;

    const result3 = await query<{ id: string }>(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTriggerId, 'send_sms', 3, JSON.stringify({})],
    );
    action3Id = result3[0].id;
  });

  it('should reorder actions', async () => {
    // Reverse the order
    const newOrder = [
      { id: action3Id, order: 1 },
      { id: action2Id, order: 2 },
      { id: action1Id, order: 3 },
    ];

    await request(app)
      .post(`/api/v1/triggers/${testTriggerId}/actions/reorder`)
      .send({ actions: newOrder })
      .expect(200);

    // Verify new order
    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/actions`)
      .expect(200);

    expect(response.body[0].id).toBe(action3Id);
    expect(response.body[1].id).toBe(action2Id);
    expect(response.body[2].id).toBe(action1Id);
  });

  it('should validate reorder request', async () => {
    const invalidOrder = {
      // Missing actions array
    };

    await request(app)
      .post(`/api/v1/triggers/${testTriggerId}/actions/reorder`)
      .send(invalidOrder)
      .expect(400);
  });
});
