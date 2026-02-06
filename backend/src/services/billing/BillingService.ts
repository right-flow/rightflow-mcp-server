// BillingService - Monthly billing and payment processing
// TDD Phase 2.4 - GREEN (Implementation to pass tests)
// Created: 2026-02-05

import { GrowClient } from './GrowClient';
import { SubscriptionService } from './SubscriptionService';
import { UsageService } from './UsageService';
import { query } from '../../config/database';
import type { Invoice } from '../../types/billing';

export interface MonthlyCharge {
  basePriceCents: number;
  overageSubmissions: number;
  overageCents: number;
  totalCents: number;
}

export interface BillingResult {
  success: boolean;
  invoice?: Invoice;
  gracePeriodStarted?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export interface WebhookPayload {
  event: string;
  customerId?: string;
  transactionId?: string;
  amount?: number;
  reason?: string;
  [key: string]: any;
}

export interface WebhookResult {
  success: boolean;
  message: string;
}

export class BillingService {
  private growClient: GrowClient;
  private subscriptionService: SubscriptionService;
  private usageService: UsageService;

  // Overage pricing: 50 agorot (0.50 ILS) per submission over limit
  private readonly OVERAGE_PRICE_PER_SUBMISSION = 50; // cents

  constructor(
    growClient: GrowClient,
    subscriptionService: SubscriptionService,
    usageService: UsageService,
  ) {
    this.growClient = growClient;
    this.subscriptionService = subscriptionService;
    this.usageService = usageService;
  }

  /**
   * Calculate monthly charge for organization
   */
  async calculateMonthlyCharge(orgId: string): Promise<MonthlyCharge> {
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      orgId,
    );
    const usage = await this.usageService.getOrganizationUsage(orgId);

    const basePriceCents = subscription.plan?.priceMonthly || 0;

    // Calculate overage
    const overageSubmissions = Math.max(
      0,
      usage.totalSubmissions - usage.quotaLimit,
    );
    const overageCents =
      overageSubmissions * this.OVERAGE_PRICE_PER_SUBMISSION;

    return {
      basePriceCents,
      overageSubmissions,
      overageCents,
      totalCents: basePriceCents + overageCents,
    };
  }

  /**
   * Process monthly billing for organization
   */
  async processMonthlyBilling(orgId: string): Promise<BillingResult> {
    try {
      const subscription = await this.subscriptionService.getOrganizationSubscription(
        orgId,
      );

      // Skip FREE plan
      if (subscription.plan?.name === 'FREE') {
        return {
          success: true,
          skipped: true,
          reason: 'FREE plan - no charge',
        };
      }

      // Calculate charge
      const charge = await this.calculateMonthlyCharge(orgId);

      if (charge.totalCents === 0) {
        return {
          success: true,
          skipped: true,
          reason: 'No charge for this period',
        };
      }

      // Charge customer via GROW
      if (!subscription.growCustomerId) {
        return {
          success: false,
          error: 'No GROW customer ID found',
        };
      }

      const chargeResult = await this.growClient.chargeCustomer({
        customerId: subscription.growCustomerId,
        amount: charge.totalCents,
        description: `RightFlow ${subscription.plan?.name} - ${new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`,
        idempotencyKey: `charge-${orgId}-${new Date().toISOString().slice(0, 7)}`,
      });

      if (chargeResult.success) {
        // Create invoice record
        const invoice = await this.createInvoice({
          orgId,
          subscriptionId: subscription.id,
          amountCents: charge.totalCents,
          status: 'paid',
          growTransactionId: chargeResult.transactionId,
        });

        // Advance billing period
        await this.subscriptionService.advanceBillingPeriod(subscription.id);

        // Reset usage for new period
        const newPeriodStart = subscription.currentPeriodEnd;
        const newPeriodEnd = new Date(newPeriodStart);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await this.usageService.resetUsageForNewPeriod(orgId, {
          start: newPeriodStart,
          end: newPeriodEnd,
        });

        return {
          success: true,
          invoice,
        };
      } else {
        // Payment failed - start grace period
        await this.startGracePeriod(subscription.id, orgId, chargeResult.failureReason || 'Payment failed');

        return {
          success: false,
          gracePeriodStarted: true,
          error: chargeResult.error || 'Payment failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create invoice record
   */
  private async createInvoice(params: {
    orgId: string;
    subscriptionId: string;
    amountCents: number;
    status: string;
    growTransactionId?: string;
  }): Promise<Invoice> {
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      params.orgId,
    );

    const result = await query<any>(
      `INSERT INTO invoices
       (org_id, subscription_id, amount_cents, currency, status, billing_period_start, billing_period_end, paid_at, grow_invoice_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        params.orgId,
        params.subscriptionId,
        params.amountCents,
        'ILS',
        params.status,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        params.status === 'paid' ? new Date() : null,
        params.growTransactionId || null,
      ],
    );

    return {
      id: result[0].id,
      orgId: result[0].org_id,
      subscriptionId: result[0].subscription_id,
      amountCents: result[0].amount_cents,
      currency: result[0].currency,
      status: result[0].status,
      billingPeriodStart: new Date(result[0].billing_period_start),
      billingPeriodEnd: new Date(result[0].billing_period_end),
      paidAt: result[0].paid_at ? new Date(result[0].paid_at) : null,
      growInvoiceId: result[0].grow_invoice_id,
      createdAt: new Date(result[0].created_at),
    };
  }

  /**
   * Start grace period for failed payment
   */
  private async startGracePeriod(
    subscriptionId: string,
    orgId: string,
    reason: string,
  ): Promise<void> {
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + 14); // 14 days grace period

    const nextRetryAt = new Date(now);
    nextRetryAt.setDate(nextRetryAt.getDate() + 3); // First retry in 3 days

    await query(
      `INSERT INTO grace_periods
       (org_id, subscription_id, started_at, ends_at, next_retry_at, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [orgId, subscriptionId, now, endsAt, nextRetryAt],
    );

    // Update subscription status
    await this.subscriptionService.updateSubscriptionStatus(
      subscriptionId,
      'grace_period',
    );
  }

  /**
   * Handle GROW webhook events
   */
  async handleGrowWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    try {
      const { event, customerId } = payload;

      if (!customerId) {
        return {
          success: true,
          message: 'No customer ID in webhook - ignored',
        };
      }

      // Get subscription by GROW customer ID
      const subscription = await this.subscriptionService.getSubscriptionByGrowCustomer(
        customerId,
      );

      if (!subscription) {
        return {
          success: true,
          message: 'Subscription not found - ignored',
        };
      }

      switch (event) {
        case 'payment.success':
          // Update subscription to active
          await this.subscriptionService.updateSubscriptionStatus(
            subscription.id,
            'active',
          );

          // Resolve any active grace period
          await query(
            `UPDATE grace_periods
             SET status = 'resolved',
                 resolved_at = NOW(),
                 resolution_reason = 'payment_success'
             WHERE org_id = $1
             AND status = 'active'`,
            [subscription.orgId],
          );

          return {
            success: true,
            message: 'Payment success handled',
          };

        case 'payment.failed':
          // Start grace period
          await this.startGracePeriod(
            subscription.id,
            subscription.orgId,
            payload.reason || 'Payment failed',
          );

          return {
            success: true,
            message: 'Payment failure handled - grace period started',
          };

        default:
          return {
            success: true,
            message: `Unknown event type: ${event} - ignored`,
          };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  }
}
