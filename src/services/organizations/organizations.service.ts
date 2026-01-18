/**
 * Organizations Service
 * Handles organization and membership management
 */

import { getDb } from '../../lib/db';
import crypto from 'crypto';

type Role = 'admin' | 'member' | 'viewer';

interface ServiceResult {
  success: boolean;
  organizationId?: string;
  error?: string;
}

interface OrganizationRecord {
  id: string;
  clerk_org_id: string;
  clerk_slug?: string;
  name: string;
  owner_id: string;
  settings?: any;
  created_at: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

export class OrganizationsService {
  private readonly validRoles: Role[] = ['admin', 'member', 'viewer'];

  /**
   * Validates that a role is valid
   */
  private isValidRole(role: string): role is Role {
    return this.validRoles.includes(role as Role);
  }

  /**
   * Creates a new organization
   */
  async createOrganization(
    clerkOrgId: string,
    name: string,
    ownerId: string
  ): Promise<ServiceResult> {
    // Validate inputs
    if (!clerkOrgId) {
      return { success: false, error: 'clerk_org_id is required' };
    }
    if (!name) {
      return { success: false, error: 'name is required' };
    }
    if (!ownerId) {
      return { success: false, error: 'ownerId is required' };
    }

    try {
      const db = getDb();
      const id = crypto.randomUUID();

      await db('organizations').insert({
        id,
        clerk_org_id: clerkOrgId,
        name,
        owner_id: ownerId,
        created_at: new Date(),
      });

      return {
        success: true,
        organizationId: id,
      };
    } catch (error: any) {
      console.error('Error creating organization:', error);
      return {
        success: false,
        error: `Failed to create organization: ${error.message}`,
      };
    }
  }

  /**
   * Updates an organization
   */
  async updateOrganization(
    clerkOrgId: string,
    updates: Partial<Pick<OrganizationRecord, 'name' | 'settings'>>
  ): Promise<ServiceResult> {
    try {
      const db = getDb();

      // Find organization
      const org = await db('organizations')
        .where({ clerk_org_id: clerkOrgId })
        .whereNull('deleted_at')
        .first('id');

      if (!org) {
        return {
          success: false,
          error: 'Organization not found',
        };
      }

      // Update organization
      await db('organizations')
        .where({ id: org.id })
        .update({
          ...updates,
          updated_at: new Date(),
        });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating organization:', error);
      return {
        success: false,
        error: `Failed to update organization: ${error.message}`,
      };
    }
  }

  /**
   * Deletes an organization (soft delete)
   */
  async deleteOrganization(clerkOrgId: string): Promise<ServiceResult> {
    try {
      const db = getDb();

      // Find organization
      const org = await db('organizations')
        .where({ clerk_org_id: clerkOrgId })
        .whereNull('deleted_at')
        .first('id');

      if (!org) {
        return {
          success: false,
          error: 'Organization not found',
        };
      }

      // Soft delete organization
      await db('organizations')
        .where({ id: org.id })
        .update({
          deleted_at: new Date(),
        });

      // Delete members
      await db('organization_members')
        .where({ org_id: org.id })
        .delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      return {
        success: false,
        error: `Failed to delete organization: ${error.message}`,
      };
    }
  }

  /**
   * Adds a member to an organization
   */
  async addMember(
    clerkMembershipId: string,
    orgId: string,
    userId: string,
    role: string
  ): Promise<ServiceResult> {
    // Validate role
    if (!this.isValidRole(role)) {
      return {
        success: false,
        error: 'Invalid role. Must be admin, member, or viewer',
      };
    }

    try {
      const db = getDb();
      const id = crypto.randomUUID();

      await db('organization_members').insert({
        id,
        clerk_membership_id: clerkMembershipId,
        org_id: orgId,
        user_id: userId,
        role,
        created_at: new Date(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error adding member:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Member already exists in this organization',
        };
      }

      return {
        success: false,
        error: `Failed to add member: ${error.message}`,
      };
    }
  }

  /**
   * Updates a member's role
   */
  async updateMemberRole(
    clerkMembershipId: string,
    newRole: string
  ): Promise<ServiceResult> {
    // Validate role
    if (!this.isValidRole(newRole)) {
      return {
        success: false,
        error: 'Invalid role. Must be admin, member, or viewer',
      };
    }

    try {
      const db = getDb();

      // Find membership
      const membership = await db('organization_members')
        .where({ clerk_membership_id: clerkMembershipId })
        .first('id');

      if (!membership) {
        return {
          success: false,
          error: 'Membership not found',
        };
      }

      // Update role
      await db('organization_members')
        .where({ id: membership.id })
        .update({
          role: newRole,
          updated_at: new Date(),
        });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating member role:', error);
      return {
        success: false,
        error: `Failed to update member role: ${error.message}`,
      };
    }
  }

  /**
   * Removes a member from an organization
   */
  async removeMember(clerkMembershipId: string): Promise<ServiceResult> {
    try {
      const db = getDb();

      // Find membership
      const membership = await db('organization_members')
        .where({ clerk_membership_id: clerkMembershipId })
        .first('id');

      if (!membership) {
        return {
          success: false,
          error: 'Membership not found',
        };
      }

      // Delete membership
      await db('organization_members')
        .where({ id: membership.id })
        .delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error removing member:', error);
      return {
        success: false,
        error: `Failed to remove member: ${error.message}`,
      };
    }
  }

  /**
   * Checks if a user is a member of an organization
   */
  async isUserMember(userId: string, orgId: string): Promise<boolean> {
    try {
      const db = getDb();

      const membership = await db('organization_members')
        .where({ user_id: userId, org_id: orgId })
        .first('id');

      return !!membership;
    } catch (error: any) {
      console.error('Error checking membership:', error);
      return false;
    }
  }

  /**
   * Gets a user's role in an organization
   */
  async getUserRole(userId: string, orgId: string): Promise<string | null> {
    try {
      const db = getDb();

      const membership = await db('organization_members')
        .where({ user_id: userId, org_id: orgId })
        .first('role');

      return membership?.role || null;
    } catch (error: any) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Gets an organization by Clerk organization ID
   */
  async getOrganizationByClerkId(
    clerkOrgId: string
  ): Promise<OrganizationRecord | null> {
    try {
      const db = getDb();

      const org = await db('organizations')
        .where({ clerk_org_id: clerkOrgId })
        .whereNull('deleted_at')
        .first();

      return org || null;
    } catch (error: any) {
      console.error('Error getting organization:', error);
      return null;
    }
  }
}
