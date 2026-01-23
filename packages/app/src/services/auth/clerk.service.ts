/**
 * Clerk Authentication Service (Phase 0)
 * Handles user authentication and webhook events from Clerk
 *
 * RightFlow-ready: Supports multi-tenant architecture
 */

import { getDb } from '../../lib/db';
import crypto from 'crypto';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { OrganizationsService } from '../organizations/organizations.service';

export interface ClerkWebhookData {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    public_metadata?: {
      tenant_type?: 'rightflow' | 'docsflow';
    };
    created_at?: number;
    updated_at?: number;
    deleted?: boolean;
    // Organization fields
    name?: string;
    slug?: string;
    created_by?: string;
    // Membership fields
    organization?: {
      id: string;
    };
    public_user_data?: {
      user_id: string;
    };
    role?: string;
  };
}

export interface WebhookResult {
  success: boolean;
  userId?: string;
  organizationId?: string;
  tenantType?: 'rightflow' | 'docsflow';
  error?: string;
}

export interface SessionClaims {
  sub: string;
  org_id: string | null;
  org_role: 'admin' | 'basic_member' | null;
}

export class ClerkService {
  private clerkClient: ReturnType<typeof createClerkClient> | null = null;
  private organizationsService: OrganizationsService;

  constructor() {
    // Initialize Clerk client if secret key is available
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (secretKey) {
      this.clerkClient = createClerkClient({ secretKey });
    }

    // Initialize Organizations Service
    this.organizationsService = new OrganizationsService();
  }

