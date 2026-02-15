/**
 * Integration Tests for Triggers API
 * Tests complete request-response cycle with database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../../../config/database';
import triggersRouter from '../../triggers';

let app: Application;
let testOrg1Id: string;
let testOrg2Id: string;
let testUser1Id: string;
let testUser2Id: string;

beforeAll(async () => {
  // Create two organizations for isolation testing
  const org1 = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-triggers-int-org1', 'Triggers Integration Org 1'],
  );
  testOrg1Id = org1[0].id;

  const org2 = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-triggers-int-org2', 'Triggers Integration Org 2'],
  );
  testOrg2Id = org2[0].id;

  // Create users for each organization
  const user1 = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_int1', 'clerk_int1', 'user1@int.com', 'User 1', testOrg1Id, 'admin'],
  );
  testUser1Id = user1[0].id;

  const user2 = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_int2', 'clerk_int2', 'user2@int.com', 'User 2', testOrg2Id, 'admin'],
  );
  testUser2Id = user2[0].id;
});

afterAll(async () => {
  // Cleanup
  await query('DELETE FROM action_executions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id IN ($1, $2))', [testOrg1Id, testOrg2Id]);
  await query('DELETE FROM events WHERE organization_id IN ($1, $2)', [testOrg1Id, testOrg2Id]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id IN ($1, $2))', [testOrg1Id, testOrg2Id]);
  await query('DELETE FROM event_triggers WHERE organization_id IN ($1, $2)', [testOrg1Id, testOrg2Id]);
  await query('DELETE FROM users WHERE organization_id IN ($1, $2)', [testOrg1Id, testOrg2Id]);
  await query('DELETE FROM organizations WHERE clerk_organization_id IN ($1, $2)', ['test-triggers-int-org1', 'test-triggers-int-org2']);
});

beforeEach(async () => {
  // Clean triggers between tests
  await query('DELETE FROM action_executions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id IN ($1, $2))', [testOrg1Id, testOrg2Id]);
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id IN ($1, $2))', [testOrg1Id, testOrg2Id]);
  await query('DELETE FROM event_triggers WHERE organization_id IN ($1, $2)', [testOrg1Id, testOrg2Id]);
});

function createApp(organizationId: string, userId: string): Application {
  const testApp = express();
  testApp.use(express.json());

  testApp.use((req, _res, next) => {
    req.user = {
      id: userId,
      organizationId,
      role: 'admin',
      email: 'test@integration.com',
      name: 'Test User',
    };
    next();
  });

  testApp.use('/api/v1/triggers', triggersRouter);

  testApp.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(
      err.toJSON ? err.toJSON() : { error: { message: err.message } }
    );
  });

  return testApp;
}

describe('Triggers API Integration - Multi-org isolation', () => {
  it('should isolate triggers between organizations', async () => {
    const app1 = createApp(testOrg1Id, testUser1Id);
    const app2 = createApp(testOrg2Id, testUser2Id);

    // Org 1 creates a trigger
    const response1 = await request(app1)
      .post('/api/v1/triggers')
      .send({
        name: 'Org 1 Trigger',
        event_type: 'form.submitted',
        status: 'active',
      })
      .expect(201);

    const triggerId1 = response1.body.id;

    // Org 2 creates a trigger
    const response2 = await request(app2)
      .post('/api/v1/triggers')
      .send({
        name: 'Org 2 Trigger',
        event_type: 'user.created',
        status: 'active',
      })
      .expect(201);

    const triggerId2 = response2.body.id;

    // Org 1 should only see their trigger
    const listResponse1 = await request(app1)
      .get('/api/v1/triggers')
      .expect(200);

    expect(listResponse1.body).toHaveLength(1);
    expect(listResponse1.body[0].id).toBe(triggerId1);
    expect(listResponse1.body[0].name).toBe('Org 1 Trigger');

    // Org 2 should only see their trigger
    const listResponse2 = await request(app2)
      .get('/api/v1/triggers')
      .expect(200);

    expect(listResponse2.body).toHaveLength(1);
    expect(listResponse2.body[0].id).toBe(triggerId2);
    expect(listResponse2.body[0].name).toBe('Org 2 Trigger');

    // Org 1 should not be able to access Org 2's trigger
    await request(app1)
      .get(`/api/v1/triggers/${triggerId2}`)
      .expect(404);

    // Org 2 should not be able to access Org 1's trigger
    await request(app2)
      .get(`/api/v1/triggers/${triggerId1}`)
      .expect(404);
  });
});

describe('Triggers API Integration - CRUD operations', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp(testOrg1Id, testUser1Id);
  });

  it('should complete full CRUD lifecycle', async () => {
    // CREATE
    const createResponse = await request(app)
      .post('/api/v1/triggers')
      .send({
        name: 'CRUD Test Trigger',
        event_type: 'form.submitted',
        status: 'active',
        priority: 100,
        conditions: [
          { field: 'event.data.email', operator: 'contains', value: '@example.com' },
        ],
      })
      .expect(201);

    const triggerId = createResponse.body.id;
    expect(createResponse.body.name).toBe('CRUD Test Trigger');
    expect(createResponse.body.priority).toBe(100);

    // READ - Single
    const getResponse = await request(app)
      .get(`/api/v1/triggers/${triggerId}`)
      .expect(200);

    expect(getResponse.body.id).toBe(triggerId);
    expect(getResponse.body.name).toBe('CRUD Test Trigger');

    // READ - List
    const listResponse = await request(app)
      .get('/api/v1/triggers')
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].id).toBe(triggerId);

    // UPDATE
    const updateResponse = await request(app)
      .put(`/api/v1/triggers/${triggerId}`)
      .send({
        name: 'Updated Trigger Name',
        priority: 200,
      })
      .expect(200);

    expect(updateResponse.body.name).toBe('Updated Trigger Name');
    expect(updateResponse.body.priority).toBe(200);

    // TOGGLE
    const toggleResponse = await request(app)
      .patch(`/api/v1/triggers/${triggerId}/toggle`)
      .expect(200);

    expect(toggleResponse.body.status).toBe('inactive');

    // Toggle back
    const toggleBackResponse = await request(app)
      .patch(`/api/v1/triggers/${triggerId}/toggle`)
      .expect(200);

    expect(toggleBackResponse.body.status).toBe('active');

    // DELETE
    await request(app)
      .delete(`/api/v1/triggers/${triggerId}`)
      .expect(204);

    // Verify deletion
    await request(app)
      .get(`/api/v1/triggers/${triggerId}`)
      .expect(404);

    // Verify list is empty
    const emptyListResponse = await request(app)
      .get('/api/v1/triggers')
      .expect(200);

    expect(emptyListResponse.body).toHaveLength(0);
  });
});

describe('Triggers API Integration - Filtering', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp(testOrg1Id, testUser1Id);
  });

  beforeEach(async () => {
    // Create test triggers
    await request(app)
      .post('/api/v1/triggers')
      .send({
        name: 'Active Form Trigger',
        event_type: 'form.submitted',
        status: 'active',
      });

    await request(app)
      .post('/api/v1/triggers')
      .send({
        name: 'Inactive User Trigger',
        event_type: 'user.created',
        status: 'inactive',
      });

    await request(app)
      .post('/api/v1/triggers')
      .send({
        name: 'Active User Trigger',
        event_type: 'user.created',
        status: 'active',
      });
  });

  it('should filter by status', async () => {
    const response = await request(app)
      .get('/api/v1/triggers?status=active')
      .expect(200);

    expect(response.body).toHaveLength(2);
    response.body.forEach((trigger: any) => {
      expect(trigger.status).toBe('active');
    });
  });

  it('should filter by event_type', async () => {
    const response = await request(app)
      .get('/api/v1/triggers?event_type=user.created')
      .expect(200);

    expect(response.body).toHaveLength(2);
    response.body.forEach((trigger: any) => {
      expect(trigger.event_type).toBe('user.created');
    });
  });

  it('should filter by search term', async () => {
    const response = await request(app)
      .get('/api/v1/triggers?search=Form')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Active Form Trigger');
  });

  it('should combine filters', async () => {
    const response = await request(app)
      .get('/api/v1/triggers?status=active&event_type=user.created')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Active User Trigger');
  });
});

describe('Triggers API Integration - Validation', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp(testOrg1Id, testUser1Id);
  });

  it('should reject trigger without name', async () => {
    await request(app)
      .post('/api/v1/triggers')
      .send({
        event_type: 'form.submitted',
      })
      .expect(400);
  });

  it('should reject trigger without event_type', async () => {
    await request(app)
      .post('/api/v1/triggers')
      .send({
        name: 'Invalid Trigger',
      })
      .expect(400);
  });

  it('should reject invalid event_type', async () => {
    const response = await request(app)
      .post('/api/v1/triggers')
      .send({
        name: 'Invalid Event Type',
        event_type: 'invalid.event.type',
      })
      .expect(400);

    expect(response.body.error.message).toContain('event_type must be one of');
  });
});
