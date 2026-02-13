/**
 * Field Mapping API Routes - Integration Hub Phase 2
 *
 * Endpoints:
 * - POST /api/v1/integrations/mappings - Create mapping
 * - GET /api/v1/integrations/mappings - List mappings
 * - GET /api/v1/integrations/mappings/:id - Get mapping
 * - PATCH /api/v1/integrations/mappings/:id - Update mapping
 * - DELETE /api/v1/integrations/mappings/:id - Delete mapping
 * - POST /api/v1/integrations/mappings/:id/preview - Preview transform
 *
 * Security:
 * - JWT authentication required
 * - Manager+ role required
 * - Multi-tenant isolation enforced
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as fieldMappingService from '../../../services/integrationHub/fieldMappingService';
import { authenticateJWT, requireRole } from '../../../middleware/auth';
import { syncUser } from '../../../middleware/syncUser';
import { ValidationError } from '../../../utils/errors';

const router = express.Router();

// Apply authentication and authorization to all routes
router.use(authenticateJWT);
router.use(syncUser);
router.use(requireRole('manager')); // Only managers+ can manage field mappings

// ============================================================================
// Validation Schemas
// ============================================================================

const transformSchema = z.object({
  type: z.string().min(1).max(100),
  params: z.record(z.any()).optional(),
});

const createMappingSchema = z.object({
  connectorId: z.string().uuid('Invalid connector ID'),
  formId: z.string().uuid('Invalid form ID').nullable(),
  formField: z.string().min(1).max(255),
  connectorField: z.string().min(1).max(255),
  transforms: z.array(transformSchema).default([]),
  required: z.boolean().default(false),
  defaultValue: z.string().nullable().optional(),
});

const updateMappingSchema = z.object({
  connectorField: z.string().min(1).max(255).optional(),
  transforms: z.array(transformSchema).optional(),
  required: z.boolean().optional(),
  defaultValue: z.string().nullable().optional(),
});

const listMappingsQuerySchema = z.object({
  connectorId: z.string().uuid('Invalid connector ID'),
  formId: z.string().uuid('Invalid form ID').nullable().optional(),
});

const previewTransformSchema = z.object({
  sampleData: z.any(),
});

// ============================================================================
// Helper Functions
// ============================================================================

function validateRequest<T>(schema: z.ZodSchema<T>, data: any): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.message,
        { field: firstError.path.join('.'), code: firstError.code },
      );
    }
    throw error;
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/integrations/mappings
 * Create field mapping
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user!;
    const mappingData = validateRequest(createMappingSchema, req.body);

    const mapping = await fieldMappingService.create({
      organizationId,
      connectorId: mappingData.connectorId,
      formId: mappingData.formId,
      formField: mappingData.formField,
      connectorField: mappingData.connectorField,
      transforms: (mappingData.transforms || []) as any,
      required: mappingData.required || false,
      defaultValue: mappingData.defaultValue || null,
    });

    res.status(201).json(mapping);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/integrations/mappings
 * List field mappings
 * Query params: connectorId (required), formId (optional)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user!;

    // Parse query parameters with special handling for formId
    const queryParams: any = { ...req.query };

    // Convert "null" string to actual null for formId
    if (queryParams.formId === 'null') {
      queryParams.formId = null;
    }

    const filters = validateRequest(listMappingsQuerySchema, queryParams);

    const mappings = await fieldMappingService.list({
      organizationId,
      connectorId: filters.connectorId,
      formId: filters.formId,
    });

    res.json({
      data: mappings,
      count: mappings.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/integrations/mappings/:id
 * Get single field mapping
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user!;
    const id = req.params.id as string;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('Invalid mapping ID', { field: 'id', provided: id });
    }

    const mapping = await fieldMappingService.getByIdForOrg(id, organizationId);
    res.json(mapping);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/integrations/mappings/:id
 * Update field mapping
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('Invalid mapping ID', { field: 'id', provided: id });
    }

    const updateData = validateRequest(updateMappingSchema, req.body);

    const mapping = await fieldMappingService.update(id, organizationId, updateData as any);
    res.json(mapping);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/integrations/mappings/:id
 * Delete field mapping (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('Invalid mapping ID', { field: 'id', provided: id });
    }

    await fieldMappingService.softDelete(id, organizationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/integrations/mappings/:id/preview
 * Preview transformation with sample data
 */
router.post('/:id/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('Invalid mapping ID', { field: 'id', provided: id });
    }

    const { sampleData } = validateRequest(previewTransformSchema, req.body);

    const result = await fieldMappingService.previewTransform(
      id,
      organizationId,
      sampleData,
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
