/**
 * Event Triggers API Routes
 * Provides CRUD operations for managing event triggers
 *
 * Endpoints:
 * - GET    /api/v1/triggers             - List triggers with filters
 * - GET    /api/v1/triggers/templates   - Get trigger templates
 * - GET    /api/v1/triggers/export      - Export triggers as JSON
 * - POST   /api/v1/triggers/import      - Import triggers from JSON
 * - GET    /api/v1/triggers/:id         - Get single trigger with actions
 * - POST   /api/v1/triggers             - Create new trigger
 * - PUT    /api/v1/triggers/:id         - Update trigger
 * - DELETE /api/v1/triggers/:id         - Delete trigger
 * - PATCH  /api/v1/triggers/:id/toggle  - Toggle trigger status
 * - POST   /api/v1/triggers/:id/test    - Test trigger with sample data
 * - GET    /api/v1/triggers/:id/history - Get execution history
 * - GET    /api/v1/triggers/:id/versions - Get version history
 * - POST   /api/v1/triggers/:id/restore - Restore previous version
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { EventTrigger, TriggerCondition, EventType, TriggerStatus } from '../../types/event-trigger';
import { authenticateJWT } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import triggerActionsRouter from './trigger-actions';
import executionsRouter from './executions';

const router = Router();

// Apply authentication and user sync to all routes (skip in test environment)
// syncUser converts Clerk org ID to internal UUID in req.user.organizationId
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticateJWT);
  router.use(syncUser);
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
 * GET /api/v1/triggers/templates
 * Get trigger templates
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search } = req.query;

    // Built-in templates
    let templates = [
      {
        id: 'template-form-webhook',
        name: 'Form Submission Webhook',
        nameHe: 'Webhook לשליחת טופס',
        description: 'Send a webhook when a form is submitted',
        descriptionHe: 'שליחת webhook כאשר טופס נשלח',
        category: 'forms',
        eventType: 'form.submitted',
        thumbnail: null,
        defaultActions: [
          {
            actionType: 'send_webhook',
            actionConfig: { url: '', method: 'POST', headers: {} },
            executionOrder: 1,
            executionMode: 'sequential',
          },
        ],
        popularity: 100,
      },
      {
        id: 'template-form-email',
        name: 'Form Submission Email',
        nameHe: 'אימייל לשליחת טופס',
        description: 'Send an email notification when a form is submitted',
        descriptionHe: 'שליחת אימייל כאשר טופס נשלח',
        category: 'forms',
        eventType: 'form.submitted',
        thumbnail: null,
        defaultActions: [
          {
            actionType: 'send_email',
            actionConfig: { to: '', subject: 'New Form Submission', body: '' },
            executionOrder: 1,
            executionMode: 'sequential',
          },
        ],
        popularity: 95,
      },
      {
        id: 'template-approval-notification',
        name: 'Approval Notification',
        nameHe: 'התראת אישור',
        description: 'Notify when a form is approved',
        descriptionHe: 'התראה כאשר טופס מאושר',
        category: 'forms',
        eventType: 'form.approved',
        thumbnail: null,
        defaultActions: [
          {
            actionType: 'send_email',
            actionConfig: { to: '', subject: 'Form Approved', body: '' },
            executionOrder: 1,
            executionMode: 'sequential',
          },
        ],
        popularity: 85,
      },
      {
        id: 'template-user-welcome',
        name: 'Welcome New User',
        nameHe: 'ברוכים הבאים למשתמש חדש',
        description: 'Send welcome email to new users',
        descriptionHe: 'שליחת אימייל ברוכים הבאים למשתמשים חדשים',
        category: 'users',
        eventType: 'user.created',
        thumbnail: null,
        defaultActions: [
          {
            actionType: 'send_email',
            actionConfig: { to: '{{user.email}}', subject: 'Welcome!', body: '' },
            executionOrder: 1,
            executionMode: 'sequential',
          },
        ],
        popularity: 80,
      },
      {
        id: 'template-crm-sync',
        name: 'CRM Sync on Submission',
        nameHe: 'סנכרון CRM בשליחה',
        description: 'Sync form data to CRM on submission',
        descriptionHe: 'סנכרון נתוני טופס ל-CRM בשליחה',
        category: 'integrations',
        eventType: 'form.submitted',
        thumbnail: null,
        defaultActions: [
          {
            actionType: 'update_crm',
            actionConfig: { crmType: '', operation: 'create', entityType: 'lead' },
            executionOrder: 1,
            executionMode: 'sequential',
          },
        ],
        popularity: 75,
      },
    ];

    // Filter by category
    if (category && typeof category === 'string') {
      templates = templates.filter(t => t.category === category);
    }

    // Filter by search
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      templates = templates.filter(
        t =>
          t.name.toLowerCase().includes(searchLower) ||
          t.nameHe.includes(search) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.descriptionHe.includes(search)
      );
    }

    // Sort by popularity
    templates.sort((a, b) => b.popularity - a.popularity);

    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/triggers/export
 * Export triggers as JSON
 */
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.query;
    const organizationId = req.user!.organizationId;

    let sql = `
      SELECT
        id,
        name,
        level,
        event_type,
        status,
        scope,
        form_ids,
        conditions,
        priority,
        error_handling
      FROM event_triggers
      WHERE organization_id = $1
    `;
    const params: any[] = [organizationId];

    // Filter by specific IDs if provided
    if (ids && typeof ids === 'string') {
      const idArray = ids.split(',').filter(id => id.trim());
      if (idArray.length > 0) {
        sql += ` AND id = ANY($2)`;
        params.push(idArray);
      }
    }

    const triggers = await query<EventTrigger>(sql, params);

    // Get actions for each trigger
    const triggersWithActions = await Promise.all(
      triggers.map(async (trigger) => {
        const actions = await query(
          `SELECT
            action_type,
            "order",
            config,
            retry_config,
            timeout_ms,
            is_critical
          FROM trigger_actions
          WHERE trigger_id = $1
          ORDER BY "order" ASC`,
          [trigger.id]
        );
        return { ...trigger, actions };
      })
    );

    res.json({
      triggers: triggersWithActions,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/triggers/import
 * Import triggers from JSON
 */
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { triggers, mode = 'merge' } = req.body;
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

    if (!triggers || !Array.isArray(triggers)) {
      return res.status(400).json({
        error: { message: 'triggers array is required' }
      });
    }

    let imported = 0;
    let skipped = 0;
    const errors: { name: string; error: string }[] = [];

    for (const triggerData of triggers) {
      try {
        // Check if trigger with same name exists
        const existing = await query(
          'SELECT id FROM event_triggers WHERE organization_id = $1 AND name = $2',
          [organizationId, triggerData.name]
        );

        if (existing.length > 0) {
          if (mode === 'replace') {
            // Delete existing trigger (cascades to actions)
            await query('DELETE FROM event_triggers WHERE id = $1', [existing[0].id]);
          } else {
            // Skip in merge mode
            skipped++;
            continue;
          }
        }

        // Create new trigger
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
          RETURNING id`,
          [
            organizationId,
            triggerData.name,
            triggerData.level || 'user_defined',
            triggerData.event_type,
            'inactive', // Import as inactive for safety
            triggerData.scope || 'all_forms',
            triggerData.form_ids || [],
            JSON.stringify(triggerData.conditions || []),
            triggerData.priority || 0,
            triggerData.error_handling || 'stop_on_first_error',
            userId,
          ]
        );

        const newTriggerId = result[0].id;

        // Import actions
        if (triggerData.actions && Array.isArray(triggerData.actions)) {
          for (const action of triggerData.actions) {
            await query(
              `INSERT INTO trigger_actions (
                trigger_id,
                action_type,
                "order",
                config,
                retry_config,
                timeout_ms,
                is_critical
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                newTriggerId,
                action.action_type,
                action.order || 0,
                JSON.stringify(action.config || {}),
                JSON.stringify(action.retry_config || { max_attempts: 3 }),
                action.timeout_ms || 30000,
                action.is_critical || false,
              ]
            );
          }
        }

        imported++;
      } catch (error: any) {
        errors.push({
          name: triggerData.name || 'Unknown',
          error: error.message,
        });
      }
    }

    res.json({ imported, skipped, errors });
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

    // If trying to activate, check if trigger has at least one action
    if (newStatus === 'active') {
      const actions = await query(
        'SELECT COUNT(*) as count FROM trigger_actions WHERE trigger_id = $1',
        [id]
      );

      if (parseInt(actions[0]?.count || '0') === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_ACTIONS',
            message: 'לא ניתן להפעיל טריגר ללא פעולות. יש להוסיף לפחות פעולה אחת.',
            messageEn: 'Cannot activate trigger without actions. Please add at least one action.',
          }
        });
      }
    }

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

