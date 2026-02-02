/**
 * WorkflowEngine - Core workflow execution engine
 * Handles node traversal, state management, and execution logic
 */

import { Redis } from 'ioredis';
import { getRedisClient } from '../../utils/redis';
import { db } from '../../db';
import {
  Workflow,
  WorkflowInstance,
  WorkflowNode,
  WorkflowConnection,
  WorkflowContext,
  WorkflowHistoryEntry,
  WorkflowInstanceStatus,
  WorkflowNodeType,
  FormNode,
  ConditionNode,
  ActionNode,
  WaitNode,
  ApprovalNode,
  WorkflowExecutionError,
  WorkflowTimeoutError
} from './types';
import { ConditionEvaluator } from './ConditionEvaluator';
import { ActionExecutor } from './ActionExecutor';
import { StateManager } from './StateManager';
import { validateWorkflowDefinition } from './validation';
import { EventEmitter } from 'events';

export class WorkflowEngine extends EventEmitter {
  private redis: Redis;
  private conditionEvaluator: ConditionEvaluator;
  private actionExecutor: ActionExecutor;
  private stateManager: StateManager;

  constructor() {
    super();
    this.redis = getRedisClient();
    this.conditionEvaluator = new ConditionEvaluator();
    this.actionExecutor = new ActionExecutor();
    this.stateManager = new StateManager(this.redis);
  }

  /**
   * Start a new workflow instance
   */
  async startWorkflow(
    workflow: Workflow,
    initialData: Record<string, any> = {},
    userId?: string,
    triggeredBy: string = 'manual'
  ): Promise<WorkflowInstance> {
    // Validate workflow definition
    if (!validateWorkflowDefinition(workflow.definition)) {
      throw new WorkflowExecutionError('Invalid workflow definition');
    }

    // Find start node
    const startNode = workflow.definition.nodes.find(
      node => node.type === WorkflowNodeType.START
    );

    if (!startNode) {
      throw new WorkflowExecutionError('No start node found in workflow');
    }

    // Create workflow instance
    const instance = await this.createInstance(
      workflow,
      userId,
      triggeredBy,
      initialData
    );

    // Save initial state
    await this.stateManager.saveState(instance.id, {
      currentNode: startNode,
      previousNodeId: undefined,
      visitedNodes: [],
      pendingNodes: [],
      formData: initialData,
      variables: workflow.definition.variables?.reduce((acc, v) => {
        acc[v.name] = v.defaultValue;
        return acc;
      }, {} as Record<string, any>) || {},
      metadata: {
        startTime: Date.now()
      }
    });

    // Start execution
    this.executeNode(instance, startNode).catch(error => {
      console.error(`[WorkflowEngine] Execution error for instance ${instance.id}:`, error);
      this.handleExecutionError(instance, error);
    });

    return instance;
  }

  /**
   * Resume a paused workflow instance
   */
  async resumeWorkflow(instanceId: string): Promise<void> {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      throw new WorkflowExecutionError('Instance not found');
    }

    if (instance.status !== WorkflowInstanceStatus.PAUSED) {
      throw new WorkflowExecutionError('Instance is not paused');
    }

    // Update instance status
    await db('workflow_instances')
      .where('id', instanceId)
      .update({
        status: WorkflowInstanceStatus.RUNNING,
        resumed_at: new Date()
      });

    // Get current state
    const context = await this.stateManager.getState(instanceId);
    if (!context || !context.currentNode) {
      throw new WorkflowExecutionError('No saved state found');
    }

