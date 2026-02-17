/**
 * Grow API Service Tests
 *
 * Comprehensive tests for Grow Payment API integration
 * Following TDD methodology - tests written before implementation
 *
 * @see ADR-009: Grow Payment API Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowApiService, CreatePaymentProcessParams, GrowWebhookPayload } from './grow-api.service';
import { getDb, closeDb } from '../../lib/db';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GrowApiService', () => {
  let growApiService: GrowApiService;
  let testUserId: string;
  let testPlanId: string;
  let freePlanId: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set environment variables
    process.env.GROW_PAGE_CODE = 'test_page_code';
    process.env.GROW_USER_ID = 'test_grow_user_id';
    process.env.GROW_API_BASE_URL = 'https://sandbox.meshulam.co.il/api/light/server/1.0';
    process.env.APP_URL = 'https://app.rightflow.co';

    growApiService = new GrowApiService();

    // Create Free plan
    const [freePlan] = await getDb()('plans').insert({
      id: crypto.randomUUID(),
      name: 'Free',
      display_name: 'Free',
      monthly_price_ils: 0,
      yearly_price_ils: 0,
      max_forms: 3,
      max_responses_monthly: 100,
      max_storage_mb: 100,
      features: {},
      is_active: true,
    }).returning('*');
    freePlanId = freePlan.id;

    // Create EXPANDED plan (matches ADR-009 example)
    const [plan] = await getDb()('plans').insert({
      id: crypto.randomUUID(),
      name: 'EXPANDED',
      display_name: 'Expanded',
      monthly_price_ils: 269,
      yearly_price_ils: 2388,
      max_forms: 100,
      max_responses_monthly: 50000,
      max_storage_mb: 51200,
      features: { installments_yearly_max: 12 },
      is_active: true,
    }).returning('*');
    testPlanId = plan.id;

    // Create test user
    const [user] = await getDb()('users').insert({
      id: crypto.randomUUID(),
      clerk_id: `test_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      phone: '0541234567',
      plan_id: freePlanId,
      tenant_type: 'rightflow',
      payment_status: 'none',
    }).returning('*');
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up in correct order for foreign key constraints
    await getDb()('webhook_events').del();
    await getDb()('checkout_sessions').del();
    await getDb()('grow_transactions').del();
    await getDb()('users').where({ id: testUserId }).del();
    await getDb()('plans').where({ id: testPlanId }).del();
    await getDb()('plans').where({ id: freePlanId }).del();
    await closeDb();
  });

  // ============================================================================
  // CreatePaymentProcess Tests
  // ============================================================================

  describe('createPaymentProcess', () => {
    const mockSuccessResponse = {
      status: '1',
      data: {
        url: 'https://meshulam.co.il/payment/xyz123',
        processId: '332002',
        processToken: 'f01644c3f19b30h825eg5g5g5g3b0',
      },
    };

    it('should create payment process with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      const result = await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'monthly',
      });

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBe('https://meshulam.co.il/payment/xyz123');
      expect(result.processId).toBe('332002');

      // Verify fetch was called with correct form data
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('createPaymentProcess');
      expect(options.method).toBe('POST');

      // Verify form data contains required fields
      const formData = options.body as FormData;
      expect(formData.get('pageCode')).toBe('test_page_code');
      expect(formData.get('sum')).toBe('269');
      expect(formData.get('cField1')).toBe(testUserId); // User ID correlation
      expect(formData.get('cField3')).toBe('monthly');
    });

    it('should embed userId in cField1 for deterministic correlation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'monthly',
      });

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get('cField1')).toBe(testUserId);
    });

    it('should create checkout session in database', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'monthly',
      });

      const session = await getDb()('checkout_sessions')
        .where({ user_id: testUserId })
        .first();

      expect(session).toBeDefined();
      expect(session.process_id).toBe('332002');
      expect(session.status).toBe('pending');
      expect(session.amount_ils).toBe(269);
      expect(session.price_at_checkout).toBe(269);
    });

    it('should reject checkout with empty userId', async () => {
      await expect(
        growApiService.createPaymentProcess({
          userId: '',
          planId: testPlanId,
          billingPeriod: 'monthly',
        }),
      ).rejects.toThrow('User ID is required');
    });

    it('should reject checkout with invalid userId format', async () => {
      await expect(
        growApiService.createPaymentProcess({
          userId: 'not-a-uuid',
          planId: testPlanId,
          billingPeriod: 'monthly',
        }),
      ).rejects.toThrow('Invalid user ID format');
    });

    it('should reject checkout for non-existent user', async () => {
      await expect(
        growApiService.createPaymentProcess({
          userId: '00000000-0000-0000-0000-000000000001',
          planId: testPlanId,
          billingPeriod: 'monthly',
        }),
      ).rejects.toThrow('User not found');
    });

    it('should reject checkout for non-existent plan', async () => {
      await expect(
        growApiService.createPaymentProcess({
          userId: testUserId,
          planId: '00000000-0000-0000-0000-000000000001',
          billingPeriod: 'monthly',
        }),
      ).rejects.toThrow('Plan not found');
    });

    it('should reject checkout with zero or negative amount', async () => {
      // Create a free plan that has 0 price
      await expect(
        growApiService.createPaymentProcess({
          userId: testUserId,
          planId: freePlanId,
          billingPeriod: 'monthly',
        }),
      ).rejects.toThrow('Cannot create checkout for free plan');
    });

    it('should handle yearly billing with correct price', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'yearly',
      });

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get('sum')).toBe('2388');
    });

    it('should supersede old checkout when new one created', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      // First checkout
      await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'monthly',
      });

      // Second checkout (different period)
      await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'yearly',
      });

      const sessions = await getDb()('checkout_sessions')
        .where({ user_id: testUserId })
        .orderBy('created_at', 'asc');

      expect(sessions).toHaveLength(2);
      expect(sessions[0].status).toBe('superseded');
      expect(sessions[1].status).toBe('pending');
    });

    it('should validate successUrl and cancelUrl domains', async () => {
      await expect(
        growApiService.createPaymentProcess({
          userId: testUserId,
          planId: testPlanId,
          billingPeriod: 'monthly',
          successUrl: 'https://evil.com/phishing',
        }),
      ).rejects.toThrow('Invalid redirect URL');
    });

    it('should sanitize Hebrew description properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'monthly',
      });

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      const description = formData.get('description') as string;
      // Should contain Hebrew description
      expect(description).toContain('Expanded');
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: '0',
          err: { code: 1001, message: 'Invalid pageCode' },
        }),
      });

      await expect(
        growApiService.createPaymentProcess({
          userId: testUserId,
          planId: testPlanId,
          billingPeriod: 'monthly',
        }),
      ).rejects.toThrow('Invalid pageCode');
    });

    it('should retry on retryable errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: '0',
            err: { code: 5001, message: 'Internal server error' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSuccessResponse),
        });

      const result = await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'monthly',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.checkoutUrl).toBeDefined();
    });

    it('should rate limit checkout creation', async () => {
      // Update user to have recent checkout
      await getDb()('users').where({ id: testUserId }).update({
        last_checkout_at: new Date(),
        checkout_count_today: 10,
      });

      await expect(
        growApiService.createPaymentProcess({
          userId: testUserId,
          planId: testPlanId,
          billingPeriod: 'monthly',
        }),
      ).rejects.toThrow('Rate limited');
    });
  });

  // ============================================================================
  // Installments Tests
  // ============================================================================

  describe('installments', () => {
    const mockSuccessResponse = {
      status: '1',
      data: {
        url: 'https://meshulam.co.il/payment/xyz123',
        processId: '332002',
        processToken: 'test_token',
      },
    };

    it('should reject installments for monthly billing', async () => {
      await expect(
        growApiService.createPaymentProcess({
          userId: testUserId,
          planId: testPlanId,
          billingPeriod: 'monthly',
          installments: 6,
        }),
      ).rejects.toThrow('Installments only available for yearly plans');
    });

    it('should validate installment count range', async () => {
      await expect(
        growApiService.createPaymentProcess({
          userId: testUserId,
          planId: testPlanId,
          billingPeriod: 'yearly',
          installments: 24,
        }),
      ).rejects.toThrow('Installments must be between 1 and 12');
    });

    it('should include installments in API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'yearly',
        installments: 6,
      });

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get('maxPayments')).toBe('6');
      expect(formData.get('cField4')).toBe('6');
    });

    it('should store installments in checkout session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });

      await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'yearly',
        installments: 6,
      });

      const session = await getDb()('checkout_sessions')
        .where({ user_id: testUserId })
        .first();

      expect(session.installments).toBe(6);
    });
  });

  // ============================================================================
  // Webhook Handler Tests
  // ============================================================================

  describe('handleWebhook', () => {
    const createMockWebhook = (overrides: Partial<GrowWebhookPayload['data']> = {}): GrowWebhookPayload => ({
      status: '1',
      data: {
        transactionId: `tx_${Date.now()}`,
        processId: '332002',
        processToken: 'test_token',
        asmachta: '0289199',
        statusCode: '2', // Paid
        sum: '269',
        cardSuffix: '1177',
        cardBrand: 'Mastercard',
        paymentType: '2',
        description: 'Test payment',
        fullName: 'Test User',
        payerEmail: 'test@example.com',
        customFields: {
          cField1: testUserId,
          cField2: testPlanId,
          cField3: 'monthly',
        },
        ...overrides,
      },
    });

    beforeEach(async () => {
      // Create a pending checkout session
      await getDb()('checkout_sessions').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        plan_id: testPlanId,
        process_id: '332002',
        amount_ils: 269,
        billing_period: 'monthly',
        price_at_checkout: 269,
        status: 'pending',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      });
    });

    it('should activate subscription on successful payment', async () => {
      const webhook = createMockWebhook();
      const result = await growApiService.handleWebhook(webhook);

      expect(result.subscriptionActivated).toBe(true);

      const user = await getDb()('users').where({ id: testUserId }).first();
      expect(user.plan_id).toBe(testPlanId);
      expect(user.payment_status).toBe('active');
    });

    it('should handle duplicate webhook idempotently', async () => {
      const webhook = createMockWebhook();

      const result1 = await growApiService.handleWebhook(webhook);
      expect(result1.subscriptionActivated).toBe(true);

      const result2 = await growApiService.handleWebhook(webhook);
      expect(result2.subscriptionActivated).toBe(false);
      expect(result2.reason).toBe('Already processed');

      // Verify only one transaction record
      const transactions = await getDb()('grow_transactions')
        .where({ transaction_id: webhook.data.transactionId });
      expect(transactions).toHaveLength(1);
    });

    it('should handle concurrent duplicate webhooks', async () => {
      const webhook = createMockWebhook();

      const results = await Promise.all([
        growApiService.handleWebhook(webhook),
        growApiService.handleWebhook(webhook),
        growApiService.handleWebhook(webhook),
      ]);

      const activated = results.filter(r => r.subscriptionActivated);
      expect(activated).toHaveLength(1);
    });

    it('should reject webhook without customFields', async () => {
      const webhook = {
        status: '1',
        data: {
          transactionId: 'tx_123',
          processId: '332002',
          statusCode: '2',
          sum: '269',
        },
      };

      const result = await growApiService.handleWebhook(webhook as any);
      expect(result.error).toBe('Missing user identification');
      expect(result.requiresManualReview).toBe(true);
    });

    it('should handle webhook with non-existent userId', async () => {
      const webhook = createMockWebhook({
        customFields: {
          cField1: '00000000-0000-0000-0000-000000000001',
          cField2: testPlanId,
          cField3: 'monthly',
        },
      });

      const result = await growApiService.handleWebhook(webhook);
      expect(result.processed).toBe(false);
      expect(result.reason).toBe('User not found');
    });

    it('should not activate subscription for pending status', async () => {
      const webhook = createMockWebhook({ statusCode: '1' }); // Pending

      const result = await growApiService.handleWebhook(webhook);
      expect(result.subscriptionActivated).toBe(false);
      expect(result.action).toBe('awaiting_final_status');
    });

    it('should handle failed payment webhook', async () => {
      const webhook = createMockWebhook({ statusCode: '3' }); // Failed

      const result = await growApiService.handleWebhook(webhook);
      expect(result.subscriptionActivated).toBe(false);
      expect(result.notificationSent).toBe(true);
    });

    it('should verify webhook amount matches expected', async () => {
      const webhook = createMockWebhook({ sum: '1' }); // Wrong amount

      const result = await growApiService.handleWebhook(webhook);
      expect(result.rejected).toBe(true);
      expect(result.reason).toBe('Amount mismatch');
    });

    it('should reject webhook for expired checkout session', async () => {
      // Update session to be expired
      await getDb()('checkout_sessions')
        .where({ process_id: '332002' })
        .update({
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000),
          expires_at: new Date(Date.now() - 47 * 60 * 60 * 1000),
        });

      const webhook = createMockWebhook();
      const result = await growApiService.handleWebhook(webhook);

      expect(result.rejected).toBe(true);
      expect(result.reason).toBe('Checkout session expired');
    });

    it('should sanitize custom field values for SQL injection', async () => {
      const webhook = createMockWebhook({
        customFields: {
          cField1: "'; DROP TABLE users; --",
          cField2: testPlanId,
          cField3: 'monthly',
        },
      });

      const result = await growApiService.handleWebhook(webhook);
      expect(result.error).toBe('Invalid user ID format');
    });

    it('should store transaction in database', async () => {
      const webhook = createMockWebhook();
      await growApiService.handleWebhook(webhook);

      const transaction = await getDb()('grow_transactions')
        .where({ transaction_id: webhook.data.transactionId })
        .first();

      expect(transaction).toBeDefined();
      expect(transaction.user_id).toBe(testUserId);
      expect(transaction.amount_ils).toBe(269);
      expect(transaction.status).toBe('completed');
      expect(transaction.card_suffix).toBe('1177');
    });

    it('should create admin alert for potential double payment', async () => {
      // Create two successful webhooks for same user
      const webhook1 = createMockWebhook({ transactionId: 'tx_1' });
      const webhook2 = createMockWebhook({ transactionId: 'tx_2' });

      await growApiService.handleWebhook(webhook1);
      await growApiService.handleWebhook(webhook2);

      const alerts = await getDb()('admin_alerts').where({ user_id: testUserId });
      expect(alerts.some(a => a.type === 'potential_double_payment')).toBe(true);
    });

    it('should handle unknown status codes', async () => {
      const webhook = createMockWebhook({ statusCode: '99' });

      const result = await growApiService.handleWebhook(webhook);
      expect(result.requiresManualReview).toBe(true);
    });
  });

  // ============================================================================
  // ApproveTransaction Tests
  // ============================================================================

  describe('approveTransaction', () => {
    it('should call ApproveTransaction after successful webhook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: '1' }),
      });

      await growApiService.approveTransaction({
        processId: '332002',
        processToken: 'test_token',
        sum: '269',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('approveTransaction'),
        expect.any(Object),
      );
    });

    it('should still process subscription if ApproveTransaction fails', async () => {
      // Create checkout session
      await getDb()('checkout_sessions').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        plan_id: testPlanId,
        process_id: '332002',
        amount_ils: 269,
        billing_period: 'monthly',
        price_at_checkout: 269,
        status: 'pending',
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const webhook: GrowWebhookPayload = {
        status: '1',
        data: {
          transactionId: 'tx_123',
          processId: '332002',
          processToken: 'test_token',
          statusCode: '2',
          sum: '269',
          customFields: {
            cField1: testUserId,
            cField2: testPlanId,
            cField3: 'monthly',
          },
        },
      };

      const result = await growApiService.handleWebhook(webhook);
      expect(result.subscriptionActivated).toBe(true);
      expect(result.approveTransactionFailed).toBe(true);
    });
  });

  // ============================================================================
  // Grace Period Tests
  // ============================================================================

  describe('gracePeriod', () => {
    it('should start grace period on payment failure', async () => {
      // Set user to active subscription
      await getDb()('users').where({ id: testUserId }).update({
        plan_id: testPlanId,
        payment_status: 'active',
      });

      await growApiService.handlePaymentFailure(testUserId, 'Insufficient funds');

      const user = await getDb()('users').where({ id: testUserId }).first();
      expect(user.payment_status).toBe('grace_period');
      expect(user.grace_period_start).toBeDefined();
      expect(user.grace_period_end).toBeDefined();
    });

    it('should allow upgrade during grace period', async () => {
      await getDb()('users').where({ id: testUserId }).update({
        payment_status: 'grace_period',
        grace_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: '1',
          data: { url: 'https://test.com', processId: '123', processToken: 'token' },
        }),
      });

      const result = await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'yearly',
      });

      expect(result.checkoutUrl).toBeDefined();
    });

    it('should clear grace period after successful payment', async () => {
      await getDb()('users').where({ id: testUserId }).update({
        payment_status: 'grace_period',
        grace_period_start: new Date(),
        grace_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await getDb()('checkout_sessions').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        plan_id: testPlanId,
        process_id: '332002',
        amount_ils: 269,
        billing_period: 'monthly',
        price_at_checkout: 269,
        status: 'pending',
      });

      const webhook: GrowWebhookPayload = {
        status: '1',
        data: {
          transactionId: 'tx_123',
          processId: '332002',
          statusCode: '2',
          sum: '269',
          customFields: {
            cField1: testUserId,
            cField2: testPlanId,
            cField3: 'monthly',
          },
        },
      };

      await growApiService.handleWebhook(webhook);

      const user = await getDb()('users').where({ id: testUserId }).first();
      expect(user.payment_status).toBe('active');
      expect(user.grace_period_start).toBeNull();
    });

    it('should downgrade after grace period expires', async () => {
      await getDb()('users').where({ id: testUserId }).update({
        plan_id: testPlanId,
        payment_status: 'grace_period',
        grace_period_end: new Date(Date.now() - 1000), // Expired
      });

      await growApiService.processGracePeriodExpiries();

      const user = await getDb()('users').where({ id: testUserId }).first();
      expect(user.plan_id).toBe(freePlanId);
      expect(user.payment_status).toBe('expired');
    });
  });

  // ============================================================================
  // Checkout Session Cleanup Tests
  // ============================================================================

  describe('checkoutSessionCleanup', () => {
    it('should mark abandoned checkouts', async () => {
      await getDb()('checkout_sessions').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        plan_id: testPlanId,
        process_id: 'old_process',
        amount_ils: 269,
        billing_period: 'monthly',
        price_at_checkout: 269,
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
      });

      await growApiService.cleanupAbandonedCheckouts();

      const session = await getDb()('checkout_sessions')
        .where({ process_id: 'old_process' })
        .first();

      expect(session.status).toBe('abandoned');
    });

    it('should clear user pending state after cleanup', async () => {
      await getDb()('users').where({ id: testUserId }).update({
        pending_plan_id: testPlanId,
        pending_billing_period: 'monthly',
      });

      await getDb()('checkout_sessions').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        plan_id: testPlanId,
        process_id: 'old_process',
        amount_ils: 269,
        billing_period: 'monthly',
        price_at_checkout: 269,
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
      });

      await growApiService.cleanupAbandonedCheckouts();

      const user = await getDb()('users').where({ id: testUserId }).first();
      expect(user.pending_plan_id).toBeNull();
    });
  });

  // ============================================================================
  // Credit Days Tests
  // ============================================================================

  describe('creditDays', () => {
    it('should calculate and store credit days for mid-period upgrade', async () => {
      // Set user with active subscription ending in 15 days
      const endDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await getDb()('users').where({ id: testUserId }).update({
        plan_id: testPlanId,
        subscription_end_date: endDate,
        payment_status: 'active',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: '1',
          data: { url: 'https://test.com', processId: '123', processToken: 'token' },
        }),
      });

      const result = await growApiService.createPaymentProcess({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'yearly',
      });

      expect(result.creditDays).toBe(15);

      const session = await getDb()('checkout_sessions')
        .where({ user_id: testUserId })
        .first();
      expect(session.credit_days).toBe(15);
    });

    it('should apply credit days when payment confirmed', async () => {
      await getDb()('checkout_sessions').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        plan_id: testPlanId,
        process_id: '332002',
        amount_ils: 2388,
        billing_period: 'yearly',
        price_at_checkout: 2388,
        credit_days: 15,
        status: 'pending',
      });

      const webhook: GrowWebhookPayload = {
        status: '1',
        data: {
          transactionId: 'tx_123',
          processId: '332002',
          statusCode: '2',
          sum: '2388',
          customFields: {
            cField1: testUserId,
            cField2: testPlanId,
            cField3: 'yearly',
            cField5: '15', // Credit days
          },
        },
      };

      await growApiService.handleWebhook(webhook);

      const user = await getDb()('users').where({ id: testUserId }).first();
      const expectedEnd = new Date();
      expectedEnd.setFullYear(expectedEnd.getFullYear() + 1);
      expectedEnd.setDate(expectedEnd.getDate() + 15);

      // Allow 1 day tolerance for timing
      const diff = Math.abs(new Date(user.subscription_end_date).getTime() - expectedEnd.getTime());
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
    });
  });

  // ============================================================================
  // Security Tests
  // ============================================================================

  describe('security', () => {
    it('should sanitize XSS in description', async () => {
      const webhook: GrowWebhookPayload = {
        status: '1',
        data: {
          transactionId: 'tx_123',
          processId: '332002',
          statusCode: '2',
          sum: '269',
          description: '<script>alert(document.cookie)</script>',
          customFields: {
            cField1: testUserId,
            cField2: testPlanId,
            cField3: 'monthly',
          },
        },
      };

      await getDb()('checkout_sessions').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        plan_id: testPlanId,
        process_id: '332002',
        amount_ils: 269,
        billing_period: 'monthly',
        price_at_checkout: 269,
        status: 'pending',
      });

      await growApiService.handleWebhook(webhook);

      const transaction = await getDb()('grow_transactions').first();
      expect(transaction.description).not.toContain('<script>');
    });

    it('should validate doc_url format from iCount', async () => {
      const suspiciousUrl = 'https://icount.co.il/../../etc/passwd';

      await expect(
        growApiService.validateDocUrl(suspiciousUrl),
      ).rejects.toThrow('Invalid document URL');
    });

    it('should rate limit webhook requests', async () => {
      const webhook: GrowWebhookPayload = {
        status: '1',
        data: {
          transactionId: `tx_${Date.now()}`,
          processId: '332002',
          statusCode: '2',
          sum: '269',
          customFields: {
            cField1: testUserId,
            cField2: testPlanId,
            cField3: 'monthly',
          },
        },
      };

      await getDb()('checkout_sessions').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        plan_id: testPlanId,
        process_id: '332002',
        amount_ils: 269,
        billing_period: 'monthly',
        price_at_checkout: 269,
        status: 'pending',
      });

      // Simulate 200 requests
      const requests = Array(200).fill(null).map((_, i) => ({
        ...webhook,
        data: { ...webhook.data, transactionId: `tx_${i}` },
      }));

      const results = await Promise.all(
        requests.map(w => growApiService.handleWebhook(w).catch(e => ({ rateLimited: true }))),
      );

      const rateLimited = results.filter((r: any) => r.rateLimited);
      expect(rateLimited.length).toBeGreaterThan(100);
    });
  });
});
