/**
 * Zod Validation Schemas for Workflow System
 * Used for API request validation and data integrity
 */

import { z } from 'zod';
import {
  WorkflowStatus,
  WorkflowNodeType,
  WorkflowInstanceStatus,
  WorkflowActionType,
  WhatsAppSessionStatus,
  WorkflowTriggerType
} from './types';

// ============================================================
// BASIC SCHEMAS
// ============================================================

export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'exists', 'in', 'not_in']),
  value: z.any(),
  dataType: z.enum(['string', 'number', 'boolean', 'date', 'array']).optional()
});

export const workflowVariableSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['string', 'number', 'boolean', 'date', 'object', 'array']),
  defaultValue: z.any().optional(),
  required: z.boolean().optional(),
  description: z.string().optional()
});

// ============================================================
// NODE SCHEMAS
// ============================================================

const baseNodeSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.nativeEnum(WorkflowNodeType),
  position: nodePositionSchema,
  data: z.record(z.any())
});

export const formNodeSchema = baseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.FORM),
  data: z.object({
    formId: z.string().uuid(),
    formName: z.string().optional(),
    required: z.array(z.string()).optional(),
    optional: z.array(z.string()).optional(),
    prefillMapping: z.record(z.string()).optional(),
    validation: z.record(z.any()).optional()
  })
});

export const conditionNodeSchema = baseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.CONDITION),
  data: z.object({
    conditions: z.array(conditionSchema).min(1),
    operator: z.enum(['AND', 'OR']),
    defaultPath: z.string().optional()
  })
});

export const actionNodeSchema = baseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.ACTION),
  data: z.object({
    actionType: z.nativeEnum(WorkflowActionType),
    config: z.record(z.any()),
    retryPolicy: z.object({
      maxRetries: z.number().int().min(0).max(10),
      retryDelay: z.number().int().min(1000).max(3600000),
      backoffMultiplier: z.number().optional(),
      retryOn: z.array(z.number()).optional()
    }).optional()
  })
});

export const waitNodeSchema = baseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.WAIT),
  data: z.object({
    waitType: z.enum(['time', 'event', 'condition']),
    duration: z.number().int().min(0).optional(),
    eventType: z.string().optional(),
    condition: conditionSchema.optional(),
    timeout: z.number().int().min(0).optional()
  })
});

export const approvalNodeSchema = baseNodeSchema.extend({
  type: z.literal(WorkflowNodeType.APPROVAL),
  data: z.object({
    approverType: z.enum(['user', 'role', 'dynamic']),
    approverIds: z.array(z.string().uuid()).optional(),
    approverRole: z.string().optional(),
    approverField: z.string().optional(),
    options: z.array(z.string()).optional(),
    escalation: z.object({
      timeout: z.number().int().min(60000),
      escalateTo: z.string(),
      reminderInterval: z.number().int().optional(),
      maxReminders: z.number().int().max(10).optional()
    }).optional()
  })
});

export const workflowNodeSchema = z.union([
  formNodeSchema,
  conditionNodeSchema,
  actionNodeSchema,
  waitNodeSchema,
  approvalNodeSchema,
  baseNodeSchema // For start/end nodes
]);

// ============================================================
// CONNECTION SCHEMA
// ============================================================

export const workflowConnectionSchema = z.object({
  id: z.string().optional(),
  from: z.string().min(1),
  to: z.string().min(1),
  condition: conditionSchema.optional(),
  label: z.string().optional()
});

// ============================================================
// WORKFLOW DEFINITION SCHEMA
// ============================================================

export const workflowTriggerSchema = z.object({
  type: z.nativeEnum(WorkflowTriggerType),
  config: z.record(z.any()),
  enabled: z.boolean()
});

export const workflowConfigSchema = z.object({
  maxExecutionTime: z.number().int().min(1000).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  errorHandling: z.enum(['stop', 'continue', 'rollback']).optional(),
  notifications: z.object({
    onStart: z.boolean().optional(),
    onComplete: z.boolean().optional(),
    onFail: z.boolean().optional(),
    channels: z.array(z.enum(['email', 'whatsapp', 'in_app'])).optional(),
    recipients: z.array(z.string()).optional()
  }).optional(),
  businessHours: z.object({
    timezone: z.string(),
    workDays: z.array(z.number().int().min(0).max(6)),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    holidays: z.array(z.date()).optional()
  }).optional()
});

export const workflowDefinitionSchema = z.object({
  nodes: z.array(workflowNodeSchema).min(2), // At least start and end
  connections: z.array(workflowConnectionSchema),
  variables: z.array(workflowVariableSchema).optional(),
  config: workflowConfigSchema.optional()
});

