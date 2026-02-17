/**
 * Billing API Endpoint
 * Handles checkout, billing portal, and current plan requests
 *
 * POST /api/billing/checkout - Create Grow checkout session
 * POST /api/billing/portal - Create billing portal session
 * GET /api/billing/current - Get user's current plan and usage
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../src/lib/db';
import { GrowService } from '../src/services/billing/grow.service';
import { LimitsService } from '../src/services/billing/limits.service';
import { getUserFromAuth } from './lib/auth';

const growService = new GrowService();
const limitsService = new LimitsService();

/**
 * Handle POST /api/billing/checkout
 * Create Grow checkout session for plan upgrade
 */
async function handleCheckout(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const { planId, billingPeriod } = req.body;

  // Validate required fields
  if (!planId || !billingPeriod) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'planId and billingPeriod are required',
    });
    return;
  }

  // Validate billing period
  if (!['monthly', 'yearly'].includes(billingPeriod)) {
    res.status(400).json({
      error: 'Invalid billing period',
      message: 'billingPeriod must be "monthly" or "yearly"',
    });
    return;
  }

  // Get authenticated user ID
  const userId = await getUserFromAuth(req);
  if (!userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  try {
    // Verify plan exists
    const plan = await getDb()('plans')
      .where({ id: planId, is_active: true })
      .first();

    if (!plan) {
      res.status(404).json({
        error: 'Plan not found',
        message: 'The selected plan does not exist or is not available',
      });
      return;
    }

    // Create checkout session
    const session = await growService.createCheckoutSession({
      userId,
      planId,
      billingPeriod,
      successUrl: `${process.env.APP_URL || 'http://localhost:5173'}/dashboard?billing=success`,
      cancelUrl: `${process.env.APP_URL || 'http://localhost:5173'}/pricing`,
    });

    res.status(200).json({ checkoutUrl: session.checkoutUrl });
  } catch (error) {
    console.error('Checkout session creation failed:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create checkout session',
    });
  }
}

/**
 * Handle POST /api/billing/portal
 * Create Grow billing portal session for payment management
 */
async function handlePortal(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Get authenticated user ID
  const userId = await getUserFromAuth(req);
  if (!userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  try {
    // Get user's Grow customer ID
    const user = await getDb()('users').where({ id: userId }).first();

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User account does not exist',
      });
      return;
    }

    if (!user.grow_customer_id) {
      res.status(400).json({
        error: 'No billing account',
        message: 'You do not have an active billing account. Please upgrade to a paid plan first.',
      });
      return;
    }

    // Create portal session
    const session = await growService.createPortalSession({
      customerId: user.grow_customer_id,
      returnUrl: `${process.env.APP_URL || 'http://localhost:5173'}/dashboard/billing`,
    });

    res.status(200).json({ portalUrl: session.portalUrl });
  } catch (error) {
    console.error('Portal session creation failed:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create billing portal session',
    });
  }
}

/**
 * Handle POST /api/billing/payment-confirmed
 * Called by ActivePieces when Grow payment is confirmed
 * Activates user subscription
 */
