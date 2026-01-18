/**
 * Organizations Service Tests
 * Testing organization and membership management with TDD
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrganizationsService } from './organizations.service';
import { getDb } from '../../lib/db';
import crypto from 'crypto';

// Mock dependencies
vi.mock('../../lib/db');
vi.mock('crypto');

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockDbQuery: any;

  beforeEach(() => {
    service = new OrganizationsService();

    // Mock DB query chain
    mockDbQuery = {
      insert: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]),
      where: vi.fn().mockReturnThis(),
      whereNull: vi.fn().mockReturnThis(),
      first: vi.fn(),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(1),
      select: vi.fn().mockReturnThis(),
    };

    (getDb as any).mockReturnValue(() => mockDbQuery);

    // Mock crypto.randomUUID
    (crypto.randomUUID as any).mockReturnValue('test-uuid-123');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrganization()', () => {
    it('creates organization with valid data', async () => {
      const clerkOrgId = 'org_clerk123';
      const name = 'Test Organization';
      const ownerId = 'user_456';

      const result = await service.createOrganization(clerkOrgId, name, ownerId);

      expect(result.success).toBe(true);
      expect(result.organizationId).toBeDefined();
      expect(mockDbQuery.insert).toHaveBeenCalled();
    });

    it('fails when clerk_org_id is missing', async () => {
      const result = await service.createOrganization('', 'Test Org', 'user_456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('fails when name is missing', async () => {
      const result = await service.createOrganization('org_123', '', 'user_456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('fails when ownerId is missing', async () => {
      const result = await service.createOrganization('org_123', 'Test Org', '');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles database errors gracefully', async () => {
      mockDbQuery.insert.mockRejectedValue(new Error('DB Error'));

      const result = await service.createOrganization('org_123', 'Test Org', 'user_456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('DB Error');
    });
  });

  describe('updateOrganization()', () => {
    it('updates organization name', async () => {
      const clerkOrgId = 'org_clerk123';
      const updates = { name: 'Updated Name' };

      mockDbQuery.first.mockResolvedValue({ id: 'org_db_123' });

      const result = await service.updateOrganization(clerkOrgId, updates);

      expect(result.success).toBe(true);
      expect(mockDbQuery.update).toHaveBeenCalled();
    });

    it('fails when organization not found', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      const result = await service.updateOrganization('org_nonexistent', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('updates multiple fields', async () => {
      mockDbQuery.first.mockResolvedValue({ id: 'org_db_123' });

      const updates = {
        name: 'New Name',
        settings: { theme: 'dark' },
      };

      const result = await service.updateOrganization('org_123', updates);

      expect(result.success).toBe(true);
    });
  });

  describe('deleteOrganization()', () => {
    it('performs soft delete on organization', async () => {
      const clerkOrgId = 'org_clerk123';

      mockDbQuery.first.mockResolvedValue({ id: 'org_db_123' });

      const result = await service.deleteOrganization(clerkOrgId);

      expect(result.success).toBe(true);
      expect(mockDbQuery.update).toHaveBeenCalled();
    });

    it('fails when organization not found', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      const result = await service.deleteOrganization('org_nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('also deletes organization members', async () => {
      mockDbQuery.first.mockResolvedValue({ id: 'org_db_123' });

      await service.deleteOrganization('org_123');

      // Should delete members as well (cascade or explicit)
      expect(mockDbQuery.delete).toHaveBeenCalled();
    });
  });

  describe('addMember()', () => {
    it('adds member with role', async () => {
      const clerkMembershipId = 'mem_clerk123';
      const orgId = 'org_db_456';
      const userId = 'user_db_789';
      const role = 'member';

      const result = await service.addMember(clerkMembershipId, orgId, userId, role);

      expect(result.success).toBe(true);
      expect(mockDbQuery.insert).toHaveBeenCalled();
    });

    it('fails when member already exists', async () => {
      mockDbQuery.insert.mockRejectedValue({ code: '23505' }); // Unique constraint violation

      const result = await service.addMember('mem_123', 'org_456', 'user_789', 'member');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('validates role is valid (admin, member, viewer)', async () => {
      const result = await service.addMember('mem_123', 'org_456', 'user_789', 'invalid_role' as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });

    it('accepts admin role', async () => {
      const result = await service.addMember('mem_123', 'org_456', 'user_789', 'admin');

      expect(result.success).toBe(true);
    });

    it('accepts viewer role', async () => {
      const result = await service.addMember('mem_123', 'org_456', 'user_789', 'viewer');

      expect(result.success).toBe(true);
    });
  });

  describe('updateMemberRole()', () => {
    it('updates member role', async () => {
      const clerkMembershipId = 'mem_clerk123';
      const newRole = 'admin';

      mockDbQuery.first.mockResolvedValue({ id: 'membership_db_123' });

      const result = await service.updateMemberRole(clerkMembershipId, newRole);

      expect(result.success).toBe(true);
      expect(mockDbQuery.update).toHaveBeenCalled();
    });

    it('fails when membership not found', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      const result = await service.updateMemberRole('mem_nonexistent', 'admin');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('validates new role is valid', async () => {
      mockDbQuery.first.mockResolvedValue({ id: 'membership_db_123' });

      const result = await service.updateMemberRole('mem_123', 'invalid_role' as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });
  });

  describe('removeMember()', () => {
    it('removes member from organization', async () => {
      const clerkMembershipId = 'mem_clerk123';

      mockDbQuery.first.mockResolvedValue({ id: 'membership_db_123' });

      const result = await service.removeMember(clerkMembershipId);

      expect(result.success).toBe(true);
      expect(mockDbQuery.delete).toHaveBeenCalled();
    });

    it('fails when membership not found', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      const result = await service.removeMember('mem_nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('isUserMember()', () => {
    it('returns true when user is member of organization', async () => {
      const userId = 'user_db_123';
      const orgId = 'org_db_456';

      mockDbQuery.first.mockResolvedValue({ id: 'membership_123' });

      const isMember = await service.isUserMember(userId, orgId);

      expect(isMember).toBe(true);
    });

    it('returns false when user is not member', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      const isMember = await service.isUserMember('user_123', 'org_456');

      expect(isMember).toBe(false);
    });

    it('handles database errors and returns false', async () => {
      mockDbQuery.first.mockRejectedValue(new Error('DB Error'));

      const isMember = await service.isUserMember('user_123', 'org_456');

      expect(isMember).toBe(false);
    });
  });

  describe('getUserRole()', () => {
    it('returns role when user is member', async () => {
      const userId = 'user_db_123';
      const orgId = 'org_db_456';

      mockDbQuery.first.mockResolvedValue({ role: 'admin' });

      const role = await service.getUserRole(userId, orgId);

      expect(role).toBe('admin');
    });

    it('returns null when user is not member', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      const role = await service.getUserRole('user_123', 'org_456');

      expect(role).toBeNull();
    });

    it('returns correct role for member', async () => {
      mockDbQuery.first.mockResolvedValue({ role: 'member' });

      const role = await service.getUserRole('user_123', 'org_456');

      expect(role).toBe('member');
    });

    it('returns correct role for viewer', async () => {
      mockDbQuery.first.mockResolvedValue({ role: 'viewer' });

      const role = await service.getUserRole('user_123', 'org_456');

      expect(role).toBe('viewer');
    });

    it('handles database errors and returns null', async () => {
      mockDbQuery.first.mockRejectedValue(new Error('DB Error'));

      const role = await service.getUserRole('user_123', 'org_456');

      expect(role).toBeNull();
    });
  });

  describe('getOrganizationByClerkId()', () => {
    it('returns organization when found', async () => {
      const clerkOrgId = 'org_clerk123';

      mockDbQuery.first.mockResolvedValue({
        id: 'org_db_123',
        clerk_org_id: clerkOrgId,
        name: 'Test Org',
      });

      const org = await service.getOrganizationByClerkId(clerkOrgId);

      expect(org).toBeDefined();
      expect(org?.clerk_org_id).toBe(clerkOrgId);
    });

    it('returns null when not found', async () => {
      mockDbQuery.first.mockResolvedValue(null);

      const org = await service.getOrganizationByClerkId('org_nonexistent');

      expect(org).toBeNull();
    });
  });
});
