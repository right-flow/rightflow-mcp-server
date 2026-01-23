import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { query } from '../../config/database';
import { validateRequest } from '../../utils/validation';
import {
  ValidationError,
  NotFoundError,
  OrganizationMismatchError,
  ConflictError,
} from '../../utils/errors';
import logger from '../../utils/logger';

const router = express.Router();

// Apply authentication + user sync to all routes (manager+ only for webhooks)
router.use(authenticateJWT);
router.use(syncUser);
router.use(requireRole('manager'));

// ============================================================================
// Validation Schemas
// ============================================================================

const webhookEventSchema = z.enum([
  'submission.created',
  'submission.updated',
  'submission.approved',
  'submission.rejected',
  'form.created',
  'form.updated',
  'form.deleted',
]);

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(webhookEventSchema).min(1),
  enabled: z.boolean().default(true),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(webhookEventSchema).min(1).optional(),
  enabled: z.boolean().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/webhooks
 * List all webhooks
 */
router.get('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    const webhooks = await query(
      `
      SELECT
        id,
        url,
        events,
        enabled,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        (SELECT COUNT(*) FROM webhook_events WHERE webhook_id = webhooks.id) AS "totalEvents",
        (SELECT COUNT(*) FROM webhook_events WHERE webhook_id = webhooks.id AND status = 'delivered') AS "deliveredEvents",
        (SELECT COUNT(*) FROM webhook_events WHERE webhook_id = webhooks.id AND status = 'failed') AS "failedEvents"
      FROM webhooks
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `,
      [organizationId],
    );

    res.json({ data: webhooks });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/webhooks
 * Create new webhook
 */
router.post('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Validate request body
    const webhookData = validateRequest(createWebhookSchema, req.body);

    // Check if URL already exists for this org
    const existing = await query(
      'SELECT id FROM webhooks WHERE organization_id = $1 AND url = $2 AND deleted_at IS NULL',
      [organizationId, webhookData.url],
    );

    if (existing.length > 0) {
      throw new ConflictError(`כתובת Webhook כבר קיימת: ${webhookData.url}`);
    }

    // Generate secret for HMAC signatures
    const secret = crypto.randomBytes(32).toString('hex'); // 64 char hex string

    // Create webhook
    const [webhook] = await query(
      `
      INSERT INTO webhooks (
        organization_id,
        url,
        events,
        secret,
        enabled
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        url,
        events,
        secret,
        enabled,
        created_at AS "createdAt"
    `,
      [
        organizationId,
        webhookData.url,
        webhookData.events,
        secret,
        webhookData.enabled,
      ],
    );

    logger.info('Webhook created', {
      webhookId: webhook.id,
      url: webhookData.url,
      events: webhookData.events,
    });

    res.status(201).json(webhook);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/webhooks/:id
 * Get webhook by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    const webhooks = await query(
      `
      SELECT
        id,
        organization_id AS "organizationId",
        url,
        events,
        secret,
        enabled,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM webhooks
      WHERE id = $1 AND deleted_at IS NULL
    `,
      [id],
    );

    if (webhooks.length === 0) {
      throw new NotFoundError('Webhook', id);
    }

    const webhook = webhooks[0];

    // Verify webhook belongs to user's org
    if (webhook.organizationId !== organizationId) {
      throw new OrganizationMismatchError();
    }

    res.json(webhook);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/webhooks/:id/events
 * Get webhook delivery log
 */
router.get('/:id/events', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    // Verify webhook belongs to user's org
    const webhooks = await query(
      'SELECT organization_id FROM webhooks WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (webhooks.length === 0) {
      throw new NotFoundError('Webhook', id);
    }

    if (webhooks[0].organization_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // Get delivery log
    const events = await query(
      `
      SELECT
        id,
        event_id AS "eventId",
        event_type AS "eventType",
        status,
        attempts,
        last_attempt_at AS "lastAttemptAt",
        last_error AS "lastError",
        created_at AS "createdAt"
      FROM webhook_events
      WHERE webhook_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [id, limit],
    );

    res.json({ data: events });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/webhooks/:id
 * Update webhook
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    // Validate request body
    const updates = validateRequest(updateWebhookSchema, req.body);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('לא סופקו שדות לעדכון');
    }

    // Verify webhook exists and belongs to organization
    const existing = await query(
      'SELECT organization_id FROM webhooks WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundError('Webhook', id);
    }

    if (existing[0].organization_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // If updating URL, check for conflicts
    if (updates.url) {
      const conflicts = await query(
        'SELECT id FROM webhooks WHERE organization_id = $1 AND url = $2 AND id != $3 AND deleted_at IS NULL',
        [organizationId, updates.url, id],
      );

      if (conflicts.length > 0) {
        throw new ConflictError(`כתובת Webhook כבר קיימת: ${updates.url}`);
      }
    }

    // Build dynamic UPDATE query
    const setClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.url) {
      setClause.push(`url = $${paramIndex++}`);
      params.push(updates.url);
    }

    if (updates.events) {
      setClause.push(`events = $${paramIndex++}`);
      params.push(updates.events);
    }

    if (updates.enabled !== undefined) {
      setClause.push(`enabled = $${paramIndex++}`);
      params.push(updates.enabled);
    }

    params.push(id);

    // Update webhook
    const [webhook] = await query(
      `
      UPDATE webhooks
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING
        id,
        url,
        events,
        enabled,
        updated_at AS "updatedAt"
    `,
      params,
    );

    logger.info('Webhook updated', { webhookId: id });

    res.json(webhook);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/webhooks/:id
 * Delete webhook
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    // Verify webhook exists and belongs to organization
    const existing = await query(
      'SELECT organization_id FROM webhooks WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundError('Webhook', id);
    }

    if (existing[0].organization_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // Soft delete
    await query('UPDATE webhooks SET deleted_at = NOW() WHERE id = $1', [id]);

    logger.info('Webhook deleted', { webhookId: id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
