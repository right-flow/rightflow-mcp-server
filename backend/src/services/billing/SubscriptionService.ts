// SubscriptionService - Manage organization subscriptions and plans
// TDD Phase 1.4 - GREEN (Implementation to pass tests)
// Created: 2026-02-05

import { query } from '../../config/database';
import type {
  OrganizationSubscription,
  SubscriptionPlan,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  CancelSubscriptionResponse,
  SubscriptionStatus,
  SubscriptionPlanRow,
  OrganizationSubscriptionRow,
  PlanName,
} from '../../types/billing';
import { mapPlanFromRow, mapSubscriptionFromRow } from '../../types/billing';

export class SubscriptionService {
  /**
   * Get organization's current subscription
   * If no subscription exists, returns default FREE plan
   */
  async getOrganizationSubscription(
    orgId: string,
  ): Promise<OrganizationSubscription> {
    // Try to fetch existing subscription
    const result = await query<OrganizationSubscriptionRow>(
      `SELECT * FROM organization_subscriptions
       WHERE org_id = $1
       AND status != 'cancelled'
       ORDER BY created_at DESC
       LIMIT 1`,
      [orgId],
    );

    if (result.length === 0) {
      // No subscription exists - return FREE plan
      const freePlan = await this.getPlanByName('FREE');
      if (!freePlan) {
        throw new Error('FREE plan not found in database');
      }

      // Create a virtual subscription for FREE plan
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      return {
        id: 'virtual-free',
        orgId,
        planId: freePlan.id,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
        plan: freePlan,
      };
    }

    const subscription = mapSubscriptionFromRow(result[0]);

    // Fetch plan details
    const plan = await this.getPlanById(subscription.planId);
    subscription.plan = plan || undefined;

    return subscription;
  }

