/**
 * Dead Letter Queue API Routes
 * Provides access to failed actions and retry mechanisms
 *
 * Endpoints:
 * - GET  /api/v1/dlq              - List DLQ entries
 * - GET  /api/v1/dlq/stats        - DLQ statistics
 * - POST /api/v1/dlq/:id/retry    - Retry single entry
 * - POST /api/v1/dlq/bulk-retry   - Bulk retry entries
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { DeadLetterQueueEntry } from '../../types/event-trigger';
import { authenticateJWT } from '../../middleware/auth';

const router = Router();

// Apply authentication (skip in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticateJWT);
}

/**
 * GET /api/v1/dlq/stats
 * Get DLQ statistics
 * NOTE: Must be before /:id route
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get organization's events to filter DLQ
    const stats = await query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM dead_letter_queue
      WHERE event_id IN (SELECT id FROM events WHERE organization_id = $1)`,
      [organizationId]
    );

    const result = stats[0];

    res.json({
      total: parseInt(result.total as string) || 0,
      pending: parseInt(result.pending as string) || 0,
      processing: parseInt(result.processing as string) || 0,
      resolved: parseInt(result.resolved as string) || 0,
      failed: parseInt(result.failed as string) || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/dlq
 * List DLQ entries
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const organizationId = req.user!.organizationId;

    let sql = `
      SELECT
        dlq.id,
        dlq.event_id,
        dlq.trigger_id,
        dlq.action_id,
        dlq.failure_reason,
        dlq.failure_count,
        dlq.last_error,
        dlq.event_snapshot,
        dlq.action_snapshot,
        dlq.status,
        dlq.retry_after,
        dlq.resolved_at,
        dlq.created_at,
        dlq.updated_at
      FROM dead_letter_queue dlq
      JOIN events e ON dlq.event_id = e.id
      WHERE e.organization_id = $1
    `;

    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND dlq.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ' ORDER BY dlq.created_at DESC';

    const entries = await query<DeadLetterQueueEntry>(sql, params);

    res.json(entries);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/dlq/:id/retry
 * Retry single DLQ entry
 */
router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify entry exists and belongs to organization
    const entries = await query(
      `SELECT dlq.id
       FROM dead_letter_queue dlq
       JOIN events e ON dlq.event_id = e.id
       WHERE dlq.id = $1 AND e.organization_id = $2`,
      [id, organizationId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: { message: 'DLQ entry not found' } });
    }

    // Update status to processing
    // Note: Actual retry logic would be handled by a background worker
    await query(
      `UPDATE dead_letter_queue
       SET status = 'processing', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Retry initiated' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/dlq/bulk-retry
 * Bulk retry DLQ entries
 */
router.post('/bulk-retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    const organizationId = req.user!.organizationId;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        error: { message: 'ids array is required' }
      });
    }

    let succeeded = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        // Verify entry belongs to organization
        const entries = await query(
          `SELECT dlq.id
           FROM dead_letter_queue dlq
           JOIN events e ON dlq.event_id = e.id
           WHERE dlq.id = $1 AND e.organization_id = $2`,
          [id, organizationId]
        );

        if (entries.length > 0) {
          await query(
            `UPDATE dead_letter_queue
             SET status = 'processing', updated_at = NOW()
             WHERE id = $1`,
            [id]
          );
          succeeded++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    res.json({ succeeded, failed });
  } catch (error) {
    next(error);
  }
});

export default router;
