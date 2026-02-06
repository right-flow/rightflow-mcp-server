// Subscription API Routes Tests
// TDD Phase 4 - RED (Tests written first, implementation will follow)
// Created: 2026-02-05
// Purpose: Test subscription management API endpoints

import request from 'supertest';
import express from 'express';
import subscriptionRoutes from './subscriptions';
import { SubscriptionService } from '../../../services/billing/SubscriptionService';
import { DowngradeService } from '../../../services/billing/DowngradeService';

// Mock services
jest.mock('../../../services/billing/SubscriptionService');
jest.mock('../../../services/billing/DowngradeService');

const mockSubscriptionService = SubscriptionService as jest.MockedClass<typeof SubscriptionService>;
const mockDowngradeService = DowngradeService as jest.MockedClass<typeof DowngradeService>;

describe('Subscription API Routes', () => {
  let app: express.Application;
  let subscriptionService: jest.Mocked<SubscriptionService>;
  let downgradeService: jest.Mocked<DowngradeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    subscriptionService = new mockSubscriptionService() as jest.Mocked<SubscriptionService>;
    downgradeService = new mockDowngradeService() as jest.Mocked<DowngradeService>;

    // Mount routes with mocked services
    app.use('/api/v1/billing/subscriptions', subscriptionRoutes);
  });

  describe('GET /api/v1/billing/subscriptions/:orgId', () => {
    it('should return organization subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        orgId: 'org-456',
        planId: 'plan-basic',
        status: 'active' as const,
        billingCycle: 'monthly' as const,
        currentPeriodStart: new Date('2026-02-01'),
        currentPeriodEnd: new Date('2026-03-01'),
        growCustomerId: 'grow-789',
        growSubscriptionId: null,
        cancelledAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        plan: {
          id: 'plan-basic',
          name: 'BASIC' as const,
          displayName: 'Basic Plan',
          priceMonthly: 30000,
          priceYearly: 288000,
          maxForms: 10,
          maxSubmissionsPerMonth: 100,
          maxStorageMB: 5120,
          maxMembers: 3,
          features: {},
          isActive: true,
          createdAt: new Date('2025-01-01'),
        },
      };

      subscriptionService.getOrganizationSubscription.mockResolvedValueOnce(mockSubscription);

      const response = await request(app)
        .get('/api/v1/billing/subscriptions/org-456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orgId).toBe('org-456');
      expect(response.body.data.plan.name).toBe('BASIC');
    });

    it('should return 404 if subscription not found', async () => {
      subscriptionService.getOrganizationSubscription.mockRejectedValueOnce(
        new Error('Subscription not found')
      );

      await request(app)
        .get('/api/v1/billing/subscriptions/org-nonexistent')
        .expect(404);
    });
  });

  describe('POST /api/v1/billing/subscriptions/:orgId/upgrade', () => {
    it('should upgrade subscription to higher plan', async () => {
      const mockResult = {
        success: true,
        subscription: {
          id: 'sub-123',
          orgId: 'org-456',
          planId: 'plan-expanded',
          status: 'active',
        },
      };

      subscriptionService.upgradeSubscription = jest.fn().mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/v1/billing/subscriptions/org-456/upgrade')
        .send({ targetPlan: 'EXPANDED' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(subscriptionService.upgradeSubscription).toHaveBeenCalledWith(
        'org-456',
        'EXPANDED'
      );
    });

    it('should return 400 if targetPlan is missing', async () => {
      await request(app)
        .post('/api/v1/billing/subscriptions/org-456/upgrade')
        .send({})
        .expect(400);
    });

    it('should return 400 if invalid plan name', async () => {
      await request(app)
        .post('/api/v1/billing/subscriptions/org-456/upgrade')
        .send({ targetPlan: 'INVALID_PLAN' })
        .expect(400);
    });
  });

  describe('POST /api/v1/billing/subscriptions/:orgId/downgrade', () => {
    it('should downgrade subscription with form archiving warning', async () => {
      const mockDowngradeCheck = {
        allowed: true,
        willArchiveForms: true,
        formsToArchiveCount: 3,
        warning: '3 forms will be archived',
        formsToArchive: [
          { id: 'form-1', name: 'Old Form 1', createdAt: new Date() },
          { id: 'form-2', name: 'Old Form 2', createdAt: new Date() },
          { id: 'form-3', name: 'Old Form 3', createdAt: new Date() },
        ],
      };

      downgradeService.canDowngrade = jest.fn().mockResolvedValueOnce(mockDowngradeCheck);

      const response = await request(app)
        .post('/api/v1/billing/subscriptions/org-456/downgrade')
        .send({ targetPlan: 'FREE', confirmArchive: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warning).toContain('3 forms will be archived');
    });

    it('should return 400 if downgrade requires confirmation but not provided', async () => {
      const mockDowngradeCheck = {
        allowed: true,
        willArchiveForms: true,
        formsToArchiveCount: 3,
        warning: '3 forms will be archived',
      };

      downgradeService.canDowngrade = jest.fn().mockResolvedValueOnce(mockDowngradeCheck);

      await request(app)
        .post('/api/v1/billing/subscriptions/org-456/downgrade')
        .send({ targetPlan: 'FREE', confirmArchive: false })
        .expect(400);
    });

    it('should allow downgrade without confirmation if no forms to archive', async () => {
      const mockDowngradeCheck = {
        allowed: true,
        willArchiveForms: false,
        formsToArchiveCount: 0,
      };

      downgradeService.canDowngrade = jest.fn().mockResolvedValueOnce(mockDowngradeCheck);
      subscriptionService.downgradeSubscription = jest.fn().mockResolvedValueOnce({
        success: true,
      });

      const response = await request(app)
        .post('/api/v1/billing/subscriptions/org-456/downgrade')
        .send({ targetPlan: 'FREE' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/billing/subscriptions/:orgId', () => {
    it('should cancel subscription', async () => {
      const mockResult = {
        success: true,
        effectiveDate: new Date('2026-03-01'),
      };

      subscriptionService.cancelSubscription = jest.fn().mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .delete('/api/v1/billing/subscriptions/org-456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.effectiveDate).toBeDefined();
      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith('org-456');
    });

    it('should return 404 if subscription not found', async () => {
      subscriptionService.cancelSubscription = jest.fn().mockResolvedValueOnce({
        success: false,
        error: 'No active subscription found',
      });

      await request(app)
        .delete('/api/v1/billing/subscriptions/org-nonexistent')
        .expect(404);
    });
  });

  describe('GET /api/v1/billing/subscriptions/plans', () => {
    it('should return all available plans', async () => {
      const mockPlans = [
        {
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
        {
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
      ];

      subscriptionService.getAllPlans = jest.fn().mockResolvedValueOnce(mockPlans);

      const response = await request(app)
        .get('/api/v1/billing/subscriptions/plans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('FREE');
    });
  });
});
