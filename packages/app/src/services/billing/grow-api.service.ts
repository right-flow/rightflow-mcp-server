/**
 * Grow API Service
 *
 * Full integration with Grow Payment API using CreatePaymentProcess endpoint.
 * Replaces static payment links with dynamic, user-correlated payment sessions.
 *
 * Key Features:
 * - Dynamic payment session creation with user ID correlation (cField1)
 * - Webhook handling with idempotency
 * - ApproveTransaction acknowledgment
 * - Installment support for yearly plans
 * - Grace period management
 * - Security: rate limiting, input validation, XSS prevention
 *
 * @see ADR-009: Grow Payment API Integration
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import crypto from 'crypto';
import { getDb } from '../../lib/db.js';
import type { Knex } from 'knex';

// Initialize DOMPurify for server-side use
const jsdomWindow = new JSDOM('').window;
const purify = DOMPurify(jsdomWindow as unknown as Parameters<typeof DOMPurify>[0]);

// ============================================================================
// Types
// ============================================================================

export interface CreatePaymentProcessParams {
  userId: string;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  installments?: number;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentProcessResult {
  checkoutUrl: string;
  processId: string;
  processToken: string;
  creditDays?: number;
}

export interface GrowWebhookPayload {
  status: string;
  err?: string;
  data: {
    transactionId?: string;
    processId?: string;
    processToken?: string;
    asmachta?: string;
    cardSuffix?: string;
    cardType?: string;
    cardBrand?: string;
    cardExp?: string;
    statusCode?: string;
    status?: string;
    sum?: string;
    paymentsNum?: string;
    allPaymentsNum?: string;
    paymentType?: string;
    paymentDate?: string;
    description?: string;
    fullName?: string;
    payerPhone?: string;
    payerEmail?: string;
    customFields?: {
      cField1?: string; // userId
      cField2?: string; // planId
      cField3?: string; // billingPeriod
      cField4?: string; // installments
      cField5?: string; // creditDays
    };
  };
}

export interface WebhookResult {
  subscriptionActivated: boolean;
  processed?: boolean;
  rejected?: boolean;
  reason?: string;
  error?: string;
  action?: string;
  notificationSent?: boolean;
  requiresManualReview?: boolean;
  approveTransactionFailed?: boolean;
  warnings?: string[];
  rateLimited?: boolean;
}

export interface ApproveTransactionParams {
  processId: string;
  processToken: string;
  sum: string;
}

// ============================================================================
// Constants
// ============================================================================

const GROW_STATUS_CODES = {
  PENDING: '1',
  PAID: '2',
  FAILED: '3',
  CANCELED: '4',
};

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [5001, 2002], // Server error, rate limit
  nonRetryableErrors: [1001, 1002, 1003, 2001], // Validation errors
};

const RATE_LIMIT_CONFIG = {
  maxCheckoutsPerDay: 10,
  maxWebhooksPerMinute: 100,
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// Service
// ============================================================================

export class GrowApiService {
  private db: Knex;
  private pageCode: string;
  private growUserId: string;
  private apiBaseUrl: string;
  private appUrl: string;
  private webhookSecret: string | undefined;
  private webhookRequestCounts: Map<string, { count: number; timestamp: number }> = new Map();

  constructor() {
    this.db = getDb();
    this.pageCode = process.env.GROW_PAGE_CODE || '';
    this.growUserId = process.env.GROW_USER_ID || '';
    this.apiBaseUrl = process.env.GROW_API_BASE_URL || 'https://meshulam.co.il/api/light/server/1.0';
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';
    this.webhookSecret = process.env.GROW_WEBHOOK_SECRET;

    // SECURITY: Warn if webhook secret not configured in production
    if (!this.webhookSecret && process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] GROW_WEBHOOK_SECRET not configured - webhooks will be REJECTED');
    }
  }

  // ==========================================================================
  // Webhook Signature Verification
  // ==========================================================================

  /**
   * Verify webhook signature using HMAC-SHA256
   * CRITICAL: In production, unsigned webhooks are REJECTED
   */
  verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
    // In production: require valid signature
    if (process.env.NODE_ENV === 'production') {
      if (!this.webhookSecret) {
        console.error('[SECURITY] Cannot verify webhook: GROW_WEBHOOK_SECRET not configured');
        return false; // REJECT in production without secret
      }
      if (!signature) {
        console.error('[SECURITY] Webhook rejected: Missing signature');
        return false;
      }
    } else {
      // Development/test: warn but accept if no secret configured
      if (!this.webhookSecret) {
        console.log('[DEV] Webhook signature verification skipped (no secret configured)');
        return true;
      }
      if (!signature) {
        console.warn('[DEV] Webhook has no signature but secret is configured');
        return false;
      }
    }

    // Verify HMAC-SHA256 signature using timing-safe comparison
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret!)
        .update(payload)
        .digest('hex');

      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      console.error('[GrowApi] Signature verification error:', error);
      return false;
    }
  }

  // ==========================================================================
  // CreatePaymentProcess
  // ==========================================================================

  /**
   * Create a payment process using Grow API
   * Returns a checkout URL for the user to complete payment
   */
  async createPaymentProcess(params: CreatePaymentProcessParams): Promise<CreatePaymentProcessResult> {
    const { userId, planId, billingPeriod, installments = 1, successUrl, cancelUrl } = params;

    // Validate userId
    this.validateUserId(userId);

    // Check rate limit
    await this.checkCheckoutRateLimit(userId);

    // Get user and validate
    const user = await this.db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('User not found');
    }

    // Get plan and validate
    const plan = await this.db('plans').where({ id: planId, is_active: true }).first();
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get price based on billing period
    const price = billingPeriod === 'yearly' ? plan.yearly_price_ils : plan.monthly_price_ils;
    if (!price || price <= 0) {
      throw new Error('Cannot create checkout for free plan');
    }

    // Validate installments
    this.validateInstallments(billingPeriod, installments, plan);

    // Validate redirect URLs
    const validSuccessUrl = this.validateRedirectUrl(successUrl || `${this.appUrl}/billing?status=success`);
    const validCancelUrl = this.validateRedirectUrl(cancelUrl || `${this.appUrl}/pricing`);

    // Calculate credit days for mid-period upgrade
    const creditDays = await this.calculateCreditDays(userId);

    // Supersede any existing pending checkouts
    await this.supersedePendingCheckouts(userId);

    // Build form data for Grow API
    const formData = this.buildFormData({
      userId,
      planId,
      billingPeriod,
      price,
      installments,
      creditDays,
      user,
      plan,
      successUrl: validSuccessUrl,
      cancelUrl: validCancelUrl,
    });

    // Call Grow API with retry
    const response = await this.callGrowApiWithRetry('createPaymentProcess', formData);

    // Create checkout session in database
    await this.createCheckoutSession({
      userId,
      planId,
      billingPeriod,
      price,
      installments,
      creditDays,
      processId: response.processId,
      processToken: response.processToken,
      plan,
    });

    // Update rate limit tracking
    await this.updateCheckoutRateLimit(userId);

    console.log('[GrowApi] Payment process created:', {
      userId,
      planId,
      billingPeriod,
      price,
      installments,
      creditDays,
      processId: response.processId,
    });

    return {
      checkoutUrl: response.url,
      processId: response.processId,
      processToken: response.processToken,
      creditDays,
    };
  }

  // ==========================================================================
  // Webhook Handler
  // ==========================================================================

  /**
   * Handle incoming webhook from Grow
   * Implements idempotency to prevent duplicate processing
   */
  async handleWebhook(payload: GrowWebhookPayload): Promise<WebhookResult> {
    const { data } = payload;
    const transactionId = data.transactionId;
    const processId = data.processId;

    // Check webhook rate limit
    if (this.isWebhookRateLimited()) {
      return { subscriptionActivated: false, rateLimited: true };
    }

    // Validate required fields
    if (!data.customFields?.cField1) {
      await this.createAdminAlert({
        type: 'missing_user_identification',
        title: 'Webhook missing user identification',
        metadata: { transactionId, processId },
      });
      return {
        subscriptionActivated: false,
        error: 'Missing user identification',
        requiresManualReview: true,
      };
    }

    const userId = data.customFields.cField1;

    // Validate userId format (prevent SQL injection)
    if (!UUID_REGEX.test(userId)) {
      return {
        subscriptionActivated: false,
        error: 'Invalid user ID format',
      };
    }

    // Check idempotency - have we already processed this transaction?
    if (transactionId) {
      const existingEvent = await this.db('webhook_events')
        .where({ idempotency_key: transactionId, source: 'grow' })
        .first();

      if (existingEvent) {
        console.log('[GrowApi] Duplicate webhook, skipping:', transactionId);
        return {
          subscriptionActivated: false,
          processed: false,
          reason: 'Already processed',
        };
      }

      // Mark as processing (for concurrent request handling)
      try {
        await this.db('webhook_events').insert({
          idempotency_key: transactionId,
          source: 'grow',
          status: 'processing',
          received_at: new Date(),
        });
      } catch (error: any) {
        // Unique constraint violation = concurrent request
        if (error.code === '23505') {
          return {
            subscriptionActivated: false,
            processed: false,
            reason: 'Already processed',
          };
        }
        throw error;
      }
    }

    try {
      // Verify checkout session exists and is not expired
      const session = await this.db('checkout_sessions')
        .where({ process_id: processId })
        .first();

      if (!session) {
        console.warn('[GrowApi] No checkout session found for processId:', processId);
        // Still process - user may have paid successfully
      } else if (session.expires_at && new Date(session.expires_at) < new Date()) {
        await this.markWebhookEvent(transactionId!, 'failed');
        return {
          subscriptionActivated: false,
          rejected: true,
          reason: 'Checkout session expired',
        };
      }

      // Verify amount matches expected
      if (session && data.sum && parseInt(data.sum) !== session.amount_ils) {
        await this.createAdminAlert({
          type: 'amount_mismatch',
          userId,
          title: 'Payment amount mismatch',
          metadata: {
            expected: session.amount_ils,
            received: data.sum,
            transactionId,
          },
          severity: 'high',
        });
        await this.markWebhookEvent(transactionId!, 'failed');
        return {
          subscriptionActivated: false,
          rejected: true,
          reason: 'Amount mismatch',
        };
      }

      // Get user
      const user = await this.db('users').where({ id: userId }).first();
      if (!user) {
        console.warn('[GrowApi] User not found:', userId);
        await this.markWebhookEvent(transactionId!, 'failed');
        return {
          subscriptionActivated: false,
          processed: false,
          reason: 'User not found',
        };
      }

      // Handle based on status code
      const statusCode = data.statusCode;

      if (statusCode === GROW_STATUS_CODES.PENDING) {
        await this.markWebhookEvent(transactionId!, 'completed');
        return {
          subscriptionActivated: false,
          action: 'awaiting_final_status',
        };
      }

      if (statusCode === GROW_STATUS_CODES.FAILED || statusCode === GROW_STATUS_CODES.CANCELED) {
        await this.handlePaymentFailure(userId, data.status || 'Payment failed');
        await this.markWebhookEvent(transactionId!, 'completed');
        return {
          subscriptionActivated: false,
          notificationSent: true,
        };
      }

      if (statusCode === GROW_STATUS_CODES.PAID) {
        // SECURITY: Check for potential double payment - prevent automatic activation
        const recentPayments = await this.db('grow_transactions')
          .where({ user_id: userId, status: 'completed' })
          .where('created_at', '>', new Date(Date.now() - 60 * 60 * 1000)) // Last hour
          .count();

        const recentPaymentCount = parseInt(recentPayments[0].count as string);
        if (recentPaymentCount > 0) {
          // Double payment detected - require manual review
          await this.createAdminAlert({
            type: 'potential_double_payment',
            userId,
            title: 'URGENT: Potential double payment - requires manual review',
            metadata: {
              transactionId,
              recentPayments: recentPaymentCount,
              action: 'Review and manually activate or refund',
            },
            severity: 'high',
          });

          // Store transaction for manual processing
          await this.db('grow_transactions').insert({
            transaction_id: transactionId,
            user_id: userId,
            process_id: processId,
            status: 'pending_review', // New status for manual review
            amount: data.sum ? parseInt(data.sum) : 0,
            payment_method: data.paymentType,
            raw_response: JSON.stringify(data),
            created_at: new Date(),
          });

          await this.markWebhookEvent(transactionId!, 'completed', {
            requiresManualReview: true,
          });

          console.warn('[GrowApi] Double payment detected, requiring manual review:', {
            userId,
            transactionId,
            recentPaymentCount,
          });

          return {
            subscriptionActivated: false,
            requiresManualReview: true,
            reason: 'Potential double payment - pending admin review',
            warnings: ['Recent payment detected - subscription activation paused for review'],
          };
        }

        // Activate subscription (no double payment detected)
        const result = await this.activateSubscription(userId, data, session);

        // Call ApproveTransaction (non-blocking with proper error handling)
        this.approveTransaction({
          processId: processId || '',
          processToken: data.processToken || '',
          sum: data.sum || '',
        }).catch(async (error) => {
          console.error('[GrowApi] ApproveTransaction failed:', error);
          result.approveTransactionFailed = true;

          // Create admin alert for failed acknowledgment
          await this.createAdminAlert({
            type: 'approve_transaction_failed',
            userId,
            title: 'Failed to acknowledge payment to Grow',
            metadata: {
              processId,
              transactionId,
              error: error instanceof Error ? error.message : String(error),
            },
            severity: 'high',
          }).catch(alertError => {
            console.error('[GrowApi] Failed to create admin alert:', alertError);
          });
        });

        await this.markWebhookEvent(transactionId!, 'completed', {
          subscriptionActivated: true,
        });

        return result;
      }

      // Unknown status code
      await this.createAdminAlert({
        type: 'unknown_status_code',
        userId,
        title: `Unknown payment status code: ${statusCode}`,
        metadata: { transactionId, statusCode },
      });
      await this.markWebhookEvent(transactionId!, 'completed');
      return {
        subscriptionActivated: false,
        requiresManualReview: true,
      };
    } catch (error) {
      console.error('[GrowApi] Webhook processing error:', error);
      if (transactionId) {
        await this.markWebhookEvent(transactionId, 'failed');
      }
      throw error;
    }
  }

  // ==========================================================================
  // ApproveTransaction
  // ==========================================================================

  /**
   * Send ApproveTransaction acknowledgment to Grow
   * This confirms receipt of the webhook
   */
  async approveTransaction(params: ApproveTransactionParams): Promise<void> {
    const formData = new FormData();
    formData.append('pageCode', this.pageCode);
    formData.append('processId', params.processId);
    formData.append('processToken', params.processToken);
    formData.append('sum', params.sum);

    const response = await fetch(`${this.apiBaseUrl}/approveTransaction`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ApproveTransaction failed: ${response.status}`);
    }

    const result = await response.json() as { status: string; err?: string };
    if (result.status !== '1') {
      throw new Error(`ApproveTransaction failed: ${result.err || 'Unknown error'}`);
    }

    console.log('[GrowApi] ApproveTransaction sent:', params.processId);
  }

  // ==========================================================================
  // Grace Period Management
  // ==========================================================================

  /**
   * Handle payment failure - start grace period
   */
  async handlePaymentFailure(userId: string, reason: string): Promise<void> {
    const gracePeriodDays = 7;
    const now = new Date();
    const graceEnd = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

    await this.db('users').where({ id: userId }).update({
      payment_status: 'grace_period',
      grace_period_start: now,
      grace_period_end: graceEnd,
      payment_failure_reason: reason,
    });

    // Create notification
    await this.createPaymentNotification(userId, 'payment_failed', {
      reason,
      gracePeriodEnd: graceEnd,
    });

    console.log('[GrowApi] Grace period started:', { userId, graceEnd });
  }

  /**
   * Process all expired grace periods - downgrade to free
   */
  async processGracePeriodExpiries(): Promise<void> {
    const expiredUsers = await this.db('users')
      .where({ payment_status: 'grace_period' })
      .where('grace_period_end', '<', new Date())
      .select('id');

    const freePlan = await this.db('plans')
      .whereRaw('LOWER(name) = ?', ['free'])
      .where({ is_active: true })
      .first();

    if (!freePlan) {
      console.error('[GrowApi] Free plan not found - cannot process grace period expiries');
      return;
    }

    for (const user of expiredUsers) {
      await this.db('users').where({ id: user.id }).update({
        plan_id: freePlan.id,
        payment_status: 'expired',
        grow_subscription_id: null,
      });

      await this.createPaymentNotification(user.id, 'subscription_downgraded', {});

      console.log('[GrowApi] User downgraded due to grace period expiry:', user.id);
    }
  }

  // ==========================================================================
  // Checkout Session Cleanup
  // ==========================================================================

  /**
   * Clean up abandoned checkout sessions
   */
  async cleanupAbandonedCheckouts(): Promise<void> {
    const abandonedSessions = await this.db('checkout_sessions')
      .where('status', 'pending')
      .where('expires_at', '<', new Date())
      .select('id', 'user_id', 'process_id');

    for (const session of abandonedSessions) {
      // Check if payment actually completed (webhook might have been missed)
      const transaction = await this.db('grow_transactions')
        .where({ process_id: session.process_id })
        .first();

      if (!transaction) {
        // Mark as abandoned
        await this.db('checkout_sessions')
          .where({ id: session.id })
          .update({ status: 'abandoned' });

        // Clear user's pending state
        await this.db('users')
          .where({ id: session.user_id })
          .update({
            pending_plan_id: null,
            pending_billing_period: null,
            checkout_initiated_at: null,
          });

        console.log('[GrowApi] Checkout marked as abandoned:', session.process_id);
      }
    }
  }

  // ==========================================================================
  // Validation Helpers
  // ==========================================================================

  /**
   * Validate document URL format (for iCount)
   */
  async validateDocUrl(url: string): Promise<void> {
    const validDomains = ['icount.co.il', 'api.icount.co.il'];
    try {
      const parsed = new URL(url);
      if (!validDomains.some(d => parsed.hostname.endsWith(d))) {
        throw new Error('Invalid document URL');
      }
      if (url.includes('..')) {
        throw new Error('Invalid document URL');
      }
    } catch {
      throw new Error('Invalid document URL');
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private validateUserId(userId: string): void {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required');
    }
    if (!UUID_REGEX.test(userId)) {
      throw new Error('Invalid user ID format');
    }
  }

  private validateInstallments(
    billingPeriod: string,
    installments: number,
    plan: any,
  ): void {
    if (installments > 1 && billingPeriod !== 'yearly') {
      throw new Error('Installments only available for yearly plans');
    }
    if (installments < 1 || installments > 12) {
      throw new Error('Installments must be between 1 and 12');
    }
    // Check plan-specific limits
    const maxInstallments = plan.features?.installments_yearly_max || 12;
    if (installments > maxInstallments) {
      throw new Error(`${plan.name} plan allows maximum ${maxInstallments} installments`);
    }
  }

  private validateRedirectUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const allowedDomains = [
        'rightflow.co',
        'app.rightflow.co',
        'localhost',
        '127.0.0.1',
      ];
      if (!allowedDomains.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))) {
        throw new Error('Invalid redirect URL');
      }
      return url;
    } catch {
      throw new Error('Invalid redirect URL');
    }
  }

  private async calculateCreditDays(userId: string): Promise<number> {
    const user = await this.db('users').where({ id: userId }).first();
    if (!user?.subscription_end_date) {
      return 0;
    }

    const currentPlan = user.plan_id
      ? await this.db('plans').where({ id: user.plan_id }).first()
      : null;

    if (!currentPlan || currentPlan.name.toUpperCase() === 'FREE') {
      return 0;
    }

    const now = new Date();
    const endDate = new Date(user.subscription_end_date);

    if (endDate <= now) {
      return 0;
    }

    const remainingMs = endDate.getTime() - now.getTime();
    const creditDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));

    return creditDays >= 1 ? creditDays : 0;
  }

  private async supersedePendingCheckouts(userId: string): Promise<void> {
    await this.db('checkout_sessions')
      .where({ user_id: userId, status: 'pending' })
      .update({ status: 'superseded' });
  }

  private buildFormData(params: {
    userId: string;
    planId: string;
    billingPeriod: string;
    price: number;
    installments: number;
    creditDays: number;
    user: any;
    plan: any;
    successUrl: string;
    cancelUrl: string;
  }): FormData {
    const formData = new FormData();

    formData.append('pageCode', this.pageCode);
    formData.append('userId', this.growUserId);
    formData.append('sum', params.price.toString());
    formData.append('successUrl', params.successUrl);
    formData.append('cancelUrl', params.cancelUrl);
    formData.append('notifyUrl', `${this.appUrl}/api/webhooks/grow`);

    // User data pre-fill
    formData.append('pageField[fullName]', `${params.user.first_name || ''} ${params.user.last_name || ''}`.trim());
    formData.append('pageField[phone]', params.user.phone || '');
    formData.append('pageField[email]', params.user.email || '');

    // Description (Hebrew safe)
    const description = `תוכנית ${params.plan.display_name || params.plan.name} - ${params.billingPeriod === 'yearly' ? 'שנתי' : 'חודשי'}`;
    formData.append('description', description);

    // Custom fields for correlation
    formData.append('cField1', params.userId); // User ID - PRIMARY CORRELATION
    formData.append('cField2', params.planId);
    formData.append('cField3', params.billingPeriod);
    formData.append('cField4', params.installments.toString());
    formData.append('cField5', params.creditDays.toString());

    // Installments (yearly only)
    if (params.installments > 1 && params.billingPeriod === 'yearly') {
      formData.append('maxPayments', params.installments.toString());
      formData.append('minPayments', '1');
    }

    return formData;
  }

  private async callGrowApiWithRetry(
    endpoint: string,
    formData: FormData,
  ): Promise<{ url: string; processId: string; processToken: string }> {
    let lastError: Error | null = null;
    let delay = RETRY_CONFIG.initialDelayMs;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/${endpoint}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        interface GrowApiResponse {
          status: string;
          data?: {
            url?: string;
            processId?: string;
            processToken?: string;
          };
          err?: {
            code?: number;
            message?: string;
          };
        }
        const result = await response.json() as GrowApiResponse;

        if (result.status === '1' && result.data) {
          return {
            url: result.data.url || '',
            processId: result.data.processId || '',
            processToken: result.data.processToken || '',
          };
        }

        // API returned error
        const errorCode = result.err?.code;
        if (errorCode && RETRY_CONFIG.nonRetryableErrors.includes(errorCode)) {
          throw new Error(result.err?.message || 'API error');
        }

        if (errorCode && !RETRY_CONFIG.retryableErrors.includes(errorCode)) {
          throw new Error(result.err?.message || 'API error');
        }

        lastError = new Error(result.err?.message || 'Retryable error');
      } catch (error) {
        lastError = error as Error;
      }

      if (attempt < RETRY_CONFIG.maxRetries) {
        await this.sleep(delay);
        delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs);
      }
    }

    throw lastError || new Error('API call failed after retries');
  }

  private async createCheckoutSession(params: {
    userId: string;
    planId: string;
    billingPeriod: string;
    price: number;
    installments: number;
    creditDays: number;
    processId: string;
    processToken: string;
    plan: any;
  }): Promise<void> {
    await this.db('checkout_sessions').insert({
      user_id: params.userId,
      plan_id: params.planId,
      process_id: params.processId,
      process_token: params.processToken,
      amount_ils: params.price,
      billing_period: params.billingPeriod,
      installments: params.installments,
      price_at_checkout: params.price,
      plan_snapshot: JSON.stringify(params.plan),
      credit_days: params.creditDays,
      status: 'pending',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });
  }

  private async checkCheckoutRateLimit(userId: string): Promise<void> {
    const user = await this.db('users').where({ id: userId }).first();
    if (!user) return;

    const today = new Date().toDateString();
    const lastCheckoutDate = user.last_checkout_at
      ? new Date(user.last_checkout_at).toDateString()
      : null;

    if (lastCheckoutDate === today && user.checkout_count_today >= RATE_LIMIT_CONFIG.maxCheckoutsPerDay) {
      throw new Error('Rate limited');
    }
  }

  private async updateCheckoutRateLimit(userId: string): Promise<void> {
    const user = await this.db('users').where({ id: userId }).first();
    const today = new Date().toDateString();
    const lastCheckoutDate = user.last_checkout_at
      ? new Date(user.last_checkout_at).toDateString()
      : null;

    const newCount = lastCheckoutDate === today ? (user.checkout_count_today || 0) + 1 : 1;

    await this.db('users').where({ id: userId }).update({
      last_checkout_at: new Date(),
      checkout_count_today: newCount,
    });
  }

  private isWebhookRateLimited(): boolean {
    const now = Date.now();
    const windowKey = Math.floor(now / 60000).toString(); // Per minute

    const current = this.webhookRequestCounts.get(windowKey) || { count: 0, timestamp: now };
    current.count++;
    this.webhookRequestCounts.set(windowKey, current);

    // Clean old windows
    for (const [key, value] of this.webhookRequestCounts) {
      if (now - value.timestamp > 120000) {
        this.webhookRequestCounts.delete(key);
      }
    }

    return current.count > RATE_LIMIT_CONFIG.maxWebhooksPerMinute;
  }

  private async activateSubscription(
    userId: string,
    data: GrowWebhookPayload['data'],
    session: any,
  ): Promise<WebhookResult> {
    const planId = data.customFields?.cField2 || session?.plan_id;
    const billingPeriod = data.customFields?.cField3 || session?.billing_period || 'monthly';
    const creditDays = parseInt(data.customFields?.cField5 || '0') || session?.credit_days || 0;

    // Calculate subscription dates
    const now = new Date();
    const periodMonths = billingPeriod === 'yearly' ? 12 : 1;
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + periodMonths);

    // Apply credit days
    if (creditDays > 0) {
      endDate.setDate(endDate.getDate() + creditDays);
    }

    // Update user
    await this.db('users').where({ id: userId }).update({
      plan_id: planId,
      payment_status: 'active',
      subscription_start_date: now,
      subscription_end_date: endDate,
      billing_period: billingPeriod,
      grow_subscription_id: data.transactionId,
      last_payment_method: this.mapPaymentMethod(data.paymentType),
      last_card_suffix: data.cardSuffix,
      last_card_brand: data.cardBrand,
      grace_period_start: null,
      grace_period_end: null,
      payment_failure_reason: null,
      pending_plan_id: null,
      pending_billing_period: null,
      checkout_initiated_at: null,
    });

    // Mark checkout session as completed
    if (session) {
      await this.db('checkout_sessions')
        .where({ id: session.id })
        .update({ status: 'completed', completed_at: now });
    }

    // Create transaction record
    await this.db('grow_transactions').insert({
      user_id: userId,
      plan_id: planId,
      process_id: data.processId,
      process_token: data.processToken,
      transaction_id: data.transactionId,
      asmachta: data.asmachta,
      amount_ils: parseInt(data.sum || '0'),
      payment_method: this.mapPaymentMethod(data.paymentType),
      card_suffix: data.cardSuffix,
      card_brand: data.cardBrand,
      card_exp: data.cardExp,
      status: 'completed',
      status_code: data.statusCode,
      billing_period: billingPeriod,
      description: purify.sanitize(data.description || ''),
      created_at: now,
      completed_at: now,
      raw_webhook_data: JSON.stringify(data),
    });

    // Create success notification
    await this.createPaymentNotification(userId, 'payment_success', {
      amount: data.sum,
      planId,
    });

    console.log('[GrowApi] Subscription activated:', {
      userId,
      planId,
      billingPeriod,
      creditDays,
      subscriptionEnd: endDate,
    });

    return { subscriptionActivated: true };
  }

  private mapPaymentMethod(paymentType?: string): string {
    const map: Record<string, string> = {
      '1': 'credit_card',
      '2': 'credit_card',
      '6': 'bit',
      '13': 'apple_pay',
      '14': 'google_pay',
      '15': 'bank_transfer',
    };
    return map[paymentType || ''] || 'credit_card';
  }

  private async markWebhookEvent(
    idempotencyKey: string,
    status: string,
    result?: object,
  ): Promise<void> {
    await this.db('webhook_events')
      .where({ idempotency_key: idempotencyKey })
      .update({
        status,
        processed_at: new Date(),
        result: result ? JSON.stringify(result) : null,
      });
  }

  private async createAdminAlert(params: {
    type: string;
    userId?: string;
    title: string;
    description?: string;
    metadata?: object;
    severity?: string;
  }): Promise<void> {
    await this.db('admin_alerts').insert({
      type: params.type,
      user_id: params.userId || null,
      title: params.title,
      description: params.description || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      severity: params.severity || 'medium',
      status: 'open',
      created_at: new Date(),
    });
  }

  private async createPaymentNotification(
    userId: string,
    type: string,
    metadata: object,
  ): Promise<void> {
    await this.db('payment_notifications').insert({
      user_id: userId,
      type,
      channel: 'email',
      status: 'pending',
      metadata: JSON.stringify(metadata),
      scheduled_for: new Date(),
      created_at: new Date(),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
