/**
 * Clerk Authentication Service Tests (Phase 0)
 * Following TDD methodology
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClerkService } from './clerk.service';

// Mock Clerk SDK
vi.mock('@clerk/clerk-sdk-node', () => ({
  default: vi.fn(() => ({
    users: {
      getUser: vi.fn(),
      getUserList: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    },
  })),
}));

describe('ClerkService (Authentication)', () => {
  let clerkService: ClerkService;

  beforeEach(() => {
    clerkService = new ClerkService();
  });

  describe('User Creation via Webhook', () => {
    it('creates user record on Clerk webhook', async () => {
      const webhookData = {
        type: 'user.created',
        data: {
          id: 'user_test123',
          email_addresses: [{ email_address: 'test@example.com' }],
          created_at: Date.now(),
        },
      };

      const result = await clerkService.handleWebhook(webhookData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user_test123');
    });

    it('syncs user profile updates', async () => {
      const webhookData = {
        type: 'user.updated',
        data: {
          id: 'user_test123',
          email_addresses: [{ email_address: 'updated@example.com' }],
          updated_at: Date.now(),
        },
      };

      const result = await clerkService.handleWebhook(webhookData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('handles user deletion', async () => {
      const webhookData = {
        type: 'user.deleted',
        data: {
          id: 'user_test123',
          deleted: true,
        },
      };

      const result = await clerkService.handleWebhook(webhookData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('User Retrieval', () => {
    it('gets user by Clerk ID', async () => {
      const userId = 'user_test123';
      const user = await clerkService.getUserByClerkId(userId);

      expect(user).toBeDefined();
      // In real implementation, this would query the database
    });

    it('gets user by email', async () => {
      const email = 'test@example.com';
      const user = await clerkService.getUserByEmail(email);

      expect(user).toBeDefined();
    });

    it('handles non-existent user gracefully', async () => {
      const result = await clerkService.getUserByClerkId('user_nonexistent');

      // Should return null or undefined, not throw error
      expect(result === null || result === undefined).toBe(true);
    });
  });

  describe('Webhook Validation', () => {
    it('validates webhook signature', () => {
      const payload = JSON.stringify({ type: 'user.created' });
      const signature = 'test_signature';
      const secret = process.env.CLERK_WEBHOOK_SECRET || 'test_secret';

      const isValid = clerkService.validateWebhookSignature(payload, signature, secret);

      expect(typeof isValid).toBe('boolean');
    });

    it('rejects invalid webhook signatures', () => {
      const payload = JSON.stringify({ type: 'user.created' });
      const invalidSignature = 'invalid_signature';
      const secret = process.env.CLERK_WEBHOOK_SECRET || 'test_secret';

      const isValid = clerkService.validateWebhookSignature(payload, invalidSignature, secret);

      expect(isValid).toBe(false);
    });
  });

  describe('Multi-Tenant Support (DocsFlow-Ready)', () => {
    it('creates RightFlow users with correct tenant_type', async () => {
      const webhookData = {
        type: 'user.created',
        data: {
          id: 'user_rightflow123',
          email_addresses: [{ email_address: 'rightflow@example.com' }],
          public_metadata: { tenant_type: 'rightflow' as const },
        },
      };

      const result = await clerkService.handleWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.tenantType).toBe('rightflow');
    });

    it('supports DocsFlow tenant type for future integration', async () => {
      const webhookData = {
        type: 'user.created',
        data: {
          id: 'user_docsflow123',
          email_addresses: [{ email_address: 'docsflow@example.com' }],
          public_metadata: { tenant_type: 'docsflow' as const },
        },
      };

      const result = await clerkService.handleWebhook(webhookData);

      expect(result.success).toBe(true);
      expect(result.tenantType).toBe('docsflow');
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      // Simulate database error
      const webhookData = {
        type: 'user.created',
        data: {
          id: 'user_error',
          email_addresses: [],  // Invalid: no email
        },
      };

      const result = await clerkService.handleWebhook(webhookData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles Clerk API errors', async () => {
      // Test error handling for Clerk API failures
      const invalidUserId = '';

      await expect(async () => {
        await clerkService.getUserByClerkId(invalidUserId);
      }).rejects.toThrow();
    });
  });
});
