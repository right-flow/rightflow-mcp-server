/**
 * Responses API Tests - Organization Support
 * Tests for Responses API endpoints with multi-tenant functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './responses';
import { getAuthContext, checkPermission } from './lib/auth';
import { ResponsesService as _ResponsesService } from '../src/services/responses/responses.service';
import { FormsService as _FormsService } from '../src/services/forms/forms.service';

// Create mock function references that will be initialized in beforeEach
let mockGetFormResponses: any;
let mockGetResponse: any;
let mockDeleteResponse: any;
let mockExportResponses: any;
let mockSubmitResponse: any;
let mockGetFormById: any;

vi.mock('../src/services/responses/responses.service', () => {
  return {
    ResponsesService: vi.fn().mockImplementation(() => {
      return {
        getFormResponses: (...args: any[]) => mockGetFormResponses(...args),
        getResponse: (...args: any[]) => mockGetResponse(...args),
        deleteResponse: (...args: any[]) => mockDeleteResponse(...args),
        exportResponses: (...args: any[]) => mockExportResponses(...args),
        submitResponse: (...args: any[]) => mockSubmitResponse(...args),
      };
    }),
  };
});

vi.mock('../src/services/forms/forms.service', () => {
  return {
    FormsService: vi.fn().mockImplementation(() => {
      return {
        getFormById: (...args: any[]) => mockGetFormById(...args),
      };
    }),
  };
});

// Mock auth functions
vi.mock('./lib/auth');

describe('Responses API - Organization Support', () => {
  let mockRequest: Partial<VercelRequest>;
  let mockResponse: Partial<VercelResponse>;
  let responseData: any;
  let responseStatus: number;

  beforeEach(() => {
    // Initialize mock functions
    mockGetFormResponses = vi.fn();
    mockGetResponse = vi.fn();
    mockDeleteResponse = vi.fn();
    mockExportResponses = vi.fn();
    mockSubmitResponse = vi.fn();
    mockGetFormById = vi.fn();

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

    // Create mock response with method chaining
    mockResponse = {
      status: vi.fn((code: number) => {
        responseStatus = code;
        return mockResponse;
      }),
      json: vi.fn((data: any) => {
        responseData = data;
        return mockResponse;
      }),
      send: vi.fn((data: any) => {
        responseData = data;
        return mockResponse;
      }),
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/responses?formId=xxx - List responses with org access check', () => {
    it('allows org member to view responses for org form', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { formId: 'form_123' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Org Form',
        user_id: 'other_user',
        org_id: 'org_456',
      };

      const mockResponses = [
        { id: 'resp_1', formId: 'form_123', data: { name: 'John' } },
        { id: 'resp_2', formId: 'form_123', data: { name: 'Jane' } },
      ];

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'member',
      });

      (checkPermission as any).mockResolvedValue(true);
      mockGetFormById.mockResolvedValue(mockForm);
      mockGetFormResponses.mockResolvedValue(mockResponses);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:response:read');
      expect(mockGetFormResponses).toHaveBeenCalledWith('form_123');
      expect(responseStatus).toBe(200);
      expect(responseData.responses).toEqual(mockResponses);
      expect(responseData.count).toBe(2);
    });

    it('allows viewer to view responses for org form', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { formId: 'form_123' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Org Form',
        user_id: 'other_user',
        org_id: 'org_456',
      };

      const mockResponses = [
        { id: 'resp_1', formId: 'form_123', data: { name: 'John' } },
      ];

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'viewer',
      });

      (checkPermission as any).mockResolvedValue(true); // Viewer has org:response:read
      mockGetFormById.mockResolvedValue(mockForm);
      mockGetFormResponses.mockResolvedValue(mockResponses);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(200);
      expect(responseData.responses).toEqual(mockResponses);
    });

    it('denies access when user is not in the same org', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { formId: 'form_123' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Org Form',
        user_id: 'other_user',
        org_id: 'org_456',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_789', // Different org
        orgRole: 'admin',
      });

      mockGetFormById.mockResolvedValue(mockForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });

    it('allows user to view responses for their personal form', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { formId: 'form_123' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Personal Form',
        user_id: 'user_123',
        org_id: null,
      };

      const mockResponses = [
        { id: 'resp_1', formId: 'form_123', data: { name: 'John' } },
      ];

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: null,
        orgRole: null,
      });

      mockGetFormById.mockResolvedValue(mockForm);
      mockGetFormResponses.mockResolvedValue(mockResponses);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(200);
      expect(responseData.responses).toEqual(mockResponses);
    });

    it('denies access when user does not own personal form', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { formId: 'form_123' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Personal Form',
        user_id: 'other_user',
        org_id: null,
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: null,
        orgRole: null,
      });

      mockGetFormById.mockResolvedValue(mockForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });
  });

  describe('DELETE /api/responses?id=xxx - Delete response with org permission check', () => {
    it('allows admin to delete response from org form', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'resp_123' },
      };

      const mockResponse_data = {
        id: 'resp_123',
        formId: 'form_123',
        data: { name: 'John' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Org Form',
        user_id: 'other_user',
        org_id: 'org_456',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'admin',
      });

      (checkPermission as any).mockResolvedValue(true);
      mockGetResponse.mockResolvedValue(mockResponse_data);
      mockGetFormById.mockResolvedValue(mockForm);
      mockDeleteResponse.mockResolvedValue(undefined);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:response:delete');
      expect(mockDeleteResponse).toHaveBeenCalledWith('resp_123');
      expect(responseStatus).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('allows member to delete response from org form', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'resp_123' },
      };

      const mockResponse_data = {
        id: 'resp_123',
        formId: 'form_123',
        data: { name: 'John' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Org Form',
        user_id: 'other_user',
        org_id: 'org_456',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'member',
      });

      (checkPermission as any).mockResolvedValue(true); // Member has org:response:*
      mockGetResponse.mockResolvedValue(mockResponse_data);
      mockGetFormById.mockResolvedValue(mockForm);
      mockDeleteResponse.mockResolvedValue(undefined);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('denies viewer from deleting response from org form', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'resp_123' },
      };

      const mockResponse_data = {
        id: 'resp_123',
        formId: 'form_123',
        data: { name: 'John' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Org Form',
        user_id: 'other_user',
        org_id: 'org_456',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'viewer',
      });

      (checkPermission as any).mockResolvedValue(false); // Viewer doesn't have org:response:delete
      mockGetResponse.mockResolvedValue(mockResponse_data);
      mockGetFormById.mockResolvedValue(mockForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:response:delete');
      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });

    it('allows user to delete response from their personal form', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'resp_123' },
      };

      const mockResponse_data = {
        id: 'resp_123',
        formId: 'form_123',
        data: { name: 'John' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Personal Form',
        user_id: 'user_123',
        org_id: null,
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: null,
        orgRole: null,
      });

      mockGetResponse.mockResolvedValue(mockResponse_data);
      mockGetFormById.mockResolvedValue(mockForm);
      mockDeleteResponse.mockResolvedValue(undefined);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('denies deletion when user is not in the same org', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'resp_123' },
      };

      const mockResponse_data = {
        id: 'resp_123',
        formId: 'form_123',
        data: { name: 'John' },
      };

      const mockForm = {
        id: 'form_123',
        title: 'Org Form',
        user_id: 'other_user',
        org_id: 'org_456',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_789', // Different org
        orgRole: 'admin',
      });

      mockGetResponse.mockResolvedValue(mockResponse_data);
      mockGetFormById.mockResolvedValue(mockForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });
  });

  describe('POST /api/responses - Submit response (public endpoint)', () => {
    it('allows public submission without authentication', async () => {
      mockRequest = {
        method: 'POST',
        headers: {},
        body: {
          formId: 'form_123',
          data: { name: 'John Doe', email: 'john@example.com' },
        },
      };

      const mockSubmittedResponse = {
        id: 'resp_new',
        formId: 'form_123',
        data: { name: 'John Doe', email: 'john@example.com' },
        submittedAt: new Date(),
      };

      mockSubmitResponse.mockResolvedValue(mockSubmittedResponse);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockSubmitResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          formId: 'form_123',
          data: { name: 'John Doe', email: 'john@example.com' },
        }),
      );
      expect(responseStatus).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.response).toEqual(mockSubmittedResponse);
    });
  });
});
