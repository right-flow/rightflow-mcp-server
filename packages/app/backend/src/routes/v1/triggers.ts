/**
 * Event Triggers API Routes
 * Provides CRUD operations for managing event triggers
 *
 * Endpoints:
 * - GET    /api/v1/triggers          - List triggers with filters
 * - GET    /api/v1/triggers/:id      - Get single trigger with actions
 * - POST   /api/v1/triggers          - Create new trigger
 * - PUT    /api/v1/triggers/:id      - Update trigger
 * - DELETE /api/v1/triggers/:id      - Delete trigger
 * - PATCH  /api/v1/triggers/:id/toggle - Toggle trigger status
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { EventTrigger, TriggerCondition, EventType, TriggerStatus } from '../../types/event-trigger';
import { authenticateJWT } from '../../middleware/auth';
import triggerActionsRouter from './trigger-actions';
import executionsRouter from './executions';

const router = Router();

// Apply authentication to all routes (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticateJWT);
}

// Nested routes for trigger actions and executions
router.use('/:triggerId/actions', triggerActionsRouter);
router.use('/:triggerId/executions', executionsRouter);

/**
 * GET /api/v1/triggers
 * List all triggers for the authenticated user's organization
 * Query params:
 * - status: Filter by status (active, inactive, draft)
 * - event_type: Filter by event type
 * - search: Search by name (supports Hebrew)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, event_type, search } = req.query;
    const organizationId = req.user!.organizationId;

    let sql = `
      SELECT
        id,
        organization_id,
        name,
        level,
        event_type,
        status,
        scope,
        form_ids,
        conditions,
        priority,
        error_handling,
        created_by,
        created_at,
        updated_at
      FROM event_triggers
      WHERE organization_id = $1
    `;

    const params: any[] = [organizationId];
    let paramIndex = 2;

    // Filter by status
    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by event_type
    if (event_type) {
      sql += ` AND event_type = $${paramIndex}`;
      params.push(event_type);
      paramIndex++;
    }

    // Search by name (case-insensitive, supports Hebrew)
    if (search && typeof search === 'string') {
      sql += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Sort by priority descending (higher priority first)
    sql += ' ORDER BY priority DESC, created_at DESC';

    const triggers = await query<EventTrigger>(sql, params);

    res.json(triggers);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/triggers/:id
 * Get a single trigger by ID with its actions
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Get trigger
    const triggers = await query<EventTrigger>(
      `SELECT
        id,
        organization_id,
        name,
        level,
        event_type,
        status,
        scope,
        form_ids,
        conditions,
        priority,
        error_handling,
        created_by,
        created_at,
        updated_at
      FROM event_triggers
      WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    const trigger = triggers[0];

    // Get associated actions
    const actions = await query(
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
      [id]
    );

    const triggerWithActions = {
      ...trigger,
      actions,
    };

    res.json(triggerWithActions);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/triggers
 * Create a new trigger
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

    const {
      name,
      event_type,
      status = 'active',
      level = 'user_defined',
      scope = 'all_forms',
      form_ids = [],
      conditions = [],
      priority = 0,
      error_handling = 'stop_on_first_error',
    } = req.body;

    // Validation
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: { message: 'name is required and must be a string' }
      });
    }

    if (!event_type) {
      return res.status(400).json({
        error: { message: 'event_type is required' }
      });
    }

    // Validate event_type enum
    const validEventTypes = [
      'form.submitted',
      'form.approved',
      'form.rejected',
      'user.created',
      'user.updated',
      'user.deleted',
      'workflow.started',
      'workflow.completed',
      'workflow.failed',
      'integration.sync_started',
      'integration.sync_completed',
      'integration.sync_failed',
    ];

    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        error: { message: `event_type must be one of: ${validEventTypes.join(', ')}` }
      });
    }

    // Create trigger
    const result = await query<EventTrigger>(
      `INSERT INTO event_triggers (
        organization_id,
        name,
        level,
        event_type,
        status,
        scope,
        form_ids,
        conditions,
        priority,
        error_handling,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        organization_id,
        name,
        level,
        event_type,
        status,
        scope,
        form_ids,
        conditions,
        priority,
        error_handling,
        created_by,
        created_at,
        updated_at`,
      [
        organizationId,
        name,
        level,
        event_type,
        status,
        scope,
        form_ids,
        JSON.stringify(conditions),
        priority,
        error_handling,
        userId,
      ]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/triggers/:id
 * Update an existing trigger
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Check if trigger exists and belongs to organization
    const existing = await query<EventTrigger>(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    const {
      name,
      event_type,
      status,
      scope,
      form_ids,
      conditions,
      priority,
      error_handling,
    } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (event_type !== undefined) {
      updates.push(`event_type = $${paramIndex}`);
      params.push(event_type);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (scope !== undefined) {
      updates.push(`scope = $${paramIndex}`);
      params.push(scope);
      paramIndex++;
    }

    if (form_ids !== undefined) {
      updates.push(`form_ids = $${paramIndex}`);
      params.push(form_ids);
      paramIndex++;
    }

    if (conditions !== undefined) {
      updates.push(`conditions = $${paramIndex}`);
      params.push(JSON.stringify(conditions));
      paramIndex++;
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (error_handling !== undefined) {
      updates.push(`error_handling = $${paramIndex}`);
      params.push(error_handling);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: { message: 'No fields to update' } });
    }

    // Add id and organizationId for WHERE clause
    params.push(id);
    params.push(organizationId);

    const sql = `
      UPDATE event_triggers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
      RETURNING
        id,
        organization_id,
        name,
        level,
        event_type,
        status,
        scope,
        form_ids,
        conditions,
        priority,
        error_handling,
        created_by,
        created_at,
        updated_at
    `;

    const result = await query<EventTrigger>(sql, params);

    res.json(result[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/triggers/:id
 * Delete a trigger (cascades to actions via FK)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Check if trigger exists and belongs to organization
    const existing = await query<EventTrigger>(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Delete trigger (cascades to actions)
    await query(
      'DELETE FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/triggers/:id/toggle
 * Toggle trigger status between active and inactive
 */
router.patch('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Get current status
    const current = await query<EventTrigger>(
      'SELECT status FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (current.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Toggle status
    const newStatus = current[0].status === 'active' ? 'inactive' : 'active';

    const result = await query<EventTrigger>(
      `UPDATE event_triggers
       SET status = $1
       WHERE id = $2 AND organization_id = $3
       RETURNING
        id,
        organization_id,
        name,
        level,
        event_type,
        status,
        scope,
        form_ids,
        conditions,
        priority,
        error_handling,
        created_by,
        created_at,
        updated_at`,
      [newStatus, id, organizationId]
    );

    res.json(result[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
