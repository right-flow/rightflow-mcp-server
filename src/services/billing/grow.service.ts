/**
 * Grow Payment Gateway Service
 * Handles payment processing, subscription management, and webhook events
 *
 * NOTE: This is a MOCK implementation until actual Grow API credentials are provided.
 * Replace mock logic with actual Grow API calls when credentials are available.
 *
 * Grow API Documentation: https://grow-il.readme.io/reference/introduction
 */

import { getDb } from '../../lib/db';
import type { Knex } from 'knex';

export interface GrowSubscription {
  id: string;
  customerId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
}

export interface GrowWebhookEvent {
  type: 'subscription.created' | 'subscription.updated' | 'subscription.deleted' | 'payment.failed';
  data: {
    subscriptionId?: string;
    customerId: string;
    planId?: string;
    status?: string;
    reason?: string;
  };
}

export interface CreateCheckoutSessionParams {
  userId: string;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCustomerParams {
  userId: string;
  email: string;
  name?: string;
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export class GrowService {
  private db: Knex;
  private apiKey: string | undefined;
  private webhookSecret: string | undefined;

  constructor() {
    this.db = getDb();
    this.apiKey = process.env.GROW_API_KEY;
    this.webhookSecret = process.env.GROW_WEBHOOK_SECRET;

    // Warn if credentials not configured
    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      console.warn('GROW_API_KEY not configured. Using mock implementation.');
    }
  }

  /**
   * Create a checkout session for plan upgrade
   * Redirects user to Grow payment page
   *
   * TODO: Replace with actual Grow API call when credentials available
   * Grow API: POST /api/checkout/session
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ checkoutUrl: string }> {
    const { userId, planId, billingPeriod, successUrl, cancelUrl } = params;

    // Validate user exists
    const user = await this.db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('User not found');
    }

    // Validate plan exists
    const plan = await this.db('plans').where({ id: planId }).first();
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get or create Grow customer
    const { customerId } = await this.getOrCreateCustomer({
      userId,
      email: user.email,
    });

    // MOCK IMPLEMENTATION
    // TODO: Replace with actual Grow API call
    if (!this.apiKey) {
      // Return mock checkout URL for development
      const mockCheckoutUrl = `https://grow.mock/checkout?customer=${customerId}&plan=${plan.grow_product_id}&period=${billingPeriod}&success=${encodeURIComponent(successUrl)}&cancel=${encodeURIComponent(cancelUrl)}`;

      console.log('[MOCK] Created checkout session:', {
        userId,
        planId,
        customerId,
        billingPeriod,
        amount: billingPeriod === 'yearly'
          ? Math.round(plan.monthly_price_ils * 10) // 17% discount
          : plan.monthly_price_ils,
      });

      return { checkoutUrl: mockCheckoutUrl };
    }

    // PRODUCTION IMPLEMENTATION (when credentials available)
    // const response = await fetch('https://api.grow.com/v1/checkout/session', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     customerId,
    //     productId: plan.grow_product_id,
    //     billingPeriod,
    //     successUrl,
    //     cancelUrl,
    //   }),
    // });
    // const data = await response.json();
    // return { checkoutUrl: data.checkoutUrl };

    throw new Error('Grow API not configured');
  }

  /**
   * Create or retrieve Grow customer for user
   *
   * TODO: Replace with actual Grow API call when credentials available
   * Grow API: POST /api/customers
   */
  async getOrCreateCustomer(params: CreateCustomerParams): Promise<{ customerId: string }> {
    const { userId, email, name } = params;

    // Check if user exists
    const user = await this.db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('User not found');
    }

    // Return existing customer if already created
    if (user.grow_customer_id) {
      return { customerId: user.grow_customer_id };
    }

    // MOCK IMPLEMENTATION
    // TODO: Replace with actual Grow API call
    if (!this.apiKey) {
      // Generate mock customer ID
      const mockCustomerId = `grow_cust_mock_${userId.substring(0, 8)}`;

      console.log('[MOCK] Created Grow customer:', {
        customerId: mockCustomerId,
        email,
        name,
      });

      // Store customer ID in database
      await this.db('users')
        .where({ id: userId })
        .update({ grow_customer_id: mockCustomerId });

      return { customerId: mockCustomerId };
    }

    // PRODUCTION IMPLEMENTATION (when credentials available)
    // const response = await fetch('https://api.grow.com/v1/customers', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     email,
    //     name,
    //     metadata: { userId },
    //   }),
    // });
    // const data = await response.json();
    // const customerId = data.id;
    //
    // await this.db('users')
    //   .where({ id: userId })
    //   .update({ grow_customer_id: customerId });
    //
    // return { customerId };

    throw new Error('Grow API not configured');
  }

