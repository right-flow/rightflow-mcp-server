/**
 * Unit Tests for Event Triggers API Routes (TDD - Red Phase)
 * Tests CRUD operations for event triggers
 *
 * Test Coverage:
 * - List triggers with filters (status, event_type, search)
 * - Get single trigger with actions
 * - Create trigger with validation
 * - Update trigger
 * - Delete trigger
 * - Toggle trigger (enable/disable)
 * - Organization isolation
 * - Hebrew name support
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../../config/database';
import triggersRouter from '../triggers';

let app: Application;
let testOrgId: string;
let testOrgId2: string;
let testUserId: string;
let testTriggerId: string;

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
      email: 'test@triggers.com',
      name: 'Test Admin',
    };
    next();
  });

  app.use('/api/v1/triggers', triggersRouter);

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
    ['test-triggers-org1', 'Triggers Test Org 1'],
  );
  testOrgId = org1[0].id;

  const org2 = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-triggers-org2', 'Triggers Test Org 2'],
  );
  testOrgId2 = org2[0].id;

  // Create test user
  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_id, clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    ['clerk_triggers_test', 'clerk_triggers_test', 'admin@triggers.com', 'Test Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;
});

afterAll(async () => {
  // Cleanup in reverse order
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1 OR organization_id = $2)', [testOrgId, testOrgId2]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
  await query('DELETE FROM users WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
  await query('DELETE FROM organizations WHERE clerk_organization_id LIKE $1', ['test-triggers-org%']);
});

beforeEach(async () => {
  // Clean triggers before each test
  await query('DELETE FROM trigger_actions WHERE trigger_id IN (SELECT id FROM event_triggers WHERE organization_id = $1)', [testOrgId]);
  await query('DELETE FROM event_triggers WHERE organization_id = $1', [testOrgId]);
});

describe('GET /api/v1/triggers', () => {
  it('should return empty array when no triggers', async () => {
    const response = await request(app)
      .get('/api/v1/triggers')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should return all triggers for organization', async () => {
    // Create 2 triggers
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'Trigger 1', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'Trigger 2', 'user.created', 'inactive', 'user_defined', testUserId],
    );

    const response = await request(app)
      .get('/api/v1/triggers')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('name');
    expect(response.body[0]).toHaveProperty('event_type');
  });

  it('should filter triggers by status', async () => {
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'Active Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'Inactive Trigger', 'form.submitted', 'inactive', 'user_defined', testUserId],
    );

    const response = await request(app)
      .get('/api/v1/triggers?status=active')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Active Trigger');
  });

  it('should filter triggers by event_type', async () => {
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'Form Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'User Trigger', 'user.created', 'active', 'user_defined', testUserId],
    );

    const response = await request(app)
      .get('/api/v1/triggers?event_type=form.submitted')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].event_type).toBe('form.submitted');
  });

  it('should search triggers by name (English)', async () => {
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'Contact Form Notification', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'Daily Report', 'user.created', 'active', 'user_defined', testUserId],
    );

    const response = await request(app)
      .get('/api/v1/triggers?search=Contact')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Contact Form Notification');
  });

  it('should search triggers by name (Hebrew)', async () => {
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'הודעת טופס יצירת קשר', 'form.submitted', 'active', 'user_defined', testUserId],
    );

    const response = await request(app)
      .get('/api/v1/triggers?search=טופס')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('הודעת טופס יצירת קשר');
  });

  it('should isolate triggers by organization', async () => {
    // Create trigger for org1
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId, 'Org1 Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    // Create trigger for org2
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrgId2, 'Org2 Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );

    const response = await request(app)
      .get('/api/v1/triggers')
      .expect(200);

    // Should only see org1's trigger
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Org1 Trigger');
  });

  it('should sort triggers by priority descending', async () => {
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testOrgId, 'Low Priority', 'form.submitted', 'active', 'user_defined', 10, testUserId],
    );
    await query(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testOrgId, 'High Priority', 'form.submitted', 'active', 'user_defined', 100, testUserId],
    );

    const response = await request(app)
      .get('/api/v1/triggers')
      .expect(200);

    expect(response.body[0].name).toBe('High Priority');
    expect(response.body[1].name).toBe('Low Priority');
  });
});

describe('GET /api/v1/triggers/:id', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Test Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    testTriggerId = result[0].id;
  });

  it('should return trigger by id', async () => {
    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}`)
      .expect(200);

    expect(response.body.id).toBe(testTriggerId);
    expect(response.body.name).toBe('Test Trigger');
    expect(response.body).toHaveProperty('actions');
  });

  it('should include actions in trigger response', async () => {
    // Add action to trigger
    await query(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4)`,
      [testTriggerId, 'send_webhook', 1, JSON.stringify({ url: 'https://example.com/webhook' })],
    );

    const response = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}`)
      .expect(200);

    expect(response.body.actions).toHaveLength(1);
    expect(response.body.actions[0].action_type).toBe('send_webhook');
  });

  it('should return 404 for non-existent trigger', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .get(`/api/v1/triggers/${fakeId}`)
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
      .get(`/api/v1/triggers/${result[0].id}`)
      .expect(404);
  });
});

describe('POST /api/v1/triggers', () => {
  it('should create a new trigger', async () => {
    const newTrigger = {
      name: 'New Trigger',
      event_type: 'form.submitted',
      status: 'active',
      level: 'user_defined',
      scope: 'all_forms',
      priority: 100,
      error_handling: 'stop_on_first_error',
    };

    const response = await request(app)
      .post('/api/v1/triggers')
      .send(newTrigger)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('New Trigger');
    expect(response.body.organization_id).toBe(testOrgId);
    expect(response.body.created_by).toBe(testUserId);
  });

  it('should create trigger with Hebrew name', async () => {
    const newTrigger = {
      name: 'טריגר חדש',
      event_type: 'form.submitted',
      status: 'active',
      level: 'user_defined',
    };

    const response = await request(app)
      .post('/api/v1/triggers')
      .send(newTrigger)
      .expect(201);

    expect(response.body.name).toBe('טריגר חדש');
  });

  it('should create trigger with conditions', async () => {
    const newTrigger = {
      name: 'Conditional Trigger',
      event_type: 'form.submitted',
      status: 'active',
      level: 'user_defined',
      conditions: [
        { field: 'event.data.form_name', operator: 'equals', value: 'Contact Form' },
        { field: 'event.data.email', operator: 'contains', value: '@example.com' },
      ],
    };

    const response = await request(app)
      .post('/api/v1/triggers')
      .send(newTrigger)
      .expect(201);

    expect(response.body.conditions).toHaveLength(2);
    expect(response.body.conditions[0].operator).toBe('equals');
  });

  it('should validate required fields', async () => {
    const invalidTrigger = {
      // Missing name and event_type
      status: 'active',
    };

    const response = await request(app)
      .post('/api/v1/triggers')
      .send(invalidTrigger)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it('should validate event_type enum', async () => {
    const invalidTrigger = {
      name: 'Invalid Event Type',
      event_type: 'invalid.event.type',
      status: 'active',
      level: 'user_defined',
    };

    const response = await request(app)
      .post('/api/v1/triggers')
      .send(invalidTrigger)
      .expect(400);

    expect(response.body.error.message).toContain('event_type');
  });

  it('should set default values', async () => {
    const minimalTrigger = {
      name: 'Minimal Trigger',
      event_type: 'form.submitted',
    };

    const response = await request(app)
      .post('/api/v1/triggers')
      .send(minimalTrigger)
      .expect(201);

    expect(response.body.status).toBe('active');
    expect(response.body.level).toBe('user_defined');
    expect(response.body.priority).toBe(0);
    expect(response.body.error_handling).toBe('stop_on_first_error');
  });
});

describe('PUT /api/v1/triggers/:id', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Original Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    testTriggerId = result[0].id;
  });

  it('should update trigger name', async () => {
    const updates = { name: 'Updated Trigger' };

    const response = await request(app)
      .put(`/api/v1/triggers/${testTriggerId}`)
      .send(updates)
      .expect(200);

    expect(response.body.name).toBe('Updated Trigger');
    expect(response.body.event_type).toBe('form.submitted'); // Unchanged
  });

  it('should update trigger conditions', async () => {
    const updates = {
      conditions: [
        { field: 'event.data.status', operator: 'equals', value: 'approved' },
      ],
    };

    const response = await request(app)
      .put(`/api/v1/triggers/${testTriggerId}`)
      .send(updates)
      .expect(200);

    expect(response.body.conditions).toHaveLength(1);
    expect(response.body.conditions[0].value).toBe('approved');
  });

  it('should update updated_at timestamp', async () => {
    const originalResponse = await request(app)
      .get(`/api/v1/triggers/${testTriggerId}`)
      .expect(200);

    const originalUpdatedAt = new Date(originalResponse.body.updated_at);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updates = { name: 'Updated Again' };
    const updateResponse = await request(app)
      .put(`/api/v1/triggers/${testTriggerId}`)
      .send(updates)
      .expect(200);

    const newUpdatedAt = new Date(updateResponse.body.updated_at);
    expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should return 404 for non-existent trigger', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .put(`/api/v1/triggers/${fakeId}`)
      .send({ name: 'Update' })
      .expect(404);
  });

  it('should not update trigger from different organization', async () => {
    // Create trigger for org2
    const result = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId2, 'Other Org Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );

    await request(app)
      .put(`/api/v1/triggers/${result[0].id}`)
      .send({ name: 'Hacked' })
      .expect(404);
  });
});

describe('DELETE /api/v1/triggers/:id', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Trigger to Delete', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    testTriggerId = result[0].id;
  });

  it('should delete trigger', async () => {
    await request(app)
      .delete(`/api/v1/triggers/${testTriggerId}`)
      .expect(204);

    // Verify deleted
    await request(app)
      .get(`/api/v1/triggers/${testTriggerId}`)
      .expect(404);
  });

  it('should cascade delete trigger actions', async () => {
    // Add action
    await query(
      `INSERT INTO trigger_actions (trigger_id, action_type, "order", config)
       VALUES ($1, $2, $3, $4)`,
      [testTriggerId, 'send_webhook', 1, JSON.stringify({})],
    );

    await request(app)
      .delete(`/api/v1/triggers/${testTriggerId}`)
      .expect(204);

    // Verify actions also deleted
    const actions = await query(
      'SELECT * FROM trigger_actions WHERE trigger_id = $1',
      [testTriggerId],
    );
    expect(actions).toHaveLength(0);
  });

  it('should return 404 for non-existent trigger', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .delete(`/api/v1/triggers/${fakeId}`)
      .expect(404);
  });

  it('should not delete trigger from different organization', async () => {
    // Create trigger for org2
    const result = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId2, 'Other Org Trigger', 'form.submitted', 'active', 'user_defined', testUserId],
    );

    await request(app)
      .delete(`/api/v1/triggers/${result[0].id}`)
      .expect(404);
  });
});

describe('PATCH /api/v1/triggers/:id/toggle', () => {
  beforeEach(async () => {
    const result = await query<{ id: string }>(
      `INSERT INTO event_triggers (organization_id, name, event_type, status, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testOrgId, 'Trigger to Toggle', 'form.submitted', 'active', 'user_defined', testUserId],
    );
    testTriggerId = result[0].id;
  });

  it('should toggle trigger from active to inactive', async () => {
    const response = await request(app)
      .patch(`/api/v1/triggers/${testTriggerId}/toggle`)
      .expect(200);

    expect(response.body.status).toBe('inactive');
  });

  it('should toggle trigger from inactive to active', async () => {
    // First make it inactive
    await query('UPDATE event_triggers SET status = $1 WHERE id = $2', ['inactive', testTriggerId]);

    const response = await request(app)
      .patch(`/api/v1/triggers/${testTriggerId}/toggle`)
      .expect(200);

    expect(response.body.status).toBe('active');
  });

  it('should return 404 for non-existent trigger', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .patch(`/api/v1/triggers/${fakeId}/toggle`)
      .expect(404);
  });
});
