/**
 * Auth Layer Tests - Organization Context & Permissions
 * Testing getAuthContext() and checkPermission() functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { getAuthContext, checkPermission, getUserFromAuth, type AuthContext } from './auth';
import { clerkService } from '../../src/services/auth/clerk.service';
import { getDb } from '../../src/lib/db';

// Mock dependencies
vi.mock('../../src/services/auth/clerk.service');
vi.mock('../../src/lib/db');

describe('Auth Layer - Organization Support', () => {
  let mockRequest: Partial<VercelRequest>;
  let mockDbQuery: any;

  beforeEach(() => {
    mockRequest = {
      headers: {
        authorization: 'Bearer mock_token',
      },
    };

    // Mock the DB query chain
    mockDbQuery = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn(),
    };

    // Mock getDb to return a function that returns the query chain
    (getDb as any).mockReturnValue(() => mockDbQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthContext()', () => {
    it('returns userId, orgId, and orgRole when user is in org context', async () => {
      // Mock Clerk service to return org claims
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: 'org_456',
        org_role: 'admin',
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const context = await getAuthContext(mockRequest as VercelRequest);

      expect(context).toBeDefined();
      expect(context).toHaveProperty('userId', 'db_user_123');
      expect(context).toHaveProperty('orgId', 'org_456');
      expect(context).toHaveProperty('orgRole', 'admin');
    });

    it('returns null for orgId when user is in personal context', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: null,
        org_role: null,
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const context = await getAuthContext(mockRequest as VercelRequest);

      expect(context).toBeDefined();
      expect(context!.userId).toBe('db_user_123');
      expect(context!.orgId).toBeNull();
      expect(context!.orgRole).toBeNull();
    });

    it('returns null when authorization header is missing', async () => {
      mockRequest.headers = {};

      const context = await getAuthContext(mockRequest as VercelRequest);

      expect(context).toBeNull();
    });

    it('returns null when token is invalid', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue(null);

      const context = await getAuthContext(mockRequest as VercelRequest);

      expect(context).toBeNull();
    });

    it('returns null when user not found in database', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_nonexistent',
        org_id: null,
        org_role: null,
      });

      mockDbQuery.first.mockResolvedValue(null);

      const context = await getAuthContext(mockRequest as VercelRequest);

      expect(context).toBeNull();
    });
  });

  describe('checkPermission()', () => {
    it('allows admin to perform all actions', async () => {
      // Mock Clerk service to return admin role
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: 'org_456',
        org_role: 'admin',
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const permissions = [
        'org:form:create',
        'org:form:read',
        'org:form:update',
        'org:form:delete',
        'org:response:read',
        'org:response:delete',
        'org:member:manage',
        'org:settings:manage',
      ];

      for (const permission of permissions) {
        const hasPermission = await checkPermission(mockRequest as VercelRequest, permission);
        expect(hasPermission).toBe(true);
      }
    });

    it('prevents member from org:settings:manage', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: 'org_456',
        org_role: 'member',
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const hasPermission = await checkPermission(
        mockRequest as VercelRequest,
        'org:settings:manage'
      );

      expect(hasPermission).toBe(false);
    });

    it('prevents member from org:member:manage', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: 'org_456',
        org_role: 'member',
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const hasPermission = await checkPermission(
        mockRequest as VercelRequest,
        'org:member:manage'
      );

      expect(hasPermission).toBe(false);
    });

    it('allows member to manage forms', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: 'org_456',
        org_role: 'member',
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const formPermissions = [
        'org:form:create',
        'org:form:read',
        'org:form:update',
        'org:form:delete',
      ];

      for (const permission of formPermissions) {
        const hasPermission = await checkPermission(mockRequest as VercelRequest, permission);
        expect(hasPermission).toBe(true);
      }
    });

    it('prevents viewer from org:form:update', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: 'org_456',
        org_role: 'viewer',
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const hasPermission = await checkPermission(
        mockRequest as VercelRequest,
        'org:form:update'
      );

      expect(hasPermission).toBe(false);
    });

    it('allows viewer to read forms and responses', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: 'org_456',
        org_role: 'viewer',
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const readPermissions = ['org:form:read', 'org:response:read'];

      for (const permission of readPermissions) {
        const hasPermission = await checkPermission(mockRequest as VercelRequest, permission);
        expect(hasPermission).toBe(true);
      }
    });

    it('supports wildcard permissions (org:form:*)', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: 'org_456',
        org_role: 'member',
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      // Member has org:form:* which should match org:form:read, org:form:update, etc.
      const formActions = ['org:form:create', 'org:form:read', 'org:form:update', 'org:form:delete'];

      for (const permission of formActions) {
        const hasPermission = await checkPermission(mockRequest as VercelRequest, permission);
        expect(hasPermission).toBe(true);
      }
    });

    it('returns false when no orgId in context (personal mode)', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: null,
        org_role: null,
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const hasPermission = await checkPermission(
        mockRequest as VercelRequest,
        'org:form:create'
      );

      expect(hasPermission).toBe(false);
    });

    it('returns false when context is null', async () => {
      mockRequest.headers = {};

      const hasPermission = await checkPermission(
        mockRequest as VercelRequest,
        'org:form:create'
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('getUserFromAuth() - Backward Compatibility', () => {
    it('still works for backward compatibility', async () => {
      vi.spyOn(clerkService, 'verifySessionToken').mockResolvedValue({
        sub: 'clerk_user_123',
        org_id: null,
        org_role: null,
      });

      mockDbQuery.first.mockResolvedValue({
        id: 'db_user_123',
      });

      const userId = await getUserFromAuth(mockRequest as VercelRequest);

      expect(userId).toBe('db_user_123');
    });

    it('returns null when authorization fails', async () => {
      mockRequest.headers = {};

      const userId = await getUserFromAuth(mockRequest as VercelRequest);

      expect(userId).toBeNull();
    });
  });
});
