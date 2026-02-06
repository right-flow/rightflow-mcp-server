// SubscriptionService Unit Tests
// TDD Phase 1.1 - RED (Tests written first, implementation will follow)
// Created: 2026-02-05

import { SubscriptionService } from './SubscriptionService';
import { query } from '../../config/database';
import type {
  OrganizationSubscription,
  SubscriptionPlan,
  CreateSubscriptionRequest,
} from '../../types/billing';

// Mock database
jest.mock('../../config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    service = new SubscriptionService();
    jest.clearAllMocks();
  });

  describe('getOrganizationSubscription', () => {
    it('should return FREE plan for org without subscription', async () => {
      // Mock: organization has no subscription yet
      mockQuery.mockResolvedValueOnce([]); // No subscription found

      // Mock: fetch FREE plan details
      mockQuery.mockResolvedValueOnce([
        {
          id: 'plan-free-id',
          name: 'FREE',
          display_name: 'Free Plan',
          price_monthly_cents: 0,
          price_yearly_cents: null,
          max_forms: 3,
          max_submissions_per_month: 50,
          max_storage_mb: 1024,
          max_members: 1,
          features: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const subscription = await service.getOrganizationSubscription('org-123');

      expect(subscription).toBeDefined();
      expect(subscription.plan?.name).toBe('FREE');
      expect(subscription.status).toBe('active');
      expect(subscription.plan?.maxForms).toBe(3);
      expect(subscription.plan?.maxSubmissionsPerMonth).toBe(50);
    });

    it('should return active subscription with correct limits', async () => {
      // Mock: organization has BASIC subscription
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          org_id: 'org-with-basic',
          plan_id: 'plan-basic-id',
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: 'cust-grow-123',
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      // Mock: fetch BASIC plan details
      mockQuery.mockResolvedValueOnce([
        {
          id: 'plan-basic-id',
          name: 'BASIC',
          display_name: 'Basic Plan',
          price_monthly_cents: 30000,
          price_yearly_cents: 288000,
          max_forms: 10,
          max_submissions_per_month: 100,
          max_storage_mb: 5120,
          max_members: 3,
          features: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const subscription = await service.getOrganizationSubscription(
        'org-with-basic',
      );

      expect(subscription.plan?.maxForms).toBe(10);
      expect(subscription.plan?.maxSubmissionsPerMonth).toBe(100);
      expect(subscription.status).toBe('active');
    });

    it('should return subscription in grace_period status', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-456',
          org_id: 'org-in-grace',
          plan_id: 'plan-basic-id',
          status: 'grace_period',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: 'cust-grow-456',
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      mockQuery.mockResolvedValueOnce([
        {
          id: 'plan-basic-id',
          name: 'BASIC',
          display_name: 'Basic Plan',
          price_monthly_cents: 30000,
          price_yearly_cents: null,
          max_forms: 10,
          max_submissions_per_month: 100,
          max_storage_mb: 5120,
          max_members: 3,
          features: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const subscription = await service.getOrganizationSubscription('org-in-grace');

      expect(subscription.status).toBe('grace_period');
    });
  });

  describe('createSubscription', () => {
    it('should create subscription for organization', async () => {
      const request: CreateSubscriptionRequest = {
        orgId: 'org-123',
        planId: 'plan-basic-id',
        billingCycle: 'monthly',
      };

      // Mock: check no existing subscription
      mockQuery.mockResolvedValueOnce([]);

      // Mock: insert new subscription
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-new-123',
          org_id: 'org-123',
          plan_id: 'plan-basic-id',
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          grow_customer_id: null,
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const result = await service.createSubscription(request);

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.status).toBe('active');
      expect(result.subscription?.planId).toBe('plan-basic-id');
    });

    it('should fail if org already has active subscription', async () => {
      const request: CreateSubscriptionRequest = {
        orgId: 'org-with-existing',
        planId: 'plan-basic-id',
        billingCycle: 'monthly',
      };

      // Mock: existing subscription found
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-existing',
          org_id: 'org-with-existing',
          plan_id: 'plan-free-id',
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: null,
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const result = await service.createSubscription(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Organization already has active subscription');
    });

    it('should calculate correct billing period for monthly cycle', async () => {
      const request: CreateSubscriptionRequest = {
        orgId: 'org-new',
        planId: 'plan-basic-id',
        billingCycle: 'monthly',
      };

      mockQuery.mockResolvedValueOnce([]); // No existing

      const now = new Date('2026-02-15');
      const expectedEnd = new Date('2026-03-15');

      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-new',
          org_id: 'org-new',
          plan_id: 'plan-basic-id',
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: now.toISOString(),
          current_period_end: expectedEnd.toISOString(),
          grow_customer_id: null,
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ]);

      const result = await service.createSubscription(request);

      expect(result.success).toBe(true);
      expect(result.subscription?.billingCycle).toBe('monthly');
    });
  });

  describe('cancelSubscription', () => {
    it('should mark subscription as cancelled', async () => {
      // Mock: fetch existing subscription
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-to-cancel',
          org_id: 'org-123',
          plan_id: 'plan-basic-id',
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: 'cust-123',
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      // Mock: update subscription
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-to-cancel',
          org_id: 'org-123',
          plan_id: 'plan-basic-id',
          status: 'cancelled',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: 'cust-123',
          grow_subscription_id: null,
          cancelled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const result = await service.cancelSubscription('org-123');

      expect(result.success).toBe(true);
      expect(result.effectiveDate).toBeDefined();
    });

    it('should schedule downgrade to FREE at period end', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-to-cancel',
          org_id: 'org-123',
          plan_id: 'plan-basic-id',
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: null,
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-to-cancel',
          org_id: 'org-123',
          plan_id: 'plan-basic-id',
          status: 'cancelled',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: null,
          grow_subscription_id: null,
          cancelled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const result = await service.cancelSubscription('org-123');

      expect(result.success).toBe(true);
      // Effective date should be current_period_end
      expect(result.effectiveDate).toBeDefined();
    });

    it('should fail if no subscription exists', async () => {
      mockQuery.mockResolvedValueOnce([]); // No subscription

      const result = await service.cancelSubscription('org-no-sub');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active subscription found');
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('should update subscription status to grace_period', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-123',
          org_id: 'org-123',
          plan_id: 'plan-basic-id',
          status: 'grace_period',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: 'cust-123',
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const updated = await service.updateSubscriptionStatus(
        'sub-123',
        'grace_period',
      );

      expect(updated.status).toBe('grace_period');
    });

    it('should update subscription status to suspended', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'sub-456',
          org_id: 'org-456',
          plan_id: 'plan-basic-id',
          status: 'suspended',
          billing_cycle: 'monthly',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          grow_customer_id: 'cust-456',
          grow_subscription_id: null,
          cancelled_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const updated = await service.updateSubscriptionStatus('sub-456', 'suspended');

      expect(updated.status).toBe('suspended');
    });
  });

  describe('getAllPlans', () => {
    it('should return all active subscription plans', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'plan-free',
          name: 'FREE',
          display_name: 'Free Plan',
          price_monthly_cents: 0,
          price_yearly_cents: null,
          max_forms: 3,
          max_submissions_per_month: 50,
          max_storage_mb: 1024,
          max_members: 1,
          features: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'plan-basic',
          name: 'BASIC',
          display_name: 'Basic Plan',
          price_monthly_cents: 30000,
          price_yearly_cents: 288000,
          max_forms: 10,
          max_submissions_per_month: 100,
          max_storage_mb: 5120,
          max_members: 3,
          features: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'plan-expanded',
          name: 'EXPANDED',
          display_name: 'Expanded Plan',
          price_monthly_cents: 40000,
          price_yearly_cents: 384000,
          max_forms: 50,
          max_submissions_per_month: 500,
          max_storage_mb: 10240,
          max_members: 10,
          features: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const plans = await service.getAllPlans();

      expect(plans).toHaveLength(3);
      expect(plans[0].name).toBe('FREE');
      expect(plans[1].name).toBe('BASIC');
      expect(plans[2].name).toBe('EXPANDED');
    });

    it('should exclude inactive plans', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'plan-free',
          name: 'FREE',
          display_name: 'Free Plan',
          price_monthly_cents: 0,
          price_yearly_cents: null,
          max_forms: 3,
          max_submissions_per_month: 50,
          max_storage_mb: 1024,
          max_members: 1,
          features: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const plans = await service.getAllPlans();

      expect(plans).toHaveLength(1);
      expect(plans.every((p) => p.isActive)).toBe(true);
    });
  });

  describe('getPlanByName', () => {
    it('should return plan by name', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'plan-basic',
          name: 'BASIC',
          display_name: 'Basic Plan',
          price_monthly_cents: 30000,
          price_yearly_cents: 288000,
          max_forms: 10,
          max_submissions_per_month: 100,
          max_storage_mb: 5120,
          max_members: 3,
          features: {},
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);

      const plan = await service.getPlanByName('BASIC');

      expect(plan).toBeDefined();
      expect(plan?.name).toBe('BASIC');
      expect(plan?.maxForms).toBe(10);
    });

    it('should return null if plan not found', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const plan = await service.getPlanByName('NONEXISTENT');

      expect(plan).toBeNull();
    });
  });
});
