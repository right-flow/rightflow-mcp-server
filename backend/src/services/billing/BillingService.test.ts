// BillingService Unit Tests
// TDD Phase 2.2 - RED (Tests written first, implementation will follow)
// Created: 2026-02-05

import { BillingService } from './BillingService';
import { GrowClient } from './GrowClient';
import { SubscriptionService } from './SubscriptionService';
import { UsageService } from './UsageService';
import { query } from '../../config/database';

// Mock dependencies
jest.mock('./GrowClient');
jest.mock('./SubscriptionService');
jest.mock('./UsageService');
jest.mock('../../config/database');

const mockGrowClient = GrowClient as jest.MockedClass<typeof GrowClient>;
const mockSubscriptionService = SubscriptionService as jest.MockedClass<
  typeof SubscriptionService
>;
const mockUsageService = UsageService as jest.MockedClass<typeof UsageService>;
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('BillingService', () => {
  let service: BillingService;
  let growClient: jest.Mocked<GrowClient>;
  let subscriptionService: jest.Mocked<SubscriptionService>;
  let usageService: jest.Mocked<UsageService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    growClient = new mockGrowClient({
      apiKey: 'test',
      apiSecret: 'test',
      environment: 'sandbox',
    }) as jest.Mocked<GrowClient>;

    subscriptionService =
      new mockSubscriptionService() as jest.Mocked<SubscriptionService>;
    usageService = new mockUsageService() as jest.Mocked<UsageService>;

    service = new BillingService(growClient, subscriptionService, usageService);
  });

  describe('calculateMonthlyCharge', () => {
    it('should return fixed price for BASIC plan', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-123',
        orgId: 'org-basic',
        planId: 'plan-basic',
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000, // 300 ILS
          priceYearly: null,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: 'cust-123',
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-123',
        orgId: 'org-basic',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 50, // Under limit
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const charge = await service.calculateMonthlyCharge('org-basic');

      expect(charge.basePriceCents).toBe(30000);
      expect(charge.overageCents).toBe(0);
      expect(charge.totalCents).toBe(30000);
    });

    it('should include overage charges if applicable', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-456',
        orgId: 'org-with-overage',
        planId: 'plan-basic',
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: null,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: 'cust-456',
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-456',
        orgId: 'org-with-overage',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 150, // 50 over limit
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const charge = await service.calculateMonthlyCharge('org-with-overage');

      expect(charge.basePriceCents).toBe(30000);
      expect(charge.overageSubmissions).toBe(50);
      expect(charge.overageCents).toBeGreaterThan(0);
      expect(charge.totalCents).toBeGreaterThan(30000);
    });

    it('should return 0 for FREE plan', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-free',
        orgId: 'org-free',
        planId: 'plan-free',
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
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-free',
        orgId: 'org-free',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 25,
        quotaLimit: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const charge = await service.calculateMonthlyCharge('org-free');

      expect(charge.totalCents).toBe(0);
    });
  });

  describe('processMonthlyBilling', () => {
    it('should charge and create invoice', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-123',
        orgId: 'org-basic',
        planId: 'plan-basic',
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: null,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: 'cust-123',
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-123',
        orgId: 'org-basic',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 80,
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      growClient.chargeCustomer.mockResolvedValueOnce({
        success: true,
        transactionId: 'txn-123',
        amount: 30000,
      });

      mockQuery.mockResolvedValueOnce([
        {
          id: 'invoice-123',
          org_id: 'org-basic',
          subscription_id: 'sub-123',
          amount_cents: 30000,
          currency: 'ILS',
          status: 'paid',
          billing_period_start: '2026-02-01',
          billing_period_end: '2026-03-01',
          paid_at: new Date().toISOString(),
          grow_invoice_id: 'txn-123',
          created_at: new Date().toISOString(),
        },
      ]);

      const result = await service.processMonthlyBilling('org-basic');

      expect(result.success).toBe(true);
      expect(result.invoice).toBeDefined();
      expect(result.invoice?.status).toBe('paid');
      expect(growClient.chargeCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-123',
          amount: 30000,
        }),
      );
    });

    it('should start grace period on payment failure', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-456',
        orgId: 'org-failing',
        planId: 'plan-basic',
        plan: {
          id: 'plan-basic',
          name: 'BASIC',
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: null,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date(),
        },
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: 'cust-declined',
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      usageService.getOrganizationUsage.mockResolvedValueOnce({
        id: 'usage-456',
        orgId: 'org-failing',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 80,
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      growClient.chargeCustomer.mockResolvedValueOnce({
        success: false,
        error: 'Card declined',
        failureReason: 'insufficient_funds',
      });

      // Mock grace period creation
      mockQuery.mockResolvedValueOnce([
        {
          id: 'grace-123',
          org_id: 'org-failing',
          subscription_id: 'sub-456',
          started_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          retry_count: 0,
          last_retry_at: null,
          next_retry_at: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: 'active',
          resolved_at: null,
          resolution_reason: null,
          created_at: new Date().toISOString(),
        },
      ]);

      const result = await service.processMonthlyBilling('org-failing');

      expect(result.success).toBe(false);
      expect(result.gracePeriodStarted).toBe(true);
      expect(result.error).toContain('Card declined');
    });

    it('should skip billing for FREE plan', async () => {
      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce({
        id: 'sub-free',
        orgId: 'org-free',
        planId: 'plan-free',
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
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: null,
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.processMonthlyBilling('org-free');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('FREE plan - no charge');
      expect(growClient.chargeCustomer).not.toHaveBeenCalled();
    });
  });

  describe('handleGrowWebhook', () => {
    it('should update subscription on successful payment', async () => {
      const webhookPayload = {
        event: 'payment.success',
        customerId: 'cust-123',
        transactionId: 'txn-456',
        amount: 30000,
      };

      subscriptionService.getSubscriptionByGrowCustomer.mockResolvedValueOnce({
        id: 'sub-123',
        orgId: 'org-123',
        planId: 'plan-basic',
        status: 'grace_period',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: 'cust-123',
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      subscriptionService.updateSubscriptionStatus.mockResolvedValueOnce({
        id: 'sub-123',
        orgId: 'org-123',
        planId: 'plan-basic',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: 'cust-123',
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.handleGrowWebhook(webhookPayload);

      expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
        'sub-123',
        'active',
      );
    });

    it('should trigger grace period on payment failure', async () => {
      const webhookPayload = {
        event: 'payment.failed',
        customerId: 'cust-123',
        transactionId: 'txn-failed',
        reason: 'insufficient_funds',
      };

      subscriptionService.getSubscriptionByGrowCustomer.mockResolvedValueOnce({
        id: 'sub-123',
        orgId: 'org-123',
        planId: 'plan-basic',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: 'cust-123',
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockQuery.mockResolvedValueOnce([
        {
          id: 'grace-new',
          org_id: 'org-123',
          subscription_id: 'sub-123',
          started_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          retry_count: 0,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ]);

      await service.handleGrowWebhook(webhookPayload);

      expect(subscriptionService.updateSubscriptionStatus).toHaveBeenCalledWith(
        'sub-123',
        'grace_period',
      );
    });

    it('should handle unknown event types gracefully', async () => {
      const webhookPayload = {
        event: 'unknown.event',
        customerId: 'cust-123',
      };

      const result = await service.handleGrowWebhook(webhookPayload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('ignored');
    });
  });
});
