/**
 * Workflow Service
 * Handles business logic for workflow management
 */

import { db } from '../../db';
import {
  Workflow,
  WorkflowStatus,
  WorkflowDefinition,
  WorkflowListResponse,
  WorkflowTemplate,
  WorkflowAnalytics,
  WorkflowValidationError
} from './types';
import { validateWorkflowDefinition } from './validation';

/**
 * List workflows for an organization
 */
export async function listWorkflows(params: {
  organizationId: string;
  status?: WorkflowStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<WorkflowListResponse> {
  const { organizationId, status, search, limit = 20, offset = 0 } = params;

  let query = db('workflows')
    .where('organization_id', organizationId)
    .orderBy('created_at', 'desc');

  // Apply filters
  if (status) {
    query = query.where('status', status);
  }

  if (search) {
    query = query.where(function() {
      this.where('name', 'ilike', `%${search}%`)
        .orWhere('description', 'ilike', `%${search}%`);
    });
  }

  // Get total count
  const countResult = await query.clone().count('* as total').first() as { total?: string | number } | undefined;
  const total = parseInt(String(countResult?.total || '0'));

  // Get paginated results
  const workflows = await query
    .limit(limit)
    .offset(offset)
    .select(
      'id',
      'name',
      'description',
      'status',
      'version',
      'definition',
      'triggers',
      'created_by',
      'updated_by',
      'published_by',
      'published_at',
      'created_at',
      'updated_at'
    );

  // Transform to proper types
  const data = workflows.map(transformWorkflow);

  return {
    data,
    total,
    limit,
    offset
  };
}

/**
 * Get a single workflow
 */
export async function getWorkflow(
  id: string,
  organizationId: string
): Promise<Workflow | null> {
  const workflow = await db('workflows')
    .where({ id, organization_id: organizationId })
    .first();

  if (!workflow) {
    return null;
  }

  return transformWorkflow(workflow);
}

/**
 * Create a new workflow
 */
export async function createWorkflow(params: {
  organizationId: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  triggers?: any[];
  createdBy: string;
}): Promise<Workflow> {
  const { organizationId, name, description, definition, triggers, createdBy } = params;

  // Validate workflow definition
  if (!validateWorkflowDefinition(definition)) {
    throw new WorkflowValidationError('Invalid workflow definition');
  }

  // Check for duplicate name
  const existing = await db('workflows')
    .where({ organization_id: organizationId, name })
    .first();

  if (existing) {
    throw new WorkflowValidationError(`Workflow with name "${name}" already exists`);
  }

  // Create workflow
  const [workflow] = await db('workflows')
    .insert({
      organization_id: organizationId,
      name,
      description,
      status: WorkflowStatus.DRAFT,
      version: 1,
      definition,
      config: definition.config || {},
      triggers: triggers || [],
      variables: definition.variables || [],
      created_by: createdBy,
      updated_by: createdBy
    })
    .returning('*');

  console.log(`[WorkflowService] Created workflow ${workflow.id}: ${name}`);

  return transformWorkflow(workflow);
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  id: string,
  updates: {
    name?: string;
    description?: string;
    definition?: WorkflowDefinition;
    triggers?: any[];
    status?: WorkflowStatus;
    updatedBy: string;
  },
  organizationId: string
): Promise<Workflow | null> {
  const { name, description, definition, triggers, status, updatedBy } = updates;

  // Check if workflow exists
  const existing = await db('workflows')
    .where({ id, organization_id: organizationId })
    .first();

  if (!existing) {
    return null;
  }

  // Validate definition if provided
  if (definition && !validateWorkflowDefinition(definition)) {
    throw new WorkflowValidationError('Invalid workflow definition');
  }

  // Check for duplicate name if changing
  if (name && name !== existing.name) {
    const duplicate = await db('workflows')
      .where({ organization_id: organizationId, name })
      .whereNot('id', id)
      .first();

    if (duplicate) {
      throw new WorkflowValidationError(`Workflow with name "${name}" already exists`);
    }
  }

  // Build update object
  const updateData: any = {
    updated_by: updatedBy,
    updated_at: new Date()
  };

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (definition !== undefined) {
    updateData.definition = definition;
    updateData.config = definition.config || {};
    updateData.variables = definition.variables || [];
    updateData.version = existing.version + 1;
  }
  if (triggers !== undefined) updateData.triggers = triggers;
  if (status !== undefined) updateData.status = status;

  // Update workflow
  const [updated] = await db('workflows')
    .where({ id, organization_id: organizationId })
    .update(updateData)
    .returning('*');

  console.log(`[WorkflowService] Updated workflow ${id}`);

  return transformWorkflow(updated);
}

/**
 * Archive (soft delete) a workflow
 */
export async function archiveWorkflow(
  id: string,
  organizationId: string
): Promise<boolean> {
  // Check if workflow exists and is not already archived
  const workflow = await db('workflows')
    .where({ id, organization_id: organizationId })
    .whereNot('status', WorkflowStatus.ARCHIVED)
    .first();

  if (!workflow) {
    return false;
  }

  // Check for active instances
  const activeInstances = await db('workflow_instances')
    .where('workflow_id', id)
    .whereIn('status', ['running', 'paused', 'waiting'])
    .count('* as count')
    .first() as { count?: string | number } | undefined;

  if (activeInstances && parseInt(String(activeInstances.count)) > 0) {
    throw new WorkflowValidationError(
      'Cannot archive workflow with active instances'
    );
  }

  // Archive workflow
  await db('workflows')
    .where({ id, organization_id: organizationId })
    .update({
      status: WorkflowStatus.ARCHIVED,
      updated_at: new Date()
    });

  console.log(`[WorkflowService] Archived workflow ${id}`);

  return true;
}

/**
 * Publish a workflow
 */
export async function publishWorkflow(
  id: string,
  userId: string,
  organizationId: string
): Promise<Workflow | null> {
  const workflow = await db('workflows')
    .where({ id, organization_id: organizationId })
    .where('status', WorkflowStatus.DRAFT)
    .first();

  if (!workflow) {
    return null;
  }

  // Validate before publishing
  if (!validateWorkflowDefinition(workflow.definition)) {
    throw new WorkflowValidationError(
      'Cannot publish workflow with invalid definition'
    );
  }

  // Update status to published
  const [updated] = await db('workflows')
    .where({ id, organization_id: organizationId })
    .update({
      status: WorkflowStatus.PUBLISHED,
      published_by: userId,
      published_at: new Date(),
      updated_at: new Date()
    })
    .returning('*');

  console.log(`[WorkflowService] Published workflow ${id}`);

  return transformWorkflow(updated);
}

/**
 * Duplicate a workflow
 */
export async function duplicateWorkflow(
  id: string,
  newName: string,
  userId: string,
  organizationId: string
): Promise<Workflow | null> {
  const original = await db('workflows')
    .where({ id, organization_id: organizationId })
    .first();

  if (!original) {
    return null;
  }

  // Generate unique name if needed
  let uniqueName = newName || `${original.name} Copy`;
  let counter = 1;

  while (true) {
    const existing = await db('workflows')
      .where({ organization_id: organizationId, name: uniqueName })
      .first();

    if (!existing) break;

    uniqueName = `${newName || original.name} Copy ${++counter}`;
  }

  // Create duplicate
  const [duplicate] = await db('workflows')
    .insert({
      organization_id: organizationId,
      name: uniqueName,
      description: original.description,
      status: WorkflowStatus.DRAFT,
      version: 1,
      definition: original.definition,
      config: original.config,
      triggers: original.triggers,
      variables: original.variables,
      created_by: userId,
      updated_by: userId
    })
    .returning('*');

  console.log(`[WorkflowService] Duplicated workflow ${id} as ${duplicate.id}`);

  return transformWorkflow(duplicate);
}

/**
 * Get workflow analytics
 */
export async function getAnalytics(
  workflowId: string,
  organizationId: string,
  params: {
    from: Date;
    to: Date;
    granularity: 'hour' | 'day' | 'week' | 'month';
  }
): Promise<any> {
  const { from, to, granularity } = params;

  // Verify workflow belongs to organization
  const workflow = await db('workflows')
    .where({ id: workflowId, organization_id: organizationId })
    .first();

  if (!workflow) {
    throw new WorkflowValidationError('Workflow not found');
  }

  // Get aggregated analytics
  const analytics = await db('workflow_analytics')
    .where('workflow_id', workflowId)
    .whereBetween('date', [from, to])
    .orderBy('date', 'asc');

  // Get instance statistics
  interface InstanceStatsResult {
    total_executions?: string | number;
    completed?: string | number;
    failed?: string | number;
    cancelled?: string | number;
    avg_duration?: string | number;
    min_duration?: string | number;
    max_duration?: string | number;
  }
  const instanceStats = await db('workflow_instances')
    .where('workflow_id', workflowId)
    .whereBetween('started_at', [from, to])
    .select(
      db.raw('COUNT(*) as total_executions'),
      db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed', ['completed']),
      db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as failed', ['failed']),
      db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as cancelled', ['cancelled']),
      db.raw('AVG(execution_time_ms) as avg_duration'),
      db.raw('MIN(execution_time_ms) as min_duration'),
      db.raw('MAX(execution_time_ms) as max_duration')
    )
    .first() as InstanceStatsResult | undefined;

  // Get bottleneck analysis
  const bottlenecks = await db('workflow_history')
    .join('workflow_instances', 'workflow_history.instance_id', 'workflow_instances.id')
    .where('workflow_instances.workflow_id', workflowId)
    .whereBetween('workflow_history.created_at', [from, to])
    .groupBy('workflow_history.node_id')
    .select(
      'workflow_history.node_id',
      db.raw('AVG(duration_ms) as avg_duration'),
      db.raw('COUNT(*) as executions'),
      db.raw('COUNT(CASE WHEN action = ? THEN 1 END) as failures', ['failed'])
    )
    .orderBy('avg_duration', 'desc')
    .limit(5);

  return {
    workflowId,
    period: { from, to },
    metrics: {
      totalExecutions: parseInt(String(instanceStats?.total_executions || '0')),
      completedExecutions: parseInt(String(instanceStats?.completed || '0')),
      failedExecutions: parseInt(String(instanceStats?.failed || '0')),
      cancelledExecutions: parseInt(String(instanceStats?.cancelled || '0')),
      averageDuration: parseFloat(String(instanceStats?.avg_duration || '0')),
      minDuration: parseFloat(String(instanceStats?.min_duration || '0')),
      maxDuration: parseFloat(String(instanceStats?.max_duration || '0')),
      completionRate: instanceStats?.total_executions
        ? (parseInt(String(instanceStats.completed)) / parseInt(String(instanceStats.total_executions))) * 100
        : 0,
      bottlenecks: (bottlenecks as any[]).map(b => ({
        nodeId: b.node_id,
        averageWaitTime: parseFloat(String(b.avg_duration || '0')),
        failureRate: b.executions ? (parseInt(String(b.failures)) / parseInt(String(b.executions))) * 100 : 0
      }))
    },
    timeline: analytics.map((a: any) => ({
      date: a.date,
      executions: a.total_executions,
      completed: a.completed_executions,
      failed: a.failed_executions
    }))
  };
}

/**
 * Get workflow templates
 */
export async function getTemplates(params: {
  category?: string;
  search?: string;
  isPublic?: boolean;
  organizationId?: string;
}): Promise<WorkflowTemplate[]> {
  const { category, search, isPublic, organizationId } = params;

  let query = db('workflow_templates');

  // Filter by organization or public
  if (organizationId) {
    query = query.where(function() {
      this.where('organization_id', organizationId)
        .orWhere('is_public', true);
    });
  } else if (isPublic !== undefined) {
    query = query.where('is_public', isPublic);
  }

  // Filter by category
  if (category) {
    query = query.where('category', category);
  }

  // Search
  if (search) {
    query = query.where(function() {
      this.where('name', 'ilike', `%${search}%`)
        .orWhere('description', 'ilike', `%${search}%`);
    });
  }

  const templates = await query.orderBy('popularity', 'desc');

  return templates;
}

/**
 * Create workflow from template
 */
export async function createFromTemplate(
  templateId: string,
  params: {
    organizationId: string;
    name: string;
    customization?: Record<string, any>;
    createdBy: string;
  }
): Promise<Workflow> {
  const { organizationId, name, customization, createdBy } = params;

  // Get template
  const template = await db('workflow_templates')
    .where('id', templateId)
    .where(function() {
      this.where('organization_id', organizationId)
        .orWhere('is_public', true);
    })
    .first();

  if (!template) {
    throw new WorkflowValidationError('Template not found');
  }

  // Apply customizations to definition
  let definition = { ...template.definition };
  if (customization?.variables) {
    definition.variables = definition.variables?.map((v: any) => ({
      ...v,
      defaultValue: customization.variables[v.name] || v.defaultValue
    }));
  }

  // Create workflow from template
  const workflow = await createWorkflow({
    organizationId,
    name,
    description: `Created from template: ${template.name}`,
    definition,
    createdBy
  });

  // Increment template usage
  await db('workflow_templates')
    .where('id', templateId)
    .increment('popularity', 1);

  return workflow;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Transform database record to Workflow type
 */
function transformWorkflow(record: any): Workflow {
  return {
    id: record.id,
    organizationId: record.organization_id,
    name: record.name,
    description: record.description,
    status: record.status,
    version: record.version,
    definition: record.definition,
    triggers: record.triggers,
    createdBy: record.created_by,
    updatedBy: record.updated_by,
    publishedBy: record.published_by,
    publishedAt: record.published_at ? new Date(record.published_at) : undefined,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  };
}