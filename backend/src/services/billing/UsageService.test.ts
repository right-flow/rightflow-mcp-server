// UsageService Unit Tests
// TDD Phase 1.2 - RED (Tests written first, implementation will follow)
// Created: 2026-02-05

import { UsageService } from './UsageService';
import { query } from '../../config/database';
import { SubscriptionService } from './SubscriptionService';

// Mock database
jest.mock('../../config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock SubscriptionService
jest.mock('./SubscriptionService');
const mockSubscriptionService = SubscriptionService as jest.MockedClass<typeof SubscriptionService>;

describe('UsageService', () => {
  let service: UsageService;
  let mockGetOrgSubscription: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SubscriptionService.getOrganizationSubscription
    mockGetOrgSubscription = jest.fn().mockResolvedValue({
      id: 'sub-123',
      orgId: 'org-123',
      planId: 'plan-free',
      plan: {
        id: 'plan-free',
        name: 'FREE',
        displayName: 'Free Plan',
        description: 'Free plan',
        maxSubmissionsPerMonth: 50,
        price: 0,
        features: [],
        isActive: true,
      },
      status: 'active',
      currentPeriodStart: new Date('2026-02-01'),
      currentPeriodEnd: new Date('2026-03-01'),
      cancelledAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });

    mockSubscriptionService.prototype.getOrganizationSubscription = mockGetOrgSubscription;

    service = new UsageService();
  });

  describe('getOrganizationUsage', () => {
    it('should return zero usage for new billing period', async () => {
      // Mock: organization has no usage record for current period
      mockQuery.mockResolvedValueOnce([]); // No usage found

      // Mock: create new usage record
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-123',
          org_id: 'org-123',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 0,
          quota_limit: 50, // FREE plan limit
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const usage = await service.getOrganizationUsage('org-123');

      expect(usage).toBeDefined();
      expect(usage.totalSubmissions).toBe(0);
      expect(usage.quotaLimit).toBeGreaterThan(0);
    });

    it('should return accumulated usage within billing period', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-456',
          org_id: 'org-with-usage',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 45,
          quota_limit: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const usage = await service.getOrganizationUsage('org-with-usage');

      expect(usage.totalSubmissions).toBe(45);
      expect(usage.quotaLimit).toBe(100);
    });

    it('should calculate correct billing period dates', async () => {
      const expectedStart = new Date('2026-02-01');
      const expectedEnd = new Date('2026-03-01');

      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-789',
          org_id: 'org-789',
          billing_period_start: expectedStart.toISOString(),
          billing_period_end: expectedEnd.toISOString(),
          total_submissions: 10,
          quota_limit: 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const usage = await service.getOrganizationUsage('org-789');

      expect(usage.billingPeriodStart.getDate()).toBe(1);
      expect(usage.billingPeriodEnd.getMonth()).toBe(
        usage.billingPeriodStart.getMonth() + 1,
      );
    });
  });

  describe('incrementUsage', () => {
    it('should increment total submissions by 1', async () => {
      // Mock: successful update
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-123',
          org_id: 'org-123',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 46, // Was 45, now 46
          quota_limit: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      // Mock: successful form usage update
      mockQuery.mockResolvedValueOnce([]);

      await service.incrementUsage('org-123', 'form-456');

      // Verify query was called with correct parameters
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should track form-level usage for analytics', async () => {
      // Mock: update organization total
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-123',
          org_id: 'org-123',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 11,
          quota_limit: 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      // Mock: upsert form usage
      mockQuery.mockResolvedValueOnce([
        {
          id: 'form-usage-123',
          org_id: 'org-123',
          form_id: 'form-456',
          billing_period_start: '2026-02-01',
          submissions_count: 5,
        },
      ]);

      await service.incrementUsage('org-123', 'form-456');

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent increments correctly', async () => {
      // Simulate multiple concurrent submissions
      const promises = Array(10)
        .fill(null)
        .map((_, i) => {
          mockQuery.mockResolvedValueOnce([
            {
              id: 'usage-123',
              org_id: 'org-123',
              billing_period_start: '2026-02-01',
              billing_period_end: '2026-03-01',
              total_submissions: i + 1,
              quota_limit: 50,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
          mockQuery.mockResolvedValueOnce([]);
          return service.incrementUsage('org-123', 'form-456');
        });

      await Promise.all(promises);

      // Should have called query 20 times (2 per increment)
      expect(mockQuery).toHaveBeenCalledTimes(20);
    });
  });

  describe('resetUsageForNewPeriod', () => {
    it('should create new usage record for billing period', async () => {
      const billingPeriod = {
        start: new Date('2026-03-01'),
        end: new Date('2026-04-01'),
      };

      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-new',
          org_id: 'org-123',
          billing_period_start: '2026-03-01',
          billing_period_end: '2026-04-01',
          total_submissions: 0,
          quota_limit: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const newUsage = await service.resetUsageForNewPeriod('org-123', billingPeriod);

      expect(newUsage.totalSubmissions).toBe(0);
      expect(newUsage.billingPeriodStart).toEqual(billingPeriod.start);
      expect(newUsage.billingPeriodEnd).toEqual(billingPeriod.end);
    });

    it('should use correct quota limit from subscription', async () => {
      const billingPeriod = {
        start: new Date('2026-03-01'),
        end: new Date('2026-04-01'),
      };

      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-new',
          org_id: 'org-123',
          billing_period_start: '2026-03-01',
          billing_period_end: '2026-04-01',
          total_submissions: 0,
          quota_limit: 500, // EXPANDED plan limit
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const newUsage = await service.resetUsageForNewPeriod('org-123', billingPeriod);

      expect(newUsage.quotaLimit).toBe(500);
    });
  });

  describe('getFormUsage', () => {
    it('should return usage for specific form', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'form-usage-123',
          org_id: 'org-123',
          form_id: 'form-456',
          billing_period_start: '2026-02-01',
          submissions_count: 25,
        },
      ]);

      const formUsage = await service.getFormUsage('form-456');

      expect(formUsage).toBeDefined();
      expect(formUsage?.submissionsCount).toBe(25);
      expect(formUsage?.formId).toBe('form-456');
    });

    it('should return null for form with no usage', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const formUsage = await service.getFormUsage('form-no-usage');

      expect(formUsage).toBeNull();
    });
  });

  describe('getAllFormsUsage', () => {
    it('should return usage breakdown for all forms', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'form-usage-1',
          org_id: 'org-123',
          form_id: 'form-1',
          billing_period_start: '2026-02-01',
          submissions_count: 35,
        },
        {
          id: 'form-usage-2',
          org_id: 'org-123',
          form_id: 'form-2',
          billing_period_start: '2026-02-01',
          submissions_count: 20,
        },
        {
          id: 'form-usage-3',
          org_id: 'org-123',
          form_id: 'form-3',
          billing_period_start: '2026-02-01',
          submissions_count: 7,
        },
      ]);

      const allUsage = await service.getAllFormsUsage('org-123');

      expect(allUsage).toHaveLength(3);
      expect(allUsage[0].submissionsCount).toBe(35);
      expect(allUsage[1].submissionsCount).toBe(20);
      expect(allUsage[2].submissionsCount).toBe(7);
    });

    it('should return empty array for org with no forms', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const allUsage = await service.getAllFormsUsage('org-no-forms');

      expect(allUsage).toEqual([]);
    });

    it('should sort forms by usage descending', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'form-usage-1',
          org_id: 'org-123',
          form_id: 'form-1',
          billing_period_start: '2026-02-01',
          submissions_count: 10,
        },
        {
          id: 'form-usage-2',
          org_id: 'org-123',
          form_id: 'form-2',
          billing_period_start: '2026-02-01',
          submissions_count: 50,
        },
        {
          id: 'form-usage-3',
          org_id: 'org-123',
          form_id: 'form-3',
          billing_period_start: '2026-02-01',
          submissions_count: 30,
        },
      ]);

      const allUsage = await service.getAllFormsUsage('org-123');

      // Should be sorted by submissions_count DESC
      expect(allUsage[0].submissionsCount).toBeGreaterThanOrEqual(
        allUsage[1].submissionsCount,
      );
      expect(allUsage[1].submissionsCount).toBeGreaterThanOrEqual(
        allUsage[2].submissionsCount,
      );
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate usage percentage correctly', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-123',
          org_id: 'org-80-percent',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 80,
          quota_limit: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const percentage = await service.getUsagePercentage('org-80-percent');

      expect(percentage).toBe(80);
    });

    it('should return 100 when at limit', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-456',
          org_id: 'org-at-limit',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 50,
          quota_limit: 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const percentage = await service.getUsagePercentage('org-at-limit');

      expect(percentage).toBe(100);
    });

    it('should handle zero quota gracefully', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-789',
          org_id: 'org-suspended',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 10,
          quota_limit: 0, // Suspended account
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const percentage = await service.getUsagePercentage('org-suspended');

      expect(percentage).toBe(100); // Over limit
    });
  });

  describe('getRemainingQuota', () => {
    it('should calculate remaining quota correctly', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-123',
          org_id: 'org-123',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 30,
          quota_limit: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const remaining = await service.getRemainingQuota('org-123');

      expect(remaining).toBe(70);
    });

    it('should return 0 when at or over limit', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-456',
          org_id: 'org-over-limit',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 105,
          quota_limit: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const remaining = await service.getRemainingQuota('org-over-limit');

      expect(remaining).toBe(0);
    });
  });

  describe('getOverageAmount', () => {
    it('should return 0 when under quota', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-123',
          org_id: 'org-under',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 45,
          quota_limit: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const overage = await service.getOverageAmount('org-under');

      expect(overage).toBe(0);
    });

    it('should calculate overage when over quota', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 'usage-456',
          org_id: 'org-over',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          total_submissions: 125,
          quota_limit: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const overage = await service.getOverageAmount('org-over');

      expect(overage).toBe(25); // 125 - 100
    });
  });
});
