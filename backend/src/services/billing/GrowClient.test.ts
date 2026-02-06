// GrowClient Unit Tests
// TDD Phase 2.1 - RED (Tests written first, implementation will follow)
// Created: 2026-02-05
// Reference: GROW (Meshulam) API Integration

import { GrowClient } from './GrowClient';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('GrowClient', () => {
  let client: GrowClient;
  const mockApiKey = 'test-api-key-12345';
  const mockApiSecret = 'test-api-secret-67890';

  beforeEach(() => {
    client = new GrowClient({
      apiKey: mockApiKey,
      apiSecret: mockApiSecret,
      environment: 'sandbox',
    });
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should create customer in GROW sandbox', async () => {
      const mockResponse = {
        data: {
          success: true,
          customerId: 'cust-grow-123',
          message: 'Customer created successfully',
        },
      };

      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.createCustomer({
        email: 'test@example.com',
        name: 'Test Organization',
        phone: '0501234567',
      });

      expect(result.success).toBe(true);
      expect(result.customerId).toBe('cust-grow-123');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('sandbox'),
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test Organization',
        }),
        expect.any(Object),
      );
    });

    it('should handle customer creation failure', async () => {
      mockAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Invalid email format',
          },
        },
      });

      const result = await client.createCustomer({
        email: 'invalid-email',
        name: 'Test',
        phone: '050123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use correct API endpoint for production', async () => {
      const prodClient = new GrowClient({
        apiKey: mockApiKey,
        apiSecret: mockApiSecret,
        environment: 'production',
      });

      mockAxios.post.mockResolvedValueOnce({
        data: { success: true, customerId: 'cust-123' },
      });

      await prodClient.createCustomer({
        email: 'test@example.com',
        name: 'Test',
        phone: '0501234567',
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.not.stringContaining('sandbox'),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('createPaymentMethod', () => {
    it('should generate payment page URL', async () => {
      const mockResponse = {
        data: {
          success: true,
          paymentUrl: 'https://sandbox.grow.co.il/payment/abc123',
          sessionId: 'session-xyz',
        },
      };

      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.createPaymentMethod({
        customerId: 'cust-123',
        returnUrl: 'https://app.rightflow.io/billing/callback',
        amount: 30000, // 300 ILS
      });

      expect(result.success).toBe(true);
      expect(result.paymentUrl).toMatch(/^https:\/\/sandbox\.grow\.co\.il/);
      expect(result.sessionId).toBe('session-xyz');
    });

    it('should include amount and return URL in request', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          paymentUrl: 'https://sandbox.grow.co.il/payment/test',
        },
      });

      await client.createPaymentMethod({
        customerId: 'cust-123',
        returnUrl: 'https://app.rightflow.io/callback',
        amount: 40000,
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          customerId: 'cust-123',
          returnUrl: 'https://app.rightflow.io/callback',
          amount: 40000,
        }),
        expect.any(Object),
      );
    });

    it('should handle payment page generation failure', async () => {
      mockAxios.post.mockRejectedValueOnce({
        response: {
          data: { error: 'Customer not found' },
        },
      });

      const result = await client.createPaymentMethod({
        customerId: 'invalid-customer',
        returnUrl: 'https://app.rightflow.io/callback',
        amount: 30000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Customer not found');
    });
  });

  describe('chargeCustomer', () => {
    it('should charge saved payment method', async () => {
      const mockResponse = {
        data: {
          success: true,
          transactionId: 'txn-grow-456',
          amount: 30000,
          currency: 'ILS',
          status: 'approved',
        },
      };

      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.chargeCustomer({
        customerId: 'cust-123',
        amount: 30000,
        description: 'RightFlow BASIC - February 2026',
        idempotencyKey: 'charge-org-123-2026-02',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-grow-456');
      expect(result.amount).toBe(30000);
    });

    it('should return failure on declined card', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: 'Card declined',
          errorCode: 'CARD_DECLINED',
        },
      };

      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.chargeCustomer({
        customerId: 'cust-declined',
        amount: 30000,
        description: 'Test charge',
        idempotencyKey: 'test-decline',
      });

      expect(result.success).toBe(false);
      expect(result.failureReason).toContain('Card declined');
    });

    it('should use idempotency key to prevent double charging', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { success: true, transactionId: 'txn-123' },
      });

      await client.chargeCustomer({
        customerId: 'cust-123',
        amount: 30000,
        description: 'Monthly charge',
        idempotencyKey: 'unique-key-123',
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Idempotency-Key': 'unique-key-123',
          }),
        }),
      );
    });

    it('should handle network errors gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.chargeCustomer({
        customerId: 'cust-123',
        amount: 30000,
        description: 'Test',
        idempotencyKey: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network');
    });

    it('should include currency in request (ILS)', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { success: true, transactionId: 'txn-123' },
      });

      await client.chargeCustomer({
        customerId: 'cust-123',
        amount: 30000,
        description: 'Test',
        idempotencyKey: 'test',
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          currency: 'ILS',
        }),
        expect.any(Object),
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const payload = {
        event: 'payment.success',
        customerId: 'cust-123',
        transactionId: 'txn-456',
      };

      const signature = client.generateWebhookSignature(payload);

      const isValid = client.verifyWebhookSignature(payload, signature);

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = {
        event: 'payment.success',
        customerId: 'cust-123',
      };

      const invalidSignature = 'invalid-signature-12345';

      const isValid = client.verifyWebhookSignature(payload, invalidSignature);

      expect(isValid).toBe(false);
    });

    it('should reject tampered webhook payload', () => {
      const originalPayload = {
        event: 'payment.success',
        amount: 30000,
      };

      const signature = client.generateWebhookSignature(originalPayload);

      const tamperedPayload = {
        event: 'payment.success',
        amount: 100, // Tampered amount
      };

      const isValid = client.verifyWebhookSignature(
        tamperedPayload,
        signature,
      );

      expect(isValid).toBe(false);
    });
  });

  describe('getTransaction', () => {
    it('should fetch transaction details', async () => {
      const mockResponse = {
        data: {
          transactionId: 'txn-789',
          status: 'approved',
          amount: 30000,
          currency: 'ILS',
          createdAt: '2026-02-05T10:00:00Z',
        },
      };

      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getTransaction('txn-789');

      expect(result.transactionId).toBe('txn-789');
      expect(result.status).toBe('approved');
      expect(result.amount).toBe(30000);
    });

    it('should return null for non-existent transaction', async () => {
      mockAxios.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      const result = await client.getTransaction('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('refundTransaction', () => {
    it('should refund a transaction', async () => {
      const mockResponse = {
        data: {
          success: true,
          refundId: 'refund-123',
          amount: 30000,
        },
      };

      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.refundTransaction({
        transactionId: 'txn-original',
        amount: 30000,
        reason: 'Customer request',
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('refund-123');
    });

    it('should handle partial refunds', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { success: true, refundId: 'refund-partial', amount: 15000 },
      });

      const result = await client.refundTransaction({
        transactionId: 'txn-123',
        amount: 15000, // Half of original 30000
        reason: 'Partial refund',
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(15000);
    });

    it('should fail refund for already refunded transaction', async () => {
      mockAxios.post.mockRejectedValueOnce({
        response: {
          data: { error: 'Transaction already refunded' },
        },
      });

      const result = await client.refundTransaction({
        transactionId: 'txn-already-refunded',
        amount: 30000,
        reason: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already refunded');
    });
  });

  describe('Authentication', () => {
    it('should include API credentials in all requests', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { success: true, customerId: 'cust-123' },
      });

      await client.createCustomer({
        email: 'test@example.com',
        name: 'Test',
        phone: '0501234567',
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': mockApiKey,
          }),
        }),
      );
    });

    it('should use Basic Auth with API secret', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      await client.createCustomer({
        email: 'test@example.com',
        name: 'Test',
        phone: '050123',
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          auth: {
            username: mockApiKey,
            password: mockApiSecret,
          },
        }),
      );
    });
  });
});
