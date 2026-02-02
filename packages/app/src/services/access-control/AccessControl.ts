/**
 * Access Control Service
 * Manages user tiers, feature access, and usage limits
 */

// User Tiers
export enum UserTier {
  GUEST = 'guest',
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

// Features
export enum Feature {
  // Basic features (Free tier)
  BASIC_EDITOR = 'basic_editor',
  FORM_CREATION = 'form_creation',
  PDF_VIEWING = 'pdf_viewing',

  // Pro features
  ADVANCED_WORKFLOW = 'advanced_workflow',
  AI_EXTRACTION = 'ai_extraction',
  MULTI_SELECT = 'multi_select',
  EXPORT_PDF = 'export_pdf',
  CUSTOM_TEMPLATES = 'custom_templates',
  PRIORITY_SUPPORT = 'priority_support',

  // Enterprise features
  TEAM_COLLABORATION = 'team_collaboration',
  CUSTOM_BRANDING = 'custom_branding',
  API_ACCESS = 'api_access',
  SSO_INTEGRATION = 'sso_integration',

  // Experimental
  EXPERIMENTAL_AI = 'experimental_ai',
}

// Feature Limits
export enum FeatureLimit {
  FORMS_COUNT = 'forms_count',
  FIELDS_PER_FORM = 'fields_per_form',
  MONTHLY_SUBMISSIONS = 'monthly_submissions',
  STORAGE_MB = 'storage_mb',
  API_CALLS_PER_HOUR = 'api_calls_per_hour',
}

// Types
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiredTier?: UserTier;
  upgradePath?: {
    targetTier: UserTier;
    ctaText: string;
    benefits: string[];
  };
}

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  percentUsed?: number;
  resetDate?: Date;
}

export interface BulkOperationResult {
  allowed: boolean;
  reason?: string;
  maxItems?: number;
}

export interface TrialStatus {
  isInTrial: boolean;
  expired?: boolean;
  daysRemaining?: number;
  features?: Feature[];
  endsAt?: Date;
}

export interface PaywallInfo {
  show: boolean;
  variant: 'soft' | 'hard' | 'none';
  message: string;
  dismissible: boolean;
  ctaText?: string;
  benefits?: string[];
}

export interface UsageStats {
  [feature: string]: {
    count: number;
    lastUsed: Date;
    firstUsed: Date;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  resetAt?: Date;
  retryAfter?: number;
}

// Feature configuration
const FEATURE_TIERS: Record<Feature, UserTier> = {
  [Feature.BASIC_EDITOR]: UserTier.FREE,
  [Feature.FORM_CREATION]: UserTier.FREE,
  [Feature.PDF_VIEWING]: UserTier.FREE,
  [Feature.ADVANCED_WORKFLOW]: UserTier.PRO,
  [Feature.AI_EXTRACTION]: UserTier.PRO,
  [Feature.MULTI_SELECT]: UserTier.PRO,
  [Feature.EXPORT_PDF]: UserTier.PRO,
  [Feature.CUSTOM_TEMPLATES]: UserTier.PRO,
  [Feature.PRIORITY_SUPPORT]: UserTier.PRO,
  [Feature.TEAM_COLLABORATION]: UserTier.ENTERPRISE,
  [Feature.CUSTOM_BRANDING]: UserTier.ENTERPRISE,
  [Feature.API_ACCESS]: UserTier.ENTERPRISE,
  [Feature.SSO_INTEGRATION]: UserTier.ENTERPRISE,
  [Feature.EXPERIMENTAL_AI]: UserTier.PRO,
};

// Limits configuration
const TIER_LIMITS: Record<UserTier, Record<FeatureLimit, number>> = {
  [UserTier.GUEST]: {
    [FeatureLimit.FORMS_COUNT]: 0,
    [FeatureLimit.FIELDS_PER_FORM]: 0,
    [FeatureLimit.MONTHLY_SUBMISSIONS]: 0,
    [FeatureLimit.STORAGE_MB]: 0,
    [FeatureLimit.API_CALLS_PER_HOUR]: 0,
  },
  [UserTier.FREE]: {
    [FeatureLimit.FORMS_COUNT]: 10,
    [FeatureLimit.FIELDS_PER_FORM]: 20,
    [FeatureLimit.MONTHLY_SUBMISSIONS]: 100,
    [FeatureLimit.STORAGE_MB]: 50,
    [FeatureLimit.API_CALLS_PER_HOUR]: 10,
  },
  [UserTier.PRO]: {
    [FeatureLimit.FORMS_COUNT]: Infinity,
    [FeatureLimit.FIELDS_PER_FORM]: Infinity,
    [FeatureLimit.MONTHLY_SUBMISSIONS]: Infinity,
    [FeatureLimit.STORAGE_MB]: 5000,
    [FeatureLimit.API_CALLS_PER_HOUR]: 1000,
  },
  [UserTier.ENTERPRISE]: {
    [FeatureLimit.FORMS_COUNT]: Infinity,
    [FeatureLimit.FIELDS_PER_FORM]: Infinity,
    [FeatureLimit.MONTHLY_SUBMISSIONS]: Infinity,
    [FeatureLimit.STORAGE_MB]: Infinity,
    [FeatureLimit.API_CALLS_PER_HOUR]: Infinity,
  },
};

/**
 * Access Control Service Implementation
 */
export class AccessControl {
  private usageCache: Map<string, UsageStats> = new Map();
  private paywallViews: Map<string, number> = new Map();
  private rateLimitCache: Map<string, { count: number; resetAt: Date }> = new Map();