  /**
   * Handle Clerk webhook events
   * Creates/updates/deletes user records based on Clerk events
   */
  async handleWebhook(webhookData: ClerkWebhookData): Promise<WebhookResult> {
    try {
      const { type, data } = webhookData;

      switch (type) {
        // User events
        case 'user.created':
          return await this.handleUserCreated(data);

        case 'user.updated':
          return await this.handleUserUpdated(data);

        case 'user.deleted':
          return await this.handleUserDeleted(data);

        // Organization events
        case 'organization.created':
          return await this.handleOrganizationCreated(data);

        case 'organization.updated':
          return await this.handleOrganizationUpdated(data);

        case 'organization.deleted':
          return await this.handleOrganizationDeleted(data);

        // Organization membership events
        case 'organizationMembership.created':
          return await this.handleOrganizationMembershipCreated(data);

        case 'organizationMembership.updated':
          return await this.handleOrganizationMembershipUpdated(data);

        case 'organizationMembership.deleted':
          return await this.handleOrganizationMembershipDeleted(data);

        default:
          return { success: false, error: `Unknown webhook type: ${type}` };
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle user.created webhook
   * Creates user record in database
   */
  private async handleUserCreated(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const db = getDb();

    const email = data.email_addresses?.[0]?.email_address;
    if (!email) {
      return { success: false, error: 'No email address provided' };
    }

    const tenantType = data.public_metadata?.tenant_type || 'rightflow';

    try {
      await db('users').insert({
        id: crypto.randomUUID(),
        clerk_id: data.id,
        email,
        tenant_type: tenantType,
        created_at: new Date(),
      });

      return {
        success: true,
        userId: data.id,
        tenantType,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database insert failed',
      };
    }
  }

  /**
   * Handle user.updated webhook
   * Updates user record in database
   */
  private async handleUserUpdated(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const db = getDb();

    const email = data.email_addresses?.[0]?.email_address;

    try {
      await db('users')
        .where({ clerk_id: data.id })
        .update({
          email,
          updated_at: new Date(),
        });

      return { success: true, userId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database update failed',
      };
    }
  }

  /**
   * Handle user.deleted webhook
   * Soft delete user record (or hard delete based on requirements)
   */
  private async handleUserDeleted(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const db = getDb();

    try {
      // Soft delete: mark as deleted
      await db('users')
        .where({ clerk_id: data.id })
        .update({
          deleted_at: new Date(),
        });

      return { success: true, userId: data.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database delete failed',
      };
    }
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId: string) {
    if (!clerkId) {
      throw new Error('Clerk ID is required');
    }

    const db = getDb();
    const user = await db('users')
      .where({ clerk_id: clerkId })
      .whereNull('deleted_at')
      .first();

    return user || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    const db = getDb();
    const user = await db('users')
      .where({ email })
      .whereNull('deleted_at')
      .first();

    return user || null;
  }

  /**
   * Validate Clerk webhook signature
   * Ensures webhooks are from Clerk and not tampered with
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // Clerk uses HMAC SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Handle organization.created webhook
   * Creates organization record in database
   */
  private async handleOrganizationCreated(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const { id, name, created_by } = data;

    if (!name || !created_by) {
      return { success: false, error: 'Missing required fields: name or created_by' };
    }

    // Map Clerk user ID to database user ID
    const db = getDb();
    const owner = await db('users')
      .where('clerk_id', created_by)
      .whereNull('deleted_at')
      .first('id');

    if (!owner) {
      return { success: false, error: 'Owner user not found in database' };
    }

    const result = await this.organizationsService.createOrganization(id, name, owner.id);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      organizationId: result.organizationId,
    };
  }

  /**
   * Handle organization.updated webhook
   * Updates organization record in database
   */
  private async handleOrganizationUpdated(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const { id, name } = data;

    if (!id) {
      return { success: false, error: 'Missing required field: id' };
    }

    const updates: { name?: string } = {};
    if (name) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    const result = await this.organizationsService.updateOrganization(id, updates);

    return result;
  }

  /**
   * Handle organization.deleted webhook
   * Deletes organization record from database
   */
  private async handleOrganizationDeleted(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const { id } = data;

    if (!id) {
      return { success: false, error: 'Missing required field: id' };
    }

    const result = await this.organizationsService.deleteOrganization(id);

    return result;
  }

  /**
   * Handle organizationMembership.created webhook
   * Adds member to organization
   */
  private async handleOrganizationMembershipCreated(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const { id, organization, public_user_data, role } = data;

    if (!organization?.id || !public_user_data?.user_id || !role) {
      return { success: false, error: 'Missing required fields: organization, user, or role' };
    }

    // Map Clerk org ID to database org ID
    const org = await this.organizationsService.getOrganizationByClerkId(organization.id);
    if (!org) {
      return { success: false, error: 'Organization not found in database' };
    }

    // Map Clerk user ID to database user ID
    const db = getDb();
    const user = await db('users')
      .where('clerk_id', public_user_data.user_id)
      .whereNull('deleted_at')
      .first('id');

    if (!user) {
      return { success: false, error: 'User not found in database' };
    }

    const result = await this.organizationsService.addMember(id, org.id, user.id, role);

    return result;
  }

  /**
   * Handle organizationMembership.updated webhook
   * Updates member role
   */
  private async handleOrganizationMembershipUpdated(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const { id, role } = data;

    if (!id) {
      return { success: false, error: 'Missing required field: id' };
    }

    if (!role) {
      return { success: false, error: 'Missing required field: role' };
    }

    const result = await this.organizationsService.updateMemberRole(id, role);

    return result;
  }

  /**
   * Handle organizationMembership.deleted webhook
   * Removes member from organization
   */
  private async handleOrganizationMembershipDeleted(data: ClerkWebhookData['data']): Promise<WebhookResult> {
    const { id } = data;

    if (!id) {
      return { success: false, error: 'Missing required field: id' };
    }

    const result = await this.organizationsService.removeMember(id);

    return result;
  }

  /**
   * Get Clerk client instance
   * For advanced Clerk API operations
   */
  getClerkClient() {
    return this.clerkClient;
  }

  /**
   * Verify JWT session token from Clerk
   * Returns session claims including org_id and org_role if user is in org context
   */
  async verifySessionToken(token: string): Promise<SessionClaims | null> {
    if (!this.clerkClient) {
      console.error('Clerk client not initialized. Check CLERK_SECRET_KEY environment variable.');
      return null;
    }

    try {
      const sessionToken = await this.clerkClient.verifyToken(token);

      // Map Clerk roles to our free tier roles
      let orgRole: 'admin' | 'basic_member' | null = null;
      if (sessionToken.org_role) {
        const clerkRole = sessionToken.org_role as string;
        if (clerkRole === 'admin') {
          orgRole = 'admin';
        } else if (clerkRole === 'basic_member' || clerkRole === 'member') {
          // Map 'member' to 'basic_member' for consistency
          orgRole = 'basic_member';
        }
      }

      return {
        sub: sessionToken.sub || '',
        org_id: sessionToken.org_id || null,
        org_role: orgRole,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const clerkService = new ClerkService();
