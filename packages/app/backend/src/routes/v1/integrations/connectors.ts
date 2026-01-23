/**
 * Connector API Routes - Integration Hub
 * Manages connector instances (organization-level ERP/CRM connections)
 *
 * Endpoints:
 * - GET    /api/v1/integrations/connectors           - List connectors
 * - POST   /api/v1/integrations/connectors           - Create connector
 * - GET    /api/v1/integrations/connectors/:id       - Get connector by ID
 * - PATCH  /api/v1/integrations/connectors/:id       - Update connector
 * - DELETE /api/v1/integrations/connectors/:id       - Soft delete connector
 *
 * Security:
 * - All routes require JWT authentication (manager+ role)
 * - Multi-tenant isolation enforced on all operations
 * - Cross-tenant access attempts are logged and blocked
 */

import express from 'express';
import { z } from 'zod';
import { authenticateJWT, requireRole } from '../../../middleware/auth';
import { syncUser } from '../../../middleware/syncUser';
import { validateRequest } from '../../../utils/validation';
import * as connectorService from '../../../services/integrationHub/connectorService';
import { ValidationError } from '../../../utils/errors';
import logger from '../../../utils/logger';

const router = express.Router();

// Apply authentication + user sync to all routes (manager+ only)
router.use(authenticateJWT);
router.use(syncUser);
router.use(requireRole('manager'));

// ============================================================================
// Validation Schemas
// ============================================================================

const createConnectorSchema = z.object({
  definitionSlug: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  config: z.record(z.any()).default({}),
  rateLimitRequests: z.number().int().positive().optional(),
  rateLimitWindowSeconds: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const updateConnectorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z.record(z.any()).optional(),
  isEnabled: z.boolean().optional(),
  rateLimitRequests: z.number().int().positive().optional(),
  rateLimitWindowSeconds: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/integrations/connectors
 * List all connectors for organization
 */
router.get('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    logger.info('Listing connectors', { organizationId });

    const connectors = await connectorService.listForOrg(organizationId);

    res.json({ data: connectors });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/integrations/connectors
 * Create new connector instance
 */
router.post('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    // Validate request body
    const connectorData = validateRequest(createConnectorSchema, req.body);

    logger.info('Creating connector', {
      organizationId,
      definitionSlug: connectorData.definitionSlug,
      name: connectorData.name,
    });

    // Create connector
    const connector = await connectorService.create({
      organizationId,
      definitionSlug: connectorData.definitionSlug,
      name: connectorData.name,
      config: connectorData.config || {},
      rateLimitRequests: connectorData.rateLimitRequests,
      rateLimitWindowSeconds: connectorData.rateLimitWindowSeconds,
      timeoutMs: connectorData.timeoutMs || 30000,
    });

    logger.info('Connector created successfully', {
      connectorId: connector.id,
      organizationId,
    });

    res.status(201).json(connector);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/integrations/connectors/:id
 * Get connector by ID (with organization validation)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('Invalid connector ID', { field: 'id', provided: id });
    }

    logger.info('Getting connector', { connectorId: id, organizationId });

    // Get connector (service validates organization)
    const connector = await connectorService.getByIdForOrg(id, organizationId);

    res.json(connector);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/integrations/connectors/:id
 * Update connector configuration
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('Invalid connector ID', { field: 'id', provided: id });
    }

    // Validate request body
    const updates = validateRequest(updateConnectorSchema, req.body);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No fields to update');
    }

    logger.info('Updating connector', { connectorId: id, organizationId });

    // Update connector (service validates organization)
    const connector = await connectorService.update(id, organizationId, updates);

    logger.info('Connector updated successfully', { connectorId: id });

    res.json(connector);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/integrations/connectors/:id
 * Soft delete connector
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      throw new ValidationError('Invalid connector ID', { field: 'id', provided: id });
    }

    logger.info('Deleting connector', { connectorId: id, organizationId });

    // Soft delete (service validates organization)
    await connectorService.softDelete(id, organizationId);

    logger.info('Connector deleted successfully', { connectorId: id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
