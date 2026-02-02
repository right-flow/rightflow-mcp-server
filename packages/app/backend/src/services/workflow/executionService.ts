/**
 * Execution Service
 * Manages workflow instance execution and lifecycle
 */

import { db } from '../../db';
import { WorkflowEngine } from './WorkflowEngine';
import {
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowTriggerType,
  WorkflowHistoryEntry,
  WorkflowInstanceListResponse,
  WorkflowExecutionError
} from './types';
import * as workflowService from './workflowService';

// Singleton workflow engine
let workflowEngine: WorkflowEngine | null = null;

/**
 * Get or create workflow engine instance
 */
function getEngine(): WorkflowEngine {
  if (!workflowEngine) {
    workflowEngine = new WorkflowEngine();
  }
  return workflowEngine;
}

/**
 * Start a new workflow instance
 */
export async function startWorkflow(params: {
  workflowId: string;
  organizationId: string;
  userId?: string;
  initialData?: Record<string, any>;
  triggeredBy?: WorkflowTriggerType;
  metadata?: Record<string, any>;
}): Promise<WorkflowInstance> {
  const {
    workflowId,
    organizationId,
    userId,
    initialData = {},
    triggeredBy = WorkflowTriggerType.MANUAL,
    metadata = {}
  } = params;

  // Get workflow
  const workflow = await workflowService.getWorkflow(workflowId, organizationId);

  if (!workflow) {
    throw new WorkflowExecutionError('Workflow not found');
  }

  if (workflow.status !== 'published') {
    throw new WorkflowExecutionError('Workflow must be published to execute');
  }

  // Start workflow using engine
  const engine = getEngine();
  const instance = await engine.startWorkflow(
    workflow,
    initialData,
    userId,
    triggeredBy
  );

  console.log(`[ExecutionService] Started workflow instance ${instance.id}`);

  return instance;
}

/**
 * List workflow instances
 */
export async function listInstances(params: {
  workflowId: string;
  organizationId: string;
  status?: WorkflowInstanceStatus;
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}): Promise<WorkflowInstanceListResponse> {
  const {
    workflowId,
    organizationId,
    status,
    userId,
    from,
    to,
    limit = 20,
    offset = 0
  } = params;

  // Verify workflow belongs to organization
  const workflow = await workflowService.getWorkflow(workflowId, organizationId);
  if (!workflow) {
    throw new WorkflowExecutionError('Workflow not found');
  }

  let query = db('workflow_instances')
    .where('workflow_id', workflowId)
    .orderBy('started_at', 'desc');

  // Apply filters
  if (status) {
    query = query.where('status', status);
  }

  if (userId) {
    query = query.where('user_id', userId);
  }

  if (from) {
    query = query.where('started_at', '>=', from);
  }

  if (to) {
    query = query.where('started_at', '<=', to);
  }

  // Get total count
  const countResult = await query.clone().count('* as total').first();
  const total = parseInt(countResult?.total || '0');

  // Get paginated results
  const instances = await query
    .limit(limit)
    .offset(offset)
    .select(
      'id',
      'workflow_id',
      'organization_id',
      'user_id',
      'status',
      'current_node_id',
      'progress',
      'context',
      'form_data',
      'variables',
      'triggered_by',
      'trigger_data',
      'error_message',
      'error_details',
      'started_at',
      'paused_at',
      'resumed_at',
      'completed_at',
      'failed_at',
      'execution_time_ms'
    );

  // Transform to proper types
  const data = instances.map(transformInstance);

  return {
    data,
    total,
    limit,
    offset
  };
}

/**
 * Get a specific workflow instance
 */
export async function getInstance(
  instanceId: string,
  workflowId: string,
  organizationId: string
): Promise<WorkflowInstance | null> {
  // Verify workflow belongs to organization
  const workflow = await workflowService.getWorkflow(workflowId, organizationId);
  if (!workflow) {
    return null;
  }

  const instance = await db('workflow_instances')
    .where({ id: instanceId, workflow_id: workflowId })
    .first();

  if (!instance) {
    return null;
  }

  return transformInstance(instance);
}

/**
 * Pause a workflow instance
 */
export async function pauseInstance(
  instanceId: string,
  workflowId: string,
  organizationId: string
): Promise<WorkflowInstance | null> {
  // Verify instance
  const instance = await getInstance(instanceId, workflowId, organizationId);
  if (!instance) {
    return null;
  }

  if (instance.status !== WorkflowInstanceStatus.RUNNING) {
    throw new WorkflowExecutionError('Can only pause running instances');
  }

  // Update status
  const [updated] = await db('workflow_instances')
    .where({ id: instanceId })
    .update({
      status: WorkflowInstanceStatus.PAUSED,
      paused_at: new Date()
    })
    .returning('*');

  console.log(`[ExecutionService] Paused workflow instance ${instanceId}`);

  return transformInstance(updated);
}

/**
 * Resume a paused workflow instance
 */
