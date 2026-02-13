/**
 * Push API - Integration Hub Phase 4
 * REST endpoint for queuing Form → ERP push operations
 *
 * Endpoint: POST /api/v1/integrations/push
 * Auth: Clerk JWT (organizationId from auth context)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateJWT } from '../../../middleware/auth';
import * as integrationQueue from '../../../queues/integrationQueue';
import * as connectorService from '../../../services/integrationHub/connectorService';
import logger from '../../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// ============================================================================
// Validation Schema
// ============================================================================

const pushRequestSchema = z.object({
  connectorId: z.string().uuid('connectorId must be a valid UUID'),
  formId: z.string().uuid('formId must be a valid UUID'),
  submissionId: z.string().min(1, 'submissionId is required'),
  data: z.record(z.any()).refine((val) => typeof val === 'object', {
    message: 'data must be an object',
  }),
  endpoint: z.object({
    method: z.enum(['POST', 'PUT', 'PATCH', 'DELETE'], {
      errorMap: () => ({ message: 'method must be POST, PUT, PATCH, or DELETE' }),
    }),
    path: z.string().min(1, 'endpoint.path is required'),
    headers: z.record(z.string()).optional(),
  }),
});

// ============================================================================
// POST /api/v1/integrations/push
// ============================================================================

/**
 * Queue form submission for ERP push
 *
 * Flow:
 * 1. Validate request body
 * 2. Verify connector exists and belongs to organization
 * 3. Verify connector is enabled
 * 4. Generate job ID
 * 5. Enqueue job
 * 6. Return 202 Accepted with job ID
 *
 * @returns 202 Accepted with job metadata
 */
router.post('/push', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      res.status(401).json({ error: 'Organization ID not found in auth context' });
      return;
    }

      // 1. Validate request body
      const validationResult = pushRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        res.status(400).json({
          error: firstError.message,
          field: firstError.path.join('.'),
        });
        return;
      }

      const { connectorId, formId, submissionId, data, endpoint } = validationResult.data;

      // 2. Verify connector exists
      const connector = await connectorService.getById(connectorId, organizationId);
      if (!connector) {
        res.status(404).json({ error: 'Connector not found' });
        return;
      }

      // 3. Verify connector belongs to organization (multi-tenant security)
      if (connector.organizationId !== organizationId) {
        res.status(403).json({
          error: 'Unauthorized: Connector does not belong to organization',
        });
        return;
      }

      // 4. Verify connector is enabled
      if (!connector.isEnabled) {
        res.status(400).json({ error: 'Connector is disabled' });
        return;
      }

      // 5. Generate job ID
      const jobId = uuidv4();

      // 6. Build job data
      const jobData: integrationQueue.IntegrationJobData = {
        jobId,
        organizationId,
        submissionId,
        formId,
        connectorId,
        data,
        endpoint: endpoint as any,
        retryCount: 0,
        createdAt: Date.now(),
      };

      // 7. Enqueue job
      const job = await integrationQueue.enqueueIntegrationJob(jobData);

      logger.info('Push job enqueued', {
        jobId,
        organizationId,
        connectorId,
        submissionId,
        formId,
      });

      // 8. Calculate estimated completion (30 seconds from now)
      const estimatedCompletion = new Date(Date.now() + 30000).toISOString();

      // 9. Return 202 Accepted
      res.status(202).json({
        success: true,
        jobId: job.id,
        status: 'queued',
        estimatedCompletion,
        submissionId,
        connectorId,
      });
    } catch (error: any) {
      // Handle specific errors
      if (error.message.includes('Job already exists')) {
        res.status(409).json({ error: 'Job already exists for this submission' });
        return;
      }

      // Log error (sanitized)
      logger.error('Push API error', {
        organizationId: (req as any).user?.organizationId,
        error: error.message,
      });

      // Return generic error (no PII)
      res.status(500).json({
        error: 'Failed to queue push job',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
);

export default router;
