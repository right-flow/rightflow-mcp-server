/**
 * Webhook Service Tests - Integration Hub Phase 6
 * Tests for webhook CRUD operations and signature verification
 *
 * Test Categories:
 * 1. Signature Generation & Verification (HMAC-SHA256)
 * 2. Webhook CRUD Operations
 * 3. Secret Encryption/Decryption
 * 4. Multi-Tenant Isolation
 * 5. Edge Cases
 */

import * as webhookService from './webhookService';
import { query } from '../../config/database';
import crypto from 'crypto';

// ============================================================================
// Setup & Teardown
// ============================================================================

beforeAll(async () => {
  // Ensure test database is clean
  await query('DELETE FROM webhook_deliveries');
  await query('DELETE FROM inbound_webhooks');
});

afterEach(async () => {
  // Clean up after each test
  await query('DELETE FROM webhook_deliveries');
  await query('DELETE FROM inbound_webhooks');
});

afterAll(async () => {
  // Final cleanup
  await query('DELETE FROM webhook_deliveries');
  await query('DELETE FROM inbound_webhooks');
});

// ============================================================================
// Category 1: Signature Generation & Verification (15 tests)
// ============================================================================

describe('Signature Generation & Verification', () => {
  describe('generateSignature', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';

      const signature = webhookService.generateSignature(payload, secret);

      // SHA-256 produces 64 character hex string
      expect(signature).toMatch(/^[a-f0-9]{64}$/);

      // Verify it matches Node.js crypto implementation
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      expect(signature).toBe(expected);
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'test-secret';
      const payload1 = JSON.stringify({ event: 'test1' });
      const payload2 = JSON.stringify({ event: 'test2' });

      const signature1 = webhookService.generateSignature(payload1, secret);
      const signature2 = webhookService.generateSignature(payload2, secret);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret1 = 'secret1';
      const secret2 = 'secret2';

      const signature1 = webhookService.generateSignature(payload, secret1);
      const signature2 = webhookService.generateSignature(payload, secret2);

      expect(signature1).not.toBe(signature2);
    });

    it('should be deterministic (same input produces same signature)', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';

      const signature1 = webhookService.generateSignature(payload, secret);
      const signature2 = webhookService.generateSignature(payload, secret);

      expect(signature1).toBe(signature2);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';
      const signature = webhookService.generateSignature(payload, secret);

      const isValid = webhookService.verifySignature(
        payload,
        `sha256=${signature}`,
        secret,
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';

      const isValid = webhookService.verifySignature(
        payload,
        'sha256=invalid',
        secret,
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature without sha256 prefix', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';
      const signature = webhookService.generateSignature(payload, secret);

      // Missing 'sha256=' prefix
      const isValid = webhookService.verifySignature(payload, signature, secret);

      expect(isValid).toBe(false);
    });

    it('should reject signature computed with wrong secret', () => {
      const payload = JSON.stringify({ event: 'test' });
      const correctSecret = 'correct-secret';
      const wrongSecret = 'wrong-secret';

      const signature = webhookService.generateSignature(payload, wrongSecret);

      const isValid = webhookService.verifySignature(
        payload,
        `sha256=${signature}`,
        correctSecret,
      );

      expect(isValid).toBe(false);
    });

    it('should handle signature prefix case-insensitively', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';
      const signature = webhookService.generateSignature(payload, secret);

      // Test with uppercase prefix
      const isValidUpper = webhookService.verifySignature(
        payload,
        `SHA256=${signature}`,
        secret,
      );

      expect(isValidUpper).toBe(true);
    });

    it('should trim whitespace from signature header', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';
      const signature = webhookService.generateSignature(payload, secret);

      // Test with whitespace
      const isValid = webhookService.verifySignature(
        payload,
        `  sha256=${signature}  `,
        secret,
      );

      expect(isValid).toBe(true);
    });

    it('should use timing-safe comparison to prevent timing attacks', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'test-secret';

      // Verify implementation uses crypto.timingSafeEqual
      // This is a meta-test to ensure security best practices
      const sourceCode = webhookService.verifySignature.toString();
      expect(sourceCode).toContain('timingSafeEqual');
    });
  });
});