export async function resumeInstance(
  instanceId: string,
  workflowId: string,
  organizationId: string
): Promise<WorkflowInstance | null> {
  // Verify instance
  const instance = await getInstance(instanceId, workflowId, organizationId);
  if (!instance) {
    return null;
  }

  if (instance.status !== WorkflowInstanceStatus.PAUSED) {
    throw new WorkflowExecutionError('Can only resume paused instances');
  }

  // Resume using engine
  const engine = getEngine();
  await engine.resumeWorkflow(instanceId);

  // Update status
  const [updated] = await db('workflow_instances')
    .where({ id: instanceId })
    .update({
      status: WorkflowInstanceStatus.RUNNING,
      resumed_at: new Date()
    })
    .returning('*');

  console.log(`[ExecutionService] Resumed workflow instance ${instanceId}`);

  return transformInstance(updated);
}

/**
 * Cancel a workflow instance
 */
export async function cancelInstance(
  instanceId: string,
  workflowId: string,
  organizationId: string,
  reason?: string
): Promise<WorkflowInstance | null> {
  // Verify instance
  const instance = await getInstance(instanceId, workflowId, organizationId);
  if (!instance) {
    return null;
  }

  if (![
    WorkflowInstanceStatus.RUNNING,
    WorkflowInstanceStatus.PAUSED,
    WorkflowInstanceStatus.WAITING
  ].includes(instance.status)) {
    throw new WorkflowExecutionError('Cannot cancel completed or failed instances');
  }

  // Update status
  const [updated] = await db('workflow_instances')
    .where({ id: instanceId })
    .update({
      status: WorkflowInstanceStatus.CANCELLED,
      error_message: reason || 'Cancelled by user',
      completed_at: new Date()
    })
    .returning('*');

  // Record in history
  await db('workflow_history').insert({
    instance_id: instanceId,
    action: 'cancelled',
    input_data: { reason }
  });

  console.log(`[ExecutionService] Cancelled workflow instance ${instanceId}`);

  return transformInstance(updated);
}

/**
 * Retry a failed workflow instance
 */
export async function retryInstance(
  instanceId: string,
  workflowId: string,
  organizationId: string
): Promise<WorkflowInstance | null> {
  // Verify instance
  const instance = await getInstance(instanceId, workflowId, organizationId);
  if (!instance) {
    return null;
  }

  if (instance.status !== WorkflowInstanceStatus.FAILED) {
    throw new WorkflowExecutionError('Can only retry failed instances');
  }

  // Get workflow
  const workflow = await workflowService.getWorkflow(workflowId, organizationId);
  if (!workflow) {
    throw new WorkflowExecutionError('Workflow not found');
  }

  // Create new instance with same data
  const newInstance = await startWorkflow({
    workflowId,
    organizationId,
    userId: instance.userId,
    initialData: instance.formData,
    triggeredBy: WorkflowTriggerType.MANUAL,
    metadata: {
      retriedFrom: instanceId,
      retryAttempt: (instance.context.metadata?.retryAttempt || 0) + 1
    }
  });

  console.log(`[ExecutionService] Created retry instance ${newInstance.id} from ${instanceId}`);

  return newInstance;
}

/**
 * Get instance execution timeline
 */
export async function getInstanceTimeline(
  instanceId: string,
  workflowId: string,
  organizationId: string
): Promise<WorkflowHistoryEntry[]> {
  // Verify instance
  const instance = await getInstance(instanceId, workflowId, organizationId);
  if (!instance) {
    throw new WorkflowExecutionError('Instance not found');
  }

  // Get history entries
  const history = await db('workflow_history')
    .where('instance_id', instanceId)
    .orderBy('created_at', 'asc');

  return history.map(transformHistoryEntry);
}

/**
 * Get system health metrics
 */
export async function getSystemHealth(
  organizationId: string
): Promise<any> {
  // Get active instances count
  const activeInstances = await db('workflow_instances')
    .where('organization_id', organizationId)
    .whereIn('status', ['running', 'paused', 'waiting'])
    .count('* as count')
    .first();

  // Get queued actions
  const queuedActions = await db('workflow_scheduled_tasks')
    .join('workflow_instances', 'workflow_scheduled_tasks.instance_id', 'workflow_instances.id')
    .where('workflow_instances.organization_id', organizationId)
    .where('workflow_scheduled_tasks.is_executed', false)
    .where('workflow_scheduled_tasks.scheduled_for', '<=', new Date())
    .count('* as count')
    .first();

  // Get recent error rate
  const recentInstances = await db('workflow_instances')
    .where('organization_id', organizationId)
    .where('started_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as failed', ['failed'])
    )
    .first();

  const errorRate = recentInstances?.total
    ? (parseInt(recentInstances.failed) / parseInt(recentInstances.total)) * 100
    : 0;

  // Get average response time
  const avgResponseTime = await db('workflow_history')
    .join('workflow_instances', 'workflow_history.instance_id', 'workflow_instances.id')
    .where('workflow_instances.organization_id', organizationId)
    .where('workflow_history.created_at', '>=', new Date(Date.now() - 60 * 60 * 1000)) // Last hour
    .avg('workflow_history.duration_ms as avg')
    .first();

  return {
    status: 'healthy',
    metrics: {
      activeInstances: parseInt(activeInstances?.count || '0'),
      queuedActions: parseInt(queuedActions?.count || '0'),
      workerStatus: 'running',
      averageResponseTime: parseFloat(avgResponseTime?.avg || '0'),
      errorRate: errorRate.toFixed(2)
    },
    timestamp: new Date()
  };
}

