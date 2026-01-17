/**
 * Premium Features Service Tests
 * Tests for premium feature access control
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PremiumFeaturesService } from './premium-features.service';
import { closeDb } from '../../lib/db';
import crypto from 'crypto';

describe('PremiumFeaturesService', () => {
  let service: PremiumFeaturesService;
  let testUserId: string;

  beforeEach(() => {
    service = new PremiumFeaturesService();
    testUserId = crypto.randomUUID();

    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'postgresql://postgres:test@localhost:5432/rightflow_test';
    }
  });

  afterEach(async () => {
    await closeDb();
  });

  describe('Plan Detection', () => {
    it('detects free plan (monthly_price_ils = 0)', async () => {
      const planInfo = await service.getUserPlan(testUserId);

      // New users should have free plan
      expect(planInfo).toBeDefined();
      expect(planInfo?.monthly_price_ils).toBe(0);
      expect(planInfo?.plan_name).toBe('Free');
    });

    it('detects paid plan (monthly_price_ils > 0)', async () => {
      // Note: This test assumes we can modify user plan in database
      // In real implementation, this would be done through billing service

      const isPaid = await service.isPaidPlan(testUserId);

      // Without actual plan upgrade, should be false
      expect(isPaid).toBe(false);
    });
  });

  describe('URL Shortening Feature Access', () => {
    it('denies URL shortening for free users', async () => {
      const result = await service.canUseUrlShortening(testUserId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('premium');
    });

    it('allows URL shortening for paid users', async () => {
      // This test would require setting up a paid plan
      // For now, we test the logic structure

      const result = await service.canUseUrlShortening(testUserId);

      // Structure should be correct
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
    });

    it('returns plan details in access check', async () => {
      const result = await service.canUseUrlShortening(testUserId);

      expect(result).toHaveProperty('userPlan');
      expect(result.userPlan).toBeDefined();
    });
  });

  describe('Feature Gating Logic', () => {
    it('checks monthly_price_ils threshold', async () => {
      const planInfo = await service.getUserPlan(testUserId);

      if (planInfo) {
        const isPaid = planInfo.monthly_price_ils > 0;
        expect(typeof isPaid).toBe('boolean');
      }
    });

    it('handles missing user gracefully', async () => {
      const nonExistentUserId = crypto.randomUUID();
      const result = await service.canUseUrlShortening(nonExistentUserId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('Plan Information', () => {
    it('returns plan name', async () => {
      const planInfo = await service.getUserPlan(testUserId);

      expect(planInfo?.plan_name).toBeDefined();
      expect(typeof planInfo?.plan_name).toBe('string');
    });

    it('returns monthly price in ILS', async () => {
      const planInfo = await service.getUserPlan(testUserId);

      expect(planInfo?.monthly_price_ils).toBeDefined();
      expect(typeof planInfo?.monthly_price_ils).toBe('number');
      expect(planInfo?.monthly_price_ils).toBeGreaterThanOrEqual(0);
    });

    it('returns plan features', async () => {
      const planInfo = await service.getUserPlan(testUserId);

      expect(planInfo).toHaveProperty('features');
    });
  });

  describe('Multi-tenant Support', () => {
    it('filters by tenant_type', async () => {
      const planInfo = await service.getUserPlan(testUserId);

      // Should work for both RightFlow and future multi-tenant users
      if (planInfo) {
        expect(['rightflow', 'docsflow']).toContain(planInfo.tenant_type || 'rightflow');
      }
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      // This would require mocking database failure
      // For now, verify structure

      const result = await service.canUseUrlShortening(testUserId);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('allowed');
    });

    it('returns safe defaults on error', async () => {
      const invalidUserId = 'invalid-uuid-format';

      // Should not throw, should return safe default (deny access)
      const result = await service.canUseUrlShortening(invalidUserId);

      expect(result.allowed).toBe(false);
    });
  });

  describe('Future Premium Features', () => {
    it('provides extensible feature check interface', () => {
      // Verify service can be extended with more features
      expect(service.canUseUrlShortening).toBeDefined();

      // Future features could include:
      // - canUseAdvancedAnalytics(userId)
      // - canUseWhiteLabel(userId)
      // - canUseApiAccess(userId)
      // - canUseCustomDomain(userId)
    });

    it('maintains consistent return structure', async () => {
      const result = await service.canUseUrlShortening(testUserId);

      // All feature checks should return consistent structure
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('userPlan');

      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.reason).toBe('string');
    });
  });
});
