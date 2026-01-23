/**
 * Inbound Webhook Receiver - Integration Hub Phase 6
 * Receives webhooks from external systems (Activepieces, Zapier, etc.)
 *
 * Endpoint: POST /api/v1/integrations/webhooks/inbound/:organizationId/:webhookId
 * Auth: HMAC signature verification (no JWT required)
 *
 * Features:
 * - HMAC-SHA256 signature verification
 * - Multi-tenant routing and isolation
 * - Rate limiting (100 req/min per webhook)
 * - Redis caching (24h TTL)
 * - Payload validation
 */

import { Router, Request, Response } from 'express';
import * as webhookService from '../../../../services/integrationHub/webhookService';
import { redisConnection } from '../../../../config/redis';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import logger from '../../../../utils/logger';

const router = Router();

// ============================================================================
// Rate Limiting Middleware
// ============================================================================

const webhookRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore types are outdated
    client: redisConnection,
    prefix: 'rl:webhook:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per webhook
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit per organization + webhook ID
    return `${req.params.organizationId}:${req.params.webhookId}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Webhook rate limit exceeded', {
      organizationId: req.params.organizationId,
      webhookId: req.params.webhookId,
      ip: req.ip,
    });

    res.status(429).json({
      error: 'Rate limit exceeded. Maximum 100 requests per minute.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  skip: (_req: Request) => {
    // Skip rate limiting for health checks or test environments
    return process.env.NODE_ENV === 'test';
  },
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate webhook UUID format
 */
function validateUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate payload structure
 */
function validatePayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  if (!payload.event || typeof payload.event !== 'string') {
    return { valid: false, error: 'Payload must include "event" field' };
  }

  // Check for deeply nested objects (prevent stack overflow)
  const maxDepth = 50;
  function checkDepth(obj: any, depth: number = 0): boolean {
    if (depth > maxDepth) return false;
    if (typeof obj !== 'object' || obj === null) return true;

    for (const key in obj) {
      if (!checkDepth(obj[key], depth + 1)) return false;
    }
    return true;
  }

  if (!checkDepth(payload)) {
    return { valid: false, error: 'Payload is too deeply nested (max 50 levels)' };
  }

  return { valid: true };
}

// ============================================================================
// Webhook Receiver Endpoint
// ============================================================================

/**
 * POST /api/v1/integrations/webhooks/inbound/:organizationId/:webhookId
 * Receive webhook from external system
 */
router.post(
  '/inbound/:organizationId/:webhookId',
  webhookRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const { organizationId, webhookId } = req.params;

    try {
      // 1. Validate webhook UUID
      if (!validateUUID(webhookId)) {
        res.status(400).json({
          error: 'Invalid webhook UUID format',
        });
        return;
      }

      // 2. Get signature from header
      const signatureHeader = req.get('X-RightFlow-Signature');
      if (!signatureHeader) {
        logger.warn('Webhook received without signature', {
          organizationId,
          webhookId,
          ip: req.ip,
        });

        res.status(401).json({
          error: 'Missing X-RightFlow-Signature header',
        });
        return;
      }

      // 3. Validate payload structure
      const payloadValidation = validatePayload(req.body);
      if (!payloadValidation.valid) {
        res.status(400).json({
          error: payloadValidation.error,
        });
        return;
      }

      // 4. Load webhook from database (with encrypted secret)
      const webhook = await webhookService.getWebhookWithSecret(webhookId);

      if (!webhook) {
        logger.warn('Webhook not found', {
          organizationId,
          webhookId,
          ip: req.ip,
        });

        res.status(404).json({
          error: 'Webhook not found',
        });
        return;
      }

      // 5. Verify webhook belongs to organization (multi-tenant security)
      if (webhook.organizationId !== organizationId) {
        logger.error('Cross-tenant webhook access attempt', {
          requestedOrg: organizationId,
          actualOrg: webhook.organizationId,
          webhookId,
          ip: req.ip,
        });

        res.status(403).json({
          error: 'Webhook does not belong to this organization',
        });
        return;
      }

      // 6. Check webhook status
      if (webhook.status === 'disabled') {
        res.status(403).json({
          error: 'Webhook is disabled',
        });
        return;
      }

      if (webhook.status === 'paused') {
        res.status(403).json({
          error: 'Webhook is paused',
        });
        return;
      }

      // 7. Decrypt secret
      const secret = await webhookService.decryptSecret(webhook.secretEncrypted);

      // 8. Verify HMAC signature
      const payloadString = JSON.stringify(req.body);
      const isValidSignature = webhookService.verifySignature(
        payloadString,
        signatureHeader,
        secret,
      );

      if (!isValidSignature) {
        logger.warn('Invalid webhook signature', {
          organizationId,
          webhookId,
          ip: req.ip,
        });

        res.status(401).json({
          error: 'Invalid signature',
        });
        return;
      }

      // 9. Cache payload in Redis (24h TTL)
      const timestamp = req.body.timestamp || new Date().toISOString();
      const cacheKey = `webhook:payload:${organizationId}:${webhookId}:${timestamp}`;

      // Check payload size before caching (don't cache >1MB payloads)
      const payloadSize = Buffer.byteLength(payloadString, 'utf8');
      if (payloadSize < 1024 * 1024) {
        // < 1MB
        try {
          await redisConnection.setex(
            cacheKey,
            86400, // 24 hours
            payloadString,
          );

          logger.debug('Webhook payload cached', {
            organizationId,
            webhookId,
            cacheKey,
            size: payloadSize,
          });
        } catch (error: any) {
          // Non-fatal: Log error but don't fail request
          logger.error('Failed to cache webhook payload', {
            organizationId,
            webhookId,
            error: error.message,
          });

          // Return 503 if caching is critical
          res.status(503).json({
            error: 'Cache service temporarily unavailable',
          });
          return;
        }
      } else {
        logger.info('Webhook payload too large to cache', {
          organizationId,
          webhookId,
          size: payloadSize,
        });
      }

      // 10. Update webhook last_triggered_at
      await webhookService.updateWebhookHealth(webhookId, true);

      const durationMs = Date.now() - startTime;

      // 11. Log successful reception
      logger.info('Webhook received successfully', {
        organizationId,
        webhookId,
        event: req.body.event,
        durationMs,
        ip: req.ip,
      });

      // 12. Return success response
      res.status(200).json({
        success: true,
        webhookId,
        received: new Date().toISOString(),
        status: 'processed',
      });
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      logger.error('Webhook processing error', {
        organizationId,
        webhookId,
        error: error.message,
        durationMs,
        ip: req.ip,
      });

      // Return generic error (don't leak internal details)
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
);

export default router;
