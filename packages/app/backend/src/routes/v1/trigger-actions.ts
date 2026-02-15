/**
 * Trigger Actions API Routes
 * Provides CRUD operations for trigger actions
 *
 * Endpoints:
 * - GET    /api/v1/triggers/:triggerId/actions          - List actions for trigger
 * - GET    /api/v1/triggers/:triggerId/actions/:id      - Get single action
 * - POST   /api/v1/triggers/:triggerId/actions          - Create new action
 * - PUT    /api/v1/triggers/:triggerId/actions/:id      - Update action
 * - DELETE /api/v1/triggers/:triggerId/actions/:id      - Delete action
 * - POST   /api/v1/triggers/:triggerId/actions/reorder  - Reorder actions
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { TriggerAction, ActionType } from '../../types/event-trigger';
import { authenticateJWT } from '../../middleware/auth';

const router = Router({ mergeParams: true }); // Merge params from parent router

// Apply authentication to all routes (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticateJWT);
}

/**
 * GET /api/v1/triggers/:triggerId/actions
 * List all actions for a trigger
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger exists and belongs to organization
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Get actions sorted by order
    const actions = await query<TriggerAction>(
      `SELECT
        id,
        trigger_id,
        action_type,
        "order",
        config,
        retry_config,
        timeout_ms,
        is_critical,
        created_at,
        updated_at
      FROM trigger_actions
      WHERE trigger_id = $1
      ORDER BY "order" ASC`,
      [triggerId]
    );

    res.json(actions);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/triggers/:triggerId/actions/:id
 * Get a single action by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId, id } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger exists and belongs to organization
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Get action
    const actions = await query<TriggerAction>(
      `SELECT
        id,
        trigger_id,
        action_type,
        "order",
        config,
        retry_config,
        timeout_ms,
        is_critical,
        created_at,
        updated_at
      FROM trigger_actions
      WHERE id = $1 AND trigger_id = $2`,
      [id, triggerId]
    );

    if (actions.length === 0) {
      return res.status(404).json({ error: { message: 'Action not found' } });
    }

    res.json(actions[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/triggers/:triggerId/actions
 * Create a new action
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger exists and belongs to organization
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    const {
      action_type,
      order = 0,
      config,
      retry_config = {
        max_attempts: 3,
        backoff_multiplier: 2,
        initial_delay_ms: 1000,
      },
      timeout_ms = 30000,
      is_critical = false,
    } = req.body;

    // Validation
    if (!action_type) {
      return res.status(400).json({
        error: { message: 'action_type is required' }
      });
    }

    if (!config) {
      return res.status(400).json({
        error: { message: 'config is required' }
      });
    }

    // Validate action_type enum
    const validActionTypes = [
      'send_webhook',
      'send_email',
      'send_sms',
      'update_crm',
      'create_task',
      'trigger_workflow',
      'custom',
    ];

    if (!validActionTypes.includes(action_type)) {
      return res.status(400).json({
        error: { message: `action_type must be one of: ${validActionTypes.join(', ')}` }
      });
    }

    // Create action
    const result = await query<TriggerAction>(
      `INSERT INTO trigger_actions (
        trigger_id,
        action_type,
        "order",
        config,
        retry_config,
        timeout_ms,
        is_critical
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        trigger_id,
        action_type,
        "order",
        config,
        retry_config,
        timeout_ms,
        is_critical,
        created_at,
        updated_at`,
      [
        triggerId,
        action_type,
        order,
        JSON.stringify(config),
        JSON.stringify(retry_config),
        timeout_ms,
        is_critical,
      ]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/triggers/:triggerId/actions/:id
 * Update an existing action
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId, id } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger exists and belongs to organization
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Check if action exists
    const existing = await query(
      'SELECT id FROM trigger_actions WHERE id = $1 AND trigger_id = $2',
      [id, triggerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Action not found' } });
    }

    const {
      action_type,
      order,
      config,
      retry_config,
      timeout_ms,
      is_critical,
    } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (action_type !== undefined) {
      updates.push(`action_type = $${paramIndex}`);
      params.push(action_type);
      paramIndex++;
    }

    if (order !== undefined) {
      updates.push(`"order" = $${paramIndex}`);
      params.push(order);
      paramIndex++;
    }

    if (config !== undefined) {
      updates.push(`config = $${paramIndex}`);
      params.push(JSON.stringify(config));
      paramIndex++;
    }

    if (retry_config !== undefined) {
      updates.push(`retry_config = $${paramIndex}`);
      params.push(JSON.stringify(retry_config));
      paramIndex++;
    }

    if (timeout_ms !== undefined) {
      updates.push(`timeout_ms = $${paramIndex}`);
      params.push(timeout_ms);
      paramIndex++;
    }

    if (is_critical !== undefined) {
      updates.push(`is_critical = $${paramIndex}`);
      params.push(is_critical);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: { message: 'No fields to update' } });
    }

    // Add id and triggerId for WHERE clause
    params.push(id);
    params.push(triggerId);

    const sql = `
      UPDATE trigger_actions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND trigger_id = $${paramIndex + 1}
      RETURNING
        id,
        trigger_id,
        action_type,
        "order",
        config,
        retry_config,
        timeout_ms,
        is_critical,
        created_at,
        updated_at
    `;

    const result = await query<TriggerAction>(sql, params);

    res.json(result[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/triggers/:triggerId/actions/:id
 * Delete an action
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId, id } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger exists and belongs to organization
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Check if action exists
    const existing = await query(
      'SELECT id FROM trigger_actions WHERE id = $1 AND trigger_id = $2',
      [id, triggerId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Action not found' } });
    }

    // Delete action
    await query(
      'DELETE FROM trigger_actions WHERE id = $1 AND trigger_id = $2',
      [id, triggerId]
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/triggers/:triggerId/actions/reorder
 * Reorder actions
 */
router.post('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggerId } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger exists and belongs to organization
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [triggerId, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    const { actions } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({
        error: { message: 'actions array is required' }
      });
    }

    // Update each action's order
    for (const action of actions) {
      await query(
        'UPDATE trigger_actions SET "order" = $1 WHERE id = $2 AND trigger_id = $3',
        [action.order, action.id, triggerId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
