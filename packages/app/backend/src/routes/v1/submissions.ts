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

const createSubmissionSchema = z.object({
  formId: z.string().uuid(),
  data: z.record(z.any()),
  metadata: z
    .object({
      location: z
        .object({
          lat: z.number(),
          lon: z.number(),
          address: z.string(),
        })
        .optional(),
      device: z.string().optional(),
      appVersion: z.string().optional(),
      submittedOffline: z.boolean().optional(),
    })
    .optional(),
  status: z.enum(['draft', 'submitted']).default('submitted'),
});

const updateSubmissionSchema = z.object({
  data: z.record(z.any()).optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
});

const listSubmissionsSchema = z.object({
  formId: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  submittedById: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/submissions
 * List submissions with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Validate query params
    const filters = validateRequest(listSubmissionsSchema, req.query);

    // Build dynamic WHERE clause
    const conditions: string[] = ['s.organization_id = $1', 's.deleted_at IS NULL'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (filters.formId) {
      conditions.push(`s.form_id = $${paramIndex++}`);
      params.push(filters.formId);
    }

    if (filters.status) {
      conditions.push(`s.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.submittedById) {
      conditions.push(`s.submitted_by_id = $${paramIndex++}`);
      params.push(filters.submittedById);
    }

    if (filters.fromDate) {
      conditions.push(`s.created_at >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      conditions.push(`s.created_at <= $${paramIndex++}`);
      params.push(filters.toDate);
    }

    const whereClause = conditions.join(' AND ');

    // Query with pagination
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const submissions = await query(
      `
      SELECT
        s.id,
        s.form_id AS "formId",
        f.name AS "formName",
        s.submitted_by_id AS "submittedById",
        u.name AS "submittedByName",
        s.data,
        s.metadata,
        s.status,
        s.created_at AS "createdAt",
        s.updated_at AS "updatedAt"
      FROM submissions s
      LEFT JOIN forms f ON s.form_id = f.id
      LEFT JOIN users u ON s.submitted_by_id = u.id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
      [...params, limit, offset],
    );

    // Get total count
    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM submissions s WHERE ${whereClause}`,
      params,
    );

    res.json({
      data: submissions,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/submissions
 * Create new submission
 */
router.post('/', async (req, res, next) => {
  try {
    const { organizationId, id: userId } = req.user!;

    // Validate request body
    const submissionData = validateRequest(createSubmissionSchema, req.body);

    // Verify form exists and belongs to organization
    const forms = await query(
      'SELECT id FROM forms WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [submissionData.formId, organizationId],
    );

    if (forms.length === 0) {
      throw new NotFoundError('טופס', submissionData.formId);
    }

    // Create submission
    const [submission] = await query(
      `
      INSERT INTO submissions (
        organization_id,
        form_id,
        submitted_by_id,
        data,
        metadata,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        form_id AS "formId",
        data,
        metadata,
        status,
        created_at AS "createdAt"
    `,
      [
        organizationId,
        submissionData.formId,
        userId,
        JSON.stringify(submissionData.data),
        JSON.stringify(submissionData.metadata || {}),
        submissionData.status,
      ],
    );

    logger.info('Submission created', {
      submissionId: submission.id,
      formId: submissionData.formId,
      userId,
    });

    // Emit webhook event (non-blocking)
    await emitWebhookEvent(organizationId, 'submission.created', submission);

    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/submissions/:id
 * Get submission by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    // Fetch submission
    const submissions = await query(
      `
      SELECT
        s.id,
        s.organization_id AS "organizationId",
        s.form_id AS "formId",
        f.name AS "formName",
        s.submitted_by_id AS "submittedById",
        u.name AS "submittedByName",
        u.email AS "submittedByEmail",
        s.data,
        s.metadata,
        s.status,
        s.created_at AS "createdAt",
        s.updated_at AS "updatedAt"
      FROM submissions s
      LEFT JOIN forms f ON s.form_id = f.id
      LEFT JOIN users u ON s.submitted_by_id = u.id
      WHERE s.id = $1 AND s.deleted_at IS NULL
    `,
      [id],
    );

    if (submissions.length === 0) {
      throw new NotFoundError('הגשה', id);
    }

    const submission = submissions[0];

    // Authorization: Check if submission belongs to user's org
    if (submission.organizationId !== organizationId) {
      throw new OrganizationMismatchError();
    }

    res.json(submission);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/submissions/:id
 * Update submission
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
    const updates = validateRequest(updateSubmissionSchema, req.body);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('לא סופקו שדות לעדכון');
    }

    // Verify submission exists and belongs to organization
    const existing = await query(
      'SELECT organization_id FROM submissions WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundError('הגשה', id);
    }

    if (existing[0].organization_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // Build dynamic UPDATE query
    const setClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.data) {
      setClause.push(`data = $${paramIndex++}`);
      params.push(JSON.stringify(updates.data));
    }

    if (updates.status) {
      setClause.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }

    params.push(id);

    // Update submission
    const [submission] = await query(
      `
      UPDATE submissions
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING
        id,
        form_id AS "formId",
        data,
        metadata,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
      params,
    );

    logger.info('Submission updated', { submissionId: id });

    // Emit webhook event (non-blocking)
    await emitWebhookEvent(organizationId, 'submission.updated', submission);

    res.json(submission);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/submissions/:id
 * Soft delete submission (manager+ only)
 */
router.delete('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('מזהה לא תקין', { field: 'id', provided: id });
    }

    // Verify submission exists and belongs to organization
    const existing = await query(
      'SELECT organization_id FROM submissions WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );

    if (existing.length === 0) {
      throw new NotFoundError('הגשה', id);
    }

    if (existing[0].organization_id !== organizationId) {
      throw new OrganizationMismatchError();
    }

    // Soft delete
    await query('UPDATE submissions SET deleted_at = NOW() WHERE id = $1', [id]);

    logger.info('Submission deleted', { submissionId: id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
