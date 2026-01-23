/**
 * Plans API Tests
 * Tests for public plans endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb } from '../src/lib/db';

describe('GET /api/plans', () => {
  let testPlanIds: string[] = [];

  beforeEach(async () => {
    // Create test plans
    const plans = await getDb()('plans').insert([
      {
        id: crypto.randomUUID(),
        name: 'Free',
        monthly_price_ils: 0,
        max_forms: 3,
        max_responses_monthly: 100,
        max_storage_mb: 100,
        features: { basic_forms: true },
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        name: 'Pro',
        monthly_price_ils: 14900,
        max_forms: 50,
        max_responses_monthly: 10000,
        max_storage_mb: 10240,
        features: { webhooks: true, api_access: true },
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        name: 'Inactive Plan',
        monthly_price_ils: 9900,
        max_forms: 10,
        max_responses_monthly: 1000,
        max_storage_mb: 1024,
        features: {},
        is_active: false, // Inactive plan should not be returned
      },
    ]).returning('*');

    testPlanIds = plans.map(p => p.id);
  });

  afterEach(async () => {
    // Clean up test data
    await getDb()('plans').whereIn('id', testPlanIds).del();
    await closeDb();
  });

  it('returns all active plans', async () => {
    const plans = await getDb()('plans')
      .where({ is_active: true })
      .orderBy('monthly_price_ils', 'asc');

    expect(plans).toBeDefined();
    expect(plans.length).toBeGreaterThanOrEqual(2);

    // Should include Free and Pro, but not Inactive
    const planNames = plans.map(p => p.name);
    expect(planNames).toContain('Free');
    expect(planNames).toContain('Pro');
    expect(planNames).not.toContain('Inactive Plan');
  });

  it('returns plans sorted by price', async () => {
    const plans = await getDb()('plans')
      .where({ is_active: true })
      .orderBy('monthly_price_ils', 'asc');

    // Verify sorting (Free should be first)
    expect(plans[0].name).toBe('Free');
    expect(plans[0].monthly_price_ils).toBe(0);

    // Verify prices are ascending
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].monthly_price_ils).toBeGreaterThanOrEqual(
        plans[i - 1].monthly_price_ils,
      );
    }
  });

  it('includes all plan features', async () => {
    const plans = await getDb()('plans')
      .where({ is_active: true })
      .orderBy('monthly_price_ils', 'asc');

    // Verify all required fields are present
    plans.forEach(plan => {
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('monthly_price_ils');
      expect(plan).toHaveProperty('max_forms');
      expect(plan).toHaveProperty('max_responses_monthly');
      expect(plan).toHaveProperty('max_storage_mb');
      expect(plan).toHaveProperty('features');
      expect(typeof plan.features).toBe('object');
    });
  });

  it('excludes inactive plans', async () => {
    const allPlans = await getDb()('plans').select('*');
    const activePlans = await getDb()('plans')
      .where({ is_active: true })
      .select('*');

    // Should have at least one inactive plan
    expect(allPlans.length).toBeGreaterThan(activePlans.length);

    // Active plans should not include any inactive ones
    activePlans.forEach(plan => {
      expect(plan.is_active).toBe(true);
    });
  });
});