/**
 * POST /api/v1/triggers/:id/test
 * Test trigger with sample event data
 */
router.post('/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { eventData } = req.body;
    const organizationId = req.user!.organizationId;

    // Get trigger
    const triggers = await query<EventTrigger>(
      `SELECT * FROM event_triggers WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    const trigger = triggers[0];

    // Evaluate conditions
    const conditionsEvaluated: {
      field: string;
      operator: string;
      expected: any;
      actual: any;
      result: boolean;
    }[] = [];

    let matched = true;
    const conditions = trigger.conditions || [];

    for (const condition of conditions) {
      const actualValue = getNestedValue(eventData || {}, condition.field);
      let result = false;

      switch (condition.operator) {
        case 'equals':
          result = actualValue === condition.value;
          break;
        case 'not_equals':
          result = actualValue !== condition.value;
          break;
        case 'contains':
          result = String(actualValue || '').includes(String(condition.value || ''));
          break;
        case 'not_contains':
          result = !String(actualValue || '').includes(String(condition.value || ''));
          break;
        case 'starts_with':
          result = String(actualValue || '').startsWith(String(condition.value || ''));
          break;
        case 'ends_with':
          result = String(actualValue || '').endsWith(String(condition.value || ''));
          break;
        case 'greater_than':
          result = Number(actualValue) > Number(condition.value);
          break;
        case 'less_than':
          result = Number(actualValue) < Number(condition.value);
          break;
        case 'is_empty':
          result = actualValue === null || actualValue === undefined || actualValue === '';
          break;
        case 'is_not_empty':
          result = actualValue !== null && actualValue !== undefined && actualValue !== '';
          break;
        default:
          result = true;
      }

      conditionsEvaluated.push({
        field: condition.field,
        operator: condition.operator,
        expected: condition.value,
        actual: actualValue,
        result,
      });

      if (!result) {
        matched = false;
      }
    }

    // Get actions that would execute
    const actions = await query(
      `SELECT * FROM trigger_actions WHERE trigger_id = $1 ORDER BY "order" ASC`,
      [id]
    );

    // Estimate duration based on action count and timeouts
    const estimatedDuration = actions.reduce(
      (total: number, action: any) => total + (action.timeout_ms || 30000),
      0
    );

    res.json({
      matched,
      conditionsEvaluated,
      actionsToExecute: matched ? actions : [],
      estimatedDuration,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/triggers/:id/history
 * Get execution history for a trigger
 */
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { from, to, status, limit = '20', offset = '0' } = req.query;
    const organizationId = req.user!.organizationId;

    // Verify trigger exists
    const triggers = await query(
      'SELECT id FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    let sql = `
      SELECT
        ae.id as "executionId",
        ae.event_id as "eventId",
        ae.created_at as "triggeredAt",
        ae.status,
        COUNT(CASE WHEN ae.status = 'success' THEN 1 END) OVER (PARTITION BY ae.event_id) as "actionsCompleted",
        COUNT(CASE WHEN ae.status = 'failed' THEN 1 END) OVER (PARTITION BY ae.event_id) as "actionsFailed",
        EXTRACT(EPOCH FROM (ae.completed_at - ae.started_at)) * 1000 as "totalDurationMs"
      FROM action_executions ae
      WHERE ae.trigger_id = $1
    `;

    const params: any[] = [id];
    let paramIndex = 2;

    if (from) {
      sql += ` AND ae.created_at >= $${paramIndex}`;
      params.push(new Date(from as string));
      paramIndex++;
    }

    if (to) {
      sql += ` AND ae.created_at <= $${paramIndex}`;
      params.push(new Date(to as string));
      paramIndex++;
    }

    if (status) {
      sql += ` AND ae.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count
    const countSql = `SELECT COUNT(DISTINCT event_id) as total FROM action_executions WHERE trigger_id = $1`;
    const countResult = await query(countSql, [id]);
    const total = parseInt(countResult[0]?.total || '0');

    sql += ` ORDER BY ae.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string));
    params.push(parseInt(offset as string));

    const history = await query(sql, params);

    res.json({
      data: history,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/triggers/:id/versions
 * Get version history for a trigger
 * Note: This requires a trigger_versions table that stores snapshots
 */
router.get('/:id/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Verify trigger exists
    const triggers = await query<EventTrigger>(
      'SELECT * FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Try to get versions from trigger_versions table
    // If table doesn't exist, return current version only
    try {
      const versions = await query(
        `SELECT
          version,
          snapshot,
          change_summary,
          created_by,
          created_at
        FROM trigger_versions
        WHERE trigger_id = $1
        ORDER BY version DESC`,
        [id]
      );

      res.json({ versions });
    } catch (error) {
      // Table doesn't exist - return current state as version 1
      const trigger = triggers[0];
      res.json({
        versions: [
          {
            version: 1,
            snapshot: trigger,
            changeSummary: 'Initial version',
            createdBy: trigger.created_by,
            createdAt: trigger.created_at,
          },
        ],
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/triggers/:id/restore
 * Restore a previous version of a trigger
 */
router.post('/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { version } = req.body;
    const organizationId = req.user!.organizationId;

    if (!version || typeof version !== 'number') {
      return res.status(400).json({
        error: { message: 'version number is required' }
      });
    }

    // Verify trigger exists
    const triggers = await query<EventTrigger>(
      'SELECT * FROM event_triggers WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (triggers.length === 0) {
      return res.status(404).json({ error: { message: 'Trigger not found' } });
    }

    // Try to get the version snapshot
    try {
      const versions = await query(
        `SELECT snapshot FROM trigger_versions WHERE trigger_id = $1 AND version = $2`,
        [id, version]
      );

      if (versions.length === 0) {
        return res.status(404).json({ error: { message: 'Version not found' } });
      }

      const snapshot = versions[0].snapshot;

      // Restore the trigger to the snapshot state
      const result = await query<EventTrigger>(
        `UPDATE event_triggers
         SET name = $1,
             event_type = $2,
             status = $3,
             scope = $4,
             form_ids = $5,
             conditions = $6,
             priority = $7,
             error_handling = $8,
             updated_at = NOW()
         WHERE id = $9 AND organization_id = $10
         RETURNING *`,
        [
          snapshot.name,
          snapshot.event_type,
          snapshot.status,
          snapshot.scope,
          snapshot.form_ids,
          JSON.stringify(snapshot.conditions),
          snapshot.priority,
          snapshot.error_handling,
          id,
          organizationId,
        ]
      );

      res.json({
        ...result[0],
        restoredFrom: version,
      });
    } catch (error) {
      // Version table doesn't exist
      return res.status(400).json({
        error: { message: 'Version history not available for this trigger' }
      });
    }
  } catch (error) {
    next(error);
  }
});

// Helper function to get nested value from object
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export default router;