// ============================================================================
// Category 2: Webhook CRUD Operations (18 tests)
// ============================================================================

describe('Webhook CRUD Operations', () => {
  describe('createWebhook', () => {
    it('should create webhook and return with secret', async () => {
      const result = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook',
          events: ['form.submitted'],
          formId: 'form-uuid',
          description: 'Test webhook',
        },
        'org-1',
      );

      expect(result.id).toBeDefined();
      expect(result.organizationId).toBe('org-1');
      expect(result.url).toBe('http://example.com/webhook');
      expect(result.events).toEqual(['form.submitted']);
      expect(result.formId).toBe('form-uuid');
      expect(result.description).toBe('Test webhook');
      expect(result.status).toBe('active');
      expect(result.healthStatus).toBe('unknown');
      expect(result.consecutiveFailures).toBe(0);

      // Secret should be returned (one-time)
      expect(result.secret).toBeDefined();
      expect(result.secret).toMatch(/^whsec_/);
      expect(result.secret.length).toBeGreaterThan(30);

      // Verify webhook created in database
      const rows = await query(
        'SELECT * FROM inbound_webhooks WHERE id = $1',
        [result.id],
      );
      expect(rows.length).toBe(1);
      expect(rows[0].organization_id).toBe('org-1');
    });

    it('should encrypt secret before storing', async () => {
      const result = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook',
          events: ['form.submitted'],
        },
        'org-1',
      );

      // Verify secret is encrypted in database
      const rows = await query(
        'SELECT secret_encrypted FROM inbound_webhooks WHERE id = $1',
        [result.id],
      );

      const secretEncrypted = rows[0].secret_encrypted;

      // Encrypted secret should NOT match plaintext secret
      expect(secretEncrypted).not.toBe(result.secret);

      // Encrypted secret should be longer (includes IV, auth tag)
      expect(secretEncrypted.length).toBeGreaterThan(result.secret.length);
    });

    it('should reject invalid URL (localhost)', async () => {
      await expect(
        webhookService.createWebhook(
          {
            url: 'http://localhost:3000/webhook',
            events: ['form.submitted'],
          },
          'org-1',
        ),
      ).rejects.toThrow('localhost');
    });

    it('should reject invalid URL (private IP)', async () => {
      const privateIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '127.0.0.1'];

      for (const ip of privateIPs) {
        await expect(
          webhookService.createWebhook(
            {
              url: `http://${ip}/webhook`,
              events: ['form.submitted'],
            },
            'org-1',
          ),
        ).rejects.toThrow('private');
      }
    });

    it('should reject self-referencing URL', async () => {
      await expect(
        webhookService.createWebhook(
          {
            url: 'https://rightflow.app/api/v1/integrations/webhooks/inbound/org-1/webhook-123',
            events: ['form.submitted'],
          },
          'org-1',
        ),
      ).rejects.toThrow('self-referencing');
    });

    it('should require at least one event', async () => {
      await expect(
        webhookService.createWebhook(
          {
            url: 'http://example.com/webhook',
            events: [],
          },
          'org-1',
        ),
      ).rejects.toThrow('event');
    });

    it('should generate unique secrets for each webhook', async () => {
      const webhook1 = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook1',
          events: ['form.submitted'],
        },
        'org-1',
      );

      const webhook2 = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook2',
          events: ['form.submitted'],
        },
        'org-1',
      );

      expect(webhook1.secret).not.toBe(webhook2.secret);
    });
  });

  describe('listWebhooks', () => {
    it('should list webhooks for organization', async () => {
      await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook1',
          events: ['form.submitted'],
        },
        'org-1',
      );

      await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook2',
          events: ['form.updated'],
        },
        'org-1',
      );

      const webhooks = await webhookService.listWebhooks('org-1');

      expect(webhooks).toHaveLength(2);
      expect(webhooks[0].organizationId).toBe('org-1');
      expect(webhooks[1].organizationId).toBe('org-1');

      // Secrets should NOT be included in list
      expect(webhooks[0].secret).toBeUndefined();
      expect(webhooks[1].secret).toBeUndefined();
    });

    it('should filter webhooks by form ID', async () => {
      await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook1',
          events: ['form.submitted'],
          formId: 'form-1',
        },
        'org-1',
      );

      await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook2',
          events: ['form.submitted'],
          formId: 'form-2',
        },
        'org-1',
      );

      const webhooks = await webhookService.listWebhooks('org-1', {
        formId: 'form-1',
      });

      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].formId).toBe('form-1');
    });

    it('should filter webhooks by status', async () => {
      const webhook1 = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook1',
          events: ['form.submitted'],
        },
        'org-1',
      );

      await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook2',
          events: ['form.submitted'],
        },
        'org-1',
      );

      // Disable first webhook
      await query('UPDATE inbound_webhooks SET status = $1 WHERE id = $2', [
        'disabled',
        webhook1.id,
      ]);

      const activeWebhooks = await webhookService.listWebhooks('org-1', {
        status: 'active',
      });

      expect(activeWebhooks).toHaveLength(1);
      expect(activeWebhooks[0].status).toBe('active');
    });

    it('should not include deleted webhooks', async () => {
      const webhook1 = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook1',
          events: ['form.submitted'],
        },
        'org-1',
      );

      await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook2',
          events: ['form.submitted'],
        },
        'org-1',
      );

      // Soft delete first webhook
      await webhookService.deleteWebhook(webhook1.id, 'org-1');

      const webhooks = await webhookService.listWebhooks('org-1');

      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].id).not.toBe(webhook1.id);
    });

    it('should not list webhooks from other organizations', async () => {
      await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook1',
          events: ['form.submitted'],
        },
        'org-1',
      );

      await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook2',
          events: ['form.submitted'],
        },
        'org-2',
      );

      const org1Webhooks = await webhookService.listWebhooks('org-1');
      const org2Webhooks = await webhookService.listWebhooks('org-2');

      expect(org1Webhooks).toHaveLength(1);
      expect(org2Webhooks).toHaveLength(1);
      expect(org1Webhooks[0].id).not.toBe(org2Webhooks[0].id);
    });
  });

  describe('getWebhook', () => {
    it('should get webhook by ID', async () => {
      const created = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook',
          events: ['form.submitted'],
          description: 'Test webhook',
        },
        'org-1',
      );

      const webhook = await webhookService.getWebhook(created.id, 'org-1');

      expect(webhook).toBeDefined();
      expect(webhook!.id).toBe(created.id);
      expect(webhook!.url).toBe('http://example.com/webhook');
      expect(webhook!.description).toBe('Test webhook');

      // Secret should NOT be returned
      expect(webhook!.secret).toBeUndefined();
    });

    it('should return null for non-existent webhook', async () => {
      const webhook = await webhookService.getWebhook(
        '123e4567-e89b-12d3-a456-426614174000',
        'org-1',
      );

      expect(webhook).toBeNull();
    });

    it('should return null for webhook from different organization', async () => {
      const created = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook',
          events: ['form.submitted'],
        },
        'org-1',
      );

      // Try to get webhook with wrong organization
      const webhook = await webhookService.getWebhook(created.id, 'org-2');

      expect(webhook).toBeNull();
    });

    it('should return null for deleted webhook', async () => {
      const created = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook',
          events: ['form.submitted'],
        },
        'org-1',
      );

      // Delete webhook
      await webhookService.deleteWebhook(created.id, 'org-1');

      // Try to get deleted webhook
      const webhook = await webhookService.getWebhook(created.id, 'org-1');

      expect(webhook).toBeNull();
    });
  });

  describe('deleteWebhook', () => {
    it('should soft delete webhook', async () => {
      const created = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook',
          events: ['form.submitted'],
        },
        'org-1',
      );

      await webhookService.deleteWebhook(created.id, 'org-1');

      // Verify webhook marked as deleted
      const rows = await query(
        'SELECT * FROM inbound_webhooks WHERE id = $1',
        [created.id],
      );

      expect(rows.length).toBe(1);
      expect(rows[0].deleted_at).toBeDefined();
      expect(rows[0].deleted_at).not.toBeNull();

      // Verify webhook not returned by getWebhook
      const webhook = await webhookService.getWebhook(created.id, 'org-1');
      expect(webhook).toBeNull();
    });

    it('should prevent deletion from different organization', async () => {
      const created = await webhookService.createWebhook(
        {
          url: 'http://example.com/webhook',
          events: ['form.submitted'],
        },
        'org-1',
      );

      // Try to delete with wrong organization
      await expect(
        webhookService.deleteWebhook(created.id, 'org-2'),
      ).rejects.toThrow('not found');

      // Verify webhook NOT deleted
      const webhook = await webhookService.getWebhook(created.id, 'org-1');
      expect(webhook).not.toBeNull();
    });
  });
});