    // Resume execution from current node
    this.executeNode(
      { ...instance, status: WorkflowInstanceStatus.RUNNING },
      context.currentNode
    );
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    instance: WorkflowInstance,
    node: WorkflowNode
  ): Promise<void> {
    console.log(`[WorkflowEngine] Executing node ${node.id} of type ${node.type}`);

    // Record node entry
    await this.recordHistory(instance.id, {
      nodeId: node.id,
      nodeType: node.type,
      action: 'entered',
      inputData: instance.context
    });

    // Update current node
    await this.updateInstanceNode(instance.id, node.id);

    try {
      switch (node.type) {
        case WorkflowNodeType.START:
          await this.handleStartNode(instance, node);
          break;

        case WorkflowNodeType.END:
          await this.handleEndNode(instance, node);
          break;

        case WorkflowNodeType.FORM:
          await this.handleFormNode(instance, node as FormNode);
          break;

        case WorkflowNodeType.CONDITION:
          await this.handleConditionNode(instance, node as ConditionNode);
          break;

        case WorkflowNodeType.ACTION:
          await this.handleActionNode(instance, node as ActionNode);
          break;

        case WorkflowNodeType.WAIT:
          await this.handleWaitNode(instance, node as WaitNode);
          break;

        case WorkflowNodeType.APPROVAL:
          await this.handleApprovalNode(instance, node as ApprovalNode);
          break;

        default:
          throw new WorkflowExecutionError(`Unknown node type: ${node.type}`);
      }

      // Record successful completion
      await this.recordHistory(instance.id, {
        nodeId: node.id,
        nodeType: node.type,
        action: 'completed',
        outputData: instance.context
      });

    } catch (error) {
      // Record failure
      await this.recordHistory(instance.id, {
        nodeId: node.id,
        nodeType: node.type,
        action: 'failed',
        errorData: { message: (error as Error).message }
      });

      throw error;
    }
  }

  /**
   * Handle start node
   */
  private async handleStartNode(
    instance: WorkflowInstance,
    node: WorkflowNode
  ): Promise<void> {
    // Get workflow definition
    const workflow = await this.getWorkflow(instance.workflowId);

    // Find next node
    const connection = workflow.definition.connections.find(
      c => c.from === node.id
    );

    if (!connection) {
      throw new WorkflowExecutionError('No outgoing connection from start node');
    }

    const nextNode = workflow.definition.nodes.find(
      n => n.id === connection.to
    );

    if (!nextNode) {
      throw new WorkflowExecutionError(`Next node ${connection.to} not found`);
    }

    // Move to next node
    await this.moveToNode(instance, nextNode);
  }

  /**
   * Handle end node
   */
  private async handleEndNode(
    instance: WorkflowInstance,
    node: WorkflowNode
  ): Promise<void> {
    console.log(`[WorkflowEngine] Workflow instance ${instance.id} completed`);

    // Update instance status
    await db('workflow_instances')
      .where('id', instance.id)
      .update({
        status: WorkflowInstanceStatus.COMPLETED,
        completed_at: new Date(),
        progress: 100,
        execution_time_ms: Date.now() - new Date(instance.startedAt).getTime()
      });

    // Clear state from Redis
    await this.stateManager.clearState(instance.id);

    // Emit completion event
    this.emit('workflow:completed', {
      instanceId: instance.id,
      workflowId: instance.workflowId,
      result: instance.context
    });
  }

  /**
   * Handle form node
   */
  private async handleFormNode(
    instance: WorkflowInstance,
    node: FormNode
  ): Promise<void> {
    // In a real implementation, this would:
    // 1. Send form to user
    // 2. Wait for form submission
    // 3. Validate form data
    // 4. Store form data in context

    // For now, we'll simulate immediate form completion
    console.log(`[WorkflowEngine] Form node ${node.id}: ${node.data.formName || node.data.formId}`);

    // Update context with simulated form data
    const formData = {
      [`form_${node.id}`]: {
        submitted: true,
        timestamp: new Date()
      }
    };

    await this.updateContext(instance.id, {
      formData: { ...instance.context.formData, ...formData }
    });

    // Move to next node
    await this.moveToNextNode(instance, node);
  }

  /**
   * Handle condition node
   */
  private async handleConditionNode(
    instance: WorkflowInstance,
    node: ConditionNode
  ): Promise<void> {
    const { conditions, operator, defaultPath } = node.data;

    // Evaluate conditions
    const result = await this.conditionEvaluator.evaluate(
      conditions,
      operator,
      instance.context
    );

    console.log(`[WorkflowEngine] Condition evaluated to: ${result}`);

    // Get workflow definition
    const workflow = await this.getWorkflow(instance.workflowId);

    // Find the appropriate connection based on condition result
    const connections = workflow.definition.connections.filter(
      c => c.from === node.id
    );

    let targetConnection;
    for (const conn of connections) {
      if (conn.condition) {
        const condResult = await this.conditionEvaluator.evaluateSingle(
          conn.condition,
          instance.context
        );
        if (condResult) {
          targetConnection = conn;
          break;
        }
      }
    }

    // Use default path if no conditions matched
    if (!targetConnection && defaultPath) {
      targetConnection = connections.find(c => c.to === defaultPath);
    }

    if (!targetConnection) {
      throw new WorkflowExecutionError('No matching condition path found');
    }

    const nextNode = workflow.definition.nodes.find(
      n => n.id === targetConnection.to
    );

    if (!nextNode) {
      throw new WorkflowExecutionError(`Next node ${targetConnection.to} not found`);
    }

    await this.moveToNode(instance, nextNode);
  }

  /**
   * Handle action node
   */
  private async handleActionNode(
    instance: WorkflowInstance,
    node: ActionNode
  ): Promise<void> {
    const { actionType, config, retryPolicy } = node.data;

    console.log(`[WorkflowEngine] Executing action: ${actionType}`);

    try {
      // Execute action
      const result = await this.actionExecutor.execute(
        actionType,
        config,
        instance.context,
        retryPolicy
      );

      // Update context with action result
      await this.updateContext(instance.id, {
        variables: {
          ...instance.context.variables,
          [`action_${node.id}_result`]: result
        }
      });

      // Move to next node
      await this.moveToNextNode(instance, node);

    } catch (error) {
      console.error(`[WorkflowEngine] Action failed:`, error);

      // Check if we should continue on error
      const workflow = await this.getWorkflow(instance.workflowId);
      if (workflow.definition.config?.errorHandling === 'continue') {
        await this.moveToNextNode(instance, node);
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle wait node
   */
  private async handleWaitNode(
    instance: WorkflowInstance,
    node: WaitNode
  ): Promise<void> {
    const { waitType, duration, eventType, condition, timeout } = node.data;

    console.log(`[WorkflowEngine] Wait node: ${waitType}`);

    switch (waitType) {
      case 'time':
        if (!duration) {
          throw new WorkflowExecutionError('Duration required for time wait');
        }

        // Schedule task to resume after duration
        await this.scheduleTask(instance.id, node.id, 'wait', duration);

        // Update instance status to waiting
        await db('workflow_instances')
          .where('id', instance.id)
          .update({ status: WorkflowInstanceStatus.WAITING });
        break;

      case 'event':
        // Register event listener
        // In real implementation, would listen for external events
        console.log(`[WorkflowEngine] Waiting for event: ${eventType}`);

        // Update instance status
        await db('workflow_instances')
          .where('id', instance.id)
          .update({ status: WorkflowInstanceStatus.WAITING });
        break;

      case 'condition':
        // Check condition periodically
        // For now, simulate immediate completion
        const condResult = await this.conditionEvaluator.evaluateSingle(
          condition!,
          instance.context
        );

        if (condResult) {
          await this.moveToNextNode(instance, node);
        } else {
          // Schedule periodic check
          await this.scheduleTask(instance.id, node.id, 'condition_check', 60000); // Check every minute
        }
        break;
    }
  }

  /**
   * Handle approval node
   */
  private async handleApprovalNode(
    instance: WorkflowInstance,
    node: ApprovalNode
  ): Promise<void> {
    const { approverType, approverIds, approverRole, options, escalation } = node.data;

    console.log(`[WorkflowEngine] Approval required from: ${approverType}`);

    // Create approval task
    await db('workflow_scheduled_tasks').insert({
      instance_id: instance.id,
      node_id: node.id,
      task_type: 'approval',
      scheduled_for: new Date(),
      data: {
        approverType,
        approverIds,
        approverRole,
        options
      }
    });

    // Schedule escalation if defined
    if (escalation) {
      await this.scheduleTask(
        instance.id,
        node.id,
        'escalation',
        escalation.timeout,
        { escalateTo: escalation.escalateTo }
      );
    }

    // Update instance status
    await db('workflow_instances')
      .where('id', instance.id)
      .update({ status: WorkflowInstanceStatus.WAITING });

    // In real implementation, would notify approvers
    this.emit('approval:required', {
      instanceId: instance.id,
      nodeId: node.id,
      approvers: approverIds || [approverRole]
    });
  }

  /**
   * Move to next sequential node
   */
  private async moveToNextNode(
    instance: WorkflowInstance,
    currentNode: WorkflowNode
  ): Promise<void> {
    const workflow = await this.getWorkflow(instance.workflowId);

    const connection = workflow.definition.connections.find(
      c => c.from === currentNode.id
    );

    if (!connection) {
      // No next node, might be end of a branch
      console.log(`[WorkflowEngine] No next node from ${currentNode.id}`);
      return;
    }

    const nextNode = workflow.definition.nodes.find(
      n => n.id === connection.to
    );

    if (!nextNode) {
      throw new WorkflowExecutionError(`Next node ${connection.to} not found`);
    }

    await this.moveToNode(instance, nextNode);
  }

  /**
   * Move to a specific node
   */
  private async moveToNode(
    instance: WorkflowInstance,
    node: WorkflowNode
  ): Promise<void> {
    // Update state
    const context = await this.stateManager.getState(instance.id);
    if (context) {
      context.previousNodeId = context.currentNode?.id;
      context.currentNode = node;
      context.visitedNodes.push(node.id);
      await this.stateManager.saveState(instance.id, context);
    }

    // Continue execution
    await this.executeNode(instance, node);
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async createInstance(
    workflow: Workflow,
    userId: string | undefined,
    triggeredBy: string,
    initialData: Record<string, any>
  ): Promise<WorkflowInstance> {
    const [instance] = await db('workflow_instances')
      .insert({
        workflow_id: workflow.id,
        organization_id: workflow.organizationId,
        user_id: userId,
        status: WorkflowInstanceStatus.RUNNING,
        progress: 0,
        context: {},
        form_data: initialData,
        variables: {},
        triggered_by: triggeredBy,
        trigger_data: {}
      })
      .returning('*');

    return {
      ...instance,
      context: {
        currentNode: undefined,
        previousNodeId: undefined,
        visitedNodes: [],
        pendingNodes: [],
        formData: initialData,
        variables: {}
      }
    };
  }

  private async getInstance(instanceId: string): Promise<WorkflowInstance | null> {
    const instance = await db('workflow_instances')
      .where('id', instanceId)
      .first();

    if (!instance) return null;

    const context = await this.stateManager.getState(instanceId);

    return {
      ...instance,
      context: context || {}
    };
  }

  private async getWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = await db('workflows')
      .where('id', workflowId)
      .first();

    if (!workflow) {
      throw new WorkflowExecutionError('Workflow not found');
    }

    return workflow;
  }

  private async updateInstanceNode(instanceId: string, nodeId: string): Promise<void> {
    await db('workflow_instances')
      .where('id', instanceId)
      .update({
        current_node_id: nodeId,
        updated_at: new Date()
      });
  }

  private async updateContext(
    instanceId: string,
    updates: Partial<WorkflowContext>
  ): Promise<void> {
    const context = await this.stateManager.getState(instanceId);
    if (context) {
      Object.assign(context, updates);
      await this.stateManager.saveState(instanceId, context);
    }
  }

  private async recordHistory(
    instanceId: string,
    entry: Partial<WorkflowHistoryEntry>
  ): Promise<void> {
    await db('workflow_history').insert({
      instance_id: instanceId,
      ...entry
    });
  }

  private async scheduleTask(
    instanceId: string,
    nodeId: string,
    taskType: string,
    delayMs: number,
    data?: any
  ): Promise<void> {
    const scheduledFor = new Date(Date.now() + delayMs);

    await db('workflow_scheduled_tasks').insert({
      instance_id: instanceId,
      node_id: nodeId,
      task_type: taskType,
      scheduled_for: scheduledFor,
      data: data || {}
    });
  }

  private async handleExecutionError(
    instance: WorkflowInstance,
    error: Error
  ): Promise<void> {
    await db('workflow_instances')
      .where('id', instance.id)
      .update({
        status: WorkflowInstanceStatus.FAILED,
        error_message: error.message,
        error_details: { stack: error.stack },
        failed_at: new Date()
      });

    this.emit('workflow:failed', {
      instanceId: instance.id,
      workflowId: instance.workflowId,
      error: error.message
    });
  }
}