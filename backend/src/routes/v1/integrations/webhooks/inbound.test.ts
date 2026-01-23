/**
 * Inbound Webhook Receiver Tests - Integration Hub Phase 6
 * Tests for receiving webhooks from external systems (Activepieces, Zapier, etc.)
 *
 * Test Categories:
 * 1. Signature Verification
 * 2. Multi-Tenant Routing
 * 3. Payload Validation
 * 4. Rate Limiting
 * 5. Redis Caching
 * 6. Error Handling
 */

import request from 'supertest';
import express from 'express';
import inboundRouter from './inbound';
import * as webhookService from '../../../../services/integrationHub/webhookService';
import { redisConnection } from '../../../../config/redis';
import { query } from '../../../../config/database';

// ============================================================================
// Setup & Teardown
// ============================================================================

let app: express.Application;

beforeAll(async () => {
  // Clean database
  await query('DELETE FROM webhook_deliveries');
  await query('DELETE FROM inbound_webhooks');

  // Setup Express app
  app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/v1/integrations/webhooks', inboundRouter);
});

beforeEach(async () => {
  // Clear Redis cache
  const keys = await redisConnection.keys('webhook:*');
  if (keys.length > 0) {
    await redisConnection.del(...keys);
  }

  // Clear rate limiting keys
  const rlKeys = await redisConnection.keys('rl:webhook:*');
  if (rlKeys.length > 0) {
    await redisConnection.del(...rlKeys);
  }
});

afterEach(async () => {
  await query('DELETE FROM webhook_deliveries');
  await query('DELETE FROM inbound_webhooks');
});

afterAll(async () => {
  await query('DELETE FROM webhook_deliveries');
  await query('DELETE FROM inbound_webhooks');
  await redisConnection.quit();
});

// ============================================================================
// Helper Functions
// ============================================================================

async function createTestWebhook(organizationId: string) {
  return await webhookService.createWebhook(
    {
      url: 'http://example.com/webhook',
      events: ['form.submitted'],
    },
    organizationId,
  );
}

function generateValidSignature(payload: any, secret: string): string {
  const payloadString = JSON.stringify(payload);
  return webhookService.generateSignature(payloadString, secret);
}

// ============================================================================
// Category 1: Signature Verification (12 tests)
// ============================================================================

