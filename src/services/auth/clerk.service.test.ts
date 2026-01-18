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

  describe('Multi-Tenant Support (RightFlow-Ready)', () => {
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

    it('supports RightFlow tenant type for future integration', async () => {
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

  describe('Session Token Verification (Organizations Support)', () => {
    it('verifySessionToken returns org_id and org_role when user is in org context', async () => {
      // Mock token that includes organization data
      const mockToken = 'mock_token_with_org';

      const sessionClaims = await clerkService.verifySessionToken(mockToken);

      // Should return session claims with org data
      expect(sessionClaims).toBeDefined();
      if (sessionClaims) {
        expect(sessionClaims).toHaveProperty('sub');
        expect(sessionClaims).toHaveProperty('org_id');
        expect(sessionClaims).toHaveProperty('org_role');
      }
    });

    it('verifySessionToken returns null for org_id when user is in personal context', async () => {
      // Mock token without organization context
      const mockToken = 'mock_token_personal';

      const sessionClaims = await clerkService.verifySessionToken(mockToken);

      // Should return session claims without org data
      expect(sessionClaims).toBeDefined();
      if (sessionClaims) {
        expect(sessionClaims).toHaveProperty('sub');
        expect(sessionClaims.org_id).toBeNull();
        expect(sessionClaims.org_role).toBeNull();
      }
    });

    it('verifySessionToken returns null for invalid token', async () => {
      const invalidToken = 'invalid_token';

      const sessionClaims = await clerkService.verifySessionToken(invalidToken);

      expect(sessionClaims).toBeNull();
    });

    it('verifySessionToken supports all org roles: admin, member, viewer', async () => {
      const roles = ['admin', 'member', 'viewer'] as const;

      for (const role of roles) {
        const mockToken = `mock_token_${role}`;
        const sessionClaims = await clerkService.verifySessionToken(mockToken);

        if (sessionClaims && sessionClaims.org_role) {
          expect(['admin', 'member', 'viewer']).toContain(sessionClaims.org_role);
        }
      }
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

  describe('Organization Webhooks (TDD)', () => {
    describe('organization.created', () => {
      it('creates organization in database when webhook received', async () => {
        const webhookData = {
          type: 'organization.created',
          data: {
            id: 'org_clerk123',
            name: 'Test Organization',
            slug: 'test-org',
            created_by: 'user_admin456',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(true);
        expect(result.organizationId).toBeDefined();
      });

      it('fails when required fields are missing', async () => {
        const webhookData = {
          type: 'organization.created',
          data: {
            id: 'org_123',
            // Missing name
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('organization.updated', () => {
      it('updates organization in database', async () => {
        const webhookData = {
          type: 'organization.updated',
          data: {
            id: 'org_clerk123',
            name: 'Updated Organization Name',
            slug: 'updated-org',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(true);
      });

      it('fails when organization not found', async () => {
        const webhookData = {
          type: 'organization.updated',
          data: {
            id: 'org_nonexistent',
            name: 'Should Not Work',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('organization.deleted', () => {
      it('deletes organization from database', async () => {
        const webhookData = {
          type: 'organization.deleted',
          data: {
            id: 'org_clerk123',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(true);
      });

      it('fails gracefully when organization not found', async () => {
        const webhookData = {
          type: 'organization.deleted',
          data: {
            id: 'org_nonexistent',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(false);
      });
    });

    describe('organizationMembership.created', () => {
      it('adds member to organization', async () => {
        const webhookData = {
          type: 'organizationMembership.created',
          data: {
            id: 'mem_clerk123',
            organization: {
              id: 'org_clerk456',
            },
            public_user_data: {
              user_id: 'user_clerk789',
            },
            role: 'member',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(true);
      });

      it('supports all roles: admin, member, viewer', async () => {
        const roles = ['admin', 'member', 'viewer'];

        for (const role of roles) {
          const webhookData = {
            type: 'organizationMembership.created',
            data: {
              id: `mem_${role}`,
              organization: { id: 'org_123' },
              public_user_data: { user_id: 'user_123' },
              role,
            },
          };

          const result = await clerkService.handleWebhook(webhookData);

          expect(result.success).toBe(true);
        }
      });

      it('fails when organization not found in database', async () => {
        const webhookData = {
          type: 'organizationMembership.created',
          data: {
            id: 'mem_123',
            organization: { id: 'org_nonexistent' },
            public_user_data: { user_id: 'user_123' },
            role: 'member',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('organizationMembership.updated', () => {
      it('updates member role', async () => {
        const webhookData = {
          type: 'organizationMembership.updated',
          data: {
            id: 'mem_clerk123',
            role: 'admin',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(true);
      });

      it('fails when membership not found', async () => {
        const webhookData = {
          type: 'organizationMembership.updated',
          data: {
            id: 'mem_nonexistent',
            role: 'admin',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(false);
      });
    });

    describe('organizationMembership.deleted', () => {
      it('removes member from organization', async () => {
        const webhookData = {
          type: 'organizationMembership.deleted',
          data: {
            id: 'mem_clerk123',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(true);
      });

      it('fails gracefully when membership not found', async () => {
        const webhookData = {
          type: 'organizationMembership.deleted',
          data: {
            id: 'mem_nonexistent',
          },
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(false);
      });
    });

    describe('Unknown Organization Events', () => {
      it('returns error for unknown organization event types', async () => {
        const webhookData = {
          type: 'organization.unknown_event',
          data: {},
        };

        const result = await clerkService.handleWebhook(webhookData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown');
      });
    });
  });
});
