// QuotaEnforcementService - Quota validation and enforcement
// TDD Phase 3 - GREEN (Implementation to pass tests)
// Created: 2026-02-05

import { UsageService } from './UsageService';
import { SubscriptionService } from './SubscriptionService';
import type { OrganizationUsage } from '../../types/billing';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  quotaInfo: {
    totalSubmissions: number;
    quotaLimit: number;
    remaining: number;
    percentUsed: number;
    overageAmount: number;
  };
  willIncurOverage?: boolean;
  estimatedOverageCost?: number;
  upgradeRequired?: boolean;
  isGracePeriod?: boolean;
}

export interface FormCreationValidation {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  maxAllowed?: number;
}

export interface QuotaStatus {
  totalSubmissions: number;
  quotaLimit: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
  overageAmount: number;
  canIncurOverage: boolean;
  planName: string;
  subscriptionStatus: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}

export class QuotaEnforcementService {
  private usageService: UsageService;
  private subscriptionService: SubscriptionService;

  // Overage pricing: 50 agorot per submission
  private readonly OVERAGE_PRICE_PER_SUBMISSION = 50; // cents

  constructor(
    usageService: UsageService,
    subscriptionService: SubscriptionService,
  ) {
    this.usageService = usageService;
    this.subscriptionService = subscriptionService;
  }

  /**
   * Check if organization can submit a form
   * Returns quota info and whether submission is allowed
   */
  async canSubmitForm(
    orgId: string,
    _formId: string, // Reserved for future per-form quota checks
  ): Promise<QuotaCheckResult> {
    const usage = await this.usageService.getOrganizationUsage(orgId);
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      orgId,
    );

    // Check subscription status first
    if (subscription.status === 'suspended' || subscription.status === 'pending_deletion') {
      return {
        allowed: false,
        reason: 'subscription_suspended',
        quotaInfo: this.buildQuotaInfo(usage),
      };
    }

    const isGracePeriod = subscription.status === 'grace_period';
    const remaining = usage.quotaLimit - usage.totalSubmissions;
    const percentUsed = Math.round(
      (usage.totalSubmissions / usage.quotaLimit) * 100,
    );
    const overageAmount = Math.max(0, usage.totalSubmissions - usage.quotaLimit);

    const quotaInfo = {
      totalSubmissions: usage.totalSubmissions,
      quotaLimit: usage.quotaLimit,
      remaining,
      percentUsed,
      overageAmount,
    };

    // Under quota - always allow
    if (usage.totalSubmissions < usage.quotaLimit) {
      return {
        allowed: true,
        quotaInfo,
        isGracePeriod,
      };
    }

    // At or over quota - check plan type
    const planName = subscription.plan?.name || 'FREE';

    // FREE plan: Hard limit, no overage allowed
    if (planName === 'FREE') {
      return {
        allowed: false,
        reason: 'quota_exceeded_free_plan',
        quotaInfo,
        upgradeRequired: true,
      };
    }

    // Paid plans: Allow overage with cost estimation
    const nextOverageCount = overageAmount + 1;
    const estimatedOverageCost =
      nextOverageCount * this.OVERAGE_PRICE_PER_SUBMISSION;

    return {
      allowed: true,
      quotaInfo,
      willIncurOverage: true,
      estimatedOverageCost,
      isGracePeriod,
    };
  }

  /**
   * Validate if organization can create a new form
   */
  async validateFormCreation(
    orgId: string,
    currentFormCount: number,
  ): Promise<FormCreationValidation> {
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      orgId,
    );

    // Check subscription status
    if (subscription.status === 'suspended' || subscription.status === 'pending_deletion') {
      return {
        allowed: false,
        reason: 'subscription_suspended',
      };
    }

    const maxForms = subscription.plan?.maxForms || 3;

    // Check if at or over limit
    if (currentFormCount >= maxForms) {
      return {
        allowed: false,
        reason: 'form_limit_reached',
        currentCount: currentFormCount,
        maxAllowed: maxForms,
      };
    }

    return {
      allowed: true,
    };
  }

  /**
   * Get detailed quota status for organization
   */
  async getQuotaStatus(orgId: string): Promise<QuotaStatus> {
    const usage = await this.usageService.getOrganizationUsage(orgId);
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      orgId,
    );

    const remaining = Math.max(0, usage.quotaLimit - usage.totalSubmissions);
    const percentUsed = Math.round(
      (usage.totalSubmissions / usage.quotaLimit) * 100,
    );
    const isExceeded = usage.totalSubmissions >= usage.quotaLimit;
    const overageAmount = Math.max(0, usage.totalSubmissions - usage.quotaLimit);

    const planName = subscription.plan?.name || 'FREE';
    const canIncurOverage = planName !== 'FREE';

    return {
      totalSubmissions: usage.totalSubmissions,
      quotaLimit: usage.quotaLimit,
      remaining,
      percentUsed,
      isExceeded,
      overageAmount,
      canIncurOverage,
      planName,
      subscriptionStatus: subscription.status,
      billingPeriodStart: usage.billingPeriodStart,
      billingPeriodEnd: usage.billingPeriodEnd,
    };
  }

  /**
   * Helper to build quota info object
   */
  private buildQuotaInfo(usage: OrganizationUsage) {
    const remaining = Math.max(0, usage.quotaLimit - usage.totalSubmissions);
    const percentUsed = Math.round(
      (usage.totalSubmissions / usage.quotaLimit) * 100,
    );
    const overageAmount = Math.max(0, usage.totalSubmissions - usage.quotaLimit);

    return {
      totalSubmissions: usage.totalSubmissions,
      quotaLimit: usage.quotaLimit,
      remaining,
      percentUsed,
      overageAmount,
    };
  }
}
