/**
 * Workflow Management API Routes
 * Handles CRUD operations for workflows and execution management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { validateRequest } from '../../utils/validation';
import * as workflowService from '../../services/workflow/workflowService';
import * as executionService from '../../services/workflow/executionService';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  executeWorkflowSchema,
  workflowListQuerySchema,
  instanceListQuerySchema,
  analyticsQuerySchema
} from '../../services/workflow/validation';
import {
  WorkflowStatus,
  WorkflowInstanceStatus,
  WorkflowExecutionResponse
} from '../../services/workflow/types';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);
router.use(syncUser);

// ============================================================
// WORKFLOW MANAGEMENT
// ============================================================

/**
 * GET /workflows
 * List all workflows for the organization
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const query = validateRequest(workflowListQuerySchema, req.query);

      const result = await workflowService.listWorkflows({
        organizationId,
        ...query
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /workflows/:id
 * Get a specific workflow by ID
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { id } = req.params;

      const workflow = await workflowService.getWorkflow(id, organizationId);

      if (!workflow) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow not found'
        });
      }

      res.json(workflow);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /workflows
 * Create a new workflow
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, id: userId } = req.user!;
      const data = validateRequest(createWorkflowSchema, req.body);

      const workflow = await workflowService.createWorkflow({
        ...data,
        organizationId,
        createdBy: userId
      });

      res.status(201).json(workflow);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /workflows/:id
 * Update an existing workflow
 */
router.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, id: userId } = req.user!;
      const { id } = req.params;
      const data = validateRequest(updateWorkflowSchema, req.body);

      const workflow = await workflowService.updateWorkflow(
        id,
        {
          ...data,
          updatedBy: userId
        },
        organizationId
      );

      if (!workflow) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow not found'
        });
      }

      res.json(workflow);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /workflows/:id
 * Archive (soft delete) a workflow
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { id } = req.params;

      const success = await workflowService.archiveWorkflow(id, organizationId);

      if (!success) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow not found'
        });
      }

      res.json({
        message: 'Workflow archived successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /workflows/:id/publish
 * Publish a draft workflow
 */
router.post(
  '/:id/publish',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, id: userId } = req.user!;
      const { id } = req.params;

      const workflow = await workflowService.publishWorkflow(
        id,
        userId,
        organizationId
      );

      if (!workflow) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow not found'
        });
      }

      res.json({
        id: workflow.id,
        status: workflow.status,
        publishedAt: workflow.publishedAt,
        publishedBy: workflow.publishedBy
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /workflows/:id/duplicate
 * Duplicate an existing workflow
 */
router.post(
  '/:id/duplicate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, id: userId } = req.user!;
      const { id } = req.params;
      const { name } = req.body;

      const workflow = await workflowService.duplicateWorkflow(
        id,
        name || 'Copy',
        userId,
        organizationId
      );

      if (!workflow) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow not found'
        });
      }

      res.status(201).json(workflow);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// WORKFLOW EXECUTION
// ============================================================

/**
 * POST /workflows/:id/execute
 * Start a new workflow instance
 */
router.post(
  '/:id/execute',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, id: userId } = req.user!;
      const { id } = req.params;
      const data = validateRequest(executeWorkflowSchema, req.body);

      const instance = await executionService.startWorkflow({
        workflowId: id,
        organizationId,
        userId,
        ...data
      });

      const response: WorkflowExecutionResponse = {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        status: instance.status,
        startedAt: instance.startedAt
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /workflows/:workflowId/instances
 * List all instances of a workflow
 */
router.get(
  '/:workflowId/instances',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { workflowId } = req.params;
      const query = validateRequest(instanceListQuerySchema, req.query);

      const result = await executionService.listInstances({
        workflowId,
        organizationId,
        ...query
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /workflows/:workflowId/instances/:instanceId
 * Get instance status
 */
router.get(
  '/:workflowId/instances/:instanceId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { workflowId, instanceId } = req.params;

      const instance = await executionService.getInstance(
        instanceId,
        workflowId,
        organizationId
      );

      if (!instance) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow instance not found'
        });
      }

      res.json(instance);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /workflows/:workflowId/instances/:instanceId/pause
 * Pause a running workflow instance
 */
router.post(
  '/:workflowId/instances/:instanceId/pause',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { workflowId, instanceId } = req.params;

      const instance = await executionService.pauseInstance(
        instanceId,
        workflowId,
        organizationId
      );

      if (!instance) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow instance not found'
        });
      }

      res.json({
        instanceId: instance.id,
        status: instance.status,
        pausedAt: instance.pausedAt
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /workflows/:workflowId/instances/:instanceId/resume
 * Resume a paused workflow instance
 */
router.post(
  '/:workflowId/instances/:instanceId/resume',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { workflowId, instanceId } = req.params;

      const instance = await executionService.resumeInstance(
        instanceId,
        workflowId,
        organizationId
      );

      if (!instance) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow instance not found'
        });
      }

      res.json({
        instanceId: instance.id,
        status: instance.status,
        resumedAt: instance.resumedAt
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /workflows/:workflowId/instances/:instanceId/cancel
 * Cancel a workflow instance
 */
router.post(
  '/:workflowId/instances/:instanceId/cancel',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { workflowId, instanceId } = req.params;
      const { reason } = req.body;

      const instance = await executionService.cancelInstance(
        instanceId,
        workflowId,
        organizationId,
        reason
      );

      if (!instance) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow instance not found'
        });
      }

      res.json({
        instanceId: instance.id,
        status: instance.status,
        cancelledAt: new Date()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /workflows/:workflowId/instances/:instanceId/retry
 * Retry a failed workflow instance
 */
router.post(
  '/:workflowId/instances/:instanceId/retry',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { workflowId, instanceId } = req.params;

      const instance = await executionService.retryInstance(
        instanceId,
        workflowId,
        organizationId
      );

      if (!instance) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Workflow instance not found'
        });
      }

      res.json({
        instanceId: instance.id,
        status: instance.status,
        retriedAt: new Date()
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// WORKFLOW HISTORY & ANALYTICS
// ============================================================

/**
 * GET /workflows/:workflowId/instances/:instanceId/timeline
 * Get execution timeline for an instance
 */
router.get(
  '/:workflowId/instances/:instanceId/timeline',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { workflowId, instanceId } = req.params;

      const timeline = await executionService.getInstanceTimeline(
        instanceId,
        workflowId,
        organizationId
      );

      res.json({
        instanceId,
        timeline
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /workflows/:id/analytics
 * Get workflow analytics
 */
router.get(
  '/:id/analytics',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { id } = req.params;
      const query = validateRequest(analyticsQuerySchema, req.query);

      const analytics = await workflowService.getAnalytics(
        id,
        organizationId,
        query
      );

      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /workflows/health
 * Get system health metrics
 */
router.get(
  '/health',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;

      const health = await executionService.getSystemHealth(organizationId);

      res.json(health);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// ERROR HANDLING
// ============================================================

// Workflow-specific error handler
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Workflow API Error]', error);

  if (error.name === 'WorkflowValidationError') {
    return res.status(400).json({
      error: 'ValidationError',
      message: error.message,
      details: error.details
    });
  }

  if (error.name === 'WorkflowExecutionError') {
    return res.status(500).json({
      error: 'ExecutionError',
      message: error.message,
      details: error.details
    });
  }

  if (error.name === 'WorkflowTimeoutError') {
    return res.status(408).json({
      error: 'TimeoutError',
      message: error.message,
      details: error.details
    });
  }

  // Pass to general error handler
  next(error);
});

export default router;