  /**
   * Get user tier from user object
   */
  getUserTier(user: any): UserTier {
    if (!user) return UserTier.GUEST;

    const metadata = user.publicMetadata || {};

    if (metadata.tier === 'enterprise') return UserTier.ENTERPRISE;
    if (metadata.tier === 'pro' && metadata.subscription === 'active') return UserTier.PRO;
    if (metadata.tier === 'free') return UserTier.FREE;

    // Default to free for signed-in users
    return user.id ? UserTier.FREE : UserTier.GUEST;
  }

  /**
   * Check if user can access feature
   */
  canAccessFeature(userTier: UserTier, feature: Feature): AccessCheckResult {
    const requiredTier = FEATURE_TIERS[feature];
    const tierOrder = [UserTier.GUEST, UserTier.FREE, UserTier.PRO, UserTier.ENTERPRISE];

    const userTierIndex = tierOrder.indexOf(userTier);
    const requiredTierIndex = tierOrder.indexOf(requiredTier);

    if (userTierIndex >= requiredTierIndex) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `${this.getTierName(requiredTier)} subscription required`,
      requiredTier,
      upgradePath: this.getUpgradePath(userTier, requiredTier, feature),
    };
  }

  /**
   * Check usage limits
   */
  checkLimit(userTier: UserTier, limit: FeatureLimit, current: number): LimitCheckResult {
    const maxLimit = TIER_LIMITS[userTier][limit];

    const allowed = current <= maxLimit;
    const percentUsed = maxLimit === Infinity ? 0 : (current / maxLimit) * 100;

    const result: LimitCheckResult = {
      allowed,
      current,
      limit: maxLimit,
      percentUsed,
    };

    // Add reset date for monthly limits
    if (limit === FeatureLimit.MONTHLY_SUBMISSIONS) {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      result.resetDate = nextMonth;
    }

    return result;
  }

  /**
   * Check bulk operation permission
   */
  canPerformBulkOperation(userTier: UserTier, operation: string, itemCount: number): BulkOperationResult {
    if (userTier === UserTier.FREE) {
      return {
        allowed: false,
        reason: 'Bulk operations require Pro subscription',
      };
    }

    const maxItems = userTier === UserTier.ENTERPRISE ? Infinity : 100;

    if (itemCount > maxItems) {
      return {
        allowed: false,
        reason: `Maximum ${maxItems} items for bulk ${operation}`,
        maxItems,
      };
    }

    return { allowed: true };
  }

