/**
 * Limits Service Tests
 * Tests for plan limits enforcement
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LimitsService } from './limits.service';
import { getDb, closeDb } from '../../lib/db';

describe('LimitsService', () => {
  let limitsService: LimitsService;
  let testUserId: string;
  let testPlanId: string;

  beforeEach(async () => {
    const db = getDb();
    limitsService = new LimitsService();

    // Create Free plan (3 forms, 100 responses, 100MB)
    const [plan] = await db('plans').insert({
      id: crypto.randomUUID(),
      name: 'Free',
      monthly_price_ils: 0,
      max_forms: 3,
      max_responses_monthly: 100,
      max_storage_mb: 100,
      features: {},
      is_active: true,
    }).returning('*');
    testPlanId = plan.id;

    // Create test user with Free plan
    const [user] = await db('users').insert({
      id: crypto.randomUUID(),
      clerk_id: `test_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      plan_id: testPlanId,
      tenant_type: 'rightflow',
    }).returning('*');
    testUserId = user.id;

    // Create usage metrics
    await db('usage_metrics').insert({
      id: crypto.randomUUID(),
      user_id: testUserId,
      forms_count: 0,
      responses_count: 0,
      storage_used_bytes: 0,
      period_start: new Date(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  });

  afterEach(async () => {
    const db = getDb();
    await db('usage_metrics').where({ user_id: testUserId }).del();
    await db('users').where({ id: testUserId }).del();
    await db('plans').where({ id: testPlanId }).del();
    await closeDb();
  });

  describe('checkLimit', () => {
    it('allows action when under limit', async () => {
      const result = await limitsService.checkLimit({
        userId: testUserId,
        action: 'create_form',
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.upgradeRequired).toBeUndefined();
    });

    it('blocks action when at limit', async () => {
      // Set forms_count to 3 (Free plan limit)
      const db = getDb();
      await db('usage_metrics')
        .where({ user_id: testUserId })
        .update({ forms_count: 3 });

      const result = await limitsService.checkLimit({
        userId: testUserId,
        action: 'create_form',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('3 forms');
      expect(result.reason).toContain('Free');
      expect(result.currentUsage).toBe(3);
      expect(result.limit).toBe(3);
      expect(result.upgradeRequired).toBe(true);
    });

    it('returns correct reason for blocked action', async () => {
      const db = getDb();
      await db('usage_metrics')
        .where({ user_id: testUserId })
        .update({ forms_count: 3 });

      const result = await limitsService.checkLimit({
        userId: testUserId,
        action: 'create_form',
      });

      expect(result.reason).toBe("You've reached the maximum of 3 forms on the Free plan");
    });

    it('allows unlimited forms for Business plan', async () => {
      // Create Business plan (unlimited forms)
      const db = getDb();
      const [businessPlan] = await db('plans').insert({
        id: crypto.randomUUID(),
        name: 'Business',
        monthly_price_ils: 34900,
        max_forms: -1, // -1 = unlimited
        max_responses_monthly: 50000,
        max_storage_mb: 102400, // 100GB
        features: {},
        is_active: true,
      }).returning('*');

      // Update user to Business plan
      await db('users')
        .where({ id: testUserId })
        .update({ plan_id: businessPlan.id });

      // Set very high forms count
      await db('usage_metrics')
        .where({ user_id: testUserId })
        .update({ forms_count: 1000 });

      const result = await limitsService.checkLimit({
        userId: testUserId,
        action: 'create_form',
      });

      expect(result.allowed).toBe(true);

      // Cleanup - reset user plan first to avoid foreign key constraint
      await db('users').where({ id: testUserId }).update({ plan_id: testPlanId });
      await db('plans').where({ id: businessPlan.id }).del();
    });

    it('checks storage limit correctly', async () => {
      // Set storage to 99MB
      const db = getDb();
      await db('usage_metrics')
        .where({ user_id: testUserId })
        .update({ storage_used_bytes: 99 * 1024 * 1024 });

      // Try to upload 2MB file (would exceed 100MB limit)
      const result = await limitsService.checkLimit({
        userId: testUserId,
        action: 'upload_file',
        resourceSize: 2 * 1024 * 1024,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('storage');
      expect(result.upgradeRequired).toBe(true);
    });

    it('checks responses limit correctly', async () => {
      const db = getDb();
      await db('usage_metrics')
        .where({ user_id: testUserId })
        .update({ responses_count: 100 });

      const result = await limitsService.checkLimit({
        userId: testUserId,
        action: 'submit_response',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('100 responses');
    });
  });

  describe('getUserPlanLimits', () => {
    it('returns user plan and usage', async () => {
      const limits = await limitsService.getUserPlanLimits(testUserId);

      expect(limits.plan).toBeDefined();
      expect(limits.plan.name).toBe('Free');
      expect(limits.usage).toBeDefined();
      expect(limits.usage.forms_count).toBe(0);
      expect(limits.limitsReached).toBeDefined();
    });

    it('shows limits reached status', async () => {
      const db = getDb();
      await db('usage_metrics')
        .where({ user_id: testUserId })
        .update({
          forms_count: 3,
          responses_count: 100,
          storage_used_bytes: 100 * 1024 * 1024,
        });

      const limits = await limitsService.getUserPlanLimits(testUserId);

      expect(limits.limitsReached.forms).toBe(true);
      expect(limits.limitsReached.responses).toBe(true);
      expect(limits.limitsReached.storage).toBe(true);
    });

    it('shows not reached for under limits', async () => {
      const db = getDb();
      await db('usage_metrics')
        .where({ user_id: testUserId })
        .update({
          forms_count: 2,
          responses_count: 50,
          storage_used_bytes: 50 * 1024 * 1024,
        });

      const limits = await limitsService.getUserPlanLimits(testUserId);

      expect(limits.limitsReached.forms).toBe(false);
      expect(limits.limitsReached.responses).toBe(false);
      expect(limits.limitsReached.storage).toBe(false);
    });
  });

  describe('hasFeatureAccess', () => {
    it('grants feature access based on plan', async () => {
      const hasAccess = await limitsService.hasFeatureAccess(testUserId, 'basic_forms');

      expect(hasAccess).toBe(true);
    });

    it('denies feature access for premium features on free plan', async () => {
      const hasAccess = await limitsService.hasFeatureAccess(testUserId, 'webhooks');

      expect(hasAccess).toBe(false);
    });

    it('grants premium features on paid plans', async () => {
      // Create Pro plan with webhooks feature
      const db = getDb();
      const [proPlan] = await db('plans').insert({
        id: crypto.randomUUID(),
        name: 'Pro',
        monthly_price_ils: 14900,
        max_forms: 50,
        max_responses_monthly: 10000,
        max_storage_mb: 10240,
        features: { webhooks: true, api_access: true },
        is_active: true,
      }).returning('*');

      await db('users')
        .where({ id: testUserId })
        .update({ plan_id: proPlan.id });

      const hasWebhooks = await limitsService.hasFeatureAccess(testUserId, 'webhooks');
      const hasApi = await limitsService.hasFeatureAccess(testUserId, 'api_access');

      expect(hasWebhooks).toBe(true);
      expect(hasApi).toBe(true);

      // Cleanup - reset user plan first to avoid foreign key constraint
      await db('users').where({ id: testUserId }).update({ plan_id: testPlanId });
      await db('plans').where({ id: proPlan.id }).del();
    });
  });
});
