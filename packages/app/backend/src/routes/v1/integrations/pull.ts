/**
 * Pull API Route - Integration Hub Phase 3
 * POST /api/v1/integrations/pull - Pull data from ERP system
 *
 * Flow:
 * 1. Validate request (Zod schema)
 * 2. Extract organizationId from JWT
 * 3. Call Pull Service
 * 4. Return result with metadata
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT } from '../../../middleware/auth';
import * as pullService from '../../../services/integrationHub/pullService';
import { APIError } from '../../../utils/errors';
import logger from '../../../utils/logger';

const router = Router();

// ============================================================================
// Request Validation Schema
// ============================================================================

const pullRequestSchema = z.object({
  connectorId: z.string().uuid('Connector ID must be a valid UUID'),
  resourceType: z.string().min(1, 'Resource type is required'),
  resourceId: z.string().min(1, 'Resource ID is required'),
  forceRefresh: z.boolean().optional().default(false),
});

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/v1/integrations/pull
 * Pull data from ERP system (with caching)
 *
 * @requires JWT authentication
 * @body {string} connectorId - UUID of connector to use
 * @body {string} resourceType - Type of resource (customer, order, product, etc.)
 * @body {string} resourceId - ID of resource in ERP
 * @body {boolean} [forceRefresh=false] - Skip cache and fetch fresh data
 *
 * @returns {object} Pull response with data and metadata
 */
router.post(
  '/',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Validate request body
      const validationResult = pullRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new APIError(
          400,
          'VALIDATION_ERROR',
          'Invalid request data',
          validationResult.error.errors,
        );
      }

      const { connectorId, resourceType, resourceId, forceRefresh } = validationResult.data;

      // 2. Get organization ID from JWT
      if (!req.user?.organizationId) {
        throw new APIError(
          401,
          'UNAUTHORIZED',
          'Organization ID not found in token',
        );
      }

      const organizationId = req.user.organizationId;

      logger.info('Pull request received', {
        organizationId,
        connectorId,
        resourceType,
        resourceId,
        forceRefresh,
      });

      // 3. Call Pull Service
      const result = await pullService.pullData({
        organizationId,
        connectorId,
        resourceType,
        resourceId,
        forceRefresh,
      });

      // 4. Return result
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      // Handle specific error types with appropriate status codes
      if (error.name === 'RateLimitError') {
        next(new APIError(
          429,
          'RATE_LIMIT_EXCEEDED',
          error.message,
        ));
        return;
      }

      if (error.name === 'CircuitBreakerError') {
        next(new APIError(
          503,
          'SERVICE_UNAVAILABLE',
          error.message,
        ));
        return;
      }

      if (error.name === 'TimeoutError') {
        next(new APIError(
          504,
          'TIMEOUT',
          error.message,
        ));
        return;
      }

      // Pass through APIError as-is
      if (error instanceof APIError) {
        next(error);
        return;
      }

      // Generic error
      logger.error('Pull request failed', {
        error: error.message,
        stack: error.stack,
      });

      next(new APIError(
        500,
        'INTERNAL_ERROR',
        error.message || 'Failed to pull data from ERP',
      ));
    }
  },
);

export default router;
