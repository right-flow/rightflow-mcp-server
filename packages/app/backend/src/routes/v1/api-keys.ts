/**
 * API Keys Management Routes
 * Endpoints for creating and managing MCP API keys
 */

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authenticateJWT } from '../../middleware/auth';
import { query } from '../../config/database';
import logger from '../../utils/logger';

const router = express.Router();

// Apply authentication
router.use(authenticateJWT);

// ============================================================================
// Validation Schemas
// ============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  permissions: z.object({
    templates: z.object({
      read: z.boolean().default(true),
      write: z.boolean().default(false),
    }).optional(),
    fill: z.boolean().default(true),
    batch: z.boolean().default(false),
    audit: z.boolean().default(false),
  }).optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/api-keys
 * Create a new API key
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = createApiKeySchema.parse(req.body);
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'User must belong to an organization',
        },
      });
    }

    // Generate API key: rfk_ + 64 random hex characters
    const apiKey = 'rfk_' + crypto.randomBytes(32).toString('hex');
    const keyPrefix = apiKey.substring(0, 8);

    // Hash the API key (bcrypt)
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Insert into database
    const result = await query(
      `
      INSERT INTO mcp_api_keys (
        organization_id,
        name,
        key_prefix,
        key_hash,
        description,
        environment,
        permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, key_prefix, environment, created_at
      `,
      [
        organizationId,
        params.name,
        keyPrefix,
        keyHash,
        params.description || null,
        params.environment,
        JSON.stringify(params.permissions || {
          templates: { read: true, write: false },
          fill: true,
          batch: false,
          audit: false,
        }),
      ],
    );

    if (!result || result.length === 0) {
      logger.error('Failed to create API key - no result returned', { organizationId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create API key',
        },
      });
    }

    const createdKey = result[0];

    logger.info('API key created', {
      organizationId,
      keyId: createdKey.id,
      keyPrefix,
      environment: params.environment,
    });

    res.status(201).json({
      success: true,
      data: {
        id: createdKey.id,
        name: createdKey.name,
        api_key: apiKey, // ONLY shown once!
        key_prefix: createdKey.key_prefix,
        environment: createdKey.environment,
        created_at: createdKey.created_at,
        warning: 'Save this API key now - it will not be shown again!',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request parameters',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/api-keys
 * List all API keys for the organization
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'User must belong to an organization',
        },
      });
    }

    const keys = await query(
      `
      SELECT
        id,
        name,
        key_prefix,
        description,
        environment,
        permissions,
        last_used_at,
        created_at,
        revoked_at
      FROM mcp_api_keys
      WHERE organization_id = $1
      ORDER BY created_at DESC
      `,
      [organizationId],
    );

    res.json({
      success: true,
      data: {
        api_keys: keys,
        total: keys.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/api-keys/:id
 * Revoke an API key
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid API key ID format',
        },
      });
    }

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'User must belong to an organization',
        },
      });
    }

    const result = await query(
      `
      UPDATE mcp_api_keys
      SET revoked_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND revoked_at IS NULL
      RETURNING id
      `,
      [id, organizationId],
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API key not found or already revoked',
        },
      });
    }

    logger.info('API key revoked', { keyId: id, organizationId });

    res.json({
      success: true,
      data: {
        message: 'API key revoked successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