  /**
   * Get customer's active subscription
   *
   * TODO: Replace with actual Grow API call when credentials available
   * Grow API: GET /api/subscriptions/:customerId
   */
  async getSubscription(customerId: string): Promise<GrowSubscription | null> {
    // MOCK IMPLEMENTATION
    // TODO: Replace with actual Grow API call
    if (!this.apiKey) {
      // Return mock subscription for testing
      console.log('[MOCK] Getting subscription for customer:', customerId);

      // In mock mode, return null (no subscription)
      return null;
    }

    // PRODUCTION IMPLEMENTATION (when credentials available)
    // const response = await fetch(`https://api.grow.com/v1/subscriptions/${customerId}`, {
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //   },
    // });
    //
    // if (response.status === 404) {
    //   return null;
    // }
    //
    // const data = await response.json();
    // return {
    //   id: data.id,
    //   customerId: data.customerId,
    //   planId: data.planId,
    //   status: data.status,
    //   currentPeriodStart: new Date(data.currentPeriodStart),
    //   currentPeriodEnd: new Date(data.currentPeriodEnd),
    //   canceledAt: data.canceledAt ? new Date(data.canceledAt) : undefined,
    // };

    throw new Error('Grow API not configured');
  }

  /**
   * Cancel subscription
   *
   * TODO: Replace with actual Grow API call when credentials available
   * Grow API: DELETE /api/subscriptions/:subscriptionId
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (!subscriptionId) {
      throw new Error('Invalid subscription ID');
    }

    // MOCK IMPLEMENTATION
    // TODO: Replace with actual Grow API call
    if (!this.apiKey) {
      console.log('[MOCK] Canceling subscription:', subscriptionId);
      return;
    }

    // PRODUCTION IMPLEMENTATION (when credentials available)
    // const response = await fetch(`https://api.grow.com/v1/subscriptions/${subscriptionId}`, {
    //   method: 'DELETE',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //   },
    // });
    //
    // if (!response.ok) {
    //   throw new Error('Failed to cancel subscription');
    // }

    throw new Error('Grow API not configured');
  }

  /**
   * Create billing portal session
   * Allows users to manage payment methods, invoices
   *
   * TODO: Replace with actual Grow API call when credentials available
   * Grow API: POST /api/portal/session
   */
  async createPortalSession(params: CreatePortalSessionParams): Promise<{ portalUrl: string }> {
    const { customerId, returnUrl } = params;

    if (!customerId) {
      throw new Error('Invalid customer ID');
    }

    // MOCK IMPLEMENTATION
    // TODO: Replace with actual Grow API call
    if (!this.apiKey) {
      const mockPortalUrl = `https://grow.mock/portal?customer=${customerId}&return=${encodeURIComponent(returnUrl)}`;

      console.log('[MOCK] Created portal session:', {
        customerId,
        returnUrl,
      });

      return { portalUrl: mockPortalUrl };
    }

    // PRODUCTION IMPLEMENTATION (when credentials available)
    // const response = await fetch('https://api.grow.com/v1/portal/session', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     customerId,
    //     returnUrl,
    //   }),
    // });
    // const data = await response.json();
    // return { portalUrl: data.url };

    throw new Error('Grow API not configured');
  }