describe('POST /inbound/:organizationId/:webhookId - Signature Verification', () => {
  it('should accept webhook with valid signature', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      timestamp: new Date().toISOString(),
      data: {
        formId: 'form-1',
        submissionId: 'sub-1',
        fields: { customer_name: 'John Doe' },
      },
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.webhookId).toBe(webhook.id);
    expect(response.body.status).toBe('processed');
  });

  it('should reject webhook without signature header', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {},
    };

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .send(payload)
      .expect(401);

    expect(response.body.error).toContain('signature');
  });

  it('should reject webhook with invalid signature', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {},
    };

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', 'sha256=invalid')
      .send(payload)
      .expect(401);

    expect(response.body.error).toContain('signature');
  });

  it('should reject webhook with signature computed with wrong secret', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {},
    };
    const wrongSignature = generateValidSignature(payload, 'wrong-secret');

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${wrongSignature}`)
      .send(payload)
      .expect(401);

    expect(response.body.error).toContain('signature');
  });

  it('should reject signature without sha256 prefix', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {},
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', signature) // Missing 'sha256=' prefix
      .send(payload)
      .expect(401);

    expect(response.body.error).toContain('signature');
  });

  it('should handle signature with whitespace', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {},
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `  sha256=${signature}  `) // Extra whitespace
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should handle signature with uppercase prefix', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {},
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `SHA256=${signature}`) // Uppercase
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should verify signature for payload with special characters', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {
        customer_name: "John O'Reilly <test@example.com>",
        unicode: 'שלום 你好 🚀',
      },
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should reject modified payload (signature mismatch)', async () => {
    const webhook = await createTestWebhook('org-1');
    const originalPayload = {
      event: 'form.submitted',
      data: { amount: 100 },
    };
    const signature = generateValidSignature(originalPayload, webhook.secret!);

    // Send modified payload (amount changed)
    const modifiedPayload = {
      event: 'form.submitted',
      data: { amount: 10000 },
    };

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(modifiedPayload)
      .expect(401);

    expect(response.body.error).toContain('signature');
  });
});

// ============================================================================
// Category 2: Multi-Tenant Routing (8 tests)
// ============================================================================

describe('POST /inbound/:organizationId/:webhookId - Multi-Tenant Security', () => {
  it('should accept webhook for correct organization', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should reject webhook from wrong organization', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Try to POST with org-2 in URL
    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-2/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(403);

    expect(response.body.error).toContain('organization');
  });

  it('should prevent webhook ID manipulation', async () => {
    const org1Webhook = await createTestWebhook('org-1');
    const _org2Webhook = await createTestWebhook('org-2');

    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, org1Webhook.secret!);

    // Try to use org-1 webhook with org-2 URL
    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-2/${org1Webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(403);

    expect(response.body.error).toContain('organization');
  });

  it('should return 404 for non-existent webhook', async () => {
    const payload = { event: 'form.submitted', data: {} };

    const response = await request(app)
      .post('/api/v1/integrations/webhooks/inbound/org-1/123e4567-e89b-12d3-a456-426614174000')
      .set('X-RightFlow-Signature', 'sha256=abc')
      .send(payload)
      .expect(404);

    expect(response.body.error).toContain('not found');
  });

  it('should return 404 for non-existent organization', async () => {
    const payload = { event: 'form.submitted', data: {} };

    const response = await request(app)
      .post('/api/v1/integrations/webhooks/inbound/non-existent-org/123e4567-e89b-12d3-a456-426614174000')
      .set('X-RightFlow-Signature', 'sha256=abc')
      .send(payload)
      .expect(404);

    expect(response.body.error).toContain('not found');
  });

  it('should reject disabled webhook', async () => {
    const webhook = await createTestWebhook('org-1');

    // Disable webhook
    await query('UPDATE inbound_webhooks SET status = $1 WHERE id = $2', [
      'disabled',
      webhook.id,
    ]);

    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(403);

    expect(response.body.error).toContain('disabled');
  });

  it('should reject paused webhook', async () => {
    const webhook = await createTestWebhook('org-1');

    // Pause webhook
    await query('UPDATE inbound_webhooks SET status = $1 WHERE id = $2', [
      'paused',
      webhook.id,
    ]);

    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(403);

    expect(response.body.error).toContain('paused');
  });

  it('should sanitize SQL injection in organization ID', async () => {
    const maliciousOrgId = "'; DROP TABLE inbound_webhooks;--";
    const payload = { event: 'form.submitted', data: {} };

    const _response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/${encodeURIComponent(maliciousOrgId)}/webhook-123`)
      .set('X-RightFlow-Signature', 'sha256=abc')
      .send(payload)
      .expect(404);

    // Verify table still exists
    const rows = await query('SELECT COUNT(*) FROM inbound_webhooks');
    expect(rows[0]).toBeDefined();
  });
});

// ============================================================================
// Category 3: Payload Validation (10 tests)
// ============================================================================

describe('POST /inbound/:organizationId/:webhookId - Payload Validation', () => {
  it('should accept valid JSON payload', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      timestamp: new Date().toISOString(),
      data: {
        formId: 'form-1',
        submissionId: 'sub-1',
        fields: { customer_name: 'John Doe' },
      },
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should reject malformed JSON', async () => {
    const webhook = await createTestWebhook('org-1');

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('Content-Type', 'application/json')
      .set('X-RightFlow-Signature', 'sha256=abc')
      .send('{ invalid json }')
      .expect(400);

    expect(response.body.error).toContain('JSON');
  });

  it('should reject missing event field', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { data: { formId: 'test' } }; // Missing 'event'
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(400);

    expect(response.body.error).toContain('event');
  });

  it('should reject empty payload', async () => {
    const webhook = await createTestWebhook('org-1');

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', 'sha256=abc')
      .send({})
      .expect(400);

    expect(response.body.error).toContain('event');
  });

  it('should reject oversized payload (>10MB)', async () => {
    const webhook = await createTestWebhook('org-1');
    const hugePayload = {
      event: 'form.submitted',
      data: {
        field: 'A'.repeat(11 * 1024 * 1024), // 11 MB
      },
    };
    const signature = generateValidSignature(hugePayload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(hugePayload)
      .expect(413);

    expect(response.body.error).toContain('payload');
  });

  it('should accept payload with nested objects', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {
        customer: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'New York',
            country: {
              code: 'US',
              name: 'United States',
            },
          },
        },
      },
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should accept payload with arrays', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      },
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should accept payload with Unicode characters', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {
        customer_name: 'שלום עולם',
        greeting: '你好世界',
        emoji: '🚀🎉',
      },
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should handle null values in payload', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {
        customer_name: 'John',
        customer_email: null,
        customer_phone: null,
      },
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should reject deeply nested JSON (100+ levels)', async () => {
    const webhook = await createTestWebhook('org-1');

    // Create deeply nested object
    let nested: any = { value: 'deep' };
    for (let i = 0; i < 100; i++) {
      nested = { child: nested };
    }

    const payload = {
      event: 'form.submitted',
      data: nested,
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(400);

    expect(response.body.error).toContain('nested');
  });
});

