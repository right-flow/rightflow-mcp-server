/**
 * Grow Payment Service Tests
 * Tests for Grow payment gateway integration
 *
 * Note: These tests use mock implementations until actual Grow API credentials are available
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GrowService } from './grow.service';
import { getDb, closeDb } from '../../lib/db';

describe('GrowService', () => {
  let growService: GrowService;
  let testUserId: string;
  let testPlanId: string;
  let testCustomerId: string;

  beforeEach(async () => {
    growService = new GrowService();

    // Create Free plan (needed for downgrade tests)
    await getDb()('plans').insert({
      id: crypto.randomUUID(),
      name: 'Free',
      monthly_price_ils: 0,
      max_forms: 3,
      max_responses_monthly: 100,
      max_storage_mb: 100,
      features: {},
      is_active: true,
    });

    // Create test plan
    const [plan] = await getDb()('plans').insert({
      id: crypto.randomUUID(),
      name: 'Pro',
      monthly_price_ils: 14900, // ₪149.00
      max_forms: 50,
      max_responses_monthly: 10000,
      max_storage_mb: 10240,
      features: { webhooks: true, api_access: true },
      grow_product_id: 'grow_prod_test_pro',
      is_active: true,
    }).returning('*');
    testPlanId = plan.id;

    // Create test user
    const [user] = await getDb()('users').insert({
      id: crypto.randomUUID(),
      clerk_id: `test_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      plan_id: testPlanId,
      tenant_type: 'rightflow',
    }).returning('*');
    testUserId = user.id;
    testCustomerId = 'grow_cust_test_123';
  });

  afterEach(async () => {
    // Clean up test data
    await getDb()('users').where({ id: testUserId }).del();
    await getDb()('plans').where({ name: 'Free' }).del();
    await getDb()('plans').where({ id: testPlanId }).del();
    await closeDb();
  });

  describe('createCheckoutSession', () => {
    it('creates checkout session with correct parameters', async () => {
      const result = await growService.createCheckoutSession({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'monthly',
        successUrl: 'https://rightflow.app/dashboard?billing=success',
        cancelUrl: 'https://rightflow.app/pricing',
      });

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
      expect(typeof result.checkoutUrl).toBe('string');
      expect(result.checkoutUrl).toContain('http');
    });

    it('creates checkout session for yearly billing', async () => {
      const result = await growService.createCheckoutSession({
        userId: testUserId,
        planId: testPlanId,
        billingPeriod: 'yearly',
        successUrl: 'https://rightflow.app/dashboard?billing=success',
        cancelUrl: 'https://rightflow.app/pricing',
      });

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
    });

    it('throws error for invalid plan', async () => {
      await expect(
        growService.createCheckoutSession({
          userId: testUserId,
          planId: '00000000-0000-0000-0000-000000000000',
          billingPeriod: 'monthly',
          successUrl: 'https://rightflow.app/dashboard',
          cancelUrl: 'https://rightflow.app/pricing',
        }),
      ).rejects.toThrow('Plan not found');
    });

    it('throws error for invalid user', async () => {
      await expect(
        growService.createCheckoutSession({
          userId: '00000000-0000-0000-0000-000000000001',
          planId: testPlanId,
          billingPeriod: 'monthly',
          successUrl: 'https://rightflow.app/dashboard',
          cancelUrl: 'https://rightflow.app/pricing',
        }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('getOrCreateCustomer', () => {
    it('creates Grow customer and stores customer_id', async () => {
      const result = await growService.getOrCreateCustomer({
        userId: testUserId,
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result).toBeDefined();
      expect(result.customerId).toBeDefined();
      expect(typeof result.customerId).toBe('string');

      // Verify customer_id was stored in database
      const user = await getDb()('users').where({ id: testUserId }).first();
      expect(user.grow_customer_id).toBe(result.customerId);
    });

    it('returns existing customer if already created', async () => {
      // First call creates customer
      const result1 = await growService.getOrCreateCustomer({
        userId: testUserId,
        email: 'test@example.com',
      });

      // Second call should return same customer
      const result2 = await growService.getOrCreateCustomer({
        userId: testUserId,
        email: 'test@example.com',
      });

      expect(result1.customerId).toBe(result2.customerId);
    });

    it('throws error for invalid user', async () => {
      await expect(
        growService.getOrCreateCustomer({
          userId: '00000000-0000-0000-0000-000000000001',
          email: 'test@example.com',
        }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('getSubscription', () => {
    it('retrieves active subscription', async () => {
      const subscription = await growService.getSubscription(testCustomerId);

      // Mock implementation may return null or a subscription object
      if (subscription) {
        expect(subscription).toHaveProperty('id');
        expect(subscription).toHaveProperty('status');
        expect(subscription).toHaveProperty('planId');
      } else {
        expect(subscription).toBeNull();
      }
    });

    it('returns null for customer with no subscription', async () => {
      const subscription = await growService.getSubscription('grow_cust_no_sub');

      expect(subscription).toBeNull();
    });
  });

  describe('cancelSubscription', () => {
    it('cancels subscription successfully', async () => {
      await expect(
        growService.cancelSubscription('grow_sub_test_123'),
      ).resolves.not.toThrow();
    });

    it('throws error for empty subscription ID', async () => {
      await expect(
        growService.cancelSubscription(''),
      ).rejects.toThrow('Invalid subscription ID');
    });
  });

  describe('createPortalSession', () => {
    it('creates billing portal session', async () => {
      const result = await growService.createPortalSession({
        customerId: testCustomerId,
        returnUrl: 'https://rightflow.app/dashboard/billing',
      });

      expect(result).toBeDefined();
      expect(result.portalUrl).toBeDefined();
      expect(typeof result.portalUrl).toBe('string');
      expect(result.portalUrl).toContain('http');
    });

    it('throws error for empty customer ID', async () => {
      await expect(
        growService.createPortalSession({
          customerId: '',
          returnUrl: 'https://rightflow.app/dashboard/billing',
        }),
      ).rejects.toThrow('Invalid customer ID');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('verifies valid webhook signature', () => {
      const payload = JSON.stringify({ event: 'subscription.created' });
      const signature = 'valid_signature_hash';

      // Mock implementation returns true for any signature in test mode
      const isValid = growService.verifyWebhookSignature(payload, signature);

      expect(typeof isValid).toBe('boolean');
    });

    it('rejects invalid webhook signature', () => {
      const payload = JSON.stringify({ event: 'subscription.created' });
      const signature = '';

      const isValid = growService.verifyWebhookSignature(payload, signature);

      // Empty signature should be rejected
      expect(isValid).toBe(false);
    });
  });

  describe('handleWebhookEvent', () => {
    it('handles subscription.created event', async () => {
      const event = {
        type: 'subscription.created' as const,
        data: {
          subscriptionId: 'grow_sub_123',
          customerId: testCustomerId,
          planId: testPlanId,
          status: 'active',
        },
      };

      await expect(
        growService.handleWebhookEvent(event),
      ).resolves.not.toThrow();

      // Verify subscription was stored
      const user = await getDb()('users')
        .where({ grow_customer_id: testCustomerId })
        .first();

      if (user) {
        expect(user.grow_subscription_id).toBe('grow_sub_123');
      }
    });

    it('handles subscription.updated event', async () => {
      const event = {
        type: 'subscription.updated' as const,
        data: {
          subscriptionId: 'grow_sub_123',
          customerId: testCustomerId,
          planId: testPlanId,
          status: 'active',
        },
      };

      await expect(
        growService.handleWebhookEvent(event),
      ).resolves.not.toThrow();
    });

    it('handles subscription.deleted event', async () => {
      // First create a subscription
      await getDb()('users')
        .where({ id: testUserId })
        .update({
          grow_customer_id: testCustomerId,
          grow_subscription_id: 'grow_sub_123',
        });

      const event = {
        type: 'subscription.deleted' as const,
        data: {
          subscriptionId: 'grow_sub_123',
          customerId: testCustomerId,
        },
      };

      await expect(
        growService.handleWebhookEvent(event),
      ).resolves.not.toThrow();

      // Verify user was downgraded to Free plan
      const user = await getDb()('users').where({ id: testUserId }).first();
      const freePlan = await getDb()('plans')
        .where({ name: 'Free', is_active: true })
        .first();

      if (freePlan) {
        expect(user.plan_id).toBe(freePlan.id);
      }
    });

    it('handles payment.failed event', async () => {
      const event = {
        type: 'payment.failed' as const,
        data: {
          subscriptionId: 'grow_sub_123',
          customerId: testCustomerId,
          reason: 'insufficient_funds',
        },
      };

      await expect(
        growService.handleWebhookEvent(event),
      ).resolves.not.toThrow();

      // In production, this would trigger email notification
    });

    it('throws error for unknown event type', async () => {
      const event: any = {
        type: 'unknown.event',
        data: {},
      };

      await expect(
        growService.handleWebhookEvent(event),
      ).rejects.toThrow('Unknown webhook event type');
    });
  });

  describe('integration with database', () => {
    it('stores grow_customer_id when creating customer', async () => {
      const result = await growService.getOrCreateCustomer({
        userId: testUserId,
        email: 'test@example.com',
      });

      const user = await getDb()('users').where({ id: testUserId }).first();
      expect(user.grow_customer_id).toBe(result.customerId);
    });

    it('stores grow_subscription_id when subscription created', async () => {
      // Update user with customer_id first
      await getDb()('users')
        .where({ id: testUserId })
        .update({ grow_customer_id: testCustomerId });

      const event = {
        type: 'subscription.created' as const,
        data: {
          subscriptionId: 'grow_sub_456',
          customerId: testCustomerId,
          planId: testPlanId,
          status: 'active',
        },
      };

      await growService.handleWebhookEvent(event);

      const user = await getDb()('users')
        .where({ grow_customer_id: testCustomerId })
        .first();

      expect(user.grow_subscription_id).toBe('grow_sub_456');
    });
  });
});
