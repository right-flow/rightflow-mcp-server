/**
 * Action Executions API Routes
 * Provides read-only access to execution history
 *
 * Endpoints:
 * - GET /api/v1/triggers/:triggerId/executions        - List executions
 * - GET /api/v1/triggers/:triggerId/executions/stats  - Execution statistics
 * - GET /api/v1/triggers/:triggerId/executions/:id    - Get execution details
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { ActionExecution } from '../../types/event-trigger';
import { authenticateJWT } from '../../middleware/auth';

const router = Router({ mergeParams: true });

// Apply authentication (skip in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticateJWT);
}

/**
 * GET /api/v1/triggers/:triggerId/executions/stats
 * Get execution statistics
 * NOTE: Must be before /:id route
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Get stats
    const stats = await query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM action_executions
      WHERE trigger_id = $1`,
      [triggerId]
    );

    const result = stats[0];
    const total = parseInt(result.total as string);
    const successCount = parseInt(result.success as string);

    res.json({
      total,
      success: successCount,
      failed: parseInt(result.failed as string),
      pending: parseInt(result.pending as string),
      successRate: total > 0 ? (successCount / total) * 100 : 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/triggers/:triggerId/executions
 * List executions
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;
    const organizationId = req.user!.organizationId;

    // Verify trigger
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    let sql = `
      SELECT
        id,
        event_id,
        trigger_id,
        action_id,
        status,
        attempt,
        started_at,
        completed_at,
        response,
        error,
        created_at
      FROM action_executions
      WHERE trigger_id = $1
    `;

    const params: any[] = [triggerId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string));
    params.push(parseInt(offset as string));

    const executions = await query<ActionExecution>(sql, params);

    res.json(executions);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/triggers/:triggerId/executions/:id
 * Get single execution
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId, id } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    const executions = await query<ActionExecution>(
      `SELECT
        id,
        event_id,
        trigger_id,
        action_id,
        status,
        attempt,
        started_at,
        completed_at,
        response,
        error,
        created_at
      FROM action_executions
      WHERE id = $1 AND trigger_id = $2`,
      [id, triggerId]
    );

    if (executions.length === 0) {
      return res.status(404).json({ error: { message: 'Execution not found' } });
    }

    res.json(executions[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
