import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './data-sources';
import db from '../src/lib/db';
import * as auth from './lib/auth';

/**
 * Data Sources API Tests
 * Integration tests for /api/data-sources endpoint
 */

describe('/api/data-sources', () => {
  const testUserId = '00000000-0000-0000-0000-000000000011';
  const otherUserId = '00000000-0000-0000-0000-000000000012';
  let testDataSourceId: string;

  // Mock response object
  const createMockResponse = (): Partial<VercelResponse> => {
    const res: any = {
      headers: {} as Record<string, string>,
      statusCode: 200,
      body: null,
    };

    res.setHeader = (name: string, value: string) => {
      res.headers[name] = value;
      return res;
    };

    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };

    res.json = (data: any) => {
      res.body = data;
      return res;
    };

    res.end = () => res;

    return res;
  };

  beforeEach(async () => {
    // Clean up test data
    await db('data_sources').whereIn('user_id', [testUserId, otherUserId]).del();

    // Create test users if they don't exist
    const existingUser1 = await db('users').where('id', testUserId).first();
    if (!existingUser1) {
      await db('users').insert({
        id: testUserId,
        clerk_id: `test_clerk_${testUserId}`,
        email: 'apitest1@example.com',
        tenant_type: 'rightflow',
        created_at: new Date(),
      });
    }

    const existingUser2 = await db('users').where('id', otherUserId).first();
    if (!existingUser2) {
      await db('users').insert({
        id: otherUserId,
        clerk_id: `test_clerk_${otherUserId}`,
        email: 'apitest2@example.com',
        tenant_type: 'rightflow',
        created_at: new Date(),
      });
    }

    // Create a test data source
    const [createdDataSource] = await db('data_sources')
      .insert({
        user_id: testUserId,
        name: 'Test Data Source',
        source_type: 'static',
        config: JSON.stringify({
          options: [
            { label: 'Option 1', value: 'opt1' },
            { label: 'Option 2', value: 'opt2' },
          ],
        }),
        cache_ttl: 3600,
        is_active: true,
        created_at: new Date(),
      })
      .returning('id');

    testDataSourceId = createdDataSource.id;

    // Mock authentication
    vi.spyOn(auth, 'getUserFromAuth').mockResolvedValue(testUserId);
  });

  afterEach(async () => {
    // Clean up test data
    await db('data_sources').whereIn('user_id', [testUserId, otherUserId]).del();
    vi.restoreAllMocks();
  });

  describe('GET /api/data-sources', () => {
    it('should list all data sources for authenticated user', async () => {
      const req = {
        method: 'GET',
        query: {},
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.count).toBeDefined();
    });

    it('should get single data source by ID', async () => {
      const req = {
        method: 'GET',
        query: { id: testDataSourceId },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testDataSourceId);
      expect(res.body.data.name).toBe('Test Data Source');
    });

    it('should return 404 for non-existent data source', async () => {
      const req = {
        method: 'GET',
        query: { id: '00000000-0000-0000-0000-999999999999' },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should enforce multi-tenant isolation', async () => {
      // Change mock to return different user
      vi.spyOn(auth, 'getUserFromAuth').mockResolvedValue(otherUserId);

      const req = {
        method: 'GET',
        query: { id: testDataSourceId },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should get options from a data source', async () => {
      const req = {
        method: 'GET',
        query: { id: testDataSourceId, action: 'options' },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toEqual({ label: 'Option 1', value: 'opt1' });
    });

    it('should filter by source_type', async () => {
      // Create another data source with different type
      await db('data_sources').insert({
        user_id: testUserId,
        name: 'CSV Data Source',
        source_type: 'csv_import',
        config: JSON.stringify({ file_path: '/test.csv' }),
        cache_ttl: 3600,
        is_active: true,
        created_at: new Date(),
      });

      const req = {
        method: 'GET',
        query: { source_type: 'csv_import' },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].source_type).toBe('csv_import');
    });
  });

  describe('POST /api/data-sources', () => {
    it('should create new static data source', async () => {
      const req = {
        method: 'POST',
        query: {},
        body: {
          name: 'New Data Source',
          description: 'A new test data source',
          source_type: 'static',
          config: {
            options: [{ label: 'Test', value: 'test' }],
          },
        },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Data Source');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.message).toContain('created successfully');
    });

    it('should validate required fields', async () => {
      const req = {
        method: 'POST',
        query: {},
        body: {
          // Missing name
          source_type: 'static',
          config: {},
        },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad request');
      expect(res.body.message).toContain('name');
    });

    it('should validate source_type', async () => {
      const req = {
        method: 'POST',
        query: {},
        body: {
          name: 'Test',
          source_type: 'invalid_type',
          config: {},
        },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });
  });

  describe('PUT /api/data-sources?id=xxx', () => {
    it('should update data source', async () => {
      const req = {
        method: 'PUT',
        query: { id: testDataSourceId },
        body: {
          name: 'Updated Name',
          description: 'Updated description',
        },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.description).toBe('Updated description');
      expect(res.body.message).toContain('updated successfully');
    });

    it('should require id parameter', async () => {
      const req = {
        method: 'PUT',
        query: {},
        body: { name: 'Updated' },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad request');
      expect(res.body.message).toContain('id');
    });

    it('should enforce multi-tenant isolation', async () => {
      vi.spyOn(auth, 'getUserFromAuth').mockResolvedValue(otherUserId);

      const req = {
        method: 'PUT',
        query: { id: testDataSourceId },
        body: { name: 'Hacked Name' },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });

  describe('DELETE /api/data-sources?id=xxx', () => {
    it('should soft delete data source', async () => {
      const req = {
        method: 'DELETE',
        query: { id: testDataSourceId },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');

      // Verify it's soft deleted
      const rawRecord = await db('data_sources')
        .where('id', testDataSourceId)
        .first();
      expect(rawRecord.deleted_at).not.toBeNull();
    });

    it('should require id parameter', async () => {
      const req = {
        method: 'DELETE',
        query: {},
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad request');
    });

    it('should enforce multi-tenant isolation', async () => {
      vi.spyOn(auth, 'getUserFromAuth').mockResolvedValue(otherUserId);

      const req = {
        method: 'DELETE',
        query: { id: testDataSourceId },
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.spyOn(auth, 'getUserFromAuth').mockResolvedValue(null);

      const req = {
        method: 'GET',
        query: {},
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS request', async () => {
      const req = {
        method: 'OPTIONS',
        query: {},
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(200);
      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(res.headers['Access-Control-Allow-Methods']).toContain('GET');
    });
  });

  describe('Error handling', () => {
    it('should return 405 for unsupported methods', async () => {
      const req = {
        method: 'PATCH',
        query: {},
      } as VercelRequest;

      const res = createMockResponse();

      await handler(req, res as VercelResponse);

      expect(res.statusCode).toBe(405);
      expect(res.body.error).toBe('Method not allowed');
    });
  });
});