// ============================================================================
// Category 3: Secret Encryption/Decryption (5 tests)
// ============================================================================

describe('Secret Encryption/Decryption', () => {
  it('should encrypt and decrypt secret correctly', async () => {
    const originalSecret = 'whsec_test123456';

    const encrypted = await webhookService.encryptSecret(originalSecret);
    const decrypted = await webhookService.decryptSecret(encrypted);

    expect(decrypted).toBe(originalSecret);
  });

  it('should produce different encrypted values for same secret', async () => {
    const secret = 'whsec_test123456';

    const encrypted1 = await webhookService.encryptSecret(secret);
    const encrypted2 = await webhookService.encryptSecret(secret);

    // Different due to random IV
    expect(encrypted1).not.toBe(encrypted2);

    // But both decrypt to same value
    const decrypted1 = await webhookService.decryptSecret(encrypted1);
    const decrypted2 = await webhookService.decryptSecret(encrypted2);

    expect(decrypted1).toBe(secret);
    expect(decrypted2).toBe(secret);
  });

  it('should fail to decrypt with wrong key', async () => {
    const secret = 'whsec_test123456';
    const encrypted = await webhookService.encryptSecret(secret);

    // Mock wrong key
    const originalKey = process.env.WEBHOOK_SECRET_KEY;
    process.env.WEBHOOK_SECRET_KEY = 'wrong-key';

    await expect(webhookService.decryptSecret(encrypted)).rejects.toThrow();

    // Restore original key
    process.env.WEBHOOK_SECRET_KEY = originalKey;
  });

  it('should fail to decrypt tampered ciphertext', async () => {
    const secret = 'whsec_test123456';
    const encrypted = await webhookService.encryptSecret(secret);

    // Tamper with encrypted value
    const tampered = encrypted.slice(0, -5) + 'XXXXX';

    await expect(webhookService.decryptSecret(tampered)).rejects.toThrow();
  });

  it('should generate cryptographically random secrets', () => {
    const secret1 = webhookService.generateSecret();
    const secret2 = webhookService.generateSecret();

    expect(secret1).toMatch(/^whsec_[A-Za-z0-9_-]{32,}$/);
    expect(secret2).toMatch(/^whsec_[A-Za-z0-9_-]{32,}$/);
    expect(secret1).not.toBe(secret2);
  });
});

