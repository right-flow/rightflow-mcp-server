// Usage Tracking API Routes
// TDD Phase 4 - GREEN (Implementation to pass tests)
// Created: 2026-02-05

import { Router, Request, Response } from 'express';
import { UsageService } from '../../../services/billing/UsageService';
import { QuotaEnforcementService } from '../../../services/billing/QuotaEnforcementService';
import { SubscriptionService } from '../../../services/billing/SubscriptionService';

const router = Router();

// Initialize services
const subscriptionService = new SubscriptionService();
const usageService = new UsageService(subscriptionService);
const quotaService = new QuotaEnforcementService(usageService, subscriptionService);

/**
 * GET /api/v1/billing/usage/:orgId
 * Get organization's current usage
 */
router.get('/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const usage = await usageService.getOrganizationUsage(orgId);

    return res.status(200).json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Usage not found',
    });
  }
});

/**
 * GET /api/v1/billing/usage/:orgId/quota-status
 * Get detailed quota status with calculations
 */
router.get('/:orgId/quota-status', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const quotaStatus = await quotaService.getQuotaStatus(orgId);

    return res.status(200).json({
      success: true,
      data: quotaStatus,
    });
  } catch (error) {
    console.error('Get quota status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch quota status',
    });
  }
});

/**
 * POST /api/v1/billing/usage/:orgId/check-quota
 * Check if submission is allowed (pre-submission validation)
 */
router.post('/:orgId/check-quota', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { formId } = req.body;

    // Validate input
    if (!formId) {
      return res.status(400).json({
        success: false,
        error: 'formId is required',
      });
    }

    const checkResult = await quotaService.canSubmitForm(orgId, formId);

    return res.status(200).json({
      success: true,
      data: checkResult,
    });
  } catch (error) {
    console.error('Check quota error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check quota',
    });
  }
});

/**
 * GET /api/v1/billing/usage/:orgId/details
 * Get usage breakdown by form (analytics)
 */
router.get('/:orgId/details', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const usageDetail = await usageService.getUsageWithBreakdown(orgId);

    return res.status(200).json({
      success: true,
      data: usageDetail,
    });
  } catch (error) {
    console.error('Get usage details error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch usage details',
    });
  }
});

/**
 * POST /api/v1/billing/usage/:orgId/increment
 * Increment usage counter (called on form submission)
 */
router.post('/:orgId/increment', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { formId } = req.body;

    // Validate input
    if (!formId) {
      return res.status(400).json({
        success: false,
        error: 'formId is required',
      });
    }

    await usageService.incrementUsage(orgId, formId);

    return res.status(200).json({
      success: true,
      message: 'Usage incremented successfully',
    });
  } catch (error) {
    console.error('Increment usage error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to increment usage',
    });
  }
});

export default router;
