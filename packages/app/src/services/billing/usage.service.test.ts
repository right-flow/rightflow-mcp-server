/**
 * Usage Service Tests
 * Tests for tracking forms, responses, and storage usage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UsageService } from './usage.service';
import { getDb, closeDb } from '../../lib/db';

describe('UsageService', () => {
  let usageService: UsageService;
  let testUserId: string;
  let testPlanId: string;

  beforeEach(async () => {
    usageService = new UsageService();

    // Create test plan
    const [plan] = await getDb()('plans').insert({
      id: crypto.randomUUID(),
      name: 'Test Plan',
      monthly_price_ils: 0,
      max_forms: 10,
      max_responses_monthly: 100,
      max_storage_mb: 100,
      features: {},
      is_active: true,
    }).returning('*');
    testPlanId = plan.id;

    // Create test user
    const [user] = await getDb()('users').insert({
      id: crypto.randomUUID(),
      clerk_id: `test_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      plan_id: testPlanId,
      tenant_type: 'rightflow',
    }).returning('*');
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await getDb()('usage_metrics').where({ user_id: testUserId }).del();
    await getDb()('users').where({ id: testUserId }).del();
    await getDb()('plans').where({ id: testPlanId }).del();
    await closeDb();
  });

  describe('getCurrentUsage', () => {
    it('gets current usage for user', async () => {
      const usage = await usageService.getCurrentUsage(testUserId);

      expect(usage).toBeDefined();
      expect(usage.forms_count).toBe(0);
      expect(usage.responses_count).toBe(0);
      expect(usage.storage_used_bytes).toBe(0);
      expect(usage.period_start).toBeInstanceOf(Date);
      expect(usage.period_end).toBeInstanceOf(Date);
    });

    it('creates usage_metrics record if not exists', async () => {
      // Verify no record exists
      const before = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(before).toBeUndefined();

      // Get usage (should create record)
      await usageService.getCurrentUsage(testUserId);

      // Verify record was created
      const after = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(after).toBeDefined();
      expect(Number(after.forms_count)).toBe(0);
      expect(Number(after.responses_count)).toBe(0);
      expect(Number(after.storage_used_bytes)).toBe(0);
    });

    it('returns existing usage data', async () => {
      // Create usage record with data
      await getDb()('usage_metrics').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        forms_count: 5,
        responses_count: 25,
        storage_used_bytes: 1024 * 1024, // 1MB
        period_start: new Date('2026-01-01'),
        period_end: new Date('2026-01-31'),
      });

      const usage = await usageService.getCurrentUsage(testUserId);

      expect(usage.forms_count).toBe(5);
      expect(usage.responses_count).toBe(25);
      expect(usage.storage_used_bytes).toBe(1024 * 1024);
    });
  });

  describe('incrementFormsCount', () => {
    it('increments forms_count on form creation', async () => {
      await usageService.incrementFormsCount(testUserId);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(usage.forms_count).toBe(1);
    });

    it('increments multiple times correctly', async () => {
      await usageService.incrementFormsCount(testUserId);
      await usageService.incrementFormsCount(testUserId);
      await usageService.incrementFormsCount(testUserId);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(usage.forms_count).toBe(3);
    });

    it('creates usage record if not exists', async () => {
      const before = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(before).toBeUndefined();

      await usageService.incrementFormsCount(testUserId);

      const after = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(after).toBeDefined();
      expect(after.forms_count).toBe(1);
    });
  });

  describe('decrementFormsCount', () => {
    it('decrements forms_count on form deletion', async () => {
      // Set initial count
      await getDb()('usage_metrics').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        forms_count: 5,
        responses_count: 0,
        storage_used_bytes: 0,
        period_start: new Date(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await usageService.decrementFormsCount(testUserId);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(usage.forms_count).toBe(4);
    });

    it('does not go below zero', async () => {
      // Set count to 0
      await getDb()('usage_metrics').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        forms_count: 0,
        responses_count: 0,
        storage_used_bytes: 0,
        period_start: new Date(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await usageService.decrementFormsCount(testUserId);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(usage.forms_count).toBe(0);
    });
  });

  describe('incrementResponsesCount', () => {
    it('increments responses_count on submission', async () => {
      await usageService.incrementResponsesCount(testUserId);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(usage.responses_count).toBe(1);
    });

    it('increments multiple times correctly', async () => {
      await usageService.incrementResponsesCount(testUserId);
      await usageService.incrementResponsesCount(testUserId);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(usage.responses_count).toBe(2);
    });
  });

  describe('updateStorageUsage', () => {
    it('updates storage_used_bytes on PDF upload', async () => {
      const pdfSize = 1024 * 500; // 500KB

      await usageService.updateStorageUsage(testUserId, pdfSize);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(Number(usage.storage_used_bytes)).toBe(pdfSize);
    });

    it('handles multiple uploads correctly', async () => {
      await usageService.updateStorageUsage(testUserId, 1024 * 100); // 100KB
      await usageService.updateStorageUsage(testUserId, 1024 * 200); // 200KB

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(Number(usage.storage_used_bytes)).toBe(1024 * 300); // 300KB total
    });

    it('handles negative values for deletions', async () => {
      // Set initial storage
      await getDb()('usage_metrics').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        forms_count: 0,
        responses_count: 0,
        storage_used_bytes: 1024 * 500, // 500KB
        period_start: new Date(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Delete 200KB
      await usageService.updateStorageUsage(testUserId, -1024 * 200);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(Number(usage.storage_used_bytes)).toBe(1024 * 300); // 300KB remaining
    });

    it('does not go below zero', async () => {
      await getDb()('usage_metrics').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        forms_count: 0,
        responses_count: 0,
        storage_used_bytes: 1024 * 100,
        period_start: new Date(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Try to delete more than exists
      await usageService.updateStorageUsage(testUserId, -1024 * 200);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(Number(usage.storage_used_bytes)).toBe(0);
    });
  });

  describe('resetMonthlyCounters', () => {
    it('resets monthly counters on new period', async () => {
      // Create usage record with data from last month
      const lastMonthStart = new Date('2025-12-01');
      const lastMonthEnd = new Date('2025-12-31');

      await getDb()('usage_metrics').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        forms_count: 5,
        responses_count: 100,
        storage_used_bytes: 1024 * 1024 * 10, // 10MB
        period_start: lastMonthStart,
        period_end: lastMonthEnd,
      });

      await usageService.resetMonthlyCounters();

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();

      // Responses count should reset (monthly metric)
      expect(Number(usage.responses_count)).toBe(0);

      // Forms and storage should persist (not monthly metrics)
      expect(Number(usage.forms_count)).toBe(5);
      expect(Number(usage.storage_used_bytes)).toBe(1024 * 1024 * 10);

      // Period dates should be updated to current month
      const now = new Date();
      expect(usage.period_start.getMonth()).toBe(now.getMonth());
      expect(usage.period_end.getMonth()).toBe(now.getMonth());
    });

    it('handles multiple users correctly', async () => {
      // Create second user
      const [user2] = await getDb()('users').insert({
        id: crypto.randomUUID(),
        clerk_id: `test2_${Date.now()}`,
        email: `test2${Date.now()}@example.com`,
        plan_id: testPlanId,
        tenant_type: 'rightflow',
      }).returning('*');

      // Create usage for both users from last month
      const lastMonthStart = new Date('2025-12-01');
      const lastMonthEnd = new Date('2025-12-31');

      await getDb()('usage_metrics').insert([
        {
          id: crypto.randomUUID(),
          user_id: testUserId,
          forms_count: 5,
          responses_count: 50,
          storage_used_bytes: 1024,
          period_start: lastMonthStart,
          period_end: lastMonthEnd,
        },
        {
          id: crypto.randomUUID(),
          user_id: user2.id,
          forms_count: 10,
          responses_count: 100,
          storage_used_bytes: 2048,
          period_start: lastMonthStart,
          period_end: lastMonthEnd,
        },
      ]);

      await usageService.resetMonthlyCounters();

      const usage1 = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      const usage2 = await getDb()('usage_metrics').where({ user_id: user2.id }).first();

      // Both should have responses reset
      expect(usage1.responses_count).toBe(0);
      expect(usage2.responses_count).toBe(0);

      // Both should keep forms and storage
      expect(usage1.forms_count).toBe(5);
      expect(usage2.forms_count).toBe(10);

      // Clean up
      await getDb()('usage_metrics').where({ user_id: user2.id }).del();
      await getDb()('users').where({ id: user2.id }).del();
    });
  });

  describe('concurrent operations', () => {
    it('handles multiple concurrent increments correctly', async () => {
      // Simulate concurrent form creations
      await Promise.all([
        usageService.incrementFormsCount(testUserId),
        usageService.incrementFormsCount(testUserId),
        usageService.incrementFormsCount(testUserId),
      ]);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(Number(usage.forms_count)).toBe(3);
    });

    it('handles concurrent storage updates correctly', async () => {
      await Promise.all([
        usageService.updateStorageUsage(testUserId, 1024 * 100),
        usageService.updateStorageUsage(testUserId, 1024 * 200),
        usageService.updateStorageUsage(testUserId, 1024 * 300),
      ]);

      const usage = await getDb()('usage_metrics').where({ user_id: testUserId }).first();
      expect(Number(usage.storage_used_bytes)).toBe(1024 * 600);
    });
  });
});
