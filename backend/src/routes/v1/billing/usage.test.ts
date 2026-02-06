// Usage API Routes Tests
// TDD Phase 4 - RED (Tests written first, implementation will follow)
// Created: 2026-02-05
// Purpose: Test usage tracking and quota API endpoints

import request from 'supertest';
import express from 'express';
import usageRoutes from './usage';
import { UsageService } from '../../../services/billing/UsageService';
import { QuotaEnforcementService } from '../../../services/billing/QuotaEnforcementService';

// Mock services
jest.mock('../../../services/billing/UsageService');
jest.mock('../../../services/billing/QuotaEnforcementService');

const mockUsageService = UsageService as jest.MockedClass<typeof UsageService>;
const mockQuotaService = QuotaEnforcementService as jest.MockedClass<typeof QuotaEnforcementService>;

describe('Usage API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Mount routes
    app.use('/api/v1/billing/usage', usageRoutes);
  });

  describe('GET /api/v1/billing/usage/:orgId', () => {
    it('should return organization usage', async () => {
      const mockUsage = {
        id: 'usage-123',
        orgId: 'org-456',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
        totalSubmissions: 75,
        quotaLimit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockUsageService.prototype.getOrganizationUsage as jest.Mock).mockResolvedValueOnce(mockUsage);

      const response = await request(app)
        .get('/api/v1/billing/usage/org-456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSubmissions).toBe(75);
      expect(response.body.data.quotaLimit).toBe(100);
    });

    it('should return 404 if usage not found', async () => {
      usageService.getOrganizationUsage.mockRejectedValueOnce(
        new Error('Usage not found')
      );

      await request(app)
        .get('/api/v1/billing/usage/org-nonexistent')
        .expect(404);
    });
  });

  describe('GET /api/v1/billing/usage/:orgId/quota-status', () => {
    it('should return detailed quota status', async () => {
      const mockQuotaStatus = {
        totalSubmissions: 75,
        quotaLimit: 100,
        remaining: 25,
        percentUsed: 75,
        isExceeded: false,
        overageAmount: 0,
        canIncurOverage: true,
        planName: 'BASIC',
        subscriptionStatus: 'active',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
      };

      quotaService.getQuotaStatus = jest.fn().mockResolvedValueOnce(mockQuotaStatus);

      const response = await request(app)
        .get('/api/v1/billing/usage/org-456/quota-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.percentUsed).toBe(75);
      expect(response.body.data.remaining).toBe(25);
      expect(response.body.data.isExceeded).toBe(false);
    });

    it('should indicate when quota is exceeded', async () => {
      const mockQuotaStatus = {
        totalSubmissions: 110,
        quotaLimit: 100,
        remaining: 0,
        percentUsed: 110,
        isExceeded: true,
        overageAmount: 10,
        canIncurOverage: true,
        planName: 'BASIC',
        subscriptionStatus: 'active',
        billingPeriodStart: new Date('2026-02-01'),
        billingPeriodEnd: new Date('2026-03-01'),
      };

      quotaService.getQuotaStatus = jest.fn().mockResolvedValueOnce(mockQuotaStatus);

      const response = await request(app)
        .get('/api/v1/billing/usage/org-456/quota-status')
        .expect(200);

      expect(response.body.data.isExceeded).toBe(true);
      expect(response.body.data.overageAmount).toBe(10);
    });
  });

  describe('POST /api/v1/billing/usage/:orgId/check-quota', () => {
    it('should check if submission is allowed', async () => {
      const mockCheckResult = {
        allowed: true,
        quotaInfo: {
          totalSubmissions: 75,
          quotaLimit: 100,
          remaining: 25,
          percentUsed: 75,
          overageAmount: 0,
        },
      };

      quotaService.canSubmitForm = jest.fn().mockResolvedValueOnce(mockCheckResult);

      const response = await request(app)
        .post('/api/v1/billing/usage/org-456/check-quota')
        .send({ formId: 'form-789' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowed).toBe(true);
      expect(quotaService.canSubmitForm).toHaveBeenCalledWith('org-456', 'form-789');
    });

    it('should block submission when quota exceeded (FREE plan)', async () => {
      const mockCheckResult = {
        allowed: false,
        reason: 'quota_exceeded_free_plan',
        upgradeRequired: true,
        quotaInfo: {
          totalSubmissions: 50,
          quotaLimit: 50,
          remaining: 0,
          percentUsed: 100,
          overageAmount: 0,
        },
      };

      quotaService.canSubmitForm = jest.fn().mockResolvedValueOnce(mockCheckResult);

      const response = await request(app)
        .post('/api/v1/billing/usage/org-free/check-quota')
        .send({ formId: 'form-789' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowed).toBe(false);
      expect(response.body.data.upgradeRequired).toBe(true);
    });

    it('should return overage cost estimate for paid plans', async () => {
      const mockCheckResult = {
        allowed: true,
        willIncurOverage: true,
        estimatedOverageCost: 300,
        quotaInfo: {
          totalSubmissions: 105,
          quotaLimit: 100,
          remaining: -5,
          percentUsed: 105,
          overageAmount: 5,
        },
      };

      quotaService.canSubmitForm = jest.fn().mockResolvedValueOnce(mockCheckResult);

      const response = await request(app)
        .post('/api/v1/billing/usage/org-basic/check-quota')
        .send({ formId: 'form-789' })
        .expect(200);

      expect(response.body.data.willIncurOverage).toBe(true);
      expect(response.body.data.estimatedOverageCost).toBe(300);
    });

    it('should return 400 if formId is missing', async () => {
      await request(app)
        .post('/api/v1/billing/usage/org-456/check-quota')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/billing/usage/:orgId/details', () => {
    it('should return usage breakdown by form', async () => {
      const mockUsageDetail = {
        totalSubmissions: 75,
        quotaLimit: 100,
        remaining: 25,
        percentUsed: 75,
        overageAmount: 0,
        formsBreakdown: [
          { formId: 'form-1', formName: 'Contact Form', submissions: 40 },
          { formId: 'form-2', formName: 'Survey', submissions: 35 },
        ],
      };

      usageService.getUsageWithBreakdown = jest.fn().mockResolvedValueOnce(mockUsageDetail);

      const response = await request(app)
        .get('/api/v1/billing/usage/org-456/details')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.formsBreakdown).toHaveLength(2);
      expect(response.body.data.formsBreakdown[0].formName).toBe('Contact Form');
    });
  });

  describe('POST /api/v1/billing/usage/:orgId/increment', () => {
    it('should increment usage counter', async () => {
      usageService.incrementUsage = jest.fn().mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/v1/billing/usage/org-456/increment')
        .send({ formId: 'form-789' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(usageService.incrementUsage).toHaveBeenCalledWith('org-456', 'form-789');
    });

    it('should return 400 if formId is missing', async () => {
      await request(app)
        .post('/api/v1/billing/usage/org-456/increment')
        .send({})
        .expect(400);
    });

    it('should handle increment errors gracefully', async () => {
      usageService.incrementUsage = jest.fn().mockRejectedValueOnce(
        new Error('Database error')
      );

      await request(app)
        .post('/api/v1/billing/usage/org-456/increment')
        .send({ formId: 'form-789' })
        .expect(500);
    });
  });
});
