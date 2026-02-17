/**
 * Grow Payment Webhook Handler
 *
 * Receives payment notifications directly from Grow payment gateway.
 * This endpoint is called by Grow's notifyUrl after payment completion.
 *
 * Security:
 * - No authentication required (external webhook)
 * - Rate limiting applied
 * - IP whitelisting (optional)
 * - Idempotent processing
 *
 * @see ADR-009: Grow Payment API Integration
 */

import express from 'express';
import { z } from 'zod';
import { GrowWebhookService, GrowWebhookPayload } from '../../services/billing/growWebhookService';
import logger from '../../utils/logger';

const router = express.Router();

// Rate limiting for webhooks
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

// Optional IP whitelist (Grow server IPs)
const GROW_IP_WHITELIST = process.env.GROW_IP_WHITELIST?.split(',').map(ip => ip.trim()) || [];

// Validation schema for Grow webhook payload
const growWebhookSchema = z.object({
  status: z.string(),
  err: z.string().optional(),
  data: z.object({
    transactionId: z.string().optional(),
    processId: z.string().optional(),
    processToken: z.string().optional(),
    asmachta: z.string().optional(),
    cardSuffix: z.string().optional(),
    cardType: z.string().optional(),
    cardBrand: z.string().optional(),
    cardExp: z.string().optional(),
    statusCode: z.string().optional(),
    status: z.string().optional(),
    sum: z.string().optional(),
    paymentsNum: z.string().optional(),
    allPaymentsNum: z.string().optional(),
    paymentType: z.string().optional(),
    paymentDate: z.string().optional(),
    description: z.string().optional(),
    fullName: z.string().optional(),
    payerPhone: z.string().optional(),
    payerEmail: z.string().optional(),
    customFields: z.object({
      cField1: z.string().optional(),
      cField2: z.string().optional(),
      cField3: z.string().optional(),
      cField4: z.string().optional(),
      cField5: z.string().optional(),
      cField6: z.string().optional(),
      cField7: z.string().optional(),
      cField8: z.string().optional(),
      cField9: z.string().optional(),
    }).optional(),
  }),
});

/**
 * Rate limiting middleware for webhook endpoints
 */
function webhookRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.socket.remoteAddress ||
                   'unknown';

  const now = Date.now();
  const windowKey = `${clientIp}_${Math.floor(now / RATE_LIMIT_WINDOW_MS)}`;

  const current = rateLimitMap.get(windowKey) || { count: 0, timestamp: now };
  current.count++;
  rateLimitMap.set(windowKey, current);

  // Clean old entries
  for (const [key, value] of rateLimitMap) {
    if (now - value.timestamp > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  }

  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    logger.warn('Webhook rate limit exceeded', { ip: clientIp, count: current.count });
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  next();
}

/**
 * Optional IP whitelist middleware
 */
function ipWhitelistMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (GROW_IP_WHITELIST.length === 0) {
    // No whitelist configured - allow all
    return next();
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.socket.remoteAddress ||
                   '';

  if (!GROW_IP_WHITELIST.includes(clientIp)) {
    logger.warn('Webhook rejected - IP not whitelisted', { ip: clientIp });
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

/**
 * POST /api/v1/webhooks/grow
 * Receive payment webhook from Grow
 *
 * This endpoint is called by Grow's server when:
 * - Payment is completed successfully
 * - Payment fails
 * - Payment is canceled
 * - Payment status changes
 */
router.post(
  '/grow',
  webhookRateLimiter,
  ipWhitelistMiddleware,
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const growWebhookService = new GrowWebhookService();

    try {
      // Log request metadata (no sensitive data)
      logger.info('Grow webhook received', {
        contentType: req.headers['content-type'],
        bodyKeys: Object.keys(req.body || {}),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        hasSignature: !!req.headers['x-grow-signature'],
      });

      // SECURITY: Verify webhook signature before processing
      const signature = req.headers['x-grow-signature'] as string | undefined;
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      if (!growWebhookService.verifyWebhookSignature(rawBody, signature)) {
        logger.warn('Grow webhook signature verification failed', {
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          hasSignature: !!signature,
        });
        // Return 401 for signature failures - Grow should NOT retry with same payload
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Parse and validate payload
      let payload: GrowWebhookPayload;
      try {
        // Grow sends form-urlencoded or JSON depending on configuration
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        payload = growWebhookSchema.parse(body) as GrowWebhookPayload;
      } catch (parseError) {
        logger.error('Grow webhook parse error', {
          error: parseError,
          bodyKeys: Object.keys(req.body || {}), // Only log keys, not values (security)
        });
        // Return 200 to prevent Grow from retrying bad data
        return res.status(200).json({ received: true, error: 'Invalid payload format' });
      }

      // Process webhook
      const result = await growWebhookService.handleWebhook(payload);

      // Log result
      logger.info('Grow webhook processed', {
        transactionId: payload.data.transactionId,
        processId: payload.data.processId,
        statusCode: payload.data.statusCode,
        result,
        durationMs: Date.now() - startTime,
      });

      // Always return 200 to Grow to acknowledge receipt
      // Even if processing failed, we don't want Grow to retry
      // We handle retries internally
      return res.status(200).json({
        received: true,
        processed: result.subscriptionActivated || result.processed !== false,
        message: result.reason || 'OK',
      });
    } catch (error) {
      logger.error('Grow webhook error', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: Date.now() - startTime,
      });

      // Still return 200 to prevent infinite retries from Grow
      // Log error for manual investigation
      return res.status(200).json({
        received: true,
        processed: false,
        error: 'Internal processing error',
      });
    }
  }
);

/**
 * GET /api/v1/webhooks/grow/health
 * Health check for the Grow webhook endpoint
 */
router.get('/grow/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'grow-webhook',
  });
});

export default router;