/**
 * Handle approval response
 */
export async function handleApproval(
  instanceId: string,
  nodeId: string,
  decision: 'approved' | 'rejected',
  approverId: string,
  comments?: string
): Promise<void> {
  // Get instance
  const instance = await db('workflow_instances')
    .where('id', instanceId)
    .where('status', WorkflowInstanceStatus.WAITING)
    .first();

  if (!instance) {
    throw new WorkflowExecutionError('Instance not found or not waiting for approval');
  }

  // Record approval in history
  await db('workflow_history').insert({
    instance_id: instanceId,
    node_id: nodeId,
    action: 'approval_received',
    input_data: {
      decision,
      approverId,
      comments
    }
  });

  // Update context with approval decision
  const context = instance.context || {};
  context.variables = context.variables || {};
  context.variables[`approval_${nodeId}_decision`] = decision;
  context.variables[`approval_${nodeId}_approver`] = approverId;
  context.variables[`approval_${nodeId}_comments`] = comments;

  await db('workflow_instances')
    .where('id', instanceId)
    .update({
      context,
      status: WorkflowInstanceStatus.RUNNING
    });

  // Resume workflow
  const engine = getEngine();
  await engine.resumeWorkflow(instanceId);

  console.log(`[ExecutionService] Handled approval for instance ${instanceId}, node ${nodeId}: ${decision}`);
}

/**
 * Process scheduled tasks (called by worker)
 */
export async function processScheduledTasks(): Promise<void> {
  // Get tasks that are due
  const tasks = await db('workflow_scheduled_tasks')
    .where('scheduled_for', '<=', new Date())
    .where('is_executed', false)
    .orderBy('scheduled_for', 'asc')
    .limit(10);

  for (const task of tasks) {
    try {
      await processTask(task);

      // Mark as executed
      await db('workflow_scheduled_tasks')
        .where('id', task.id)
        .update({
          is_executed: true,
          executed_at: new Date()
        });
    } catch (error) {
      console.error(`[ExecutionService] Error processing task ${task.id}:`, error);

      // Update retry count
      await db('workflow_scheduled_tasks')
        .where('id', task.id)
        .update({
          retry_count: task.retry_count + 1,
          error_message: (error as Error).message
        });

      // Mark as failed if max retries reached
      if (task.retry_count >= task.max_retries) {
        await db('workflow_scheduled_tasks')
          .where('id', task.id)
          .update({ is_executed: true });
      }
    }
  }
}

/**
 * Process a single scheduled task
 */
async function processTask(task: any): Promise<void> {
  const { instance_id, node_id, task_type, data } = task;

  switch (task_type) {
    case 'wait':
      // Resume workflow after wait period
      const engine = getEngine();
      await engine.resumeWorkflow(instance_id);
      break;

    case 'reminder':
      // Send reminder notification
      console.log(`[ExecutionService] Sending reminder for instance ${instance_id}`);
      // TODO: Implement reminder notification
      break;

    case 'timeout':
      // Handle timeout
      await db('workflow_instances')
        .where('id', instance_id)
        .update({
          status: WorkflowInstanceStatus.FAILED,
          error_message: 'Workflow timed out',
          failed_at: new Date()
        });
      break;

    case 'escalation':
      // Handle escalation
      console.log(`[ExecutionService] Escalating to ${data.escalateTo}`);
      // TODO: Implement escalation logic
      break;

    default:
      console.warn(`[ExecutionService] Unknown task type: ${task_type}`);
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Transform database record to WorkflowInstance type
 */
function transformInstance(record: any): WorkflowInstance {
  return {
    id: record.id,
    workflowId: record.workflow_id,
    organizationId: record.organization_id,
    userId: record.user_id,
    status: record.status,
    currentNodeId: record.current_node_id,
    progress: record.progress || 0,
    context: record.context || {},
    formData: record.form_data || {},
    variables: record.variables || {},
    triggeredBy: record.triggered_by,
    triggerData: record.trigger_data,
    errorMessage: record.error_message,
    errorDetails: record.error_details,
    startedAt: new Date(record.started_at),
    pausedAt: record.paused_at ? new Date(record.paused_at) : undefined,
    resumedAt: record.resumed_at ? new Date(record.resumed_at) : undefined,
    completedAt: record.completed_at ? new Date(record.completed_at) : undefined,
    failedAt: record.failed_at ? new Date(record.failed_at) : undefined,
    executionTimeMs: record.execution_time_ms
  };
}

/**
 * Transform database record to WorkflowHistoryEntry type
 */
function transformHistoryEntry(record: any): WorkflowHistoryEntry {
  return {
    id: record.id,
    instanceId: record.instance_id,
    nodeId: record.node_id,
    nodeType: record.node_type,
    action: record.action,
    inputData: record.input_data,
    outputData: record.output_data,
    errorData: record.error_data,
    durationMs: record.duration_ms,
    createdAt: new Date(record.created_at)
  };
}