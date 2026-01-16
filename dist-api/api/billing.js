/**
 * Billing API Endpoint
 * Handles checkout, billing portal, and current plan requests
 *
 * POST /api/billing/checkout - Create Grow checkout session
 * POST /api/billing/portal - Create billing portal session
 * GET /api/billing/current - Get user's current plan and usage
 */
import { getDb } from '../src/lib/db';
import { GrowService } from '../src/services/billing/grow.service';
import { LimitsService } from '../src/services/billing/limits.service';
const growService = new GrowService();
const limitsService = new LimitsService();
/**
 * Get user ID from Clerk authentication headers
 * In production, this would verify the Clerk JWT token
 */
function getUserIdFromAuth(req) {
    // Get user ID from custom header (set by Clerk middleware)
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return null;
    }
    return userId;
}
/**
 * Handle POST /api/billing/checkout
 * Create Grow checkout session for plan upgrade
 */
async function handleCheckout(req, res) {
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
    const userId = getUserIdFromAuth(req);
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
    }
    catch (error) {
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
async function handlePortal(req, res) {
    // Get authenticated user ID
    const userId = getUserIdFromAuth(req);
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
    }
    catch (error) {
        console.error('Portal session creation failed:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create billing portal session',
        });
    }
}
/**
 * Handle GET /api/billing/current
 * Get user's current plan, usage, and limits
 */
async function handleGetCurrent(req, res) {
    // Get authenticated user ID
    const userId = getUserIdFromAuth(req);
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
    }
    catch (error) {
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
function getAllowedOrigin() {
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
export default async function handler(req, res) {
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
            }
            else if (action === 'portal') {
                await handlePortal(req, res);
            }
            else {
                res.status(400).json({
                    error: 'Invalid action',
                    message: 'Supported actions: checkout, portal',
                });
            }
        }
        else if (req.method === 'GET') {
            await handleGetCurrent(req, res);
        }
        else {
            res.status(405).json({
                error: 'Method not allowed',
                message: 'Only GET and POST requests are supported',
            });
        }
    }
    catch (error) {
        console.error('Billing API error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred',
        });
    }
}
//# sourceMappingURL=billing.js.map