/**
 * Unit Tests for Action Executions API Routes (TDD - Red Phase)
 * Tests for viewing execution history and logs
 *
 * Test Coverage:
 * - List executions for a trigger
 * - Get single execution details
 * - Filter executions (status, date range)
 * - Execution statistics
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../../config/database';
import executionsRouter from '../executions';

let app: Application;
let testOrgId: string;
let testUserId: string;
let testTriggerId: string;
let testActionId: string;
let testEventId: string;
let testExecutionId: string;

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
      email: 'test@executions.com',
      name: 'Test Admin',
    };
    next();
  });

  app.use('/api/v1/triggers/:triggerId/executions', executionsRouter);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(
      err.toJSON ? err.toJSON() : { error: { message: err.message } }
    );
  });

  // Create test organization
  const org = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-executions-org', 'Executions Test Org'],
  );
  testOrgId = org[0].id;

  // Create test user
  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_exec_test', 'clerk_exec_test', 'admin@exec.com', 'Test Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;
});

afterAll(async () => {
  // Cleanup
  await query('DELETE FROM action_executions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM users WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM organizations WHERE clerk_organization_id = $1', ['test-executions-org']);
});

beforeEach(async () => {
  // Clean before each test
  await query('DELETE FROM action_executions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);

  // Create test trigger
  const trigger = await query<{ id: string }>(
    `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [testOrgId, 'Test Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
  );
  testTriggerId = trigger[0].id;

  // Create test action
  const action = await query<{ id: string }>(
    `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [testTriggerId, 'send_webhook', 1, JSON.stringify({ url: 'https://example.com' })],
  );
  testActionId = action[0].id;

  // Create test event
  const event = await query<{ id: string }>(
    `INSERT INTO events (organization_id, event_type, entity_type, entity_id, user_id, data)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [testOrgId, 'form.submitted', 'form', testTriggerId, testUserId, JSON.stringify({ test: 'data' })],
  );
  testEventId = event[0].id;
});

describe('GET /api/v1/triggers/:triggerId/executions', () => {
  it('should return empty array when no executions', async () => {
    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/executions`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should return all executions for trigger', async () => {
    // Create 3 executions
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
    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
       VALUES ($1, $2, $3, $4)`,
      [testEventId, testTriggerId, testActionId, 'pending'],
    );

    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/executions`)
      .expect(200);

    expect(response.body).toHaveLength(3);
    expect(response.body[0]).toHaveProperty('status');
  });

  it('should filter executions by status', async () => {
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

    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/executions?status=success`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('success');
  });

  it('should sort executions by created_at descending', async () => {
    const exec1 = await query<{ id: string }>(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status, created_at)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 hours') RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'success'],
    );
    const exec2 = await query<{ id: string }>(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'success'],
    );

    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/executions`)
      .expect(200);

    // Most recent first
    expect(response.body[0].id).toBe(exec2[0].id);
    expect(response.body[1].id).toBe(exec1[0].id);
  });

  it('should paginate results', async () => {
    // Create 25 executions
    for (let i = 0; i < 25; i++) {
      await query(
        `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
         VALUES ($1, $2, $3, $4)`,
        [testEventId, testTriggerId, testActionId, 'success'],
      );
    }

    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/executions?limit=10&offset=0`)
      .expect(200);

    expect(response.body).toHaveLength(10);
  });
});

describe('GET /api/v1/triggers/:triggerId/executions/:id', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status, response, error)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        testEventId,
        testTriggerId,
        testActionId,
        'success',
        JSON.stringify({ statusCode: 200, body: 'OK' }),
        null,
      ],
    );
    testExecutionId = result[0].id;
  });

  it('should return execution details', async () => {
    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/executions/${testExecutionId}`)
      .expect(200);

    expect(response.body.id).toBe(testExecutionId);
    expect(response.body.status).toBe('success');
    expect(response.body.response).toBeDefined();
  });

  it('should return 404 for non-existent execution', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/executions/${fakeId}`)
      .expect(404);
  });
});

describe('GET /api/v1/triggers/:triggerId/executions/stats', () => {
  beforeEach(async () => {
    // Create executions with different statuses
    await query(
      `INSERT INTO action_executions (event_id, trigger_id, action_id, status)
       VALUES ($1, $2, $3, $4)`,
      [testEventId, testTriggerId, testActionId, 'success'],
    );
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
  });

  it('should return execution statistics', async () => {
    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}/executions/stats`)
      .expect(200);

    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('failed');
    expect(response.body).toHaveProperty('successRate');
    expect(response.body.total).toBe(3);
    expect(response.body.success).toBe(2);
    expect(response.body.failed).toBe(1);
  });
});
