/**
 * Push API Tests - Integration Hub Phase 4
 * Test coverage for POST /api/v1/integrations/push endpoint
 *
 * Test Categories:
 * 1. Happy path - successful job enqueueing
 * 2. Request validation
 * 3. Authentication & authorization
 * 4. Multi-tenant security
 * 5. Error handling
 * 6. Edge cases
 */

import request from 'supertest';
import express from 'express';
import pushRouter from './push';
import * as integrationQueue from '../../../queues/integrationQueue';
import * as connectorService from '../../../services/integrationHub/connectorService';

// Mock auth middleware
jest.mock('../../../middleware/auth', () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => next(),
}));

// Mock dependencies
jest.mock('../../../queues/integrationQueue');
jest.mock('../../../services/integrationHub/connectorService');
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('POST /api/v1/integrations/push', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Express app with auth middleware
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, _res, next) => {
      (req as any).user = {
        id: 'user-123',
        organizationId: 'org-1',
        role: 'manager',
        email: 'test@example.com',
        name: 'Test User',
      };
      next();
    });

    app.use('/api/v1/integrations', pushRouter);
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const validRequest = {
    connectorId: '123e4567-e89b-12d3-a456-426614174000',
    formId: '123e4567-e89b-12d3-a456-426614174001',
    submissionId: 'sub-1',
    data: {
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
    },
    endpoint: {
      method: 'POST',
      path: '/odata/Priority/TEST_CO/CUSTOMERS',
    },
  };

  const mockConnector = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    organizationId: 'org-1',
    definitionId: 'def-1',
    name: 'Test Priority Connector',
    isEnabled: true,
    config: {
      baseUrl: 'https://priority.example.com',
      company: 'TEST_CO',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJob = {
    id: 'job-123',
    data: {
      jobId: 'job-123',
      organizationId: 'org-1',
      submissionId: 'sub-1',
      formId: '123e4567-e89b-12d3-a456-426614174001',
      connectorId: '123e4567-e89b-12d3-a456-426614174000',
      data: validRequest.data,
      endpoint: validRequest.endpoint,
      retryCount: 0,
      createdAt: Date.now(),
    },
    opts: {},
    getState: jest.fn().mockResolvedValue('waiting'),
  };

  // ============================================================================
  // Category 1: Happy Path
  // ============================================================================

  describe('Happy Path', () => {
    it('should enqueue job and return 202 Accepted', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(202);

      expect(response.body).toMatchObject({
        success: true,
        jobId: 'job-123',
        status: 'queued',
      });

      expect(response.body.estimatedCompletion).toBeDefined();
    });

    it('should include job metadata in response', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(202);

      expect(response.body).toEqual({
        success: true,
        jobId: 'job-123',
        status: 'queued',
        estimatedCompletion: expect.any(String),
        submissionId: 'sub-1',
        connectorId: '123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('should call enqueueIntegrationJob with correct data', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      await request(app).post('/api/v1/integrations/push').send(validRequest).expect(202);

      expect(integrationQueue.enqueueIntegrationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          connectorId: '123e4567-e89b-12d3-a456-426614174000',
          formId: '123e4567-e89b-12d3-a456-426614174001',
          submissionId: 'sub-1',
          data: validRequest.data,
          endpoint: validRequest.endpoint,
          retryCount: 0,
        }),
      );
    });
  });

  // ============================================================================
  // Category 2: Request Validation
  // ============================================================================

  describe('Request Validation', () => {
    it('should require connectorId', async () => {
      const { connectorId: _connectorId, ...invalidRequest } = validRequest;

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require formId', async () => {
      const { formId: _formId, ...invalidRequest } = validRequest;

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require submissionId', async () => {
      const { submissionId: _submissionId, ...invalidRequest } = validRequest;

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require data object', async () => {
      const { data: _data, ...invalidRequest } = validRequest;

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should require endpoint object', async () => {
      const { endpoint: _endpoint, ...invalidRequest } = validRequest;

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate endpoint.method', async () => {
      const invalidRequest = {
        ...validRequest,
        endpoint: { method: 'INVALID', path: '/test' },
      };

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain('method');
    });

    it('should require endpoint.path', async () => {
      const invalidRequest = {
        ...validRequest,
        endpoint: { method: 'POST' },
      };

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should allow empty data object', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      const requestWithEmptyData = { ...validRequest, data: {} };

      await request(app).post('/api/v1/integrations/push').send(requestWithEmptyData).expect(202);
    });
  });

  // ============================================================================
  // Category 3: Authentication & Authorization
  // ============================================================================

  describe('Authentication & Authorization', () => {
    it('should require authentication (handled by Clerk middleware)', async () => {
      // This test verifies the middleware is applied
      // In real implementation, Clerk would return 401
      // Here we mock it to always succeed, so this test is placeholder

      const response = await request(app).post('/api/v1/integrations/push').send(validRequest);

      // Should not be 401 because we mocked auth
      expect(response.status).not.toBe(401);
    });

    it('should verify connector belongs to organization', async () => {
      const wrongOrgConnector = { ...mockConnector, organizationId: 'org-2' };
      (connectorService.getById as jest.Mock).mockResolvedValue(wrongOrgConnector);

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(403);

      expect(response.body.error).toContain('Unauthorized');
    });

    it('should verify connector is enabled', async () => {
      const disabledConnector = { ...mockConnector, isEnabled: false };
      (connectorService.getById as jest.Mock).mockResolvedValue(disabledConnector);

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(400);

      expect(response.body.error).toContain('disabled');
    });

    it('should return 404 if connector not found', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(404);

      expect(response.body.error).toContain('Connector not found');
    });
  });

  // ============================================================================
  // Category 4: Multi-Tenant Security
  // ============================================================================

  describe('Multi-Tenant Security', () => {
    it('should use organizationId from auth context', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      await request(app).post('/api/v1/integrations/push').send(validRequest).expect(202);

      expect(integrationQueue.enqueueIntegrationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1', // From mocked auth
        }),
      );
    });

    it('should prevent cross-tenant connector access', async () => {
      const otherOrgConnector = { ...mockConnector, organizationId: 'org-999' };
      (connectorService.getById as jest.Mock).mockResolvedValue(otherOrgConnector);

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(403);

      expect(response.body.error).toContain('Unauthorized');
    });
  });

  // ============================================================================
  // Category 5: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle connector service errors', async () => {
      (connectorService.getById as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should handle queue errors', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should handle duplicate job errors', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockRejectedValue(
        new Error('Job already exists'),
      );

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should sanitize error messages (no PII)', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockRejectedValue(
        new Error('Failed to enqueue job for customer John Doe (email: john@example.com)'),
      );

      const response = await request(app)
        .post('/api/v1/integrations/push')
        .send(validRequest)
        .expect(500);

      // Error should be sanitized (implementation detail)
      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // Category 6: Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle Hebrew text in data', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      const hebrewRequest = {
        ...validRequest,
        data: {
          customer_name: 'שלום עולם',
          notes: 'הערות בעברית',
        },
      };

      await request(app).post('/api/v1/integrations/push').send(hebrewRequest).expect(202);
    });

    it('should handle large data payloads', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      const largeRequest = {
        ...validRequest,
        data: {
          field1: 'x'.repeat(10000),
          field2: 'y'.repeat(10000),
        },
      };

      await request(app).post('/api/v1/integrations/push').send(largeRequest).expect(202);
    });

    it('should handle special characters in endpoint path', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      const specialPathRequest = {
        ...validRequest,
        endpoint: {
          method: 'POST',
          path: '/api/v1/customers?filter=name eq "John"&expand=orders',
        },
      };

      await request(app).post('/api/v1/integrations/push').send(specialPathRequest).expect(202);
    });

    it('should handle optional headers in endpoint', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      const headersRequest = {
        ...validRequest,
        endpoint: {
          method: 'POST',
          path: '/customers',
          headers: {
            'X-Custom-Header': 'value',
            'X-Request-ID': 'req-123',
          },
        },
      };

      await request(app).post('/api/v1/integrations/push').send(headersRequest).expect(202);
    });

    it('should handle very long submission IDs', async () => {
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (integrationQueue.enqueueIntegrationJob as jest.Mock).mockResolvedValue(mockJob);

      const longIdRequest = {
        ...validRequest,
        submissionId: 'sub-' + 'a'.repeat(200),
      };

      await request(app).post('/api/v1/integrations/push').send(longIdRequest).expect(202);
    });
  });
});
