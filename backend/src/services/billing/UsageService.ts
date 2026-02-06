// UsageService - Track organization and form usage
// TDD Phase 1.5 - GREEN (Implementation to pass tests)
// Created: 2026-02-05

import { query } from '../../config/database';
import type {
  OrganizationUsage,
  FormUsageDetails,
  OrganizationUsageRow,
} from '../../types/billing';
import { mapUsageFromRow } from '../../types/billing';
import { SubscriptionService } from './SubscriptionService';

interface FormUsageRow {
  id: string;
  org_id: string;
  form_id: string;
  billing_period_start: string;
  submissions_count: number;
}

export class UsageService {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Get current billing period dates
   */
  private getCurrentBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  /**
   * Get organization usage for current billing period
   * Creates new record if doesn't exist
   */
  async getOrganizationUsage(orgId: string): Promise<OrganizationUsage> {
    const { start, end } = this.getCurrentBillingPeriod();

    // Try to fetch existing usage
    const existing = await query<OrganizationUsageRow>(
      `SELECT * FROM organization_usage
       WHERE org_id = $1
       AND billing_period_start = $2
       LIMIT 1`,
      [orgId, start],
    );

    if (existing.length > 0) {
      return mapUsageFromRow(existing[0]);
    }

    // No usage record - create one
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      orgId,
    );
    const quotaLimit = subscription.plan?.maxSubmissionsPerMonth || 50;

    const newUsage = await query<OrganizationUsageRow>(
      `INSERT INTO organization_usage
       (org_id, billing_period_start, billing_period_end, total_submissions, quota_limit)
       VALUES ($1, $2, $3, 0, $4)
       RETURNING *`,
      [orgId, start, end, quotaLimit],
    );

    return mapUsageFromRow(newUsage[0]);
  }

  /**
   * Increment usage counters
   * Updates both organization total and form-level analytics
   * Race condition fix: Uses upsert pattern to ensure record exists before incrementing
   */
  async incrementUsage(orgId: string, formId: string): Promise<void> {
    const { start, end } = this.getCurrentBillingPeriod();

    // Get subscription quota limit for potential record creation
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      orgId,
    );
    const quotaLimit = subscription.plan?.maxSubmissionsPerMonth || 50;

    // Increment organization total (critical path)
    // Use upsert to handle race condition where record doesn't exist yet
    await query(
      `INSERT INTO organization_usage
       (org_id, billing_period_start, billing_period_end, total_submissions, quota_limit)
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT (org_id, billing_period_start)
       DO UPDATE SET
         total_submissions = organization_usage.total_submissions + 1,
         updated_at = NOW()`,
      [orgId, start, end, quotaLimit],
    );

    // Track form-level usage (analytics, non-blocking)
    await query(
      `INSERT INTO form_usage_details
       (org_id, form_id, billing_period_start, submissions_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (form_id, billing_period_start)
       DO UPDATE SET submissions_count = form_usage_details.submissions_count + 1`,
      [orgId, formId, start],
    );
  }

  /**
   * Reset usage for new billing period
   */
  async resetUsageForNewPeriod(
    orgId: string,
    billingPeriod: { start: Date; end: Date },
  ): Promise<OrganizationUsage> {
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      orgId,
    );
    const quotaLimit = subscription.plan?.maxSubmissionsPerMonth || 50;

    const result = await query<OrganizationUsageRow>(
      `INSERT INTO organization_usage
       (org_id, billing_period_start, billing_period_end, total_submissions, quota_limit)
       VALUES ($1, $2, $3, 0, $4)
       RETURNING *`,
      [orgId, billingPeriod.start, billingPeriod.end, quotaLimit],
    );

    return mapUsageFromRow(result[0]);
  }

  /**
   * Get usage for specific form
   */
  async getFormUsage(formId: string): Promise<FormUsageDetails | null> {
    const { start } = this.getCurrentBillingPeriod();

    const result = await query<FormUsageRow>(
      `SELECT * FROM form_usage_details
       WHERE form_id = $1
       AND billing_period_start = $2
       LIMIT 1`,
      [formId, start],
    );

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      orgId: row.org_id,
      formId: row.form_id,
      billingPeriodStart: new Date(row.billing_period_start),
      submissionsCount: row.submissions_count,
    };
  }

  /**
   * Get usage breakdown for all forms in organization
   */
  async getAllFormsUsage(orgId: string): Promise<FormUsageDetails[]> {
    const { start } = this.getCurrentBillingPeriod();

    const result = await query<FormUsageRow>(
      `SELECT * FROM form_usage_details
       WHERE org_id = $1
       AND billing_period_start = $2
       ORDER BY submissions_count DESC`,
      [orgId, start],
    );

    return result.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      formId: row.form_id,
      billingPeriodStart: new Date(row.billing_period_start),
      submissionsCount: row.submissions_count,
    }));
  }

  /**
   * Calculate usage percentage (0-100)
   */
  async getUsagePercentage(orgId: string): Promise<number> {
    const usage = await this.getOrganizationUsage(orgId);

    if (usage.quotaLimit === 0) {
      return 100; // Suspended account or no quota
    }

    const percentage = (usage.totalSubmissions / usage.quotaLimit) * 100;
    return Math.min(Math.round(percentage), 100);
  }

  /**
   * Get remaining quota
   */
  async getRemainingQuota(orgId: string): Promise<number> {
    const usage = await this.getOrganizationUsage(orgId);
    const remaining = usage.quotaLimit - usage.totalSubmissions;
    return Math.max(remaining, 0);
  }

  /**
   * Get overage amount (submissions over limit)
   */
  async getOverageAmount(orgId: string): Promise<number> {
    const usage = await this.getOrganizationUsage(orgId);
    const overage = usage.totalSubmissions - usage.quotaLimit;
    return Math.max(overage, 0);
  }

  /**
   * Check if organization can submit (has quota available)
   */
  async canSubmit(orgId: string): Promise<boolean> {
    const usage = await this.getOrganizationUsage(orgId);
    return usage.totalSubmissions < usage.quotaLimit;
  }

  /**
   * Update quota limit for organization (when plan changes)
   */
  async updateQuotaLimit(orgId: string, newLimit: number): Promise<void> {
    const { start } = this.getCurrentBillingPeriod();

    await query(
      `UPDATE organization_usage
       SET quota_limit = $3, updated_at = NOW()
       WHERE org_id = $1
       AND billing_period_start = $2`,
      [orgId, start, newLimit],
    );
  }

  /**
   * Get usage statistics for dashboard
   */
  async getUsageStatistics(orgId: string): Promise<{
    totalSubmissions: number;
    quotaLimit: number;
    remaining: number;
    percentUsed: number;
    overageAmount: number;
    formsBreakdown: FormUsageDetails[];
  }> {
    const usage = await this.getOrganizationUsage(orgId);
    const percentage = await this.getUsagePercentage(orgId);
    const remaining = await this.getRemainingQuota(orgId);
    const overage = await this.getOverageAmount(orgId);
    const formsBreakdown = await this.getAllFormsUsage(orgId);

    return {
      totalSubmissions: usage.totalSubmissions,
      quotaLimit: usage.quotaLimit,
      remaining,
      percentUsed: percentage,
      overageAmount: overage,
      formsBreakdown,
    };
  }
}
