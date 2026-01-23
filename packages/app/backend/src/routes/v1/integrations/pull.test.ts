/**
 * Integration Tests for Pull API Route
 * POST /api/v1/integrations/pull - Pull data from ERP system
 *
 * Test Coverage:
 * - Authentication required
 * - Request validation (Zod)
 * - Multi-tenant isolation
 * - Successful pull from ERP
 * - Cache hit scenario
 * - Force refresh
 * - Error responses
 * - Hebrew/RTL data handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../../config/database';
import pullRouter from './pull';
import * as pullService from '../../../services/integrationHub/pullService';

// Mock pull service
jest.mock('../../../services/integrationHub/pullService');

// Mock Express app for testing
let app: Application;
let testOrgId: string;
let testOrgId2: string;
let testUserId: string;
let testConnectorId: string;

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
      email: 'test@pull.com',
      name: 'Test User',
    };
    next();
  });

  app.use('/api/v1/integrations/pull', pullRouter);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: { message: err.message } });
  });

  // Create test organizations
  const org1 = await query(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-pull-api-org1', 'Test Pull API Org 1'],
  );
  testOrgId = org1[0].id;

  const org2 = await query(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-pull-api-org2', 'Test Pull API Org 2'],
  );
  testOrgId2 = org2[0].id;

  // Create test users
  const user1 = await query(
    `INSERT INTO users (clerk_user_id, email, full_name, organization_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['clerk_user_pull_test1', 'test1@pull.com', 'Test User 1', testOrgId],
  );
  testUserId = user1[0].id;

  await query(
    `INSERT INTO users (clerk_user_id, email, full_name, organization_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['clerk_user_pull_test2', 'test2@pull.com', 'Test User 2', testOrgId2],
  );

  // Create test connector definition
  await query(
    `INSERT INTO connector_definitions (slug, name, category, description, config_schema)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['priority-cloud', 'Priority Cloud', 'erp', 'Priority ERP Cloud', {}],
  );

  // Create test connector
  const connResult = await query(
    `INSERT INTO connectors (organization_id, definition_slug, name, config, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [testOrgId, 'priority-cloud', 'Test Priority Connector', { baseUrl: 'https://api.priority.com', endpoints: {} }, 'active'],
  );
  testConnectorId = connResult[0].id;
});

afterAll(async () => {
  // Cleanup
  await query('DELETE FROM connectors WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
  await query('DELETE FROM connector_definitions WHERE slug = $1', ['priority-cloud']);
  await query('DELETE FROM organizations WHERE clerk_organization_id LIKE $1', ['test-pull-api-org%']);
});

beforeEach(async () => {
  // Clear mocks before each test
  jest.clearAllMocks();
});

describe('POST /api/v1/integrations/pull', () => {
  it('should require authentication', async () => {
    // Create app without auth middleware
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use('/api/v1/integrations/pull', pullRouter);

    const response = await request(unauthApp)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(401);
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        // Missing connectorId
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should validate connectorId format (UUID)', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: 'invalid-uuid',
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should validate resourceType (non-empty string)', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: '',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should validate resourceId (non-empty string)', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should validate forceRefresh (boolean)', async () => {
    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
        forceRefresh: 'true', // String instead of boolean
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should successfully pull data from ERP', async () => {
    const mockPullResponse = {
      data: {
        customerId: 'CID123',
        name: 'Test Customer',
        email: 'test@example.com',
      },
      fromCache: false,
      durationMs: 350,
      metadata: {
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
        fetchedAt: Date.now(),
      },
    };

    (pullService.pullData as jest.Mock).mockResolvedValue(mockPullResponse);

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockPullResponse);
    expect(pullService.pullData).toHaveBeenCalledWith({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      resourceType: 'customer',
      resourceId: 'CID123',
      forceRefresh: false,
    });
  });

  it('should handle cache hit scenario', async () => {
    const mockCacheResponse = {
      data: {
        customerId: 'CID123',
        name: 'Cached Customer',
      },
      fromCache: true,
      durationMs: 2,
      metadata: {
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
        cachedAt: Date.now(),
      },
    };

    (pullService.pullData as jest.Mock).mockResolvedValue(mockCacheResponse);

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.fromCache).toBe(true);
  });

  it('should handle forceRefresh parameter', async () => {
    const mockFreshResponse = {
      data: { customerId: 'CID123' },
      fromCache: false,
      durationMs: 400,
      metadata: {
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
        fetchedAt: Date.now(),
      },
    };

    (pullService.pullData as jest.Mock).mockResolvedValue(mockFreshResponse);

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
        forceRefresh: true,
      });

    expect(response.status).toBe(200);
    expect(pullService.pullData).toHaveBeenCalledWith({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      resourceType: 'customer',
      resourceId: 'CID123',
      forceRefresh: true,
    });
  });

  it('should enforce multi-tenant isolation', async () => {
    // Mock user from different organization
    app.use((req, _res, next) => {
      req.user = {
        id: testUserId,
        organizationId: testOrgId2, // Different org
        role: 'manager',
        email: 'test@pull.com',
        name: 'Test User',
      };
      next();
    });

    (pullService.pullData as jest.Mock).mockRejectedValue(
      new Error(`Organization mismatch: connector belongs to ${testOrgId}, requested by ${testOrgId2}`),
    );

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId, // Belongs to testOrgId
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain('Organization mismatch');
  });

  it('should handle connector not found error', async () => {
    (pullService.pullData as jest.Mock).mockRejectedValue(
      new Error('Connector not found: non-existent-id'),
    );

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0',
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain('Connector not found');
  });

  it('should handle timeout error', async () => {
    const timeoutError = new Error('Request timeout after 10000ms');
    timeoutError.name = 'TimeoutError';

    (pullService.pullData as jest.Mock).mockRejectedValue(timeoutError);

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain('timeout');
  });

  it('should handle rate limit error', async () => {
    const rateLimitError = new Error('Rate limit exceeded for connector');
    rateLimitError.name = 'RateLimitError';

    (pullService.pullData as jest.Mock).mockRejectedValue(rateLimitError);

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(429);
    expect(response.body.error.message).toContain('Rate limit exceeded');
  });

  it('should handle circuit breaker open error', async () => {
    const circuitError = new Error('Circuit breaker open for connector');
    circuitError.name = 'CircuitBreakerError';

    (pullService.pullData as jest.Mock).mockRejectedValue(circuitError);

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(503);
    expect(response.body.error.message).toContain('Circuit breaker open');
  });

  it('should handle Hebrew text in response', async () => {
    const hebrewResponse = {
      data: {
        customerId: 'CID123',
        name: 'לקוח ישראלי',
        address: 'רחוב הרצל 123, תל אביב',
        email: 'test@example.co.il',
      },
      fromCache: false,
      durationMs: 350,
      metadata: {
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
        fetchedAt: Date.now(),
      },
    };

    (pullService.pullData as jest.Mock).mockResolvedValue(hebrewResponse);

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID123',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.data.name).toBe('לקוח ישראלי');
    expect(response.body.data.data.address).toBe('רחוב הרצל 123, תל אביב');
  });

  it('should handle RTL marks in resourceId', async () => {
    const mockResponse = {
      data: { customerId: 'CID‏123' },
      fromCache: false,
      durationMs: 350,
      metadata: {
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID‏123',
        fetchedAt: Date.now(),
      },
    };

    (pullService.pullData as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app)
      .post('/api/v1/integrations/pull')
      .send({
        connectorId: testConnectorId,
        resourceType: 'customer',
        resourceId: 'CID‏123', // Contains RTL mark
      });

    expect(response.status).toBe(200);
    expect(pullService.pullData).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'CID‏123',
      }),
    );
  });
});
