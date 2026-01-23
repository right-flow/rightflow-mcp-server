import express from 'express';
import { z } from 'zod';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { query } from '../../config/database';
import { validateRequest } from '../../utils/validation';
import {
  ValidationError,
  NotFoundError,
  OrganizationMismatchError,
} from '../../utils/errors';
import logger from '../../utils/logger';
import { emitWebhookEvent } from '../../services/webhookService';

const router = express.Router();

// Apply authentication + user sync to all routes
router.use(authenticateJWT);
router.use(syncUser);

// ============================================================================
// Validation Schemas
// ============================================================================

const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'number', 'date', 'select', 'checkbox', 'textarea']),
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  validation: z.record(z.any()).optional(),
  options: z.array(z.string()).optional(), // For select fields
});

const createFormSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  fields: z.array(fieldSchema).min(1),
  isActive: z.boolean().default(true),
});

const updateFormSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  fields: z.array(fieldSchema).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/forms
 * List all forms
 */
router.get('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Query params
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const conditions: string[] = ['organization_id = $1', 'deleted_at IS NULL'];
    const params: any[] = [organizationId];

    if (isActive !== undefined) {
      conditions.push(`is_active = $${params.length + 1}`);
      params.push(isActive);
    }

    const forms = await query(
      `
      SELECT
        id,
        name,
        description,
        fields,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        (SELECT COUNT(*) FROM submissions WHERE form_id = forms.id AND deleted_at IS NULL) AS "submissionCount"
      FROM forms
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `,
      params,
    );

    res.json({ data: forms });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/forms
 * Create new form (manager+ only)
 */
router.post('/', requireRole('manager'), async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Validate request body
    const formData = validateRequest(createFormSchema, req.body);

    // Create form
    const [form] = await query(
      `
      INSERT INTO forms (
        organization_id,
        name,
        description,
        fields,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        name,
        description,
        fields,
        is_active AS "isActive",
        created_at AS "createdAt"
    `,
      [
        organizationId,
        formData.name,
        formData.description || null,
        JSON.stringify(formData.fields),
        formData.isActive,
      ],
    );

    logger.info('Form created', { formId: form.id, name: formData.name });

    // Emit webhook event (non-blocking)
    await emitWebhookEvent(organizationId, 'form.created', form);

    res.status(201).json(form);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/forms/:id
 * Get form by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    const forms = await query(
      `
      SELECT
        id,
        organization_id AS "organizationId",
        name,
        description,
        fields,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM forms
      WHERE id = $1 AND deleted_at IS NULL
    `,
      [id],
    );

    if (forms.length === 0) {
      throw new NotFoundError('טופס', id);
    }

    const form = forms[0];

    // Verify form belongs to user's org
    if (form.organizationId !== organizationId) {
      throw new OrganizationMismatchError();
    }

    res.json(form);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/forms/:id
 * Update form (manager+ only)
 */
router.patch('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    // Validate request body
    const updates = validateRequest(updateFormSchema, req.body);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('לא סופקו שדות לעדכון');
    }

    // Verify form exists and belongs to organization
    const existing = await query(
      'SELECT organization_id FROM forms WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundError('טופס', id);
    }

    if (existing[0].organization_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // Build dynamic UPDATE query
    const setClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.name) {
      setClause.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }

    if (updates.fields) {
      setClause.push(`fields = $${paramIndex++}`);
      params.push(JSON.stringify(updates.fields));
    }

    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramIndex++}`);
      params.push(updates.isActive);
    }

    params.push(id);

    // Update form
    const [form] = await query(
      `
      UPDATE forms
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING
        id,
        name,
        description,
        fields,
        is_active AS "isActive",
        updated_at AS "updatedAt"
    `,
      params,
    );

    logger.info('Form updated', { formId: id });

    // Emit webhook event (non-blocking)
    await emitWebhookEvent(organizationId, 'form.updated', form);

    res.json(form);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/forms/:id
 * Soft delete form (admin only)
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    // Verify form exists and belongs to organization
    const existing = await query(
      'SELECT organization_id FROM forms WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundError('טופס', id);
    }

    if (existing[0].organization_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // Check if form has submissions
    const [{ count }] = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM submissions WHERE form_id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (parseInt(count) > 0) {
      throw new ValidationError(
        `לא ניתן למחוק טופס עם ${count} הגשות קיימות. שנה את הסטטוס ל"לא פעיל" במקום.`,
      );
    }

    // Soft delete
    await query('UPDATE forms SET deleted_at = NOW() WHERE id = $1', [id]);

    logger.info('Form deleted', { formId: id });

    // Emit webhook event (non-blocking)
    await emitWebhookEvent(organizationId, 'form.deleted', { id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
