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
// TODO: Fix syncUser to match actual database schema (users/organizations/organization_members)
// router.use(syncUser);

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
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  fields: z.array(fieldSchema).min(1),
  settings: z.record(z.any()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const updateFormSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  fields: z.array(fieldSchema).optional(),
  settings: z.record(z.any()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
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
    // TODO: Fix organization filtering when user-org relationship is properly set up
    // const { organizationId } = req.user!;

    // Query params
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    // Skip org filter for now - just filter by deleted_at
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (isActive !== undefined) {
      // Map isActive boolean to status string
      conditions.push(`status = $${params.length + 1}`);
      params.push(isActive ? 'published' : 'draft');
    }

    const forms = await query(
      `
      SELECT
        id,
        title,
        description,
        fields,
        CASE WHEN status = 'published' THEN true ELSE false END AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        (SELECT COUNT(*) FROM responses WHERE form_id = forms.id AND deleted_at IS NULL) AS "submissionCount"
      FROM forms
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `,
      params,
    );

    res.json({ forms });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/forms
 * Create new form
 */
router.post('/', async (req, res, next) => {
  try {
    const { id: clerkUserId, email } = req.user!;

    // Validate request body
    const formData = validateRequest(createFormSchema, req.body);

    // Find or create user in database
    let user = await query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [clerkUserId]
    );

    if (user.length === 0) {
      // Create user if doesn't exist
      user = await query(
        `
        INSERT INTO users (clerk_id, email, tenant_type)
        VALUES ($1, $2, $3)
        RETURNING id
        `,
        [clerkUserId, email || 'user@example.com', 'user']
      );
    }

    const dbUserId = user[0].id;

    // Generate slug from title
    const slug = formData.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100) + '-' + Date.now();

    // Create form
    const [form] = await query(
      `
      INSERT INTO forms (
        user_id,
        org_id,
        tenant_type,
        slug,
        title,
        description,
        status,
        fields,
        stations,
        settings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        slug,
        title,
        description,
        status,
        fields,
        created_at AS "createdAt"
    `,
      [
        dbUserId,
        null, // org_id is nullable
        'user',
        slug,
        formData.title,
        formData.description || null,
        formData.status || 'draft',
        JSON.stringify(formData.fields),
        JSON.stringify([]),
        JSON.stringify(formData.settings || {}),
      ],
    );

    logger.info('Form created', { formId: form.id, title: formData.title });

    res.status(201).json({ form });
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
        org_id AS "orgId",
        user_id AS "userId",
        title,
        description,
        fields,
        settings,
        status,
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

    // Verify form belongs to user's org (if org-based) or user (if user-based)
    if (form.orgId && form.orgId !== organizationId) {
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
    const id = req.params.id as string;

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
      'SELECT org_id FROM forms WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundError('טופס', id);
    }

    if (existing[0].org_id && existing[0].org_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // Build dynamic UPDATE query
    const setClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.title) {
      setClause.push(`title = $${paramIndex++}`);
      params.push(updates.title);
    }

    if (updates.description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }

    if (updates.fields) {
      setClause.push(`fields = $${paramIndex++}`);
      params.push(JSON.stringify(updates.fields));
    }

    if (updates.settings !== undefined) {
      setClause.push(`settings = $${paramIndex++}`);
      params.push(JSON.stringify(updates.settings));
    }

    if (updates.status !== undefined) {
      setClause.push(`status = $${paramIndex++}`);
      params.push(updates.status);
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
        slug,
        title,
        description,
        fields,
        settings,
        status,
        short_url,
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
    const id = req.params.id as string;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    // Verify form exists and belongs to organization
    const existing = await query(
      'SELECT org_id FROM forms WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundError('טופס', id);
    }

    if (existing[0].org_id && existing[0].org_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // Check if form has responses
    const [{ count }] = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM responses WHERE form_id = $1 AND deleted_at IS NULL',
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