async function handlePaymentConfirmed(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const { email, planName, billingPeriod, transactionId, webhookKey } = req.body;

  // Verify webhook key for security
  const expectedKey = process.env.GROW_WEBHOOK_SECRET;

  // In production, require webhook key to be configured
  if (!expectedKey && process.env.NODE_ENV === 'production') {
    console.error('GROW_WEBHOOK_SECRET not configured - rejecting webhook');
    res.status(500).json({
      error: 'Configuration error',
      message: 'Webhook verification not configured',
    });
    return;
  }

  // Verify webhook key if configured
  if (expectedKey && webhookKey !== expectedKey) {
    console.error('Invalid webhook key received');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid webhook key',
    });
    return;
  }

  // Validate required fields
  if (!email || !planName) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'email and planName are required',
    });
    return;
  }

  try {
    const db = getDb();

    // Find user by email
    const user = await db('users')
      .whereRaw('LOWER(email) = ?', [email.toLowerCase()])
      .first();

    if (!user) {
      console.error('User not found for payment confirmation:', email);
      res.status(404).json({
        error: 'User not found',
        message: `No user found with email: ${email}`,
      });
      return;
    }

    // Find plan by name (case insensitive)
    const plan = await db('plans')
      .whereRaw('UPPER(name) = ?', [planName.toUpperCase()])
      .where({ is_active: true })
      .first();

    if (!plan) {
      console.error('Plan not found:', planName);
      res.status(404).json({
        error: 'Plan not found',
        message: `No plan found with name: ${planName}`,
      });
      return;
    }

    // Calculate subscription dates
    const now = new Date();
    const periodMonths = billingPeriod === 'yearly' ? 12 : 1;
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + periodMonths);

    // Apply credit days from mid-period upgrade (if any)
    const creditDays = user.pending_credit_days || 0;
    if (creditDays > 0) {
      endDate.setDate(endDate.getDate() + creditDays);
      console.log('[Grow] Applied credit days:', {
        creditDays,
        originalEnd: new Date(now.getTime() + periodMonths * 30 * 24 * 60 * 60 * 1000),
        newEnd: endDate,
      });
    }

    // Update user's subscription
    await db('users')
      .where({ id: user.id })
      .update({
        plan_id: plan.id,
        grow_subscription_id: transactionId || `grow_sub_${Date.now()}`,
        subscription_start_date: now,
        subscription_end_date: endDate,
        billing_period: billingPeriod || 'monthly',
        pending_plan_id: null,
        pending_billing_period: null,
        checkout_initiated_at: null,
        pending_credit_days: 0, // Reset credit days after applying
        updated_at: now,
      });

    console.log('[Grow] Payment confirmed:', {
      userId: user.id,
      email,
      planName,
      billingPeriod,
      transactionId,
      creditDays,
      subscriptionEnd: endDate,
    });

    res.status(200).json({
      success: true,
      message: 'Subscription activated',
      userId: user.id,
      planId: plan.id,
    });
  } catch (error) {
    console.error('Payment confirmation failed:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to activate subscription',
    });
  }
}

/**
 * Handle GET /api/billing/current
 * Get user's current plan, usage, and limits
 */
async function handleGetCurrent(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Get authenticated user ID
  const userId = await getUserFromAuth(req);
  if (!userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  try {
    // Get user's plan and usage details
    const planLimits = await limitsService.getUserPlanLimits(userId);

    res.status(200).json(planLimits);
  } catch (error) {
    console.error('Failed to get user plan limits:', error);

    // Check if it's a known error
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'User account does not exist',
        });
        return;
      }

      if (error.message === 'Usage metrics not found') {
        res.status(404).json({
          error: 'Usage metrics not found',
          message: 'Usage tracking data not initialized',
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve billing information',
    });
  }
}

/**
 * Get allowed origin for CORS based on environment
 * Never falls back to wildcard '*' for security
 */
function getAllowedOrigin(): string {
  // Use APP_URL if set (production)
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  // In production without APP_URL, fail safely with a specific origin
  // This prevents wildcard '*' in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    // Require APP_URL in production
    throw new Error('APP_URL environment variable is required in production');
  }

  // Development fallback
  return 'http://localhost:5173';
}

/**
 * Main request handler
 * Routes to appropriate handler based on HTTP method and request body
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Set CORS headers with safe origin (never wildcard)
  const allowedOrigin = getAllowedOrigin();
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Route based on method and action
    if (req.method === 'POST') {
      const { action } = req.body;

      if (action === 'checkout' || !action) {
        // Default POST action is checkout
        await handleCheckout(req, res);
      } else if (action === 'portal') {
        await handlePortal(req, res);
      } else if (action === 'payment-confirmed') {
        // Called by ActivePieces when Grow payment succeeds
        await handlePaymentConfirmed(req, res);
      } else {
        res.status(400).json({
          error: 'Invalid action',
          message: 'Supported actions: checkout, portal, payment-confirmed',
        });
      }
    } else if (req.method === 'GET') {
      await handleGetCurrent(req, res);
    } else {
      res.status(405).json({
        error: 'Method not allowed',
        message: 'Only GET and POST requests are supported',
      });
    }
  } catch (error) {
    console.error('Billing API error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    });
  }
}