  /**
   * Verify webhook signature
   *
   * Uses HMAC-SHA256 to verify webhook authenticity
   * Grow payment gateway signs webhooks with HMAC-SHA256
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false;
    }

    // MOCK IMPLEMENTATION
    // Accept all signatures in test mode when webhook secret is not configured
    if (!this.webhookSecret) {
      console.log('[MOCK] Webhook signature verification (accepting all in test mode)');
      return true;
    }

    // PRODUCTION IMPLEMENTATION
    // Verify HMAC-SHA256 signature using timing-safe comparison
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle webhook event
   * Processes subscription lifecycle events
   */
  async handleWebhookEvent(event: GrowWebhookEvent): Promise<void> {
    console.log('[Grow Webhook]', event.type, event.data);

    switch (event.type) {
      case 'subscription.created':
        await this.handleSubscriptionCreated(event.data);
        break;

      case 'subscription.updated':
        await this.handleSubscriptionUpdated(event.data);
        break;

      case 'subscription.deleted':
        await this.handleSubscriptionDeleted(event.data);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(event.data);
        break;

      default:
        throw new Error(`Unknown webhook event type: ${event.type}`);
    }
  }

  /**
   * Handle subscription.created event
   * Updates user's plan when subscription is activated
   */
  private async handleSubscriptionCreated(data: GrowWebhookEvent['data']): Promise<void> {
    const { subscriptionId, customerId, planId } = data;

    if (!subscriptionId || !customerId || !planId) {
      throw new Error('Missing required data for subscription.created event');
    }

    // Find user by customer ID
    const user = await this.db('users')
      .where({ grow_customer_id: customerId })
      .first();

    if (!user) {
      console.error(`User not found for customer ${customerId}`);
      return;
    }

    // Update user's plan and subscription
    await this.db('users')
      .where({ id: user.id })
      .update({
        plan_id: planId,
        grow_subscription_id: subscriptionId,
      });

    console.log(`Subscription activated for user ${user.id}`);
  }

  /**
   * Handle subscription.updated event
   * Updates user's plan when subscription changes
   */
  private async handleSubscriptionUpdated(data: GrowWebhookEvent['data']): Promise<void> {
    const { subscriptionId, customerId, planId } = data;

    if (!subscriptionId || !customerId) {
      throw new Error('Missing required data for subscription.updated event');
    }

    // Find user by customer ID
    const user = await this.db('users')
      .where({ grow_customer_id: customerId })
      .first();

    if (!user) {
      console.error(`User not found for customer ${customerId}`);
      return;
    }

    // Update user's plan if changed
    if (planId) {
      await this.db('users')
        .where({ id: user.id })
        .update({ plan_id: planId });

      console.log(`Plan updated for user ${user.id} to ${planId}`);
    }
  }

  /**
   * Handle subscription.deleted event
   * Downgrades user to Free plan when subscription is cancelled
   */
  private async handleSubscriptionDeleted(data: GrowWebhookEvent['data']): Promise<void> {
    const { subscriptionId, customerId } = data;

    if (!subscriptionId || !customerId) {
      throw new Error('Missing required data for subscription.deleted event');
    }

    // Find user by customer ID
    const user = await this.db('users')
      .where({ grow_customer_id: customerId })
      .first();

    if (!user) {
      console.error(`User not found for customer ${customerId}`);
      return;
    }

    // Get Free plan
    const freePlan = await this.db('plans')
      .where({ name: 'Free', is_active: true })
      .first();

    if (!freePlan) {
      throw new Error('Free plan not found');
    }

    // Downgrade user to Free plan
    await this.db('users')
      .where({ id: user.id })
      .update({
        plan_id: freePlan.id,
        grow_subscription_id: null,
      });

    console.log(`User ${user.id} downgraded to Free plan`);
  }

  /**
   * Handle payment.failed event
   * Logs payment failure and triggers notification
   */
  private async handlePaymentFailed(data: GrowWebhookEvent['data']): Promise<void> {
    const { subscriptionId: _subscriptionId, customerId, reason } = data;

    if (!customerId) {
      throw new Error('Missing customer ID for payment.failed event');
    }

    // Find user by customer ID
    const user = await this.db('users')
      .where({ grow_customer_id: customerId })
      .first();

    if (!user) {
      console.error(`User not found for customer ${customerId}`);
      return;
    }

    console.error(`Payment failed for user ${user.id}:`, reason);

    // TODO: Send email notification to user
    // TODO: Implement grace period before downgrade
  }
}
