// Subscription Management API Routes
// TDD Phase 4 - GREEN (Implementation to pass tests)
// Created: 2026-02-05

import { Router, Request, Response } from 'express';
import { SubscriptionService } from '../../../services/billing/SubscriptionService';
import { DowngradeService } from '../../../services/billing/DowngradeService';

const router = Router();

// Initialize services
const subscriptionService = new SubscriptionService();
const downgradeService = new DowngradeService();

/**
 * GET /api/v1/billing/subscriptions/:orgId
 * Get organization's current subscription
 */
router.get('/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const subscription = await subscriptionService.getOrganizationSubscription(orgId);

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Subscription not found',
    });
  }
});

/**
 * GET /api/v1/billing/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await subscriptionService.getAllPlans();

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans',
    });
  }
});

/**
 * POST /api/v1/billing/subscriptions/:orgId/upgrade
 * Upgrade subscription to higher plan
 */
router.post('/:orgId/upgrade', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { targetPlan } = req.body;

    // Validate input
    if (!targetPlan) {
      return res.status(400).json({
        success: false,
        error: 'targetPlan is required',
      });
    }

    // Validate plan name
    const validPlans = ['FREE', 'BASIC', 'EXPANDED', 'ENTERPRISE'];
    if (!validPlans.includes(targetPlan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan name',
      });
    }

    const result = await subscriptionService.upgradeSubscription(orgId, targetPlan);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Upgrade failed',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.subscription,
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upgrade subscription',
    });
  }
});

/**
 * POST /api/v1/billing/subscriptions/:orgId/downgrade
 * Downgrade subscription to lower plan (may archive forms)
 */
router.post('/:orgId/downgrade', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { targetPlan, confirmArchive } = req.body;

    // Validate input
    if (!targetPlan) {
      return res.status(400).json({
        success: false,
        error: 'targetPlan is required',
      });
    }

    // Validate plan name
    const validPlans = ['FREE', 'BASIC', 'EXPANDED', 'ENTERPRISE'];
    if (!validPlans.includes(targetPlan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan name',
      });
    }

    // Get current subscription and target plan
    const currentSubscription = await subscriptionService.getOrganizationSubscription(orgId);
    const targetPlanDetails = await subscriptionService.getPlanByName(targetPlan);

    if (!targetPlanDetails) {
      return res.status(404).json({
        success: false,
        error: 'Target plan not found',
      });
    }

    // Check if downgrade will archive forms
    const currentMaxForms = currentSubscription.plan?.maxForms || 3;
    const targetMaxForms = targetPlanDetails.maxForms;

    const downgradeCheck = await downgradeService.canDowngrade(
      orgId,
      currentMaxForms,
      targetMaxForms
    );

    // If forms will be archived, require confirmation
    if (downgradeCheck.willArchiveForms && !confirmArchive) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required',
        warning: downgradeCheck.warning,
        formsToArchive: downgradeCheck.formsToArchive,
        formsToArchiveCount: downgradeCheck.formsToArchiveCount,
      });
    }

    // Perform downgrade
    const result = await subscriptionService.downgradeSubscription(orgId, targetPlan);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Downgrade failed',
      });
    }

    // Archive forms if needed
    if (downgradeCheck.willArchiveForms) {
      const archiveResult = await downgradeService.archiveExcessForms(
        orgId,
        targetMaxForms,
        currentSubscription.plan?.name || 'UNKNOWN',
        targetPlan
      );

      return res.status(200).json({
        success: true,
        data: result.subscription,
        warning: downgradeCheck.warning,
        archivedForms: archiveResult.archivedFormIds,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.subscription,
    });
  } catch (error) {
    console.error('Downgrade subscription error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to downgrade subscription',
    });
  }
});

/**
 * DELETE /api/v1/billing/subscriptions/:orgId
 * Cancel subscription (effective at end of current period)
 */
router.delete('/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const result = await subscriptionService.cancelSubscription(orgId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Cancellation failed',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      effectiveDate: result.effectiveDate,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
    });
  }
});

export default router;
