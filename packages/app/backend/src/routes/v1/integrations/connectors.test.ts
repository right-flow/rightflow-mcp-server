/**
 * Integration Tests for Connector API Routes
 * Following TDD methodology - tests written BEFORE route implementation
 *
 * Test Coverage:
 * - Authentication middleware
 * - Request validation
 * - Create connector
 * - List connectors (organization isolation)
 * - Get connector by ID (cross-tenant prevention)
 * - Update connector
 * - Delete connector (soft delete)
 * - Hebrew text support in all operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../../config/database';
import connectorsRouter from './connectors';

// Mock Express app for testing
let app: Application;
let testOrgId: string;
let testOrgId2: string;
let testUserId: string;

beforeAll(async () => {
  // Create test Express app
  app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req, _res, next) => {
    // Mock req.user from JWT (normally set by authenticateJWT middleware)
    req.user = {
      id: testUserId,
      organizationId: testOrgId,
      role: 'manager',
      email: 'test@connector.com',
      name: 'Test User',
    };
    next();
  });

  app.use('/api/v1/integrations/connectors', connectorsRouter);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: { message: err.message } });
  });

  // Create test organizations
  const org1 = await query(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-connector-api-org1', 'Test Connector API Org 1'],
  );
  testOrgId = org1[0].id;

  const org2 = await query(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-connector-api-org2', 'Test Connector API Org 2'],
  );
  testOrgId2 = org2[0].id;

  // Create test users
  const user1 = await query(
    `INSERT INTO users (clerk_user_id, email, full_name, organization_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['clerk_user_connector_test1', 'test1@connector.com', 'Test User 1', testOrgId],
  );
  testUserId = user1[0].id;

  await query(
    `INSERT INTO users (clerk_user_id, email, full_name, organization_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['clerk_user_connector_test2', 'test2@connector.com', 'Test User 2', testOrgId2],
  );
});

afterAll(async () => {
  // Cleanup
  await query('DELETE FROM organizations WHERE clerk_organization_id LIKE $1', ['test-connector-api-org%']);
});

beforeEach(async () => {
  // Clean connectors before each test
  await query('DELETE FROM connectors WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
});

describe('POST /api/v1/integrations/connectors', () => {
  it('should create connector with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({
        definitionSlug: 'priority-cloud',
        name: 'Production Priority',
        config: {
          baseUrl: 'https://priority.example.com',
          company: 'DEMO',
        },
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Production Priority');
    expect(response.body.organizationId).toBe(testOrgId);
    expect(response.body.config.baseUrl).toBe('https://priority.example.com');
    expect(response.body.isEnabled).toBe(true);
  });

  it('should reject missing required fields', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({
        definitionSlug: 'priority-cloud',
        // Missing name and config
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject invalid connector definition', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({
        definitionSlug: 'non-existent-erp',
        name: 'Test',
        config: {},
      })
      .expect(400);

    expect(response.body.error.message).toContain('Invalid connector definition');
  });

  it('should reject duplicate connector name in same org', async () => {
    const connectorData = {
      definitionSlug: 'priority-cloud',
      name: 'Duplicate Name',
      config: {},
    };

    // Create first
    await request(app)
      .post('/api/v1/integrations/connectors')
      .send(connectorData)
      .expect(201);

    // Attempt duplicate
    const response = await request(app)
      .post('/api/v1/integrations/connectors')
      .send(connectorData)
      .expect(409);

    expect(response.body.error.code).toBe('RESOURCE_CONFLICT');
    expect(response.body.error.message).toContain('already exists');
  });

  it('should support Hebrew connector names', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({
        definitionSlug: 'priority-cloud',
        name: 'חיבור פריוריטי ייצור',
        config: {},
      })
      .expect(201);

    expect(response.body.name).toBe('חיבור פריוריטי ייצור');
  });

  it('should support Hebrew in JSONB config', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({
        definitionSlug: 'priority-cloud',
        name: 'Test',
        config: {
          company: 'חברת דוגמה',
          environment: 'ייצור',
        },
      })
      .expect(201);

    expect(response.body.config.company).toBe('חברת דוגמה');
    expect(response.body.config.environment).toBe('ייצור');
  });

  it('should reject connector name longer than 255 characters', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({
        definitionSlug: 'priority-cloud',
        name: 'A'.repeat(300),
        config: {},
      })
      .expect(400);

    expect(response.body.error.message).toContain('255 characters');
  });
});

describe('GET /api/v1/integrations/connectors', () => {
  it('should list all connectors for organization', async () => {
    // Create 3 connectors
    await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'Connector 1', config: {} });

    await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'sap-b1', name: 'Connector 2', config: {} });

    await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'generic-rest', name: 'Connector 3', config: {} });

    const response = await request(app)
      .get('/api/v1/integrations/connectors')
      .expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(response.body.data[0]).toHaveProperty('id');
    expect(response.body.data[0]).toHaveProperty('name');
  });

  it('should not list connectors from other organizations', async () => {
    // Create connector for org 1
    await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'Org1 Connector', config: {} });

    // Create connector for org 2 (directly in DB to bypass middleware)
    await query(
      `INSERT INTO connectors (organization_id, definition_id, name, config)
       VALUES ($1, (SELECT id FROM connector_definitions WHERE slug = 'priority-cloud'), $2, $3)
       RETURNING id`,
      [testOrgId2, 'Org2 Connector', JSON.stringify({})],
    );

    // List should only return org 1 connector
    const response = await request(app)
      .get('/api/v1/integrations/connectors')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Org1 Connector');
  });

  it('should not list soft-deleted connectors', async () => {
    // Create 2 connectors
    await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'Active', config: {} });

    const response2 = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'sap-b1', name: 'To Delete', config: {} });

    // Delete second
    await request(app)
      .delete(`/api/v1/integrations/connectors/${response2.body.id}`)
      .expect(204);

    // List should only return active
    const response = await request(app)
      .get('/api/v1/integrations/connectors')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Active');
  });

  it('should return empty array if no connectors exist', async () => {
    const response = await request(app)
      .get('/api/v1/integrations/connectors')
      .expect(200);

    expect(response.body.data).toEqual([]);
  });
});

describe('GET /api/v1/integrations/connectors/:id', () => {
  it('should get connector by ID', async () => {
    const created = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'Test Connector', config: {} });

    const response = await request(app)
      .get(`/api/v1/integrations/connectors/${created.body.id}`)
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
    expect(response.body.name).toBe('Test Connector');
  });

  it('should reject cross-tenant access (CRITICAL SECURITY)', async () => {
    // Create connector for org 2
    const org2Connector = await query(
      `INSERT INTO connectors (organization_id, definition_id, name, config)
       VALUES ($1, (SELECT id FROM connector_definitions WHERE slug = 'priority-cloud'), $2, $3)
       RETURNING id`,
      [testOrgId2, 'Org2 Connector', JSON.stringify({})],
    );

    // Attempt to access from org 1 (mocked in middleware)
    const response = await request(app)
      .get(`/api/v1/integrations/connectors/${org2Connector[0].id}`)
      .expect(403);

    expect(response.body.error.code).toBe('ORGANIZATION_MISMATCH');
  });

  it('should return 404 for non-existent connector', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .get(`/api/v1/integrations/connectors/${fakeId}`)
      .expect(404);

    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('should return 404 for soft-deleted connector', async () => {
    const created = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'To Delete', config: {} });

    // Delete
    await request(app)
      .delete(`/api/v1/integrations/connectors/${created.body.id}`)
      .expect(204);

    // Attempt to get
    const response = await request(app)
      .get(`/api/v1/integrations/connectors/${created.body.id}`)
      .expect(404);

    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('should reject invalid UUID format', async () => {
    const response = await request(app)
      .get('/api/v1/integrations/connectors/not-a-uuid')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/v1/integrations/connectors/:id', () => {
  it('should update connector name', async () => {
    const created = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'Original Name', config: {} });

    const response = await request(app)
      .patch(`/api/v1/integrations/connectors/${created.body.id}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(response.body.name).toBe('Updated Name');
  });

  it('should update connector config', async () => {
    const created = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({
        definitionSlug: 'priority-cloud',
        name: 'Test',
        config: { baseUrl: 'https://original.com' },
      });

    const response = await request(app)
      .patch(`/api/v1/integrations/connectors/${created.body.id}`)
      .send({
        config: {
          baseUrl: 'https://updated.com',
          company: 'NEW',
        },
      })
      .expect(200);

    expect(response.body.config.baseUrl).toBe('https://updated.com');
    expect(response.body.config.company).toBe('NEW');
  });

  it('should prevent cross-tenant update (CRITICAL SECURITY)', async () => {
    // Create connector for org 2
    const org2Connector = await query(
      `INSERT INTO connectors (organization_id, definition_id, name, config)
       VALUES ($1, (SELECT id FROM connector_definitions WHERE slug = 'priority-cloud'), $2, $3)
       RETURNING id`,
      [testOrgId2, 'Org2 Connector', JSON.stringify({})],
    );

    // Attempt to update from org 1
    const response = await request(app)
      .patch(`/api/v1/integrations/connectors/${org2Connector[0].id}`)
      .send({ name: 'Hacked' })
      .expect(403);

    expect(response.body.error.code).toBe('ORGANIZATION_MISMATCH');

    // Verify unchanged
    const unchanged = await query('SELECT name FROM connectors WHERE id = $1', [org2Connector[0].id]);
    expect(unchanged[0].name).toBe('Org2 Connector');
  });

  it('should reject duplicate name update', async () => {
    await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'Connector A', config: {} });

    const connectorB = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'sap-b1', name: 'Connector B', config: {} });

    const response = await request(app)
      .patch(`/api/v1/integrations/connectors/${connectorB.body.id}`)
      .send({ name: 'Connector A' })
      .expect(409);

    expect(response.body.error.code).toBe('RESOURCE_CONFLICT');
  });

  it('should reject update with no fields', async () => {
    const created = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'Test', config: {} });

    const response = await request(app)
      .patch(`/api/v1/integrations/connectors/${created.body.id}`)
      .send({})
      .expect(400);

    expect(response.body.error.message).toContain('No fields to update');
  });
});

describe('DELETE /api/v1/integrations/connectors/:id', () => {
  it('should soft delete connector', async () => {
    const created = await request(app)
      .post('/api/v1/integrations/connectors')
      .send({ definitionSlug: 'priority-cloud', name: 'To Delete', config: {} });

    await request(app)
      .delete(`/api/v1/integrations/connectors/${created.body.id}`)
      .expect(204);

    // Verify deleted_at is set
    const result = await query('SELECT deleted_at FROM connectors WHERE id = $1', [created.body.id]);
    expect(result[0].deleted_at).not.toBeNull();
  });

  it('should prevent cross-tenant deletion (CRITICAL SECURITY)', async () => {
    // Create connector for org 2
    const org2Connector = await query(
      `INSERT INTO connectors (organization_id, definition_id, name, config)
       VALUES ($1, (SELECT id FROM connector_definitions WHERE slug = 'priority-cloud'), $2, $3)
       RETURNING id`,
      [testOrgId2, 'Protected', JSON.stringify({})],
    );

    // Attempt to delete from org 1
    const response = await request(app)
      .delete(`/api/v1/integrations/connectors/${org2Connector[0].id}`)
      .expect(403);

    expect(response.body.error.code).toBe('ORGANIZATION_MISMATCH');

    // Verify still exists
    const unchanged = await query('SELECT deleted_at FROM connectors WHERE id = $1', [org2Connector[0].id]);
    expect(unchanged[0].deleted_at).toBeNull();
  });

  it('should allow same name after soft delete', async () => {
    const connectorData = {
      definitionSlug: 'priority-cloud',
      name: 'Reusable Name',
      config: {},
    };

    // Create
    const connector1 = await request(app)
      .post('/api/v1/integrations/connectors')
      .send(connectorData);

    // Delete
    await request(app)
      .delete(`/api/v1/integrations/connectors/${connector1.body.id}`)
      .expect(204);

    // Create again with same name - should succeed
    const connector2 = await request(app)
      .post('/api/v1/integrations/connectors')
      .send(connectorData)
      .expect(201);

    expect(connector2.body.name).toBe('Reusable Name');
    expect(connector2.body.id).not.toBe(connector1.body.id);
  });

  it('should return 404 for non-existent connector', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .delete(`/api/v1/integrations/connectors/${fakeId}`)
      .expect(404);

    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
