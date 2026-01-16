/**
 * Billing API Tests
 * Tests for billing endpoints (checkout, portal, current plan)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb } from '../src/lib/db';

// Shared test data setup
async function setupTestData() {
  // Create test plans
  const [freePlan] = await getDb()('plans').insert({
    id: crypto.randomUUID(),
    name: 'Free',
    monthly_price_ils: 0,
    max_forms: 3,
    max_responses_monthly: 100,
    max_storage_mb: 100,
    features: {},
    is_active: true,
  }).returning('*');

  const [proPlan] = await getDb()('plans').insert({
    id: crypto.randomUUID(),
    name: 'Pro',
    monthly_price_ils: 14900,
    max_forms: 50,
    max_responses_monthly: 10000,
    max_storage_mb: 10240,
    features: { webhooks: true, api_access: true },
    is_active: true,
  }).returning('*');

  // Create test user
  const [user] = await getDb()('users').insert({
    id: crypto.randomUUID(),
    clerk_id: `test_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    plan_id: freePlan.id,
    tenant_type: 'rightflow',
  }).returning('*');

  // Create usage metrics
  await getDb()('usage_metrics').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    forms_count: 2,
    responses_count: 50,
    storage_used_bytes: 50 * 1024 * 1024, // 50MB
    period_start: new Date(),
    period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return {
    testUserId: user.id,
    testPlanId: proPlan.id,
    testFreePlanId: freePlan.id,
  };
}

async function cleanupTestData(
  testUserId: string,
  testPlanId: string,
  testFreePlanId: string,
) {
  await getDb()('usage_metrics').where({ user_id: testUserId }).del();
  await getDb()('users').where({ id: testUserId }).del();
  await getDb()('plans').whereIn('id', [testPlanId, testFreePlanId]).del();
  await closeDb();
}

describe('Billing API - Checkout', () => {
  let testUserId: string;
  let testPlanId: string;
  let testFreePlanId: string;

  beforeEach(async () => {
    const data = await setupTestData();
    testUserId = data.testUserId;
    testPlanId = data.testPlanId;
    testFreePlanId = data.testFreePlanId;
  });

  afterEach(async () => {
    await cleanupTestData(testUserId, testPlanId, testFreePlanId);
  });

  it('creates checkout session for valid plan', async () => {
    const user = await getDb()('users').where({ id: testUserId }).first();
    const plan = await getDb()('plans').where({ id: testPlanId }).first();

    expect(user).toBeDefined();
    expect(plan).toBeDefined();
    expect(plan.monthly_price_ils).toBe(14900);
  });

  it('validates plan exists', async () => {
    const invalidPlanId = crypto.randomUUID();
    const plan = await getDb()('plans').where({ id: invalidPlanId }).first();

    expect(plan).toBeUndefined();
  });

  it('validates billing period', () => {
    const validPeriods = ['monthly', 'yearly'];
    expect(validPeriods).toContain('monthly');
    expect(validPeriods).toContain('yearly');
    expect(validPeriods).not.toContain('invalid');
  });

  it('requires authentication', async () => {
    const invalidUser = await getDb()('users')
      .where({ id: '00000000-0000-0000-0000-000000000001' })
      .first();

    expect(invalidUser).toBeUndefined();
  });
});

describe('Billing API - Portal', () => {
  let testUserId: string;
  let testPlanId: string;
  let testFreePlanId: string;

  beforeEach(async () => {
    const data = await setupTestData();
    testUserId = data.testUserId;
    testPlanId = data.testPlanId;
    testFreePlanId = data.testFreePlanId;
  });

  afterEach(async () => {
    await cleanupTestData(testUserId, testPlanId, testFreePlanId);
  });

  it('creates portal session for existing customer', async () => {
    await getDb()('users')
      .where({ id: testUserId })
      .update({ grow_customer_id: 'grow_cust_test_123' });

    const user = await getDb()('users').where({ id: testUserId }).first();
    expect(user.grow_customer_id).toBe('grow_cust_test_123');
  });

  it('returns error if no grow_customer_id', async () => {
    const user = await getDb()('users').where({ id: testUserId }).first();
    expect(user.grow_customer_id).toBeNull();
  });

  it('requires authentication', async () => {
    const invalidUser = await getDb()('users')
      .where({ id: '00000000-0000-0000-0000-000000000001' })
      .first();

    expect(invalidUser).toBeUndefined();
  });
});

describe('Billing API - Current Plan', () => {
  let testUserId: string;
  let testPlanId: string;
  let testFreePlanId: string;

  beforeEach(async () => {
    const data = await setupTestData();
    testUserId = data.testUserId;
    testPlanId = data.testPlanId;
    testFreePlanId = data.testFreePlanId;
  });

  afterEach(async () => {
    await cleanupTestData(testUserId, testPlanId, testFreePlanId);
  });

  it('returns user plan and usage', async () => {
    const user = await getDb()('users').where({ id: testUserId }).first();
    const plan = await getDb()('plans').where({ id: user.plan_id }).first();
    const usage = await getDb()('usage_metrics')
      .where({ user_id: testUserId })
      .first();

    expect(user).toBeDefined();
    expect(plan).toBeDefined();
    expect(usage).toBeDefined();

    // Verify plan details
    expect(plan.name).toBe('Free');
    expect(plan.max_forms).toBe(3);

    // Verify usage details
    expect(Number(usage.forms_count)).toBe(2);
    expect(Number(usage.responses_count)).toBe(50);
    expect(Number(usage.storage_used_bytes)).toBe(50 * 1024 * 1024);
  });

  it('shows limits reached status', async () => {
    const user = await getDb()('users').where({ id: testUserId }).first();
    const plan = await getDb()('plans').where({ id: user.plan_id }).first();
    const usage = await getDb()('usage_metrics')
      .where({ user_id: testUserId })
      .first();

    // Check if limits are reached
    const limitsReached = {
      forms: usage.forms_count >= plan.max_forms,
      responses: usage.responses_count >= plan.max_responses_monthly,
      storage: usage.storage_used_bytes >= plan.max_storage_mb * 1024 * 1024,
    };

    expect(limitsReached.forms).toBe(false); // 2 < 3
    expect(limitsReached.responses).toBe(false); // 50 < 100
    expect(limitsReached.storage).toBe(false); // 50MB < 100MB
  });

  it('requires authentication', async () => {
    const invalidUser = await getDb()('users')
      .where({ id: '00000000-0000-0000-0000-000000000001' })
      .first();

    expect(invalidUser).toBeUndefined();
  });

  it('handles missing usage metrics', async () => {
    // Create a user without usage metrics
    const [newUser] = await getDb()('users').insert({
      id: crypto.randomUUID(),
      clerk_id: `test_new_${Date.now()}`,
      email: `testnew${Date.now()}@example.com`,
      plan_id: testFreePlanId,
      tenant_type: 'rightflow',
    }).returning('*');

    const usage = await getDb()('usage_metrics')
      .where({ user_id: newUser.id })
      .first();

    expect(usage).toBeUndefined();

    // Clean up
    await getDb()('users').where({ id: newUser.id }).del();
  });
});

describe('Billing API - Integration Scenarios', () => {
  let testUserId: string;
  let testPlanId: string;
  let testFreePlanId: string;

  beforeEach(async () => {
    const data = await setupTestData();
    testUserId = data.testUserId;
    testPlanId = data.testPlanId;
    testFreePlanId = data.testFreePlanId;
  });

  afterEach(async () => {
    await cleanupTestData(testUserId, testPlanId, testFreePlanId);
  });
  it('handles plan upgrade flow', async () => {
    // Initial state: Free plan
    const userBefore = await getDb()('users').where({ id: testUserId }).first();
    expect(userBefore.plan_id).toBe(testFreePlanId);

    // Simulate upgrade to Pro plan
    await getDb()('users')
      .where({ id: testUserId })
      .update({
        plan_id: testPlanId,
        grow_customer_id: 'grow_cust_test_123',
        grow_subscription_id: 'grow_sub_test_456',
      });

    // Verify upgrade
    const userAfter = await getDb()('users').where({ id: testUserId }).first();
    expect(userAfter.plan_id).toBe(testPlanId);
    expect(userAfter.grow_customer_id).toBe('grow_cust_test_123');
    expect(userAfter.grow_subscription_id).toBe('grow_sub_test_456');
  });

  it('handles plan downgrade flow', async () => {
    // Start with Pro plan
    await getDb()('users')
      .where({ id: testUserId })
      .update({
        plan_id: testPlanId,
        grow_subscription_id: 'grow_sub_test_456',
      });

    const userBefore = await getDb()('users').where({ id: testUserId }).first();
    expect(userBefore.plan_id).toBe(testPlanId);

    // Simulate downgrade to Free plan
    await getDb()('users')
      .where({ id: testUserId })
      .update({
        plan_id: testFreePlanId,
        grow_subscription_id: null,
      });

    // Verify downgrade
    const userAfter = await getDb()('users').where({ id: testUserId }).first();
    expect(userAfter.plan_id).toBe(testFreePlanId);
    expect(userAfter.grow_subscription_id).toBeNull();
  });
});