// ============================================================================
// Category 4: Multi-Tenant Isolation (5 tests)
// ============================================================================

describe('Multi-Tenant Isolation', () => {
  it('should isolate webhooks by organization', async () => {
    const webhook1 = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook1',
        events: ['form.submitted'],
      },
      'org-1',
    );

    const webhook2 = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook2',
        events: ['form.submitted'],
      },
      'org-2',
    );

    // Org-1 should only see their webhook
    const org1Webhooks = await webhookService.listWebhooks('org-1');
    expect(org1Webhooks).toHaveLength(1);
    expect(org1Webhooks[0].id).toBe(webhook1.id);

    // Org-2 should only see their webhook
    const org2Webhooks = await webhookService.listWebhooks('org-2');
    expect(org2Webhooks).toHaveLength(1);
    expect(org2Webhooks[0].id).toBe(webhook2.id);
  });

  it('should prevent cross-tenant webhook access', async () => {
    const webhook = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook',
        events: ['form.submitted'],
      },
      'org-1',
    );

    // Try to access with wrong organization
    const result = await webhookService.getWebhook(webhook.id, 'org-2');

    expect(result).toBeNull();
  });

  it('should prevent cross-tenant webhook deletion', async () => {
    const webhook = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook',
        events: ['form.submitted'],
      },
      'org-1',
    );

    // Try to delete with wrong organization
    await expect(
      webhookService.deleteWebhook(webhook.id, 'org-2'),
    ).rejects.toThrow();

    // Verify webhook still exists
    const result = await webhookService.getWebhook(webhook.id, 'org-1');
    expect(result).not.toBeNull();
  });

  it('should handle UUID manipulation attempts', async () => {
    const webhook = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook',
        events: ['form.submitted'],
      },
      'org-1',
    );

    // Try to manipulate UUID (increment last character)
    const manipulatedId = webhook.id.slice(0, -1) + 'a';

    const result = await webhookService.getWebhook(manipulatedId, 'org-1');

    expect(result).toBeNull();
  });

  it('should sanitize SQL injection attempts', async () => {
    const maliciousOrgId = "'; DROP TABLE inbound_webhooks;--";

    // Should not throw, should return empty array
    const webhooks = await webhookService.listWebhooks(maliciousOrgId);

    expect(webhooks).toHaveLength(0);

    // Verify table still exists
    const rows = await query('SELECT COUNT(*) FROM inbound_webhooks');
    expect(rows[0]).toBeDefined();
  });
});

