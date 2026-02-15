/**
 * Events API Routes
 * Provides audit log and event listing endpoints
 *
 * Endpoints:
 * - GET /api/v1/events        - List events (audit log)
 * - GET /api/v1/events/types  - Get available event types
 * - GET /api/v1/events/:id    - Get event details
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { authenticateJWT } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';

const router = Router();

// Apply authentication (skip in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticateJWT);
  router.use(syncUser);
}

/**
 * GET /api/v1/events/types
 * Get available event types with metadata
 * NOTE: Must be before /:id route
 */
router.get('/types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventTypes = [
      {
        type: 'form.submitted',
        nameEn: 'Form Submitted',
        nameHe: 'טופס נשלח',
        descriptionEn: 'Triggered when a form is submitted',
        descriptionHe: 'מופעל כאשר טופס נשלח',
        level: 'organization',
        category: 'forms',
        isConfigurable: true,
      },
      {
        type: 'form.approved',
        nameEn: 'Form Approved',
        nameHe: 'טופס אושר',
        descriptionEn: 'Triggered when a form is approved',
        descriptionHe: 'מופעל כאשר טופס מאושר',
        level: 'organization',
        category: 'forms',
        isConfigurable: true,
      },
      {
        type: 'form.rejected',
        nameEn: 'Form Rejected',
        nameHe: 'טופס נדחה',
        descriptionEn: 'Triggered when a form is rejected',
        descriptionHe: 'מופעל כאשר טופס נדחה',
        level: 'organization',
        category: 'forms',
        isConfigurable: true,
      },
      {
        type: 'user.created',
        nameEn: 'User Created',
        nameHe: 'משתמש נוצר',
        descriptionEn: 'Triggered when a new user is created',
        descriptionHe: 'מופעל כאשר משתמש חדש נוצר',
        level: 'organization',
        category: 'users',
        isConfigurable: true,
      },
      {
        type: 'user.updated',
        nameEn: 'User Updated',
        nameHe: 'משתמש עודכן',
        descriptionEn: 'Triggered when a user is updated',
        descriptionHe: 'מופעל כאשר משתמש מעודכן',
        level: 'organization',
        category: 'users',
        isConfigurable: true,
      },
      {
        type: 'user.deleted',
        nameEn: 'User Deleted',
        nameHe: 'משתמש נמחק',
        descriptionEn: 'Triggered when a user is deleted',
        descriptionHe: 'מופעל כאשר משתמש נמחק',
        level: 'organization',
        category: 'users',
        isConfigurable: true,
      },
      {
        type: 'workflow.started',
        nameEn: 'Workflow Started',
        nameHe: 'תהליך התחיל',
        descriptionEn: 'Triggered when a workflow starts',
        descriptionHe: 'מופעל כאשר תהליך מתחיל',
        level: 'organization',
        category: 'workflows',
        isConfigurable: true,
      },
      {
        type: 'workflow.completed',
        nameEn: 'Workflow Completed',
        nameHe: 'תהליך הושלם',
        descriptionEn: 'Triggered when a workflow completes',
        descriptionHe: 'מופעל כאשר תהליך מסתיים',
        level: 'organization',
        category: 'workflows',
        isConfigurable: true,
      },
      {
        type: 'workflow.failed',
        nameEn: 'Workflow Failed',
        nameHe: 'תהליך נכשל',
        descriptionEn: 'Triggered when a workflow fails',
        descriptionHe: 'מופעל כאשר תהליך נכשל',
        level: 'organization',
        category: 'workflows',
        isConfigurable: true,
      },
      {
        type: 'integration.sync_started',
        nameEn: 'Integration Sync Started',
        nameHe: 'סנכרון אינטגרציה התחיל',
        descriptionEn: 'Triggered when integration sync starts',
        descriptionHe: 'מופעל כאשר סנכרון אינטגרציה מתחיל',
        level: 'organization',
        category: 'integrations',
        isConfigurable: true,
      },
      {
        type: 'integration.sync_completed',
        nameEn: 'Integration Sync Completed',
        nameHe: 'סנכרון אינטגרציה הושלם',
        descriptionEn: 'Triggered when integration sync completes',
        descriptionHe: 'מופעל כאשר סנכרון אינטגרציה מסתיים',
        level: 'organization',
        category: 'integrations',
        isConfigurable: true,
      },
      {
        type: 'integration.sync_failed',
        nameEn: 'Integration Sync Failed',
        nameHe: 'סנכרון אינטגרציה נכשל',
        descriptionEn: 'Triggered when integration sync fails',
        descriptionHe: 'מופעל כאשר סנכרון אינטגרציה נכשל',
        level: 'organization',
        category: 'integrations',
        isConfigurable: true,
      },
    ];

    res.json({ eventTypes });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/events
 * List events (audit log)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      level,
      eventType,
      sourceType,
      sourceId,
      from,
      to,
      limit = '20',
      offset = '0',
    } = req.query;
    const organizationId = req.user!.organizationId;

    let sql = `
      SELECT
        id,
        organization_id,
        level,
        event_type,
        source_type,
        source_id,
        data,
        metadata,
        occurred_at
      FROM events
      WHERE organization_id = $1
    `;

    const params: any[] = [organizationId];
    let paramIndex = 2;

    // Filter by level
    if (level) {
      sql += ` AND level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }

    // Filter by event_type
    if (eventType) {
      sql += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    // Filter by source_type
    if (sourceType) {
      sql += ` AND source_type = $${paramIndex}`;
      params.push(sourceType);
      paramIndex++;
    }

    // Filter by source_id
    if (sourceId) {
      sql += ` AND source_id = $${paramIndex}`;
      params.push(sourceId);
      paramIndex++;
    }

    // Filter by date range
    if (from) {
      sql += ` AND occurred_at >= $${paramIndex}`;
      params.push(new Date(from as string));
      paramIndex++;
    }

    if (to) {
      sql += ` AND occurred_at <= $${paramIndex}`;
      params.push(new Date(to as string));
      paramIndex++;
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.total || '0');

    // Add pagination
    sql += ` ORDER BY occurred_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string));
    params.push(parseInt(offset as string));

    const events = await query(sql, params);

    res.json({
      data: events,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/events/:id
 * Get event details with matched triggers
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Get event
    const events = await query(
      `SELECT
        id,
        organization_id,
        level,
        event_type,
        source_type,
        source_id,
        data,
        metadata,
        processing_mode,
        occurred_at
      FROM events
      WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: { message: 'Event not found' } });
    }

    const event = events[0];

    // Get triggers that were matched for this event
    const triggersMatched = await query(
      `SELECT
        ae.trigger_id,
        et.name as trigger_name,
        CASE WHEN ae.id IS NOT NULL THEN true ELSE false END as executed,
        ae.status
      FROM action_executions ae
      JOIN event_triggers et ON ae.trigger_id = et.id
      WHERE ae.event_id = $1
      GROUP BY ae.trigger_id, et.name, ae.id, ae.status`,
      [id]
    );

    res.json({
      ...event,
      triggersMatched: triggersMatched.map((t: any) => ({
        triggerId: t.trigger_id,
        triggerName: t.trigger_name,
        executed: t.executed,
        status: t.status,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
