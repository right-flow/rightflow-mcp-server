/**
 * Dead Letter Queue API Routes
 * Provides access to failed actions and retry mechanisms
 *
 * Endpoints:
 * - GET  /api/v1/dlq              - List DLQ entries
 * - GET  /api/v1/dlq/stats        - DLQ statistics
 * - GET  /api/v1/dlq/:id          - Get single DLQ entry details
 * - POST /api/v1/dlq/:id/retry    - Retry single entry
 * - POST /api/v1/dlq/:id/retry-edited - Retry with modified payload
 * - POST /api/v1/dlq/:id/ignore   - Mark as ignored
 * - POST /api/v1/dlq/:id/resolve  - Mark as manually resolved
 * - POST /api/v1/dlq/bulk-retry   - Bulk retry entries
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { DeadLetterQueueEntry } from '../../types/event-trigger';
import { authenticateJWT } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';

const router = Router();

// Apply authentication and user sync (skip in test)
// syncUser converts Clerk org ID to internal UUID in req.user.organizationId
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticateJWT);
  router.use(syncUser);
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
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'ignored' THEN 1 ELSE 0 END) as ignored
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
      ignored: parseInt(result.ignored as string) || 0,
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
 * GET /api/v1/dlq/:id
 * Get single DLQ entry details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const entries = await query(
      `SELECT
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
        dlq.resolved_by,
        dlq.resolution_notes,
        dlq.created_at,
        dlq.updated_at,
        et.name as trigger_name,
        ta.action_type
      FROM dead_letter_queue dlq
      JOIN events e ON dlq.event_id = e.id
      LEFT JOIN event_triggers et ON dlq.trigger_id = et.id
      LEFT JOIN trigger_actions ta ON dlq.action_id = ta.id
      WHERE dlq.id = $1 AND e.organization_id = $2`,
      [id, organizationId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: { message: 'DLQ entry not found' } });
    }

    const entry = entries[0];

    res.json({
      id: entry.id,
      eventId: entry.event_id,
      triggerId: entry.trigger_id,
      triggerName: entry.trigger_name,
      actionId: entry.action_id,
      actionType: entry.action_type,
      failureReason: entry.failure_reason,
      failureCount: entry.failure_count,
      errorCode: entry.last_error?.code,
      errorMessage: entry.last_error?.message,
      errorDetails: entry.last_error,
      originalPayload: {
        event: entry.event_snapshot,
        action: entry.action_snapshot,
      },
      status: entry.status,
      attemptsMade: entry.failure_count,
      firstFailureAt: entry.created_at,
      lastFailureAt: entry.updated_at,
      resolvedBy: entry.resolved_by,
      resolvedAt: entry.resolved_at,
      resolutionNotes: entry.resolution_notes,
    });
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
 * POST /api/v1/dlq/:id/retry-edited
 * Retry with modified payload
 */
router.post('/:id/retry-edited', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { modifiedPayload } = req.body;
    const organizationId = req.user!.organizationId;

    if (!modifiedPayload) {
      return res.status(400).json({
        error: { message: 'modifiedPayload is required' }
      });
    }

    // Verify entry exists and belongs to organization
    const entries = await query(
      `SELECT dlq.id, dlq.event_snapshot, dlq.action_snapshot
       FROM dead_letter_queue dlq
       JOIN events e ON dlq.event_id = e.id
       WHERE dlq.id = $1 AND e.organization_id = $2`,
      [id, organizationId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: { message: 'DLQ entry not found' } });
    }

    const entry = entries[0];

    // Merge modified payload with existing snapshots
    const updatedEventSnapshot = modifiedPayload.eventData
      ? { ...entry.event_snapshot, data: { ...entry.event_snapshot?.data, ...modifiedPayload.eventData } }
      : entry.event_snapshot;

    const updatedActionSnapshot = modifiedPayload.actionConfig
      ? { ...entry.action_snapshot, config: { ...entry.action_snapshot?.config, ...modifiedPayload.actionConfig } }
      : entry.action_snapshot;

    // Update entry with modified payload and mark for retry
    await query(
      `UPDATE dead_letter_queue
       SET status = 'processing',
           event_snapshot = $1,
           action_snapshot = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(updatedEventSnapshot), JSON.stringify(updatedActionSnapshot), id]
    );

    res.json({
      id,
      status: 'processing',
      retryScheduledAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/dlq/:id/ignore
 * Mark DLQ entry as ignored
 */
router.post('/:id/ignore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

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

    // Update status to ignored
    await query(
      `UPDATE dead_letter_queue
       SET status = 'ignored',
           resolved_by = $1,
           resolved_at = NOW(),
           resolution_notes = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [userId, notes || 'Marked as ignored', id]
    );

    res.json({
      id,
      status: 'ignored',
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/dlq/:id/resolve
 * Mark DLQ entry as manually resolved
 */
router.post('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

    if (!notes) {
      return res.status(400).json({
        error: { message: 'notes is required for manual resolution' }
      });
    }

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

    // Update status to resolved
    await query(
      `UPDATE dead_letter_queue
       SET status = 'resolved',
           resolved_by = $1,
           resolved_at = NOW(),
           resolution_notes = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [userId, notes, id]
    );

    res.json({
      id,
      status: 'resolved',
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
    });
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
