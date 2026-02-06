// QuotaEnforcementService Unit Tests
// TDD Phase 3 - RED (Tests written first, implementation will follow)
// Created: 2026-02-05
// Purpose: Test quota validation and enforcement logic

import { QuotaEnforcementService } from './QuotaEnforcementService';
import { UsageService } from './UsageService';
import { SubscriptionService } from './SubscriptionService';

// Mock dependencies
jest.mock('./UsageService');
jest.mock('./SubscriptionService');

const mockUsageService = UsageService as jest.MockedClass<typeof UsageService>;
const mockSubscriptionService = SubscriptionService as jest.MockedClass<
  typeof SubscriptionService
>;

describe('QuotaEnforcementService', () => {
  let service: QuotaEnforcementService;
  let usageService: jest.Mocked<UsageService>;
  let subscriptionService: jest.Mocked<SubscriptionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    usageService = new mockUsageService() as jest.Mocked<UsageService>;
    subscriptionService = new mockSubscriptionService() as jest.Mocked<SubscriptionService>;
    service = new QuotaEnforcementService(usageService, subscriptionService);
  });

  describe('canSubmitForm', () => {
    it('should allow submission when under quota', async () => {
      // Mock: 40 submissions used, 100 limit
      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-1',
        orgId: 'org-123',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 40,
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-1',
        orgId: 'org-123',
        planId: 'plan-basic',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.canSubmitForm('org-123', 'form-abc');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.quotaInfo.remaining).toBe(60);
      expect(result.quotaInfo.percentUsed).toBe(40);
    });

    it('should block submission when quota exceeded', async () => {
      // Mock: 50 submissions used, 50 limit (FREE plan)
      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-1',
        orgId: 'org-free',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 50,
        quotaLimit: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-free',
        orgId: 'org-free',
        planId: 'plan-free',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-free',
          name: 'FREE',
          displayName: 'Free Plan',
          priceMonthly: 0,
          priceYearly: null,
          maxForms: 3,
          maxSubmissionsPerMonth: 50,
          maxStorageMB: 1024,
          maxMembers: 1,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.canSubmitForm('org-free', 'form-abc');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exceeded_free_plan');
      expect(result.quotaInfo.remaining).toBe(0);
      expect(result.quotaInfo.overageAmount).toBe(0);
    });

    it('should allow overage for BASIC plan and above', async () => {
      // Mock: 105 submissions used, 100 limit
      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-1',
        orgId: 'org-basic',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 105,
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-1',
        orgId: 'org-basic',
        planId: 'plan-basic',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.canSubmitForm('org-basic', 'form-abc');

      expect(result.allowed).toBe(true);
      expect(result.willIncurOverage).toBe(true);
      expect(result.quotaInfo.overageAmount).toBe(5);
      expect(result.estimatedOverageCost).toBe(300); // (5 + 1) * 50 cents - next submission will be #106
    });

    it('should block overage for FREE plan', async () => {
      // Mock: 50 submissions used, 50 limit (FREE plan hard limit)
      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-1',
        orgId: 'org-free',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 50,
        quotaLimit: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-free',
        orgId: 'org-free',
        planId: 'plan-free',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-free',
          name: 'FREE',
          displayName: 'Free Plan',
          priceMonthly: 0,
          priceYearly: null,
          maxForms: 3,
          maxSubmissionsPerMonth: 50,
          maxStorageMB: 1024,
          maxMembers: 1,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.canSubmitForm('org-free', 'form-abc');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exceeded_free_plan');
      expect(result.upgradeRequired).toBe(true);
    });

    it('should block submission during suspended status', async () => {
      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-1',
        orgId: 'org-suspended',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 10,
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-suspended',
        orgId: 'org-suspended',
        planId: 'plan-basic',
        status: 'suspended',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.canSubmitForm('org-suspended', 'form-abc');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('subscription_suspended');
    });

    it('should allow submission during grace_period', async () => {
      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-1',
        orgId: 'org-grace',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 10,
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-grace',
        orgId: 'org-grace',
        planId: 'plan-basic',
        status: 'grace_period',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.canSubmitForm('org-grace', 'form-abc');

      expect(result.allowed).toBe(true);
      expect(result.isGracePeriod).toBe(true);
    });
  });

  describe('validateFormCreation', () => {
    it('should allow form creation when under limit', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-1',
        orgId: 'org-123',
        planId: 'plan-basic',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.validateFormCreation('org-123', 5);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block form creation when at limit', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-1',
        orgId: 'org-123',
        planId: 'plan-basic',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.validateFormCreation('org-123', 10);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('form_limit_reached');
      expect(result.currentCount).toBe(10);
      expect(result.maxAllowed).toBe(10);
    });

    it('should block form creation during suspended status', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-1',
        orgId: 'org-suspended',
        planId: 'plan-basic',
        status: 'suspended',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const result = await service.validateFormCreation('org-suspended', 2);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('subscription_suspended');
    });
  });

  describe('getQuotaStatus', () => {
    it('should return detailed quota status', async () => {
      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-1',
        orgId: 'org-123',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 75,
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-1',
        orgId: 'org-123',
        planId: 'plan-basic',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const status = await service.getQuotaStatus('org-123');

      expect(status.totalSubmissions).toBe(75);
      expect(status.quotaLimit).toBe(100);
      expect(status.remaining).toBe(25);
      expect(status.percentUsed).toBe(75);
      expect(status.isExceeded).toBe(false);
      expect(status.canIncurOverage).toBe(true);
      expect(status.planName).toBe('BASIC');
    });

    it('should indicate exceeded status', async () => {
      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-1',
        orgId: 'org-free',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 55,
        quotaLimit: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-free',
        orgId: 'org-free',
        planId: 'plan-free',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: {
          id: 'plan-free',
          name: 'FREE',
          displayName: 'Free Plan',
          priceMonthly: 0,
          priceYearly: null,
          maxForms: 3,
          maxSubmissionsPerMonth: 50,
          maxStorageMB: 1024,
          maxMembers: 1,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
      });

      const status = await service.getQuotaStatus('org-free');

      expect(status.isExceeded).toBe(true);
      expect(status.overageAmount).toBe(5);
      expect(status.canIncurOverage).toBe(false);
    });
  });
});
