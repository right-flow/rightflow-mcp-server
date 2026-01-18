/**
 * Forms API Tests - Organization Support
 * Tests for Forms API endpoints with multi-tenant functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './forms';
import { getAuthContext, checkPermission } from './lib/auth';

// Create mock function references that will be initialized in beforeEach
let mockGetAccessibleForms: any;
let mockGetFormById: any;
let mockGetFormBySlug: any;
let mockCreateForm: any;
let mockUpdateForm: any;
let mockDeleteForm: any;

vi.mock('../src/services/forms/forms.service', () => {
  return {
    FormsService: vi.fn().mockImplementation(() => {
      return {
        getAccessibleForms: (...args: any[]) => mockGetAccessibleForms(...args),
        getFormById: (...args: any[]) => mockGetFormById(...args),
        getFormBySlug: (...args: any[]) => mockGetFormBySlug(...args),
        getUserForms: vi.fn(),
        createForm: (...args: any[]) => mockCreateForm(...args),
        updateForm: (...args: any[]) => mockUpdateForm(...args),
        deleteForm: (...args: any[]) => mockDeleteForm(...args),
        publishForm: vi.fn(),
        unpublishForm: vi.fn(),
      };
    }),
  };
});

// Mock auth functions
vi.mock('./lib/auth');

describe('Forms API - Organization Support', () => {
  let mockRequest: Partial<VercelRequest>;
  let mockResponse: Partial<VercelResponse>;
  let responseData: any;
  let responseStatus: number;

  beforeEach(() => {
    // Initialize mock functions
    mockGetAccessibleForms = vi.fn();
    mockGetFormById = vi.fn();
    mockGetFormBySlug = vi.fn();
    mockCreateForm = vi.fn();
    mockUpdateForm = vi.fn();
    mockDeleteForm = vi.fn();

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
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/forms - List forms with org context', () => {
    it('returns only org forms when user is in org context', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: {},
      };

      const mockOrgForms = [
        { id: 'form1', title: 'Org Form 1', org_id: 'org_456' },
        { id: 'form2', title: 'Org Form 2', org_id: 'org_456' },
      ];

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'member',
      });

      mockGetAccessibleForms.mockResolvedValue(mockOrgForms);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      // Should call getAccessibleForms with orgId
      expect(mockGetAccessibleForms).toHaveBeenCalledWith('user_123', 'org_456');

      // Should return org forms
      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({ forms: mockOrgForms });
    });

    it('returns only personal forms when user is in personal context', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: {},
      };

      const mockPersonalForms = [
        { id: 'form1', title: 'Personal Form 1', org_id: null },
        { id: 'form2', title: 'Personal Form 2', org_id: null },
      ];

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: null,
        orgRole: null,
      });

      mockGetAccessibleForms.mockResolvedValue(mockPersonalForms);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      // Should call getAccessibleForms with null orgId
      expect(mockGetAccessibleForms).toHaveBeenCalledWith('user_123', null);

      // Should return personal forms
      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({ forms: mockPersonalForms });
    });
  });

  describe('GET /api/forms?id=xxx - Get single form with org access check', () => {
    it('allows access to org form when user is org member', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
      };

      const mockOrgForm = {
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

      mockGetFormById.mockResolvedValue(mockOrgForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({ form: mockOrgForm });
    });

    it('denies access to org form when user is not in same org', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
      };

      const mockOrgForm = {
        id: 'form_123',
        title: 'Org Form',
        user_id: 'other_user',
        org_id: 'org_456',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_789', // Different org
        orgRole: 'member',
      });

      mockGetFormById.mockResolvedValue(mockOrgForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });

    it('allows access to personal form when user is owner', async () => {
      mockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
      };

      const mockPersonalForm = {
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

      mockGetFormById.mockResolvedValue(mockPersonalForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(200);
      expect(responseData).toEqual({ form: mockPersonalForm });
    });
  });

  describe('POST /api/forms - Create form with org context', () => {
    it('creates org form when user is in org context with permission', async () => {
      mockRequest = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: {
          title: 'New Org Form',
          fields: [],
        },
      };

      const mockCreatedForm = {
        id: 'form_new',
        title: 'New Org Form',
        user_id: 'user_123',
        org_id: 'org_456',
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'admin',
      });

      (checkPermission as any).mockResolvedValue(true);

      mockCreateForm.mockResolvedValue({
        success: true,
        form: mockCreatedForm,
      });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:form:create');
      expect(mockCreateForm).toHaveBeenCalledWith({
        userId: 'user_123',
        orgId: 'org_456',
        title: 'New Org Form',
        description: undefined,
        fields: [],
        stations: undefined,
        settings: undefined,
      });
      expect(responseStatus).toBe(201);
      expect(responseData.success).toBe(true);
    });

    it('creates personal form when user is in personal context', async () => {
      mockRequest = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: {
          title: 'New Personal Form',
          fields: [],
        },
      };

      const mockCreatedForm = {
        id: 'form_new',
        title: 'New Personal Form',
        user_id: 'user_123',
        org_id: null,
      };

      (getAuthContext as any).mockResolvedValue({
        userId: 'user_123',
        orgId: null,
        orgRole: null,
      });

      mockCreateForm.mockResolvedValue({
        success: true,
        form: mockCreatedForm,
      });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockCreateForm).toHaveBeenCalledWith({
        userId: 'user_123',
        orgId: null,
        title: 'New Personal Form',
        description: undefined,
        fields: [],
        stations: undefined,
        settings: undefined,
      });
      expect(responseStatus).toBe(201);
      expect(responseData.success).toBe(true);
    });
  });

  describe('PUT /api/forms?id=xxx - Update form with org permission check', () => {
    it('allows admin to update org form', async () => {
      mockRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
        body: {
          title: 'Updated Org Form',
        },
      };

      const mockOrgForm = {
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

      mockGetFormById.mockResolvedValue(mockOrgForm);
      mockUpdateForm.mockResolvedValue({
        success: true,
        form: { ...mockOrgForm, title: 'Updated Org Form' },
      });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:form:update');
      expect(responseStatus).toBe(200);
    });

    it('allows member to update org form', async () => {
      mockRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
        body: {
          title: 'Updated Org Form',
        },
      };

      const mockOrgForm = {
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

      (checkPermission as any).mockResolvedValue(true);

      mockGetFormById.mockResolvedValue(mockOrgForm);
      mockUpdateForm.mockResolvedValue({
        success: true,
        form: { ...mockOrgForm, title: 'Updated Org Form' },
      });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:form:update');
      expect(responseStatus).toBe(200);
    });

    it('denies viewer from updating org form', async () => {
      mockRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
        body: {
          title: 'Updated Org Form',
        },
      };

      const mockOrgForm = {
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

      (checkPermission as any).mockResolvedValue(false); // Viewer can't update

      mockGetFormById.mockResolvedValue(mockOrgForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:form:update');
      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });

    it('denies update when user is not in the same org', async () => {
      mockRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
        body: {
          title: 'Updated Org Form',
        },
      };

      const mockOrgForm = {
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

      mockGetFormById.mockResolvedValue(mockOrgForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });

    it('allows user to update their personal form', async () => {
      mockRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
        body: {
          title: 'Updated Personal Form',
        },
      };

      const mockPersonalForm = {
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

      mockGetFormById.mockResolvedValue(mockPersonalForm);
      mockUpdateForm.mockResolvedValue({
        success: true,
        form: { ...mockPersonalForm, title: 'Updated Personal Form' },
      });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(200);
    });
  });

  describe('DELETE /api/forms?id=xxx - Delete form with org permission check', () => {
    it('allows admin to delete org form', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
      };

      const mockOrgForm = {
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

      mockGetFormById.mockResolvedValue(mockOrgForm);
      mockDeleteForm.mockResolvedValue({
        success: true,
      });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:form:delete');
      expect(responseStatus).toBe(200);
    });

    it('allows member to delete org form', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
      };

      const mockOrgForm = {
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

      (checkPermission as any).mockResolvedValue(true);

      mockGetFormById.mockResolvedValue(mockOrgForm);
      mockDeleteForm.mockResolvedValue({
        success: true,
      });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:form:delete');
      expect(responseStatus).toBe(200);
    });

    it('denies viewer from deleting org form', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
      };

      const mockOrgForm = {
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

      (checkPermission as any).mockResolvedValue(false); // Viewer can't delete

      mockGetFormById.mockResolvedValue(mockOrgForm);

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(checkPermission).toHaveBeenCalledWith(mockRequest, 'org:form:delete');
      expect(responseStatus).toBe(403);
      expect(responseData.error).toBe('Forbidden');
    });

    it('allows user to delete their personal form', async () => {
      mockRequest = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        query: { id: 'form_123' },
      };

      const mockPersonalForm = {
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

      mockGetFormById.mockResolvedValue(mockPersonalForm);
      mockDeleteForm.mockResolvedValue({
        success: true,
      });

      await handler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(responseStatus).toBe(200);
    });
  });
});
