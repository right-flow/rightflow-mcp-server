/**
 * Access Control Service Tests
 * Test-Driven Development for Free vs Pro tier access control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AccessControl,
  UserTier,
  Feature,
  FeatureLimit,
  AccessCheckResult,
} from './AccessControl';
import { useUser } from '@clerk/clerk-react';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(),
  useAuth: vi.fn(() => ({
    isSignedIn: true,
    getToken: vi.fn(() => Promise.resolve('mock-token')),
  })),
}));

describe('AccessControl', () => {
  let accessControl: AccessControl;

  beforeEach(() => {
    accessControl = new AccessControl();
    vi.clearAllMocks();
  });

  describe('User Tier Detection', () => {
    it('should detect guest user (not signed in)', () => {
      vi.mocked(useUser).mockReturnValue({
        isSignedIn: false,
        isLoaded: true,
        user: null,
      } as any);

      const tier = accessControl.getUserTier(null);
      expect(tier).toBe(UserTier.GUEST);
    });

    it('should detect free tier user', () => {
      const user = {
        id: 'user-123',
        publicMetadata: {
          tier: 'free',
        },
      };

      const tier = accessControl.getUserTier(user);
      expect(tier).toBe(UserTier.FREE);
    });

    it('should detect pro tier user', () => {
      const user = {
        id: 'user-123',
        publicMetadata: {
          tier: 'pro',
          subscription: 'active',
        },
      };

      const tier = accessControl.getUserTier(user);
      expect(tier).toBe(UserTier.PRO);
    });

    it('should detect enterprise tier user', () => {
      const user = {
        id: 'user-123',
        publicMetadata: {
          tier: 'enterprise',
          organizationId: 'org-456',
        },
      };

      const tier = accessControl.getUserTier(user);
      expect(tier).toBe(UserTier.ENTERPRISE);
    });

    it('should default to free tier for signed-in user without metadata', () => {
      const user = {
        id: 'user-123',
        publicMetadata: {},
      };

      const tier = accessControl.getUserTier(user);
      expect(tier).toBe(UserTier.FREE);
    });
  });

  describe('Feature Access Checks', () => {
    it('should allow basic features for free tier', () => {
      const result = accessControl.canAccessFeature(UserTier.FREE, Feature.BASIC_EDITOR);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block premium features for free tier', () => {
      const result = accessControl.canAccessFeature(UserTier.FREE, Feature.ADVANCED_WORKFLOW);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Pro subscription required');
      expect(result.requiredTier).toBe(UserTier.PRO);
    });

    it('should allow all features for pro tier', () => {
      const proFeatures = [
        Feature.ADVANCED_WORKFLOW,
        Feature.AI_EXTRACTION,
        Feature.MULTI_SELECT,
        Feature.EXPORT_PDF,
      ];

      proFeatures.forEach(feature => {
        const result = accessControl.canAccessFeature(UserTier.PRO, feature);
        expect(result.allowed).toBe(true);
      });
    });

    it('should allow enterprise-only features for enterprise tier', () => {
      const result = accessControl.canAccessFeature(
        UserTier.ENTERPRISE,
        Feature.CUSTOM_BRANDING
      );
      expect(result.allowed).toBe(true);
    });

    it('should provide upgrade path for blocked features', () => {
      const result = accessControl.canAccessFeature(UserTier.FREE, Feature.TEAM_COLLABORATION);
      expect(result.allowed).toBe(false);
      expect(result.upgradePath).toBeDefined();
      expect(result.upgradePath?.targetTier).toBe(UserTier.ENTERPRISE);
      expect(result.upgradePath?.ctaText).toContain('Upgrade');
    });
  });

  describe('Feature Limits', () => {
    it('should enforce form limit for free tier', () => {
      const result = accessControl.checkLimit(UserTier.FREE, FeatureLimit.FORMS_COUNT, 5);
      expect(result.allowed).toBe(true);

      const overLimit = accessControl.checkLimit(UserTier.FREE, FeatureLimit.FORMS_COUNT, 11);
      expect(overLimit.allowed).toBe(false);
      expect(overLimit.limit).toBe(10);
      expect(overLimit.current).toBe(11);
    });

    it('should enforce field limit per form', () => {
      const result = accessControl.checkLimit(UserTier.FREE, FeatureLimit.FIELDS_PER_FORM, 25);
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(20);
    });

    it('should have unlimited limits for pro tier', () => {
      const result = accessControl.checkLimit(UserTier.PRO, FeatureLimit.FORMS_COUNT, 1000);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it('should enforce monthly submission limit', () => {
      const result = accessControl.checkLimit(
        UserTier.FREE,
        FeatureLimit.MONTHLY_SUBMISSIONS,
        101
      );
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(100);
      expect(result.resetDate).toBeDefined();
    });

    it('should track storage limit', () => {
      const mbUsed = 60; // 60 MB
      const result = accessControl.checkLimit(UserTier.FREE, FeatureLimit.STORAGE_MB, mbUsed);
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(50);
      expect(result.percentUsed).toBe(120);
    });
  });

  describe('Bulk Operations Access', () => {
    it('should block bulk operations for free tier', () => {
      const result = accessControl.canPerformBulkOperation(UserTier.FREE, 'delete', 5);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Bulk operations');
    });

    it('should allow limited bulk operations for pro tier', () => {
      const result = accessControl.canPerformBulkOperation(UserTier.PRO, 'export', 50);
      expect(result.allowed).toBe(true);

      const tooMany = accessControl.canPerformBulkOperation(UserTier.PRO, 'export', 101);
      expect(tooMany.allowed).toBe(false);
      expect(tooMany.maxItems).toBe(100);
    });

    it('should allow unlimited bulk operations for enterprise', () => {
      const result = accessControl.canPerformBulkOperation(UserTier.ENTERPRISE, 'delete', 1000);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Trial Management', () => {
    it('should check if user is in trial period', () => {
      const user = {
        id: 'user-123',
        publicMetadata: {
          tier: 'pro',
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        },
      };

      const trialStatus = accessControl.getTrialStatus(user);
      expect(trialStatus.isInTrial).toBe(true);
      expect(trialStatus.daysRemaining).toBe(7);
      expect(trialStatus.features).toContain(Feature.ADVANCED_WORKFLOW);
    });

    it('should detect expired trial', () => {
      const user = {
        id: 'user-123',
        publicMetadata: {
          tier: 'free',
          trialEndsAt: new Date(Date.now() - 1000).toISOString(), // Expired
        },
      };

      const trialStatus = accessControl.getTrialStatus(user);
      expect(trialStatus.isInTrial).toBe(false);
      expect(trialStatus.expired).toBe(true);
    });

    it('should offer trial for eligible users', () => {
      const user = {
        id: 'user-123',
        createdAt: Date.now(),
        publicMetadata: {
          tier: 'free',
        },
      };

      const eligible = accessControl.isEligibleForTrial(user);
      expect(eligible).toBe(true);
    });
  });

  describe('Feature Flags', () => {
    it('should check feature flags', () => {
      const user = {
        id: 'user-123',
        publicMetadata: {
          featureFlags: ['beta_features', 'new_ui'],
        },
      };

      expect(accessControl.hasFeatureFlag(user, 'beta_features')).toBe(true);
      expect(accessControl.hasFeatureFlag(user, 'old_ui')).toBe(false);
    });

    it('should combine tier and feature flags', () => {
      const user = {
        id: 'user-123',
        publicMetadata: {
          tier: 'pro',
          subscription: 'active', // Required for PRO tier
          featureFlags: ['early_access'],
        },
      };

      const canAccess = accessControl.canAccessBetaFeature(
        user,
        Feature.EXPERIMENTAL_AI
      );
      expect(canAccess).toBe(true);
    });
  });

  describe('Usage Tracking', () => {
    it('should track feature usage', async () => {
      const user = { id: 'user-123' };

      await accessControl.trackUsage(user, Feature.AI_EXTRACTION);
      const usage = await accessControl.getUsageStats(user);

      expect(usage[Feature.AI_EXTRACTION]).toBeDefined();
      expect(usage[Feature.AI_EXTRACTION].count).toBe(1);
      expect(usage[Feature.AI_EXTRACTION].lastUsed).toBeDefined();
    });

    it('should enforce rate limits', async () => {
      const user = { id: 'user-123' };

      // Simulate multiple rapid requests
      const results = [];
      for (let i = 0; i < 15; i++) {
        results.push(
          await accessControl.checkRateLimit(user, Feature.AI_EXTRACTION, UserTier.FREE)
        );
      }

      // First 10 should be allowed (free tier limit)
      expect(results.slice(0, 10).every(r => r.allowed)).toBe(true);
      // 11th should be blocked
      expect(results[10].allowed).toBe(false);
      expect(results[10].retryAfter).toBeDefined();
    });
  });

  describe('Paywall Display Logic', () => {
    it('should determine when to show paywall', () => {
      const freeUser = {
        id: 'user-123',
        publicMetadata: { tier: 'free' },
      };

      const shouldShow = accessControl.shouldShowPaywall(
        freeUser,
        Feature.ADVANCED_WORKFLOW
      );

      expect(shouldShow.show).toBe(true);
      expect(shouldShow.variant).toBe('soft'); // Soft paywall for first attempt
      expect(shouldShow.message).toContain('Pro feature');
    });

    it('should show hard paywall after multiple attempts', () => {
      const freeUser = {
        id: 'user-123',
        publicMetadata: { tier: 'free' },
      };

      // Simulate multiple attempts
      accessControl.recordPaywallView(freeUser, Feature.ADVANCED_WORKFLOW);
      accessControl.recordPaywallView(freeUser, Feature.ADVANCED_WORKFLOW);
      accessControl.recordPaywallView(freeUser, Feature.ADVANCED_WORKFLOW);

      const shouldShow = accessControl.shouldShowPaywall(
        freeUser,
        Feature.ADVANCED_WORKFLOW
      );

      expect(shouldShow.variant).toBe('hard'); // Hard paywall after 3 attempts
      expect(shouldShow.dismissible).toBe(false);
    });

    it('should customize paywall message based on feature', () => {
      const freeUser = {
        id: 'user-123',
        publicMetadata: { tier: 'free' },
      };

      const workflowPaywall = accessControl.shouldShowPaywall(
        freeUser,
        Feature.ADVANCED_WORKFLOW
      );
      expect(workflowPaywall.message).toContain('workflow');

      const exportPaywall = accessControl.shouldShowPaywall(
        freeUser,
        Feature.EXPORT_PDF
      );
      expect(exportPaywall.message.toLowerCase()).toContain('export');
    });
  });

  describe('Tier Hierarchy Comparison (Bug Fix)', () => {
    it('should correctly compare tier hierarchy - GUEST tier', () => {
      // GUEST cannot access FREE-tier resources
      const result = accessControl.canCreate(UserTier.GUEST, 'form');
      expect(result.allowed).toBe(false);
    });

    it('should correctly compare tier hierarchy - FREE tier', () => {
      // FREE can access FREE-tier resources
      const formResult = accessControl.canCreate(UserTier.FREE, 'form');
      expect(formResult.allowed).toBe(true);

      // FREE cannot access PRO-tier resources
      const templateResult = accessControl.canCreate(UserTier.FREE, 'template');
      expect(templateResult.allowed).toBe(false);
    });

    it('should correctly compare tier hierarchy - PRO tier', () => {
      // PRO can access FREE and PRO-tier resources
      const formResult = accessControl.canCreate(UserTier.PRO, 'form');
      expect(formResult.allowed).toBe(true);

      const templateResult = accessControl.canCreate(UserTier.PRO, 'template');
      expect(templateResult.allowed).toBe(true);

      // PRO cannot access ENTERPRISE-tier resources
      const teamResult = accessControl.canCreate(UserTier.PRO, 'team');
      expect(teamResult.allowed).toBe(false);
    });

    it('should correctly compare tier hierarchy - ENTERPRISE tier', () => {
      // ENTERPRISE can access all tiers
      const formResult = accessControl.canCreate(UserTier.ENTERPRISE, 'form');
      expect(formResult.allowed).toBe(true);

      const templateResult = accessControl.canCreate(UserTier.ENTERPRISE, 'template');
      expect(templateResult.allowed).toBe(true);

      const teamResult = accessControl.canCreate(UserTier.ENTERPRISE, 'team');
      expect(teamResult.allowed).toBe(true);
    });

    it('should not show paywall for users with sufficient tier', () => {
      const proUser = {
        id: 'user-456',
        publicMetadata: { tier: 'pro', subscription: 'active' },
      };

      // PRO user should not see paywall for PRO features
      const paywall = accessControl.shouldShowPaywall(proUser, Feature.ADVANCED_WORKFLOW);
      expect(paywall.show).toBe(false);

      // PRO user should see paywall for ENTERPRISE features
      const enterprisePaywall = accessControl.shouldShowPaywall(proUser, Feature.TEAM_COLLABORATION);
      expect(enterprisePaywall.show).toBe(true);
    });

    it('should show paywall for users with insufficient tier', () => {
      const freeUser = {
        id: 'user-123',
        publicMetadata: { tier: 'free' },
      };

      // FREE user should see paywall for PRO features
      const paywall = accessControl.shouldShowPaywall(freeUser, Feature.ADVANCED_WORKFLOW);
      expect(paywall.show).toBe(true);

      // FREE user should NOT see paywall for FREE features
      const noPaywall = accessControl.shouldShowPaywall(freeUser, Feature.BASIC_EDITOR);
      expect(noPaywall.show).toBe(false);
    });
  });

  describe('Granular Permissions', () => {
    it('should check create permission', () => {
      const result = accessControl.canCreate(UserTier.FREE, 'form');
      expect(result.allowed).toBe(true);

      const templateResult = accessControl.canCreate(UserTier.FREE, 'template');
      expect(templateResult.allowed).toBe(false);
    });

    it('should check read permission', () => {
      const result = accessControl.canRead(UserTier.GUEST, 'form');
      expect(result.allowed).toBe(true); // Guests can view public forms
    });

    it('should check update permission', () => {
      const result = accessControl.canUpdate(UserTier.FREE, 'form', { ownerId: 'user-123' });
      expect(result.allowed).toBe(true);

      const otherUserForm = accessControl.canUpdate(UserTier.FREE, 'form', { ownerId: 'other' });
      expect(otherUserForm.allowed).toBe(false);
    });

    it('should check delete permission', () => {
      const result = accessControl.canDelete(UserTier.PRO, 'form', { ownerId: 'user-123' });
      expect(result.allowed).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user journey for free user', () => {
      const freeUser = {
        id: 'user-123',
        publicMetadata: { tier: 'free' },
      };

      // Can access basic editor
      expect(accessControl.canAccessFeature(UserTier.FREE, Feature.BASIC_EDITOR).allowed).toBe(true);

      // Cannot access premium features
      expect(accessControl.canAccessFeature(UserTier.FREE, Feature.AI_EXTRACTION).allowed).toBe(false);

      // Has form limits
      expect(accessControl.checkLimit(UserTier.FREE, FeatureLimit.FORMS_COUNT, 5).allowed).toBe(true);
      expect(accessControl.checkLimit(UserTier.FREE, FeatureLimit.FORMS_COUNT, 11).allowed).toBe(false);

      // Shows paywall for premium features
      const paywall = accessControl.shouldShowPaywall(freeUser, Feature.ADVANCED_WORKFLOW);
      expect(paywall.show).toBe(true);
    });

    it('should handle complete user journey for pro user', () => {
      const proUser = {
        id: 'user-456',
        publicMetadata: { tier: 'pro', subscription: 'active' },
      };

      // Can access all pro features
      expect(accessControl.canAccessFeature(UserTier.PRO, Feature.ADVANCED_WORKFLOW).allowed).toBe(true);
      expect(accessControl.canAccessFeature(UserTier.PRO, Feature.AI_EXTRACTION).allowed).toBe(true);

      // No form limits
      expect(accessControl.checkLimit(UserTier.PRO, FeatureLimit.FORMS_COUNT, 100).allowed).toBe(true);

      // No paywall
      const paywall = accessControl.shouldShowPaywall(proUser, Feature.ADVANCED_WORKFLOW);
      expect(paywall.show).toBe(false);

      // Can perform bulk operations
      expect(accessControl.canPerformBulkOperation(UserTier.PRO, 'export', 50).allowed).toBe(true);
    });
  });
});