/**
 * Grow Webhook Handler
 * Processes webhook events from Grow payment gateway
 *
 * POST /api/webhooks/grow - Handle Grow webhook events
 *
 * Supported events:
 * - subscription.created: New subscription activated
 * - subscription.updated: Subscription or plan changed
 * - subscription.deleted: Subscription cancelled
 * - payment.failed: Payment processing failed
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GrowService } from '../../packages/app/src/services/billing/grow.service.js';

const growService = new GrowService();

/**
 * Main webhook handler
 * Verifies signature and processes events
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported',
    });
  }

  try {
    // Get webhook signature from headers
    // Grow may use different header names, adjust when actual API docs are available
    const signature = (req.headers['grow-signature'] ||
      req.headers['x-grow-signature'] ||
      req.headers['x-webhook-signature']) as string;

    if (!signature) {
      console.error('Webhook signature missing');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Webhook signature is required',
      });
    }

    // Get raw payload for signature verification
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = growService.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
      });
    }

    // Process the webhook event
    await growService.handleWebhookEvent(req.body);

    // Return success response
    // Grow expects a 200 status to confirm receipt
    return res.status(200).json({
      received: true,
      eventType: req.body.type,
    });
  } catch (error) {
    console.error('Webhook processing failed:', error);

    // Check for known errors
    if (error instanceof Error) {
      if (error.message === 'Unknown webhook event type') {
        return res.status(400).json({
          error: 'Invalid event type',
          message: error.message,
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Resource not found',
          message: error.message,
        });
      }

      if (error.message.includes('required data')) {
        return res.status(400).json({
          error: 'Invalid event data',
          message: error.message,
        });
      }
    }

    // Return 500 for unexpected errors
    // Grow will retry the webhook automatically
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process webhook event',
    });
  }
}