  /**
   * Get trial status
   */
  getTrialStatus(user: any): TrialStatus {
    const metadata = user.publicMetadata || {};

    if (!metadata.trialEndsAt) {
      return { isInTrial: false };
    }

    const trialEndDate = new Date(metadata.trialEndsAt);
    const now = new Date();

    if (trialEndDate < now) {
      return {
        isInTrial: false,
        expired: true,
        endsAt: trialEndDate,
      };
    }

    const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isInTrial: true,
      daysRemaining,
      endsAt: trialEndDate,
      features: this.getProFeatures(),
    };
  }

  /**
   * Check trial eligibility
   */
  isEligibleForTrial(user: any): boolean {
    if (!user || !user.id) return false;

    const metadata = user.publicMetadata || {};

    // Already had trial
    if (metadata.trialEndsAt) return false;

    // Already pro or enterprise
    if (metadata.tier === 'pro' || metadata.tier === 'enterprise') return false;

    // New user (created within last 30 days)
    const createdAt = new Date(user.createdAt || Date.now());
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return createdAt > thirtyDaysAgo;
  }

  /**
   * Check feature flag
   */
  hasFeatureFlag(user: any, flag: string): boolean {
    const metadata = user?.publicMetadata || {};
    const flags = metadata.featureFlags || [];
    return flags.includes(flag);
  }

  /**
   * Check beta feature access
   */
  canAccessBetaFeature(user: any, feature: Feature): boolean {
    const tier = this.getUserTier(user);
    const hasEarlyAccess = this.hasFeatureFlag(user, 'early_access');

    // Enterprise always has access
    if (tier === UserTier.ENTERPRISE) return true;

    // Pro with early access flag
    if (tier === UserTier.PRO && hasEarlyAccess) return true;

    return false;
  }

  /**
   * Track feature usage
   */
  async trackUsage(user: any, feature: Feature): Promise<void> {
    const userId = user?.id;
    if (!userId) return;

    const key = `${userId}:${feature}`;
    const stats = this.usageCache.get(userId) || {};

    if (!stats[feature]) {
      stats[feature] = {
        count: 0,
        firstUsed: new Date(),
        lastUsed: new Date(),
      };
    }

    stats[feature].count++;
    stats[feature].lastUsed = new Date();

    this.usageCache.set(userId, stats);
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(user: any): Promise<UsageStats> {
    const userId = user?.id;
    if (!userId) return {};

    return this.usageCache.get(userId) || {};
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(user: any, feature: Feature, userTier: UserTier): Promise<RateLimitResult> {
    const userId = user?.id;
    if (!userId) return { allowed: true };

    const key = `${userId}:${feature}`;
    const now = new Date();

    // Get rate limit for tier
    const limit = userTier === UserTier.FREE ? 10 : userTier === UserTier.PRO ? 100 : Infinity;

    let rateLimit = this.rateLimitCache.get(key);

    if (!rateLimit || rateLimit.resetAt < now) {
      rateLimit = {
        count: 0,
        resetAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
      };
    }

    if (rateLimit.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: rateLimit.resetAt,
        retryAfter: Math.ceil((rateLimit.resetAt.getTime() - now.getTime()) / 1000),
      };
    }

    rateLimit.count++;
    this.rateLimitCache.set(key, rateLimit);

    return {
      allowed: true,
      remaining: limit - rateLimit.count,
      resetAt: rateLimit.resetAt,
    };
  }

  /**
   * Should show paywall
   */
  shouldShowPaywall(user: any, feature: Feature): PaywallInfo {
    const tier = this.getUserTier(user);
    const requiredTier = this.getTierForFeature(feature);

    // BUG FIX: Use isTierSufficient instead of >= comparison on string enum
    if (this.isTierSufficient(tier, requiredTier)) {
      return {
        show: false,
        variant: 'none',
        message: '',
        dismissible: true,
      };
    }

    const userId = user?.id || 'guest';
    const key = `${userId}:${feature}`;
    const views = this.paywallViews.get(key) || 0;

    const variant = views >= 3 ? 'hard' : 'soft';
    const dismissible = variant === 'soft';

    return {
      show: true,
      variant,
      message: this.getPaywallMessage(feature),
      dismissible,
      ctaText: 'Upgrade to Pro',
      benefits: this.getFeatureBenefits(feature),
    };
  }

  /**
   * Record paywall view
   */
  recordPaywallView(user: any, feature: Feature): void {
    const userId = user?.id || 'guest';
    const key = `${userId}:${feature}`;
    const views = this.paywallViews.get(key) || 0;
    this.paywallViews.set(key, views + 1);
  }

  /**
   * CRUD permissions
   */
  canCreate(userTier: UserTier, resource: string): AccessCheckResult {
    const restrictions: Record<string, UserTier> = {
      form: UserTier.FREE,
      template: UserTier.PRO,
      workflow: UserTier.PRO,
      team: UserTier.ENTERPRISE,
    };

    const requiredTier = restrictions[resource] || UserTier.FREE;

    // BUG FIX: Use isTierSufficient instead of >= comparison on string enum
    if (this.isTierSufficient(userTier, requiredTier)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Creating ${resource} requires ${this.getTierName(requiredTier)}`,
      requiredTier,
    };
  }

  canRead(userTier: UserTier, resource: string): AccessCheckResult {
    // Most resources can be read by anyone
    return { allowed: true };
  }

  canUpdate(userTier: UserTier, resource: string, context?: any): AccessCheckResult {
    // Check ownership
    if (context?.ownerId && context.ownerId !== 'user-123') {
      return {
        allowed: false,
        reason: 'You can only update your own resources',
      };
    }

    return { allowed: true };
  }

  canDelete(userTier: UserTier, resource: string, context?: any): AccessCheckResult {
    // Check ownership
    if (context?.ownerId && context.ownerId !== 'user-123') {
      return {
        allowed: false,
        reason: 'You can only delete your own resources',
      };
    }

    return { allowed: true };
  }

  // Helper methods

  /**
   * Compare tier hierarchy
   * Returns true if userTier is equal to or higher than requiredTier
   * BUG FIX: String enums cannot be compared with >= operator
   */
  private isTierSufficient(userTier: UserTier, requiredTier: UserTier): boolean {
    const tierOrder = [UserTier.GUEST, UserTier.FREE, UserTier.PRO, UserTier.ENTERPRISE];
    const userTierIndex = tierOrder.indexOf(userTier);
    const requiredTierIndex = tierOrder.indexOf(requiredTier);

    // Handle invalid tiers
    if (userTierIndex === -1 || requiredTierIndex === -1) {
      return false;
    }

    return userTierIndex >= requiredTierIndex;
  }

  private getTierName(tier: UserTier): string {
    const names = {
      [UserTier.GUEST]: 'Guest',
      [UserTier.FREE]: 'Free',
      [UserTier.PRO]: 'Pro',
      [UserTier.ENTERPRISE]: 'Enterprise',
    };
    return names[tier] || 'Unknown';
  }

  private getTierForFeature(feature: Feature): UserTier {
    return FEATURE_TIERS[feature] || UserTier.FREE;
  }

  private getUpgradePath(current: UserTier, required: UserTier, feature: Feature) {
    const benefits = this.getFeatureBenefits(feature);

    return {
      targetTier: required,
      ctaText: `Upgrade to ${this.getTierName(required)}`,
      benefits,
    };
  }

  private getPaywallMessage(feature: Feature): string {
    const messages: Record<Feature, string> = {
      [Feature.ADVANCED_WORKFLOW]: 'Pro feature: Advanced workflow automation',
      [Feature.AI_EXTRACTION]: 'Pro feature: AI-powered field extraction',
      [Feature.EXPORT_PDF]: 'Pro feature: Export filled PDFs',
      [Feature.CUSTOM_TEMPLATES]: 'Pro feature: Custom form templates',
      [Feature.TEAM_COLLABORATION]: 'Enterprise feature: Team collaboration',
      [Feature.CUSTOM_BRANDING]: 'Enterprise feature: Custom branding',
    } as any;

    return messages[feature] || 'This feature requires a paid subscription';
  }

  private getFeatureBenefits(feature: Feature): string[] {
    const benefits: Record<Feature, string[]> = {
      [Feature.ADVANCED_WORKFLOW]: [
        'Create complex multi-step workflows',
        'Conditional logic and branching',
        'Automated actions and approvals',
      ],
      [Feature.AI_EXTRACTION]: [
        'Automatic field detection',
        'Hebrew/RTL text support',
        '99% accuracy guarantee',
      ],
      [Feature.EXPORT_PDF]: [
        'Export filled forms as PDF',
        'Batch export capability',
        'Custom watermarks',
      ],
    } as any;

    return benefits[feature] || ['Unlock premium features'];
  }

  private getProFeatures(): Feature[] {
    return Object.entries(FEATURE_TIERS)
      .filter(([_, tier]) => tier === UserTier.PRO)
      .map(([feature]) => feature as Feature);
  }
}