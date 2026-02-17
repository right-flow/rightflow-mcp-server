/**
 * Grow Webhook Service (Backend)
 *
 * Handles Grow payment webhook processing for the backend.
 * Uses native pg pool for database operations.
 *
 * @see ADR-009: Grow Payment API Integration
 */

import crypto from 'crypto';
import { query, pool } from '../../config/database';
import logger from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Constants
// ============================================================================

const GROW_STATUS_CODES = {
  PENDING: '1',
  PAID: '2',
  FAILED: '3',
  CANCELED: '4',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// Service
// ============================================================================

export class GrowWebhookService {
  private webhookSecret: string | undefined;

  constructor() {
    this.webhookSecret = process.env.GROW_WEBHOOK_SECRET;

    if (!this.webhookSecret && process.env.NODE_ENV === 'production') {
      logger.error('[SECURITY] GROW_WEBHOOK_SECRET not configured - webhooks will be REJECTED');
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
    if (process.env.NODE_ENV === 'production') {
      if (!this.webhookSecret) {
        logger.error('[SECURITY] Cannot verify webhook: GROW_WEBHOOK_SECRET not configured');
        return false;
      }
      if (!signature) {
        logger.error('[SECURITY] Webhook rejected: Missing signature');
        return false;
      }
    } else {
      if (!this.webhookSecret) {
        logger.info('[DEV] Webhook signature verification skipped (no secret configured)');
        return true;
      }
      if (!signature) {
        logger.warn('[DEV] Webhook has no signature but secret is configured');
        return false;
      }
    }

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
      logger.error('[GrowWebhook] Signature verification error', { error });
      return false;
    }
  }

  /**
   * Handle incoming Grow webhook
   */
  async handleWebhook(payload: GrowWebhookPayload): Promise<WebhookResult> {
    const { data } = payload;
    const transactionId = data.transactionId;
    const processId = data.processId;

    // Validate customFields
    if (!data.customFields?.cField1) {
      return {
        subscriptionActivated: false,
        error: 'Missing user ID in customFields',
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

    // Check idempotency
    if (transactionId) {
      const existing = await query<{ id: string }>(
        'SELECT id FROM webhook_events WHERE idempotency_key = $1 AND source = $2',
        [transactionId, 'grow']
      );

      if (existing.length > 0) {
        logger.info('[GrowWebhook] Duplicate webhook, skipping', { transactionId });
        return {
          subscriptionActivated: false,
          processed: false,
          reason: 'Already processed',
        };
      }

      // Mark as processing
      try {
        await query(
          `INSERT INTO webhook_events (idempotency_key, source, status, received_at)
           VALUES ($1, $2, $3, NOW())`,
          [transactionId, 'grow', 'processing']
        );
      } catch (error: any) {
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
      // Verify user exists
      const users = await query<{ id: string }>(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (users.length === 0) {
        logger.warn('[GrowWebhook] User not found', { userId });
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
        // Check for double payment
        const recentPayments = await query<{ count: string }>(
          `SELECT COUNT(*) as count FROM grow_transactions
           WHERE user_id = $1 AND status = 'completed'
           AND created_at > NOW() - INTERVAL '1 hour'`,
          [userId]
        );

        const recentCount = parseInt(recentPayments[0]?.count || '0');
        if (recentCount > 0) {
          await this.createAdminAlert({
            type: 'potential_double_payment',
            userId,
            title: 'URGENT: Potential double payment - requires manual review',
            metadata: { transactionId, recentPayments: recentCount },
            severity: 'high',
          });

          await query(
            `INSERT INTO grow_transactions (transaction_id, user_id, process_id, status, amount, payment_method, raw_response, created_at)
             VALUES ($1, $2, $3, 'pending_review', $4, $5, $6, NOW())`,
            [
              transactionId,
              userId,
              processId,
              data.sum ? parseInt(data.sum) : 0,
              data.paymentType,
              JSON.stringify(data),
            ]
          );

          await this.markWebhookEvent(transactionId!, 'completed', { requiresManualReview: true });

          return {
            subscriptionActivated: false,
            requiresManualReview: true,
            reason: 'Potential double payment - pending admin review',
          };
        }

        // Activate subscription
        const result = await this.activateSubscription(userId, data, processId);

        // Call ApproveTransaction
        this.approveTransaction({
          processId: processId || '',
          processToken: data.processToken || '',
          sum: data.sum || '',
        }).catch(async (error) => {
          logger.error('[GrowWebhook] ApproveTransaction failed', { error });
          await this.createAdminAlert({
            type: 'approve_transaction_failed',
            userId,
            title: 'Failed to acknowledge payment to Grow',
            metadata: { processId, transactionId, error: error.message },
            severity: 'high',
          });
        });

        await this.markWebhookEvent(transactionId!, 'completed', { subscriptionActivated: true });

        return result;
      }

      // Unknown status
      await this.createAdminAlert({
        type: 'unknown_status_code',
        userId,
        title: `Unknown payment status code: ${statusCode}`,
        metadata: { transactionId, statusCode },
      });
      await this.markWebhookEvent(transactionId!, 'completed');

      return {
        subscriptionActivated: false,
        reason: `Unknown status code: ${statusCode}`,
      };
    } catch (error) {
      logger.error('[GrowWebhook] Processing error', { error, transactionId });
      if (transactionId) {
        await this.markWebhookEvent(transactionId, 'failed');
      }
      throw error;
    }
  }

  /**
   * Mark webhook event status
   */
  private async markWebhookEvent(
    idempotencyKey: string,
    status: 'completed' | 'failed',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await query(
      `UPDATE webhook_events SET status = $1, processed_at = NOW(), metadata = $2
       WHERE idempotency_key = $3 AND source = 'grow'`,
      [status, JSON.stringify(metadata || {}), idempotencyKey]
    );
  }

  /**
   * Handle payment failure - start grace period
   */
  private async handlePaymentFailure(userId: string, reason: string): Promise<void> {
    const gracePeriodDays = 7;

    await query(
      `UPDATE users SET
         payment_status = 'grace_period',
         grace_period_start = NOW(),
         grace_period_end = NOW() + INTERVAL '${gracePeriodDays} days'
       WHERE id = $1`,
      [userId]
    );

    logger.info('[GrowWebhook] Grace period started', { userId, reason, gracePeriodDays });
  }

  /**
   * Activate subscription after successful payment
   */
  private async activateSubscription(
    userId: string,
    data: GrowWebhookPayload['data'],
    processId: string | undefined
  ): Promise<WebhookResult> {
    const planId = data.customFields?.cField2;
    const billingPeriod = data.customFields?.cField3 as 'monthly' | 'yearly' || 'monthly';
    const creditDays = parseInt(data.customFields?.cField5 || '0');

    // Calculate period end
    const periodMonths = billingPeriod === 'yearly' ? 12 : 1;
    const periodEndSql = `NOW() + INTERVAL '${periodMonths + creditDays / 30} months'`;

    // Update user subscription
    await query(
      `UPDATE users SET
         plan_id = $1,
         subscription_status = 'active',
         billing_period = $2,
         payment_status = 'paid',
         current_period_start = NOW(),
         current_period_end = ${periodEndSql},
         grace_period_start = NULL,
         grace_period_end = NULL
       WHERE id = $3`,
      [planId, billingPeriod, userId]
    );

    // Record transaction
    await query(
      `INSERT INTO grow_transactions (transaction_id, user_id, process_id, status, amount, payment_method, raw_response, created_at)
       VALUES ($1, $2, $3, 'completed', $4, $5, $6, NOW())`,
      [
        data.transactionId,
        userId,
        processId,
        data.sum ? parseInt(data.sum) : 0,
        data.paymentType,
        JSON.stringify(data),
      ]
    );

    logger.info('[GrowWebhook] Subscription activated', {
      userId,
      planId,
      billingPeriod,
      creditDays,
    });

    return {
      subscriptionActivated: true,
    };
  }

  /**
   * Create admin alert
   */
  private async createAdminAlert(alert: {
    type: string;
    userId: string;
    title: string;
    metadata: Record<string, unknown>;
    severity?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO admin_alerts (type, user_id, title, metadata, severity, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
      [
        alert.type,
        alert.userId,
        alert.title,
        JSON.stringify(alert.metadata),
        alert.severity || 'medium',
      ]
    );
  }

  /**
   * Call ApproveTransaction API
   */
  private async approveTransaction(params: {
    processId: string;
    processToken: string;
    sum: string;
  }): Promise<void> {
    const apiBaseUrl = process.env.GROW_API_BASE_URL || 'https://meshulam.co.il/api/light/server/1.0';
    const pageCode = process.env.GROW_PAGE_CODE || '';

    const formData = new URLSearchParams();
    formData.append('pageCode', pageCode);
    formData.append('processId', params.processId);
    formData.append('processToken', params.processToken);
    formData.append('sum', params.sum);

    const response = await fetch(`${apiBaseUrl}/approveTransaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ApproveTransaction failed: ${response.status}`);
    }

    const result = await response.json() as { status: string; err?: string };
    if (result.status !== '1') {
      throw new Error(`ApproveTransaction failed: ${result.err || 'Unknown error'}`);
    }

    logger.info('[GrowWebhook] ApproveTransaction sent', { processId: params.processId });
  }
}

export default GrowWebhookService;
