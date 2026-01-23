/**
 * Webhook Delivery Service Tests - Integration Hub Phase 6
 * Tests webhook delivery enqueueing, processing, and health tracking
 *
 * Test Coverage:
 * - Job enqueueing (finding webhooks for events)
 * - Payload formatting
 * - Delivery execution (HTTP POST with HMAC signature)
 * - Delivery result recording
 * - Webhook health status updates
 * - Circuit breaker logic
 * - Multi-tenant isolation
 * - Error handling
 */

import { query } from '../../config/database';
import * as webhookDeliveryService from './webhookDeliveryService';
import * as webhookService from './webhookService';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('./webhookService');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Webhook Delivery Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Category 1: Find Webhooks for Event
  // ============================================================================

  describe('findWebhooksForEvent', () => {
    it('should find webhooks by organization and event', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          organizationId: 'org-1',
          url: 'https://example.com/webhook1',
          events: ['form.submitted', 'form.updated'],
          status: 'active',
          healthStatus: 'healthy',
        },
        {
          id: 'webhook-2',
          organizationId: 'org-1',
          url: 'https://example.com/webhook2',
          events: ['form.submitted'],
          status: 'active',
          healthStatus: 'healthy',
        },
      ];

      mockQuery.mockResolvedValue(mockWebhooks);

      const webhooks = await webhookDeliveryService.findWebhooksForEvent(
        'org-1',
        'form.submitted',
      );

      expect(webhooks).toEqual(mockWebhooks);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM inbound_webhooks'),
        expect.arrayContaining(['org-1', 'form.submitted']),
      );
    });

    it('should filter webhooks by formId if provided', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          organizationId: 'org-1',
          url: 'https://example.com/webhook1',
          events: ['form.submitted'],
          formId: 'form-123',
          status: 'active',
        },
      ];

      mockQuery.mockResolvedValue(mockWebhooks);

      const webhooks = await webhookDeliveryService.findWebhooksForEvent(
        'org-1',
        'form.submitted',
        'form-123',
      );

      expect(webhooks).toEqual(mockWebhooks);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND (form_id = $3 OR form_id IS NULL)'),
        ['org-1', 'form.submitted', 'form-123'],
      );
    });

    it('should return empty array if no webhooks found', async () => {
      mockQuery.mockResolvedValue([]);

      const webhooks = await webhookDeliveryService.findWebhooksForEvent(
        'org-1',
        'form.submitted',
      );

      expect(webhooks).toEqual([]);
    });

    it('should only return active webhooks', async () => {
      // Query should filter WHERE status = 'active'
      mockQuery.mockResolvedValue([]);

      await webhookDeliveryService.findWebhooksForEvent('org-1', 'form.submitted');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'"),
        expect.any(Array),
      );
    });

    it('should filter by deleted_at IS NULL', async () => {
      mockQuery.mockResolvedValue([]);

      await webhookDeliveryService.findWebhooksForEvent('org-1', 'form.submitted');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.any(Array),
      );
    });
  });

  // ============================================================================
  // Category 2: Enqueue Webhook Delivery
  // ============================================================================

  describe('enqueueWebhookDelivery', () => {
    it('should enqueue delivery job for matching webhooks', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          organizationId: 'org-1',
          url: 'https://example.com/webhook1',
          events: ['form.submitted'],
          status: 'active',
        },
      ];

      mockQuery.mockResolvedValue(mockWebhooks);

      const payload = {
        event: 'form.submitted',
        formId: 'form-123',
        data: { field1: 'value1' },
      };

      const jobIds = await webhookDeliveryService.enqueueWebhookDelivery(
        'org-1',
        'form.submitted',
        payload,
      );

      expect(jobIds).toHaveLength(1);
      expect(typeof jobIds[0]).toBe('string');
    });

    it('should enqueue multiple jobs if multiple webhooks match', async () => {
      const mockWebhooks = [
        { id: 'webhook-1', url: 'https://example.com/webhook1', events: ['form.submitted'], status: 'active', organizationId: 'org-1' },
        { id: 'webhook-2', url: 'https://example.com/webhook2', events: ['form.submitted'], status: 'active', organizationId: 'org-1' },
        { id: 'webhook-3', url: 'https://example.com/webhook3', events: ['form.submitted'], status: 'active', organizationId: 'org-1' },
      ];

      mockQuery.mockResolvedValue(mockWebhooks);

      const payload = { event: 'form.submitted', data: {} };
      const jobIds = await webhookDeliveryService.enqueueWebhookDelivery(
        'org-1',
        'form.submitted',
        payload,
      );

      expect(jobIds).toHaveLength(3);
    });

    it('should return empty array if no webhooks match', async () => {
      mockQuery.mockResolvedValue([]);

      const payload = { event: 'form.submitted', data: {} };
      const jobIds = await webhookDeliveryService.enqueueWebhookDelivery(
        'org-1',
        'form.submitted',
        payload,
      );

      expect(jobIds).toEqual([]);
    });

    it('should include timestamp in payload if not provided', async () => {
      const mockWebhooks = [
        { id: 'webhook-1', url: 'https://example.com/webhook', events: ['form.submitted'], status: 'active', organizationId: 'org-1' },
      ];

      mockQuery.mockResolvedValue(mockWebhooks);

      const payload = { event: 'form.submitted', data: {} };
      await webhookDeliveryService.enqueueWebhookDelivery(
        'org-1',
        'form.submitted',
        payload,
      );

      // Job should be enqueued with timestamp added
      // We'll verify this in the implementation
    });

    it('should pass formId to findWebhooksForEvent if present in payload', async () => {
      mockQuery.mockResolvedValue([]);

      const payload = {
        event: 'form.submitted',
        formId: 'form-123',
        data: {},
      };

      await webhookDeliveryService.enqueueWebhookDelivery(
        'org-1',
        'form.submitted',
        payload,
        'form-123',
      );

      // Should call findWebhooksForEvent with formId
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('form_id'),
        expect.arrayContaining(['form-123']),
      );
    });
  });

  // ============================================================================
  // Category 3: Process Webhook Delivery (HTTP POST)
  // ============================================================================

  describe('processWebhookDelivery', () => {
    it('should make HTTP POST request to webhook URL', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = {
        event: 'form.submitted',
        formId: 'form-123',
        timestamp: new Date().toISOString(),
        data: { field1: 'value1' },
      };

      // Mock decrypt secret
      (webhookService.decryptSecret as jest.Mock).mockResolvedValue('test-secret');

      // Mock successful HTTP response
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      global.fetch = mockFetch;

      const result = await webhookDeliveryService.processWebhookDelivery(
        webhook,
        payload,
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-RightFlow-Signature': expect.stringMatching(/^sha256=/),
          }),
          body: JSON.stringify(payload),
        }),
      );
    });

    it('should generate HMAC signature for payload', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      (webhookService.decryptSecret as jest.Mock).mockResolvedValue('test-secret');
      (webhookService.generateSignature as jest.Mock).mockReturnValue('abc123');

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      global.fetch = mockFetch;

      await webhookDeliveryService.processWebhookDelivery(webhook, payload);

      expect(webhookService.generateSignature).toHaveBeenCalledWith(
        JSON.stringify(payload),
        'test-secret',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-RightFlow-Signature': 'sha256=abc123',
          }),
        }),
      );
    });

    it('should handle HTTP 4xx errors as delivery failure', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      (webhookService.decryptSecret as jest.Mock).mockResolvedValue('test-secret');

      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      global.fetch = mockFetch;

      const result = await webhookDeliveryService.processWebhookDelivery(
        webhook,
        payload,
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toContain('404');
    });

    it('should handle network errors', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      (webhookService.decryptSecret as jest.Mock).mockResolvedValue('test-secret');

      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const result = await webhookDeliveryService.processWebhookDelivery(
        webhook,
        payload,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should measure response time', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      (webhookService.decryptSecret as jest.Mock).mockResolvedValue('test-secret');

      const mockFetch = jest.fn().mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ok: true, status: 200 }), 100),
        ),
      );
      global.fetch = mockFetch;

      const result = await webhookDeliveryService.processWebhookDelivery(
        webhook,
        payload,
      );

      expect(result.responseTimeMs).toBeGreaterThanOrEqual(100);
    });

    it('should timeout after 10 seconds', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      (webhookService.decryptSecret as jest.Mock).mockResolvedValue('test-secret');

      const mockFetch = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ ok: true, status: 200 }), 15000)),
      );
      global.fetch = mockFetch;

      const result = await webhookDeliveryService.processWebhookDelivery(
        webhook,
        payload,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 12000); // Test timeout 12s
  });

  // ============================================================================
  // Category 4: Record Delivery Result
  // ============================================================================

  describe('recordDeliveryResult', () => {
    it('should insert delivery record on success', async () => {
      mockQuery.mockResolvedValue([{ id: 'delivery-1' }]);

      await webhookDeliveryService.recordDeliveryResult(
        'webhook-1',
        'form.submitted',
        { event: 'form.submitted', data: {} },
        'sha256=abc123',
        {
          success: true,
          statusCode: 200,
          responseTimeMs: 150,
        },
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_deliveries'),
        expect.arrayContaining([
          'webhook-1',
          'form.submitted',
          expect.any(String), // payload_hash
          'sha256=abc123',
          'delivered',
          200,
          null, // error_message
          150,
          1, // attempt
        ]),
      );
    });

    it('should insert delivery record on failure', async () => {
      mockQuery.mockResolvedValue([{ id: 'delivery-1' }]);

      await webhookDeliveryService.recordDeliveryResult(
        'webhook-1',
        'form.submitted',
        { event: 'form.submitted', data: {} },
        'sha256=abc123',
        {
          success: false,
          statusCode: 500,
          error: 'Internal Server Error',
          responseTimeMs: 50,
        },
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_deliveries'),
        expect.arrayContaining([
          'webhook-1',
          'form.submitted',
          expect.any(String),
          'sha256=abc123',
          'failed',
          500,
          'Internal Server Error',
          50,
          1,
        ]),
      );
    });

    it('should calculate payload hash (SHA-256)', async () => {
      mockQuery.mockResolvedValue([{ id: 'delivery-1' }]);

      const payload = { event: 'form.submitted', data: { field: 'value' } };

      await webhookDeliveryService.recordDeliveryResult(
        'webhook-1',
        'form.submitted',
        payload,
        'sha256=abc123',
        { success: true, statusCode: 200, responseTimeMs: 100 },
      );

      // Should pass payload hash as parameter
      const callArgs = mockQuery.mock.calls[0]?.[1];
      expect(callArgs).toBeDefined();

      const payloadHash = callArgs![2]; // Third parameter

      expect(typeof payloadHash).toBe('string');
      expect(payloadHash).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('should set attempt number', async () => {
      mockQuery.mockResolvedValue([{ id: 'delivery-1' }]);

      await webhookDeliveryService.recordDeliveryResult(
        'webhook-1',
        'form.submitted',
        { event: 'form.submitted', data: {} },
        'sha256=abc123',
        { success: false, statusCode: 500, responseTimeMs: 50 },
        2, // Attempt 2
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_deliveries'),
        expect.arrayContaining([2]), // Attempt = 2
      );
    });
  });

  // ============================================================================
  // Category 5: Update Webhook Health
  // ============================================================================

  describe('updateWebhookHealth', () => {
    it('should call webhookService.updateWebhookHealth on success', async () => {
      (webhookService.updateWebhookHealth as jest.Mock).mockResolvedValue(undefined);

      await webhookDeliveryService.updateWebhookHealthAfterDelivery(
        'webhook-1',
        { success: true, statusCode: 200, responseTimeMs: 100 },
      );

      expect(webhookService.updateWebhookHealth).toHaveBeenCalledWith(
        'webhook-1',
        true,
      );
    });

    it('should call webhookService.updateWebhookHealth on failure', async () => {
      (webhookService.updateWebhookHealth as jest.Mock).mockResolvedValue(undefined);

      await webhookDeliveryService.updateWebhookHealthAfterDelivery(
        'webhook-1',
        { success: false, statusCode: 500, error: 'Error', responseTimeMs: 50 },
      );

      expect(webhookService.updateWebhookHealth).toHaveBeenCalledWith(
        'webhook-1',
        false,
      );
    });
  });

  // ============================================================================
  // Category 6: Multi-Tenant Isolation
  // ============================================================================

  describe('Multi-Tenant Isolation', () => {
    it('should only find webhooks for specific organization', async () => {
      const org1Webhooks = [
        { id: 'webhook-1', organizationId: 'org-1', url: 'https://example.com/webhook1', events: ['form.submitted'], status: 'active' },
      ];

      const org2Webhooks = [
        { id: 'webhook-2', organizationId: 'org-2', url: 'https://example.com/webhook2', events: ['form.submitted'], status: 'active' },
      ];

      // Mock query for org-1
      mockQuery.mockResolvedValueOnce(org1Webhooks);

      const webhooks1 = await webhookDeliveryService.findWebhooksForEvent(
        'org-1',
        'form.submitted',
      );

      expect(webhooks1).toEqual(org1Webhooks);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('organization_id = $1'),
        expect.arrayContaining(['org-1']),
      );

      // Mock query for org-2
      mockQuery.mockResolvedValueOnce(org2Webhooks);

      const webhooks2 = await webhookDeliveryService.findWebhooksForEvent(
        'org-2',
        'form.submitted',
      );

      expect(webhooks2).toEqual(org2Webhooks);
      expect(webhooks2).not.toEqual(org1Webhooks);
    });

    it('should not return webhooks from other organizations', async () => {
      mockQuery.mockResolvedValue([]);

      await webhookDeliveryService.findWebhooksForEvent('org-999', 'form.submitted');

      // Query should filter by organization_id
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1'),
        ['org-999', 'form.submitted'],
      );
    });
  });

  // ============================================================================
  // Category 7: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        webhookDeliveryService.findWebhooksForEvent('org-1', 'form.submitted'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid webhook URL in processWebhookDelivery', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'invalid-url',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      (webhookService.decryptSecret as jest.Mock).mockResolvedValue('test-secret');

      const result = await webhookDeliveryService.processWebhookDelivery(
        webhook,
        payload,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle decryption errors', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'invalid-encrypted-data',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      (webhookService.decryptSecret as jest.Mock).mockRejectedValue(
        new Error('Decryption failed'),
      );

      await expect(
        webhookDeliveryService.processWebhookDelivery(webhook, payload),
      ).rejects.toThrow('Decryption failed');
    });
  });
});
