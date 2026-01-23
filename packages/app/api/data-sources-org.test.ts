/**
 * Data Sources API Tests - Organization Support
 * Tests for Data Sources API endpoints with multi-tenant functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './data-sources';
import { getAuthContext, checkPermission } from './lib/auth';

// Create mock function references
let mockFindAll: any;
let mockFindById: any;
let mockCreate: any;
let mockUpdate: any;
let mockDelete: any;
let mockGetOptions: any;

vi.mock('../src/services/data-sources/data-sources.service', () => {
  return {
    DataSourcesService: vi.fn().mockImplementation(() => {
      return {
        findAll: (...args: any[]) => mockFindAll(...args),
        findById: (...args: any[]) => mockFindById(...args),
        create: (...args: any[]) => mockCreate(...args),
        update: (...args: any[]) => mockUpdate(...args),
        delete: (...args: any[]) => mockDelete(...args),
        getOptions: (...args: any[]) => mockGetOptions(...args),
      };
    }),
  };
});

// Mock auth functions
vi.mock('./lib/auth');

describe('Data Sources API - Organization Support', () => {
  let mockRequest: Partial<VercelRequest>;
  let mockResponse: Partial<VercelResponse>;
  let responseData: any;
  let responseStatus: number;

  beforeEach(() => {
    // Initialize mock functions
    mockFindAll = vi.fn();
    mockFindById = vi.fn();
    mockCreate = vi.fn();
    mockUpdate = vi.fn();
    mockDelete = vi.fn();
    mockGetOptions = vi.fn();

    // Reset response capture
    responseData = null;
    responseStatus = 0;

    // Create mock request
    mockRequest = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: {},
      body: {},
    };

    // Create mock response
    mockResponse = {
      setHeader: vi.fn(),
      status: vi.fn((code: number) => {
        responseStatus = code;
        return mockResponse;
      }) as any,
      json: vi.fn((data: any) => {
        responseData = data;
        return mockResponse;
      }) as any,
      end: vi.fn(() => mockResponse) as any,
    };
  });

  describe('GET /api/data-sources - List data sources with org context', () => {
    it('returns only org data sources when user is in org context', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: {},
      };

      const mockOrgDataSources = [
        { id: 'ds_1', name: 'Org Data Source 1', org_id: 'org_456', user_id: 'user_123' },
        { id: 'ds_2', name: 'Org Data Source 2', org_id: 'org_456', user_id: 'user_789' },
      ];

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'member',
      });

      mockFindAll.mockResolvedValue(mockOrgDataSources);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      // Should call findAll with userId and orgId
      expect(mockFindAll).toHaveBeenCalledWith('user_123', {}, 'org_456');

      // Should return org data sources
      expect(responseStatus).toBe(200);
      expect(responseData.data).toEqual(mockOrgDataSources);
    });

    it('returns only personal data sources when user is in personal context', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: {},
      };

      const mockPersonalDataSources = [
        { id: 'ds_1', name: 'Personal Data Source', org_id: null, user_id: 'user_123' },
      ];

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: null,
        orgRole: null,
      });

      mockFindAll.mockResolvedValue(mockPersonalDataSources);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      // Should call findAll with userId and null orgId
      expect(mockFindAll).toHaveBeenCalledWith('user_123', {}, null);

      // Should return personal data sources
      expect(responseStatus).toBe(200);
      expect(responseData.data).toEqual(mockPersonalDataSources);
    });
  });

  describe('POST /api/data-sources - Create with org support', () => {
    it('creates data source in org context with permission check', async () => {
      mockRequest = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: {
          name: 'Org Data Source',
          source_type: 'static',
          config: { options: [{ label: 'A', value: 'a' }] },
        },
      };

      const mockCreatedDataSource = {
        id: 'ds_new',
        name: 'Org Data Source',
        org_id: 'org_456',
        user_id: 'user_123',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'admin',
      });

      (checkPermission as any).mockResolvedValue(true);

      mockCreate.mockResolvedValue(mockCreatedDataSource);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:datasource:create');
      expect(mockCreate).toHaveBeenCalledWith({
        user_id: 'user_123',
        org_id: 'org_456',
        name: 'Org Data Source',
        source_type: 'static',
        config: { options: [{ label: 'A', value: 'a' }] },
        description: undefined,
        cache_ttl: undefined,
        is_active: undefined,
      });
      expect(responseStatus).toBe(201);
    });

    it('blocks viewer from creating data sources in org', async () => {
      mockRequest = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: {
          name: 'Org Data Source',
          source_type: 'static',
          config: { options: [] },
        },
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'viewer',
      });

      (checkPermission as any).mockResolvedValue(false); // Viewer can't create

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:datasource:create');
      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });
  });

  describe('PUT /api/data-sources?id=xxx - Update with org access check', () => {
    it('allows admin to update org data source', async () => {
      mockRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'ds_1' },
        body: { name: 'Updated Data Source' },
      };

      const mockDataSource = {
        id: 'ds_1',
        name: 'Org Data Source',
        org_id: 'org_456',
        user_id: 'user_789',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'admin',
      });

      (checkPermission as any).mockResolvedValue(true);

      mockFindById.mockResolvedValue(mockDataSource);
      mockUpdate.mockResolvedValue({ ...mockDataSource, name: 'Updated Data Source' });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:datasource:update');
      expect(responseStatus).toBe(200);
    });

    it('blocks viewer from updating org data source', async () => {
      mockRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'ds_1' },
        body: { name: 'Updated Data Source' },
      };

      const mockDataSource = {
        id: 'ds_1',
        name: 'Org Data Source',
        org_id: 'org_456',
        user_id: 'user_789',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'viewer',
      });

      (checkPermission as any).mockResolvedValue(false); // Viewer can't update

      mockFindById.mockResolvedValue(mockDataSource);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:datasource:update');
      expect(responseStatus).toBe(403);
    });

    it('denies access when user not in same org', async () => {
      mockRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'ds_1' },
        body: { name: 'Updated Data Source' },
      };

      const mockDataSource = {
        id: 'ds_1',
        name: 'Org Data Source',
        org_id: 'org_456',
        user_id: 'user_789',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_999', // Different org
        orgRole: 'admin',
      });

      mockFindById.mockResolvedValue(mockDataSource);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });
  });

  describe('DELETE /api/data-sources?id=xxx - Delete with org permission', () => {
    it('allows admin to delete org data source', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'ds_1' },
        body: {},
      };

      const mockDataSource = {
        id: 'ds_1',
        name: 'Org Data Source',
        org_id: 'org_456',
        user_id: 'user_789',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'admin',
      });

      (checkPermission as any).mockResolvedValue(true);

      mockFindById.mockResolvedValue(mockDataSource);
      mockDelete.mockResolvedValue(undefined);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:datasource:delete');
      expect(responseStatus).toBe(200);
    });

    it('blocks viewer from deleting org data source', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'ds_1' },
        body: {},
      };

      const mockDataSource = {
        id: 'ds_1',
        name: 'Org Data Source',
        org_id: 'org_456',
        user_id: 'user_789',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'viewer',
      });

      (checkPermission as any).mockResolvedValue(false); // Viewer can't delete

      mockFindById.mockResolvedValue(mockDataSource);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:datasource:delete');
      expect(responseStatus).toBe(403);
    });
  });

  describe('GET /api/data-sources?action=options&id=xxx - Get options with org access', () => {
    it('allows org member to get options from org data source', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { action: 'options', id: 'ds_1' },
        body: {},
      };

      const mockOptions = [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
      ];

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'member',
      });

      mockGetOptions.mockResolvedValue(mockOptions);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      // getOptions should be called with id, userId, and orgId
      expect(mockGetOptions).toHaveBeenCalledWith('ds_1', 'user_123', 'org_456');
      expect(responseStatus).toBe(200);
      expect(responseData.data).toEqual(mockOptions);
    });
  });
});
