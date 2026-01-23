/**
 * Premium Features Service
 * Checks if user has access to premium features based on their plan
 */

import { getDb } from '../../lib/db';

export interface PlanInfo {
  id: string;
  name: string;
  monthlyPrice: number;
  features: Record<string, any>;
  isPaid: boolean;
}

export interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
  planName?: string;
}

export class PremiumFeaturesService {
  /**
   * Get user's current plan
   */
  async getUserPlan(userId: string): Promise<PlanInfo | null> {
    try {
      const db = getDb();

      const user = await db('users')
        .where({ id: userId })
        .first('plan_id');

      if (!user || !user.plan_id) {
        return null;
      }

      const plan = await db('plans')
        .where({ id: user.plan_id, is_active: true })
        .first('id', 'name', 'monthly_price_ils', 'features');

      if (!plan) {
        return null;
      }

      return {
        id: plan.id,
        name: plan.name,
        monthlyPrice: plan.monthly_price_ils,
        features: plan.features || {},
        isPaid: plan.monthly_price_ils > 0,
      };
    } catch (error) {
      console.error('Error fetching user plan:', error);
      return null;
    }
  }

  /**
   * Check if user has a paid plan
   */
  async isPaidPlan(userId: string): Promise<boolean> {
    const plan = await this.getUserPlan(userId);
    return plan?.isPaid || false;
  }

  /**
   * Check if user can use URL shortening feature
   * This is a premium feature only
   */
  async canUseUrlShortening(userId: string): Promise<FeatureCheckResult> {
    const plan = await this.getUserPlan(userId);

    if (!plan) {
      return {
        allowed: false,
        reason: 'No plan found',
      };
    }

    if (!plan.isPaid) {
      return {
        allowed: false,
        reason: 'URL shortening is a premium feature. Please upgrade your plan.',
        planName: plan.name,
      };
    }

    return {
      allowed: true,
      planName: plan.name,
    };
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeature(userId: string, featureName: string): Promise<FeatureCheckResult> {
    const plan = await this.getUserPlan(userId);

    if (!plan) {
      return {
        allowed: false,
        reason: 'No plan found',
      };
    }

    // Check if feature is explicitly enabled in plan features
    if (plan.features[featureName] === true) {
      return {
        allowed: true,
        planName: plan.name,
      };
    }

    // For paid plans, some features might be implicitly allowed
    if (plan.isPaid) {
      // Premium features available to all paid plans
      const premiumFeatures = [
        'url_shortening',
        'priority_support',
        'advanced_analytics',
      ];

      if (premiumFeatures.includes(featureName)) {
        return {
          allowed: true,
          planName: plan.name,
        };
      }
    }

    return {
      allowed: false,
      reason: `Feature "${featureName}" is not available in your current plan.`,
      planName: plan.name,
    };
  }

  /**
   * Get plan upgrade suggestion for a feature
   */
  async getUpgradeSuggestion(userId: string, featureName: string): Promise<string> {
    const currentPlan = await this.getUserPlan(userId);

    if (!currentPlan) {
      return 'Please select a plan to access this feature.';
    }

    if (currentPlan.isPaid) {
      return `This feature is not available in your current plan (${currentPlan.name}). Please contact support for enterprise options.`;
    }

    // Free plan user
    return `Upgrade to a paid plan to access ${featureName}. Starting from ₪49/month.`;
  }
}

// Export singleton instance
export const premiumFeaturesService = new PremiumFeaturesService();
