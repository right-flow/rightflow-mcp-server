// GROW Webhook Handler
// Created: 2026-02-05
// Reference: GROW/Meshulam Webhook Integration

import { Router, Request, Response } from 'express';
import { GrowClient } from '../../../services/billing/GrowClient';
import { BillingService } from '../../../services/billing/BillingService';
import { SubscriptionService } from '../../../services/billing/SubscriptionService';
import { UsageService } from '../../../services/billing/UsageService';

const router = Router();

// Initialize services
const growClient = new GrowClient({
  apiKey: process.env.GROW_API_KEY || '',
  apiSecret: process.env.GROW_API_SECRET || '',
  environment: (process.env.GROW_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
});

const subscriptionService = new SubscriptionService();
const usageService = new UsageService();
const billingService = new BillingService(
  growClient,
  subscriptionService,
  usageService,
);

/**
 * POST /api/v1/webhooks/grow
 * Handle incoming webhooks from GROW/Meshulam
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-grow-signature'] as string;
    const payload = req.body;

    // Verify webhook signature
    if (!signature) {
      return res.status(401).json({
        error: 'Missing webhook signature',
      });
    }

    const isValid = growClient.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      console.error('Invalid GROW webhook signature received');
      return res.status(401).json({
        error: 'Invalid webhook signature',
      });
    }

    // Process webhook
    const result = await billingService.handleGrowWebhook(payload);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      console.error('GROW webhook processing failed:', result.message);
      return res.status(500).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    console.error('GROW webhook error:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
