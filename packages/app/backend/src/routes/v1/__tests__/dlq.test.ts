/**
 * Unit Tests for Dead Letter Queue API Routes (TDD - Red Phase)
 * Tests for viewing and managing failed actions
 *
 * Test Coverage:
 * - List DLQ entries
 * - Get DLQ entry details
 * - Retry single entry
 * - Bulk retry entries
 * - Mark as failed permanently
 * - DLQ statistics
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../../config/database';
import dlqRouter from '../dlq';

let app: Application;
let testOrgId: string;
let testUserId: string;
let testEventId: string;
let testTriggerId: string;
let testActionId: string;
let testDlqId: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    req.user = {
      id: testUserId,
      organizationId: testOrgId,
      role: 'admin',
      email: 'test@dlq.com',
      name: 'Test Admin',
    };
    next();
  });

  app.use('/api/v1/dlq', dlqRouter);

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(
      err.toJSON ? err.toJSON() : { error: { message: err.message } }
    );
  });

  const org = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-dlq-org', 'DLQ Test Org'],
  );
  testOrgId = org[0].id;

  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_dlq_test', 'clerk_dlq_test', 'admin@dlq.com', 'Test Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;
});

afterAll(async () => {
  await query('DELETE FROM dead_letter_queue WHERE event_id IN (SELECT id FROM events WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM users WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM organizations WHERE clerk_organization_id = $1', ['test-dlq-org']);
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
    `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [testTriggerId, 'send_webhook', 1, JSON.stringify({ url: 'https://example.com' })],
  );
  testActionId = action[0].id;

  const event = await query<{ id: string }>(
    `INSERT INTO events (organization_id, event_type, entity_type, entity_id, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [testOrgId, 'form.submitted', 'form', testTriggerId, JSON.stringify({ test: 'data' })],
  );
  testEventId = event[0].id;
});

describe('GET /api/v1/dlq', () => {
  it('should return empty array when no DLQ entries', async () => {
    const response = await request(app)
      .get('/api/v1/dlq')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should return all DLQ entries for organization', async () => {
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 1, JSON.stringify({ message: 'Timeout' }), JSON.stringify({}), JSON.stringify({})],
    );

    const response = await request(app)
      .get('/api/v1/dlq')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].failure_reason).toBe('Timeout');
  });

  it('should filter by status', async () => {
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Error', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Error', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'resolved'],
    );

    const response = await request(app)
      .get('/api/v1/dlq?status=pending')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('pending');
  });
});

describe('POST /api/v1/dlq/:id/retry', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 1, JSON.stringify({ message: 'Timeout' }), JSON.stringify({}), JSON.stringify({})],
    );
    testDlqId = result[0].id;
  });

  it('should retry DLQ entry', async () => {
    const response = await request(app)
      .post(`/api/v1/dlq/${testDlqId}/retry`)
      .expect(200);

    expect(response.body).toHaveProperty('success');
  });

  it('should return 404 for non-existent entry', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .post(`/api/v1/dlq/${fakeId}/retry`)
      .expect(404);
  });
});

describe('POST /api/v1/dlq/bulk-retry', () => {
  let dlqId1: string;
  let dlqId2: string;

  beforeEach(async () => {
    const result1 = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Error 1', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({})],
    );
    dlqId1 = result1[0].id;

    const result2 = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Error 2', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({})],
    );
    dlqId2 = result2[0].id;
  });

  it('should bulk retry DLQ entries', async () => {
    const response = await request(app)
      .post('/api/v1/dlq/bulk-retry')
      .send({ ids: [dlqId1, dlqId2] })
      .expect(200);

    expect(response.body).toHaveProperty('succeeded');
    expect(response.body).toHaveProperty('failed');
  });

  it('should validate ids array', async () => {
    await request(app)
      .post('/api/v1/dlq/bulk-retry')
      .send({})
      .expect(400);
  });
});

describe('GET /api/v1/dlq/stats', () => {
  beforeEach(async () => {
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Error', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Error', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'resolved'],
    );
  });

  it('should return DLQ statistics', async () => {
    const response = await request(app)
      .get('/api/v1/dlq/stats')
      .expect(200);

    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('pending');
    expect(response.body).toHaveProperty('resolved');
    expect(response.body.total).toBe(2);
    expect(response.body.pending).toBe(1);
    expect(response.body.resolved).toBe(1);
  });
});
