/**
 * Workflow System Type Definitions
 * Matches the database schema from 006_workflow_schema.sql
 */

// ============================================================
// ENUMS
// ============================================================

export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum WorkflowNodeType {
  START = 'start',
  END = 'end',
  FORM = 'form',
  CONDITION = 'condition',
  ACTION = 'action',
  WAIT = 'wait',
  APPROVAL = 'approval'
}

export enum WorkflowInstanceStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum WorkflowActionType {
  SEND_WHATSAPP = 'send_whatsapp',
  SEND_EMAIL = 'send_email',
  GENERATE_PDF = 'generate_pdf',
  CALL_WEBHOOK = 'call_webhook',
  UPDATE_DATABASE = 'update_database',
  CREATE_TASK = 'create_task',
  NOTIFY_USER = 'notify_user'
}

export enum WhatsAppSessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  ABANDONED = 'abandoned'
}

export enum WorkflowTriggerType {
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  API = 'api'
}

// ============================================================
// NODE DEFINITIONS
// ============================================================

export interface NodePosition {
  x: number;
  y: number;
}

// Base node interface
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: NodePosition;
  data: Record<string, any>;
}

// Specific node types
export interface FormNode extends WorkflowNode {
  type: WorkflowNodeType.FORM;
  data: {
    formId: string;
    formName?: string;
    required?: string[];
    optional?: string[];
    prefillMapping?: Record<string, string>;
    validation?: Record<string, any>;
  };
}

export interface ConditionNode extends WorkflowNode {
  type: WorkflowNodeType.CONDITION;
  data: {
    conditions: Condition[];
    operator: 'AND' | 'OR';
    defaultPath?: string; // Node ID for default path
  };
}

export interface ActionNode extends WorkflowNode {
  type: WorkflowNodeType.ACTION;
  data: {
    actionType: WorkflowActionType;
    config: ActionConfig;
    retryPolicy?: RetryPolicy;
  };
}

export interface WaitNode extends WorkflowNode {
  type: WorkflowNodeType.WAIT;
  data: {
    waitType: 'time' | 'event' | 'condition';
    duration?: number; // milliseconds
    eventType?: string;
    condition?: Condition;
    timeout?: number;
  };
}

export interface ApprovalNode extends WorkflowNode {
  type: WorkflowNodeType.APPROVAL;
  data: {
    approverType: 'user' | 'role' | 'dynamic';
    approverIds?: string[];
    approverRole?: string;
    approverField?: string; // Field to get approver from
    options?: string[];
    escalation?: EscalationRule;
  };
}

// ============================================================
// CONNECTIONS & CONDITIONS
// ============================================================

export interface WorkflowConnection {
  id?: string;
  from: string; // Node ID
  to: string; // Node ID
  condition?: Condition; // Optional condition for conditional connections
  label?: string;
}

export interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists' | 'in' | 'not_in';
  value: any;
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

// ============================================================
// WORKFLOW DEFINITION
// ============================================================

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  defaultValue?: any;
  required?: boolean;
  description?: string;
}

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  config: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables?: WorkflowVariable[];
  config?: WorkflowConfig;
}

export interface WorkflowConfig {
  maxExecutionTime?: number; // milliseconds
  maxRetries?: number;
  errorHandling?: 'stop' | 'continue' | 'rollback';
  notifications?: NotificationConfig;
  businessHours?: BusinessHours;
}

export interface Workflow {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  version: number;
  definition: WorkflowDefinition;
  triggers?: WorkflowTrigger[];
  createdBy?: string;
  updatedBy?: string;
  publishedBy?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// WORKFLOW INSTANCE (EXECUTION)
// ============================================================

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  organizationId: string;
  userId?: string;
  status: WorkflowInstanceStatus;
  currentNodeId?: string;
  progress: number; // 0-100
  context: WorkflowContext;
  formData: Record<string, any>;
  variables: Record<string, any>;
  triggeredBy: WorkflowTriggerType;
  triggerData?: Record<string, any>;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  startedAt: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  executionTimeMs?: number;
}