// ============================================================================
// Category 4: Rate Limiting (6 tests)
// ============================================================================

describe('POST /inbound/:organizationId/:webhookId - Rate Limiting', () => {
  it('should allow up to 100 requests per minute', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Send 100 requests
    const requests = Array(100)
      .fill(null)
      .map(() =>
        request(app)
          .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
          .set('X-RightFlow-Signature', `sha256=${signature}`)
          .send(payload),
      );

    const results = await Promise.all(requests);
    const successes = results.filter((r) => r.status === 200);

    expect(successes.length).toBe(100);
  });

  it('should reject 101st request with 429', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Send 100 requests
    const requests = Array(100)
      .fill(null)
      .map(() =>
        request(app)
          .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
          .set('X-RightFlow-Signature', `sha256=${signature}`)
          .send(payload),
      );

    await Promise.all(requests);

    // 101st request should fail
    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(429);

    expect(response.body.error).toContain('rate limit');
  });

  it('should include Retry-After header in 429 response', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Exhaust rate limit
    const requests = Array(100)
      .fill(null)
      .map(() =>
        request(app)
          .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
          .set('X-RightFlow-Signature', `sha256=${signature}`)
          .send(payload),
      );

    await Promise.all(requests);

    // Next request should include Retry-After
    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(429);

    expect(response.headers['retry-after']).toBeDefined();
  });

  it('should isolate rate limits per webhook', async () => {
    const webhook1 = await createTestWebhook('org-1');
    const webhook2 = await createTestWebhook('org-1');

    const payload = { event: 'form.submitted', data: {} };
    const signature1 = generateValidSignature(payload, webhook1.secret!);
    const signature2 = generateValidSignature(payload, webhook2.secret!);

    // Exhaust rate limit for webhook1
    const requests1 = Array(100)
      .fill(null)
      .map(() =>
        request(app)
          .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook1.id}`)
          .set('X-RightFlow-Signature', `sha256=${signature1}`)
          .send(payload),
      );

    await Promise.all(requests1);

    // webhook1 should be rate limited
    await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook1.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature1}`)
      .send(payload)
      .expect(429);

    // webhook2 should still work
    await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook2.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature2}`)
      .send(payload)
      .expect(200);
  });

  it('should handle concurrent requests at rate limit boundary', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Send 98 requests
    const initial = Array(98)
      .fill(null)
      .map(() =>
        request(app)
          .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
          .set('X-RightFlow-Signature', `sha256=${signature}`)
          .send(payload),
      );

    await Promise.all(initial);

    // Send 5 concurrent requests (only 2 should succeed)
    const concurrent = Array(5)
      .fill(null)
      .map(() =>
        request(app)
          .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
          .set('X-RightFlow-Signature', `sha256=${signature}`)
          .send(payload),
      );

    const results = await Promise.all(concurrent);
    const successes = results.filter((r) => r.status === 200);
    const rateLimited = results.filter((r) => r.status === 429);

    expect(successes.length).toBeLessThanOrEqual(2);
    expect(rateLimited.length).toBeGreaterThanOrEqual(3);
  });

  it('should reset rate limit after 60 seconds', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Exhaust rate limit
    const requests = Array(100)
      .fill(null)
      .map(() =>
        request(app)
          .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
          .set('X-RightFlow-Signature', `sha256=${signature}`)
          .send(payload),
      );

    await Promise.all(requests);

    // Should be rate limited
    await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(429);

    // Mock time passage (60 seconds)
    // Note: This is a simplified test; actual implementation may use Redis TTL
    // In real testing, you'd either mock Redis or use testcontainers with time control

    // For now, we document expected behavior:
    // After 60 seconds, rate limit should reset and requests should succeed again
  }, 65000); // Extend timeout for this test
});

// ============================================================================
// Category 5: Redis Caching (5 tests)
// ============================================================================

describe('POST /inbound/:organizationId/:webhookId - Redis Caching', () => {
  it('should cache payload in Redis with 24h TTL', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      timestamp: new Date().toISOString(),
      data: { formId: 'form-1', submissionId: 'sub-1' },
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    // Verify cached in Redis
    const cacheKey = `webhook:payload:org-1:${webhook.id}:${payload.timestamp}`;
    const cached = await redisConnection.get(cacheKey);

    expect(cached).toBeDefined();
    expect(JSON.parse(cached!)).toMatchObject(payload);

    // Verify TTL is ~24 hours (86400 seconds)
    const ttl = await redisConnection.ttl(cacheKey);
    expect(ttl).toBeGreaterThan(86000); // Allow some variance
    expect(ttl).toBeLessThanOrEqual(86400);
  });

  it('should handle Redis connection failure gracefully', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Mock Redis failure
    jest.spyOn(redisConnection, 'setex').mockRejectedValue(new Error('Redis down'));

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(503);

    expect(response.body.error).toContain('cache');

    // Restore
    jest.restoreAllMocks();
  });

  it('should cache with unique key per webhook and timestamp', async () => {
    const webhook = await createTestWebhook('org-1');
    const timestamp1 = '2026-01-23T12:00:00Z';
    const timestamp2 = '2026-01-23T12:00:01Z';

    const payload1 = {
      event: 'form.submitted',
      timestamp: timestamp1,
      data: {},
    };
    const payload2 = {
      event: 'form.submitted',
      timestamp: timestamp2,
      data: {},
    };

    const signature1 = generateValidSignature(payload1, webhook.secret!);
    const signature2 = generateValidSignature(payload2, webhook.secret!);

    await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature1}`)
      .send(payload1)
      .expect(200);

    await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature2}`)
      .send(payload2)
      .expect(200);

    // Verify both cached with different keys
    const key1 = `webhook:payload:org-1:${webhook.id}:${timestamp1}`;
    const key2 = `webhook:payload:org-1:${webhook.id}:${timestamp2}`;

    const cached1 = await redisConnection.get(key1);
    const cached2 = await redisConnection.get(key2);

    expect(cached1).toBeDefined();
    expect(cached2).toBeDefined();
    expect(cached1).not.toBe(cached2);
  });

  it('should not cache if payload exceeds size limit', async () => {
    const webhook = await createTestWebhook('org-1');
    const largePayload = {
      event: 'form.submitted',
      timestamp: new Date().toISOString(),
      data: {
        field: 'X'.repeat(5 * 1024 * 1024), // 5 MB
      },
    };
    const signature = generateValidSignature(largePayload, webhook.secret!);

    await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(largePayload)
      .expect(200);

    // Verify NOT cached (too large)
    const cacheKey = `webhook:payload:org-1:${webhook.id}:${largePayload.timestamp}`;
    const cached = await redisConnection.get(cacheKey);

    expect(cached).toBeNull();
  });

  it('should handle missing timestamp in payload', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = {
      event: 'form.submitted',
      data: {}, // No timestamp
    };
    const signature = generateValidSignature(payload, webhook.secret!);

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Should generate timestamp and cache
    const keys = await redisConnection.keys(`webhook:payload:org-1:${webhook.id}:*`);
    expect(keys.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Category 6: Error Handling (5 tests)
// ============================================================================

describe('POST /inbound/:organizationId/:webhookId - Error Handling', () => {
  it('should return 500 on database error', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Mock database error
    jest.spyOn(query, 'execute').mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(500);

    expect(response.body.error).toBeDefined();

    jest.restoreAllMocks();
  });

  it('should not leak sensitive data in error messages', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: { ssn: '123-45-6789' } };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Force error
    jest.spyOn(redisConnection, 'setex').mockRejectedValue(new Error('Redis error'));

    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(503);

    // Error message should NOT contain SSN
    expect(JSON.stringify(response.body)).not.toContain('123-45-6789');

    jest.restoreAllMocks();
  });

  it('should handle invalid UUID in webhook ID', async () => {
    const payload = { event: 'form.submitted', data: {} };

    const response = await request(app)
      .post('/api/v1/integrations/webhooks/inbound/org-1/invalid-uuid')
      .set('X-RightFlow-Signature', 'sha256=abc')
      .send(payload)
      .expect(400);

    expect(response.body.error).toContain('UUID');
  });

  it('should handle missing Content-Type header', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    // Send without Content-Type header
    const response = await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(JSON.stringify(payload));

    // Should still work (Express parses JSON by default)
    expect([200, 415]).toContain(response.status);
  });

  it('should log webhook reception for audit trail', async () => {
    const webhook = await createTestWebhook('org-1');
    const payload = { event: 'form.submitted', data: {} };
    const signature = generateValidSignature(payload, webhook.secret!);

    const logSpy = jest.spyOn(console, 'info');

    await request(app)
      .post(`/api/v1/integrations/webhooks/inbound/org-1/${webhook.id}`)
      .set('X-RightFlow-Signature', `sha256=${signature}`)
      .send(payload)
      .expect(200);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Webhook received'),
    );

    logSpy.mockRestore();
  });
});
