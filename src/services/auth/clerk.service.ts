/**
 * Clerk Authentication Service (Phase 0)
 * Handles user authentication and webhook events from Clerk
 *
 * DocsFlow-ready: Supports multi-tenant architecture
 */

import { getDb } from '../../lib/db';
import crypto from 'crypto';
import { createClerkClient } from '@clerk/clerk-sdk-node';

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
  };
}

export interface WebhookResult {
  success: boolean;
  userId?: string;
  tenantType?: 'rightflow' | 'docsflow';
  error?: string;
}

export class ClerkService {
  private clerkClient: ReturnType<typeof createClerkClient> | null = null;

  constructor() {
    // Initialize Clerk client if secret key is available
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (secretKey) {
      this.clerkClient = createClerkClient({ secretKey });
    }
  }

  /**
   * Handle Clerk webhook events
   * Creates/updates/deletes user records based on Clerk events
   */
  async handleWebhook(webhookData: ClerkWebhookData): Promise<WebhookResult> {
    try {
      const { type, data } = webhookData;

      switch (type) {
        case 'user.created':
          return await this.handleUserCreated(data);

        case 'user.updated':
          return await this.handleUserUpdated(data);

        case 'user.deleted':
          return await this.handleUserDeleted(data);

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
   * Get Clerk client instance
   * For advanced Clerk API operations
   */
  getClerkClient() {
    return this.clerkClient;
  }

  /**
   * Verify JWT session token from Clerk
   * Returns userId if valid, null otherwise
   */
  async verifySessionToken(token: string): Promise<string | null> {
    if (!this.clerkClient) {
      console.error('Clerk client not initialized. Check CLERK_SECRET_KEY environment variable.');
      return null;
    }

    try {
      const sessionToken = await this.clerkClient.verifyToken(token);
      return sessionToken.sub || null;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const clerkService = new ClerkService();