export interface WorkflowContext {
  currentNode?: WorkflowNode;
  previousNodeId?: string;
  visitedNodes: string[];
  pendingNodes?: string[];
  formData: Record<string, any>;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

// ============================================================
// WORKFLOW HISTORY
// ============================================================

export interface WorkflowHistoryEntry {
  id: string;
  instanceId: string;
  nodeId?: string;
  nodeType?: WorkflowNodeType;
  action: 'entered' | 'completed' | 'failed' | 'skipped' | 'retried';
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  errorData?: Record<string, any>;
  durationMs?: number;
  createdAt: Date;
}

// ============================================================
// WHATSAPP SESSION
// ============================================================

export interface WhatsAppWorkflowSession {
  id: string;
  instanceId?: string;
  workflowId: string;
  organizationId: string;
  channelId?: string;
  phoneNumber: string;
  language: string;
  status: WhatsAppSessionStatus;
  currentNodeId?: string;
  currentField?: string;
  formData: Record<string, any>;
  messagesSent: number;
  messagesReceived: number;
  lastMessageAt?: Date;
  expiresAt: Date;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface WhatsAppFormField {
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'file';
  label: string;
  prompt: string; // Question to ask in Hebrew
  required: boolean;
  validation?: FieldValidation;
  options?: string[]; // For select fields
}

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  customMessage?: string;
}

// ============================================================
// WORKFLOW TEMPLATES
// ============================================================

export interface WorkflowTemplate {
  id: string;
  organizationId?: string; // Null for global templates
  name: string;
  category: string;
  description?: string;
  thumbnailUrl?: string;
  definition: WorkflowDefinition;
  requiredForms: string[];
  variables: WorkflowVariable[];
  isPublic: boolean;
  isOfficial: boolean; // RightFlow provided
  popularity: number;
  estimatedDuration?: number; // seconds
  version: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// ACTIONS & AUTOMATION
// ============================================================

export interface ActionConfig {
  // WhatsApp action
  whatsapp?: {
    channelId: string;
    recipientPhone: string;
    template?: string;
    message?: string;
    mediaUrl?: string;
  };

  // Email action
  email?: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    attachments?: string[];
    template?: string;
  };

  // Webhook action
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    authentication?: WebhookAuth;
  };

  // PDF generation
  pdf?: {
    formId: string;
    templateId?: string;
    outputName: string;
    sendTo?: string[]; // Email addresses
  };

  // Database action
  database?: {
    operation: 'insert' | 'update' | 'upsert';
    table: string;
    data: Record<string, any>;
    where?: Record<string, any>;
  };

  // Task creation
  task?: {
    title: string;
    description: string;
    assignee: string;
    dueDate?: Date;
    priority?: 'low' | 'medium' | 'high';
  };
}

export interface WebhookAuth {
  type: 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth2';
  credentials?: Record<string, string>;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier?: number;
  retryOn?: number[]; // HTTP status codes
}

export interface EscalationRule {
  timeout: number; // milliseconds
  escalateTo: string; // User ID or role
  reminderInterval?: number;
  maxReminders?: number;
}

// ============================================================
// NOTIFICATIONS & MONITORING
// ============================================================

export interface NotificationConfig {
  onStart?: boolean;
  onComplete?: boolean;
  onFail?: boolean;
  channels?: ('email' | 'whatsapp' | 'in_app')[];
  recipients?: string[];
}

export interface BusinessHours {
  timezone: string;
  workDays: number[]; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  holidays?: Date[];
}

// ============================================================
// SCHEDULED TASKS
// ============================================================

export interface WorkflowScheduledTask {
  id: string;
  instanceId: string;
  nodeId: string;
  taskType: 'wait' | 'reminder' | 'timeout' | 'escalation';
  scheduledFor: Date;
  data?: Record<string, any>;
  isExecuted: boolean;
  executedAt?: Date;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  createdAt: Date;
}

// ============================================================
// ANALYTICS
// ============================================================

export interface WorkflowAnalytics {
  id: string;
  workflowId: string;
  date: Date;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  avgDurationMs?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  completionRate?: number;
  nodeMetrics?: NodeMetrics[];
  bottleneckNodes?: BottleneckInfo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeMetrics {
  nodeId: string;
  nodeType: WorkflowNodeType;
  executions: number;
  avgDurationMs: number;
  failureRate: number;
  skipRate: number;
}

export interface BottleneckInfo {
  nodeId: string;
  avgWaitTimeMs: number;
  queueLength: number;
  failureRate: number;
}

// ============================================================
// WEBHOOK CONFIGURATION
// ============================================================

export interface WorkflowWebhook {
  id: string;
  workflowId: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  authType?: 'bearer' | 'basic' | 'api_key' | 'custom';
  authConfig?: Record<string, any>; // Encrypted
  events: string[];
  isActive: boolean;
  lastTriggeredAt?: Date;
  lastStatusCode?: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface WorkflowListResponse {
  data: Workflow[];
  total: number;
  limit: number;
  offset: number;
}

export interface WorkflowInstanceListResponse {
  data: WorkflowInstance[];
  total: number;
  limit: number;
  offset: number;
}

export interface WorkflowExecutionResponse {
  instanceId: string;
  workflowId: string;
  status: WorkflowInstanceStatus;
  startedAt: Date;
}

export interface WorkflowStatusResponse {
  instanceId: string;
  status: WorkflowInstanceStatus;
  progress: number;
  currentNode?: string;
  context?: WorkflowContext;
}

// ============================================================
// ERROR TYPES
// ============================================================

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class WorkflowValidationError extends WorkflowError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'WorkflowValidationError';
  }
}

export class WorkflowExecutionError extends WorkflowError {
  constructor(message: string, details?: any) {
    super(message, 'EXECUTION_ERROR', details);
    this.name = 'WorkflowExecutionError';
  }
}

export class WorkflowTimeoutError extends WorkflowError {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'WorkflowTimeoutError';
  }
}