  /**
   * Create new subscription for organization
   */
  async createSubscription(
    request: CreateSubscriptionRequest,
  ): Promise<CreateSubscriptionResponse> {
    try {
      // Check if organization already has active subscription
      const existing = await query<OrganizationSubscriptionRow>(
        `SELECT * FROM organization_subscriptions
         WHERE org_id = $1
         AND status IN ('active', 'grace_period')`,
        [request.orgId],
      );

      if (existing.length > 0) {
        return {
          success: false,
          error: 'Organization already has active subscription',
        };
      }

      // Calculate billing period
      const now = new Date();
      const periodEnd = new Date(now);
      if (request.billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Insert new subscription
      const result = await query<OrganizationSubscriptionRow>(
        `INSERT INTO organization_subscriptions
         (org_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          request.orgId,
          request.planId,
          'active',
          request.billingCycle,
          now,
          periodEnd,
        ],
      );

      const subscription = mapSubscriptionFromRow(result[0]);

      return {
        success: true,
        subscription,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel subscription
   * Marks as cancelled and schedules downgrade to FREE at period end
   */
  async cancelSubscription(
    orgId: string,
  ): Promise<CancelSubscriptionResponse> {
    try {
      // Fetch current subscription
      const existing = await query<OrganizationSubscriptionRow>(
        `SELECT * FROM organization_subscriptions
         WHERE org_id = $1
         AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [orgId],
      );

      if (existing.length === 0) {
        return {
          success: false,
          error: 'No active subscription found',
        };
      }

      const subscription = existing[0];
      const effectiveDate = new Date(subscription.current_period_end);

      // Mark as cancelled
      await query<OrganizationSubscriptionRow>(
        `UPDATE organization_subscriptions
         SET status = 'cancelled',
             cancelled_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [subscription.id],
      );

      return {
        success: true,
        effectiveDate,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
  ): Promise<OrganizationSubscription> {
    const result = await query<OrganizationSubscriptionRow>(
      `UPDATE organization_subscriptions
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [subscriptionId, status],
    );

    return mapSubscriptionFromRow(result[0]);
  }

  /**
   * Get all active subscription plans
   */
  async getAllPlans(): Promise<SubscriptionPlan[]> {
    const result = await query<SubscriptionPlanRow>(
      `SELECT * FROM subscription_plans
       WHERE is_active = true
       ORDER BY price_monthly_cents ASC`,
    );

    return result.map(mapPlanFromRow);
  }

  /**
   * Get plan by name
   */
  async getPlanByName(name: PlanName): Promise<SubscriptionPlan | null> {
    const result = await query<SubscriptionPlanRow>(
      `SELECT * FROM subscription_plans
       WHERE name = $1
       LIMIT 1`,
      [name],
    );

    if (result.length === 0) {
      return null;
    }

    return mapPlanFromRow(result[0]);
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const result = await query<SubscriptionPlanRow>(
      `SELECT * FROM subscription_plans
       WHERE id = $1
       LIMIT 1`,
      [planId],
    );

    if (result.length === 0) {
      return null;
    }

    return mapPlanFromRow(result[0]);
  }

  /**
   * Get subscription by GROW customer ID
   */
  async getSubscriptionByGrowCustomer(
    growCustomerId: string,
  ): Promise<OrganizationSubscription | null> {
    const result = await query<OrganizationSubscriptionRow>(
      `SELECT * FROM organization_subscriptions
       WHERE grow_customer_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [growCustomerId],
    );

    if (result.length === 0) {
      return null;
    }

    return mapSubscriptionFromRow(result[0]);
  }

  /**
   * Update GROW customer ID for subscription
   */
  async updateGrowCustomerId(
    subscriptionId: string,
    growCustomerId: string,
  ): Promise<void> {
    await query(
      `UPDATE organization_subscriptions
       SET grow_customer_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [subscriptionId, growCustomerId],
    );
  }

  /**
   * Advance billing period (for monthly billing cycle)
   */
  async advanceBillingPeriod(subscriptionId: string): Promise<void> {
    const subscription = await query<OrganizationSubscriptionRow>(
      `SELECT * FROM organization_subscriptions WHERE id = $1`,
      [subscriptionId],
    );

    if (subscription.length === 0) {
      throw new Error('Subscription not found');
    }

    const current = subscription[0];
    const newStart = new Date(current.current_period_end);
    const newEnd = new Date(newStart);

    if (current.billing_cycle === 'monthly') {
      newEnd.setMonth(newEnd.getMonth() + 1);
    } else {
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    }

    await query(
      `UPDATE organization_subscriptions
       SET current_period_start = $2,
           current_period_end = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [subscriptionId, newStart, newEnd],
    );
  }

  /**
   * Upgrade subscription to higher plan
   */
  async upgradeSubscription(
    orgId: string,
    targetPlan: PlanName,
  ): Promise<{ success: boolean; subscription?: OrganizationSubscription; error?: string }> {
    try {
      const plan = await this.getPlanByName(targetPlan);
      if (!plan) {
        return {
          success: false,
          error: 'Target plan not found',
        };
      }

      // Update subscription plan
      const result = await query<OrganizationSubscriptionRow>(
        `UPDATE organization_subscriptions
         SET plan_id = $2,
             updated_at = NOW()
         WHERE org_id = $1
         AND status != 'cancelled'
         RETURNING *`,
        [orgId, plan.id],
      );

      if (result.length === 0) {
        return {
          success: false,
          error: 'No active subscription found',
        };
      }

      return {
        success: true,
        subscription: mapSubscriptionFromRow(result[0]),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upgrade failed',
      };
    }
  }

  /**
   * Downgrade subscription to lower plan
   */
  async downgradeSubscription(
    orgId: string,
    targetPlan: PlanName,
  ): Promise<{ success: boolean; subscription?: OrganizationSubscription; error?: string }> {
    try {
      const plan = await this.getPlanByName(targetPlan);
      if (!plan) {
        return {
          success: false,
          error: 'Target plan not found',
        };
      }

      // Update subscription plan
      const result = await query<OrganizationSubscriptionRow>(
        `UPDATE organization_subscriptions
         SET plan_id = $2,
             updated_at = NOW()
         WHERE org_id = $1
         AND status != 'cancelled'
         RETURNING *`,
        [orgId, plan.id],
      );

      if (result.length === 0) {
        return {
          success: false,
          error: 'No active subscription found',
        };
      }

      return {
        success: true,
        subscription: mapSubscriptionFromRow(result[0]),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Downgrade failed',
      };
    }
  }
}
