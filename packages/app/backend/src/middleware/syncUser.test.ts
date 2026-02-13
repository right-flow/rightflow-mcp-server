/**
 * Unit Tests for syncUser Middleware
 * Tests user and organization synchronization from Clerk to database
 *
 * Test Coverage:
 * - Organization upsert
 * - User creation (first user gets admin)
 * - User update (preserves existing role)
 * - Organization ID transformation (Clerk ID -> DB UUID)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { syncUser } from './syncUser';

// Mock logger to prevent noise in test output
jest.mock('../utils/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

let testOrgClerkId: string;
let testOrgDbId: string;

beforeAll(async () => {
  testOrgClerkId = 'sync-user-test-org-' + Date.now();
});

afterAll(async () => {
  // Cleanup
  await query('DELETE FROM users WHERE clerk_user_id LIKE $1', ['sync-test-user-%']);
  await query('DELETE FROM organizations WHERE clerk_org_id LIKE $1', ['sync-user-test-org-%']);
});

beforeEach(async () => {
  // Clean users before each test
  await query('DELETE FROM users WHERE clerk_user_id LIKE $1', ['sync-test-user-%']);
});

// Helper to create mock request/response
function createMockReqRes(userData: Partial<Request['user']>) {
  const req = {
    user: {
      id: 'sync-test-user-1',
      organizationId: testOrgClerkId,
      role: 'worker',
      email: 'test@sync.com',
      name: 'Test User',
      ...userData,
    },
  } as Request;

  const res = {} as Response;
  const next = jest.fn() as unknown as NextFunction;

  return { req, res, next };
}

describe('syncUser middleware', () => {
  describe('Organization handling', () => {
    it('should create new organization if not exists', async () => {
      const uniqueOrgId = 'sync-user-test-org-new-' + Date.now();
      const { req, res, next } = createMockReqRes({
        organizationId: uniqueOrgId,
        name: 'New Org Creator',
      });

      await syncUser(req, res, next);

      expect(next).toHaveBeenCalled();

      // Verify organization was created
      const orgs = await query<{ id: string; name: string }>(
        'SELECT id, name FROM organizations WHERE clerk_org_id = $1',
        [uniqueOrgId],
      );

      expect(orgs.length).toBe(1);
      expect(orgs[0].name).toContain("New's Organization");

      // Cleanup
      await query('DELETE FROM users WHERE clerk_user_id = $1', [req.user!.id]);
      await query('DELETE FROM organizations WHERE clerk_org_id = $1', [uniqueOrgId]);
    });

    it('should update req.user.organizationId to internal DB UUID', async () => {
      const { req, res, next } = createMockReqRes({
        id: 'sync-test-user-org-id-' + Date.now(),
      });

      const originalOrgId = req.user!.organizationId;
      await syncUser(req, res, next);

      expect(next).toHaveBeenCalled();

      // organizationId should now be a UUID, not the Clerk ID
      expect(req.user!.organizationId).not.toBe(originalOrgId);
      expect(req.user!.organizationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('First user handling', () => {
    it('should assign admin role to first user in organization', async () => {
      const uniqueOrgId = 'sync-user-test-org-first-' + Date.now();
      const { req, res, next } = createMockReqRes({
        id: 'sync-test-user-first-' + Date.now(),
        organizationId: uniqueOrgId,
        role: 'worker', // Default role from Clerk
      });

      await syncUser(req, res, next);

      expect(next).toHaveBeenCalled();

      // First user should be admin
      expect(req.user!.role).toBe('admin');

      // Verify in database
      const users = await query<{ role: string }>(
        'SELECT role FROM users WHERE clerk_user_id = $1',
        [req.user!.id],
      );
      expect(users[0].role).toBe('admin');

      // Cleanup
      await query('DELETE FROM users WHERE clerk_user_id = $1', [req.user!.id]);
      await query('DELETE FROM organizations WHERE clerk_org_id = $1', [uniqueOrgId]);
    });

    it('should assign worker role to second user in organization', async () => {
      const uniqueOrgId = 'sync-user-test-org-second-' + Date.now();

      // Create first user (admin)
      const { req: req1, res: res1, next: next1 } = createMockReqRes({
        id: 'sync-test-user-second-1-' + Date.now(),
        organizationId: uniqueOrgId,
      });
      await syncUser(req1, res1, next1);
      expect(req1.user!.role).toBe('admin');

      // Create second user (should be worker)
      const { req: req2, res: res2, next: next2 } = createMockReqRes({
        id: 'sync-test-user-second-2-' + Date.now(),
        organizationId: uniqueOrgId,
        role: 'worker',
      });
      await syncUser(req2, res2, next2);

      expect(req2.user!.role).toBe('worker');

      // Verify in database
      const users = await query<{ role: string }>(
        'SELECT role FROM users WHERE clerk_user_id = $1',
        [req2.user!.id],
      );
      expect(users[0].role).toBe('worker');

      // Cleanup
      await query('DELETE FROM users WHERE clerk_user_id LIKE $1', ['sync-test-user-second-%']);
      await query('DELETE FROM organizations WHERE clerk_org_id = $1', [uniqueOrgId]);
    });
  });

  describe('Existing user handling', () => {
    it('should preserve existing role when user already exists', async () => {
      const uniqueOrgId = 'sync-user-test-org-existing-' + Date.now();
      const userId = 'sync-test-user-existing-' + Date.now();

      // First create user as admin (first user)
      const { req: req1, res: res1, next: next1 } = createMockReqRes({
        id: userId,
        organizationId: uniqueOrgId,
      });
      await syncUser(req1, res1, next1);
      expect(req1.user!.role).toBe('admin');

      // Now update the user in DB to manager
      await query('UPDATE users SET role = $1 WHERE clerk_user_id = $2', ['manager', userId]);

      // Sync again - should preserve manager role
      const { req: req2, res: res2, next: next2 } = createMockReqRes({
        id: userId,
        organizationId: uniqueOrgId,
        role: 'worker', // Clerk still says worker
      });
      await syncUser(req2, res2, next2);

      // Should be manager (from DB), not worker (from Clerk)
      expect(req2.user!.role).toBe('manager');

      // Cleanup
      await query('DELETE FROM users WHERE clerk_user_id = $1', [userId]);
      await query('DELETE FROM organizations WHERE clerk_org_id = $1', [uniqueOrgId]);
    });

    it('should update email and name for existing user', async () => {
      const uniqueOrgId = 'sync-user-test-org-update-' + Date.now();
      const userId = 'sync-test-user-update-' + Date.now();

      // Create user
      const { req: req1, res: res1, next: next1 } = createMockReqRes({
        id: userId,
        organizationId: uniqueOrgId,
        email: 'old@email.com',
        name: 'Old Name',
      });
      await syncUser(req1, res1, next1);

      // Update with new email and name
      const { req: req2, res: res2, next: next2 } = createMockReqRes({
        id: userId,
        organizationId: uniqueOrgId,
        email: 'new@email.com',
        name: 'New Name',
      });
      await syncUser(req2, res2, next2);

      // Verify updates in database
      const users = await query<{ email: string; name: string }>(
        'SELECT email, name FROM users WHERE clerk_user_id = $1',
        [userId],
      );
      expect(users[0].email).toBe('new@email.com');
      expect(users[0].name).toBe('New Name');

      // Cleanup
      await query('DELETE FROM users WHERE clerk_user_id = $1', [userId]);
      await query('DELETE FROM organizations WHERE clerk_org_id = $1', [uniqueOrgId]);
    });
  });

  describe('Error handling', () => {
    it('should call next() even when req.user is undefined', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn() as unknown as NextFunction;

      await syncUser(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should continue request even if sync fails', async () => {
      // Create request with invalid data that might cause DB error
      const { req, res, next } = createMockReqRes({
        id: 'sync-test-user-error',
        organizationId: null as any, // Invalid - will cause error
      });

      await syncUser(req, res, next);

      // Should still call next (don't block request)
      expect(next).toHaveBeenCalled();
    });
  });
});