// ============================================================================
// Category 5: Edge Cases (7 tests)
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty description', async () => {
    const webhook = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook',
        events: ['form.submitted'],
        description: '',
      },
      'org-1',
    );

    expect(webhook.description).toBe('');
  });

  it('should handle null form ID', async () => {
    const webhook = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook',
        events: ['form.submitted'],
        formId: undefined,
      },
      'org-1',
    );

    expect(webhook.formId).toBeNull();
  });

  it('should handle multiple events', async () => {
    const webhook = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook',
        events: ['form.submitted', 'form.updated', 'form.deleted'],
      },
      'org-1',
    );

    expect(webhook.events).toHaveLength(3);
    expect(webhook.events).toContain('form.submitted');
    expect(webhook.events).toContain('form.updated');
    expect(webhook.events).toContain('form.deleted');
  });

  it('should handle very long URLs (4096 characters)', async () => {
    const longUrl = 'http://example.com/webhook/' + 'x'.repeat(4000);

    const webhook = await webhookService.createWebhook(
      {
        url: longUrl,
        events: ['form.submitted'],
      },
      'org-1',
    );

    expect(webhook.url).toBe(longUrl);
  });

  it('should reject URL longer than database limit', async () => {
    const tooLongUrl = 'http://example.com/webhook/' + 'x'.repeat(10000);

    await expect(
      webhookService.createWebhook(
        {
          url: tooLongUrl,
          events: ['form.submitted'],
        },
        'org-1',
      ),
    ).rejects.toThrow();
  });

  it('should handle Unicode in description', async () => {
    const webhook = await webhookService.createWebhook(
      {
        url: 'http://example.com/webhook',
        events: ['form.submitted'],
        description: 'Test webhook with Hebrew: שלום and emoji: 🚀',
      },
      'org-1',
    );

    expect(webhook.description).toContain('שלום');
    expect(webhook.description).toContain('🚀');
  });

  it('should handle signature with special characters in payload', () => {
    const payload = JSON.stringify({
      event: 'test',
      data: {
        name: "John O'Reilly",
        email: 'test+tag@example.com',
        description: 'Special chars: <>&"\'',
        unicode: 'שלום 你好 こんにちは 🚀',
      },
    });
    const secret = 'test-secret';

    const signature = webhookService.generateSignature(payload, secret);
    const isValid = webhookService.verifySignature(
      payload,
      `sha256=${signature}`,
      secret,
    );

    expect(isValid).toBe(true);
  });
});
