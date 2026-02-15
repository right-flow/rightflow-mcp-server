/**
 * Integration Tests for DLQ API
 * Tests dead letter queue operations with database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../../../config/database';
import dlqRouter from '../../dlq';

let app: Application;
let testOrgId: string;
let testUserId: string;
let testTriggerId: string;
let testActionId: string;
let testEventId: string;

beforeAll(async () => {
  const org = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-dlq-int-org', 'DLQ Integration Org'],
  );
  testOrgId = org[0].id;

  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_dlq_int', 'clerk_dlq_int', 'admin@dlqint.com', 'DLQ Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;

  // Setup app
  app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    req.user = {
      id: testUserId,
      organizationId: testOrgId,
      role: 'admin',
      email: 'admin@dlqint.com',
      name: 'DLQ Admin',
    };
    next();
  });

  app.use('/api/v1/dlq', dlqRouter);

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(
      err.toJSON ? err.toJSON() : { error: { message: err.message } }
    );
  });
});

afterAll(async () => {
  await query('DELETE FROM dead_letter_queue WHERE event_id IN (SELECT id FROM events WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM events WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM users WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM organizations WHERE clerk_organization_id = $1', ['test-dlq-int-org']);
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

describe('DLQ API Integration - Stats endpoint', () => {
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
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Failed', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'failed'],
    );

    const response = await request(app)
      .get('/api/v1/dlq/stats')
      .expect(200);

    expect(response.body.total).toBe(3);
    expect(response.body.pending).toBe(1);
    expect(response.body.resolved).toBe(1);
    expect(response.body.failed).toBe(1);
  });

  it('should return zero stats when no DLQ entries', async () => {
    const response = await request(app)
      .get('/api/v1/dlq/stats')
      .expect(200);

    expect(response.body.total).toBe(0);
    expect(response.body.pending).toBe(0);
    expect(response.body.resolved).toBe(0);
  });
});

describe('DLQ API Integration - List and filter', () => {
  beforeEach(async () => {
    // Create test DLQ entries
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
  });

  it('should list all DLQ entries', async () => {
    const response = await request(app)
      .get('/api/v1/dlq')
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it('should filter by status', async () => {
    const response = await request(app)
      .get('/api/v1/dlq?status=pending')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('pending');
  });
});

describe('DLQ API Integration - Retry operations', () => {
  let dlqId: string;

  beforeEach(async () => {
    const dlq = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Timeout', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );
    dlqId = dlq[0].id;
  });

  it('should retry single DLQ entry', async () => {
    const response = await request(app)
      .post(`/api/v1/dlq/${dlqId}/retry`)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify status updated in database
    const updated = await query(
      `SELECT status FROM dead_letter_queue WHERE id = $1`,
      [dlqId]
    );
    expect(updated[0].status).toBe('processing');
  });

  it('should return 404 for non-existent DLQ entry', async () => {
    await request(app)
      .post('/api/v1/dlq/00000000-0000-0000-0000-000000000000/retry')
      .expect(404);
  });
});

describe('DLQ API Integration - Bulk retry', () => {
  let dlqId1: string;
  let dlqId2: string;

  beforeEach(async () => {
    const dlq1 = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Error 1', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );
    dlqId1 = dlq1[0].id;

    const dlq2 = await query<{ id: string }>(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [testEventId, testTriggerId, testActionId, 'Error 2', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );
    dlqId2 = dlq2[0].id;
  });

  it('should bulk retry valid entries', async () => {
    const response = await request(app)
      .post('/api/v1/dlq/bulk-retry')
      .send({ ids: [dlqId1, dlqId2] })
      .expect(200);

    expect(response.body.succeeded).toBe(2);
    expect(response.body.failed).toBe(0);

    // Verify both updated in database
    const updated1 = await query(
      `SELECT status FROM dead_letter_queue WHERE id = $1`,
      [dlqId1]
    );
    expect(updated1[0].status).toBe('processing');

    const updated2 = await query(
      `SELECT status FROM dead_letter_queue WHERE id = $1`,
      [dlqId2]
    );
    expect(updated2[0].status).toBe('processing');
  });

  it('should handle mix of valid and invalid entries', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app)
      .post('/api/v1/dlq/bulk-retry')
      .send({ ids: [dlqId1, fakeId] })
      .expect(200);

    expect(response.body.succeeded).toBe(1);
    expect(response.body.failed).toBe(1);
  });

  it('should validate ids array is required', async () => {
    await request(app)
      .post('/api/v1/dlq/bulk-retry')
      .send({})
      .expect(400);
  });
});

describe('DLQ API Integration - Multi-org isolation', () => {
  let org2Id: string;
  let user2Id: string;
  let app2: Application;

  beforeAll(async () => {
    // Create second organization
    const org2 = await query<{ id: string }>(
      `INSERT INTO organizations (clerk_organization_id, name)
       VALUES ($1, $2) RETURNING id`,
      ['test-dlq-int-org2', 'DLQ Integration Org 2'],
    );
    org2Id = org2[0].id;

    const user2 = await query<{ id: string }>(
      `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['clerk_dlq_int2', 'clerk_dlq_int2', 'admin2@dlqint.com', 'DLQ Admin 2', org2Id, 'admin'],
    );
    user2Id = user2[0].id;

    // Setup second app
    app2 = express();
    app2.use(express.json());

    app2.use((req, _res, next) => {
      req.user = {
        id: user2Id,
        organizationId: org2Id,
        role: 'admin',
        email: 'admin2@dlqint.com',
        name: 'DLQ Admin 2',
      };
      next();
    });

    app2.use('/api/v1/dlq', dlqRouter);

    app2.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode || 500).json(
        err.toJSON ? err.toJSON() : { error: { message: err.message } }
      );
    });
  });

  afterAll(async () => {
    await query('DELETE FROM dead_letter_queue WHERE event_id IN (SELECT id FROM events WHERE organization_id = $1)', [org2Id]);
    await query('DELETE FROM events WHERE organization_id = $1', [org2Id]);
    await query('DELETE FROM users WHERE organization_id = $1', [org2Id]);
    await query('DELETE FROM organizations WHERE clerk_organization_id = $1', ['test-dlq-int-org2']);
  });

  it('should isolate DLQ entries between organizations', async () => {
    // Org 1 creates DLQ entry
    await query(
      `INSERT INTO dead_letter_queue (event_id, trigger_id, action_id, failure_reason, failure_count, last_error, event_snapshot, action_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testEventId, testTriggerId, testActionId, 'Org 1 Error', 1, JSON.stringify({}), JSON.stringify({}), JSON.stringify({}), 'pending'],
    );

    // Org 1 should see their DLQ entry
    const response1 = await request(app)
      .get('/api/v1/dlq')
      .expect(200);

    expect(response1.body).toHaveLength(1);
    expect(response1.body[0].failure_reason).toBe('Org 1 Error');

    // Org 2 should see empty list
    const response2 = await request(app2)
      .get('/api/v1/dlq')
      .expect(200);

    expect(response2.body).toHaveLength(0);
  });
});