// ============================================================
// API REQUEST SCHEMAS
// ============================================================

// Create workflow request
export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  definition: workflowDefinitionSchema,
  triggers: z.array(workflowTriggerSchema).optional()
});

// Update workflow request
export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  definition: workflowDefinitionSchema.optional(),
  triggers: z.array(workflowTriggerSchema).optional(),
  status: z.nativeEnum(WorkflowStatus).optional()
});

// Execute workflow request
export const executeWorkflowSchema = z.object({
  initialData: z.record(z.any()).optional(),
  triggeredBy: z.nativeEnum(WorkflowTriggerType).optional(),
  metadata: z.record(z.any()).optional()
});

// WhatsApp session start request
export const startWhatsAppSessionSchema = z.object({
  workflowId: z.string().uuid(),
  channelId: z.string().uuid(),
  recipientPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
  language: z.string().length(2).default('he')
});

// WhatsApp message processing request
export const processWhatsAppMessageSchema = z.object({
  message: z.string().min(1),
  type: z.enum(['text', 'image', 'document', 'audio']).default('text'),
  mediaUrl: z.string().url().optional()
});

// ============================================================
// QUERY PARAMETER SCHEMAS
// ============================================================

export const workflowListQuerySchema = z.object({
  status: z.nativeEnum(WorkflowStatus).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const instanceListQuerySchema = z.object({
  status: z.nativeEnum(WorkflowInstanceStatus).optional(),
  userId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const analyticsQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day')
});

// ============================================================
// ACTION CONFIG SCHEMAS
// ============================================================

export const whatsappActionConfigSchema = z.object({
  channelId: z.string().uuid(),
  recipientPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  template: z.string().optional(),
  message: z.string().optional(),
  mediaUrl: z.string().url().optional()
});

export const emailActionConfigSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  attachments: z.array(z.string()).optional(),
  template: z.string().optional()
});

export const webhookActionConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  authentication: z.object({
    type: z.enum(['none', 'bearer', 'basic', 'api_key', 'oauth2']),
    credentials: z.record(z.string()).optional()
  }).optional()
});

// ============================================================
// WEBHOOK SCHEMAS
// ============================================================

export const registerWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).optional()
});

export const webhookTriggerSchema = z.object({
  trigger: z.string(),
  data: z.record(z.any())
});

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Validates that a workflow definition is well-formed
 */
export function validateWorkflowDefinition(definition: any): boolean {
  try {
    workflowDefinitionSchema.parse(definition);

    // Additional validations
    const nodeIds = new Set(definition.nodes.map((n: any) => n.id));

    // Check for start and end nodes
    const hasStart = definition.nodes.some((n: any) => n.type === 'start');
    const hasEnd = definition.nodes.some((n: any) => n.type === 'end');
    if (!hasStart || !hasEnd) {
      throw new Error('Workflow must have start and end nodes');
    }

    // Validate connections reference existing nodes
    for (const connection of definition.connections) {
      if (!nodeIds.has(connection.from) || !nodeIds.has(connection.to)) {
        throw new Error(`Invalid connection: ${connection.from} -> ${connection.to}`);
      }
    }

    // Check for orphaned nodes (except start)
    const connectedNodes = new Set();
    definition.connections.forEach((c: any) => {
      connectedNodes.add(c.from);
      connectedNodes.add(c.to);
    });

    for (const node of definition.nodes) {
      if (node.type !== 'start' && !connectedNodes.has(node.id)) {
        throw new Error(`Orphaned node: ${node.id}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Workflow validation error:', error);
    return false;
  }
}

/**
 * Validates WhatsApp phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // E.164 format validation
  const e164Regex = /^\+?[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Validates Hebrew text (for WhatsApp messages)
 */
export function validateHebrewText(text: string): boolean {
  // Check for Hebrew characters
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
}

// ============================================================
// TYPE GUARDS
// ============================================================

export function isFormNode(node: any): node is z.infer<typeof formNodeSchema> {
  return node.type === WorkflowNodeType.FORM;
}

export function isConditionNode(node: any): node is z.infer<typeof conditionNodeSchema> {
  return node.type === WorkflowNodeType.CONDITION;
}

export function isActionNode(node: any): node is z.infer<typeof actionNodeSchema> {
  return node.type === WorkflowNodeType.ACTION;
}

export function isWaitNode(node: any): node is z.infer<typeof waitNodeSchema> {
  return node.type === WorkflowNodeType.WAIT;
}

export function isApprovalNode(node: any): node is z.infer<typeof approvalNodeSchema> {
  return node.type === WorkflowNodeType.APPROVAL;
}