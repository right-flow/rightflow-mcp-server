/**
 * Type definitions for Event Trigger System
 */

export type EventType =
  | 'form.submitted'
  | 'form.approved'
  | 'form.rejected'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'integration.sync_started'
  | 'integration.sync_completed'
  | 'integration.sync_failed';

export type TriggerLevel = 'platform' | 'organization' | 'user_defined';

export type TriggerScope = 'all_forms' | 'specific_forms';

export type TriggerStatus = 'active' | 'inactive' | 'draft';

export type ErrorHandlingStrategy =
  | 'stop_on_first_error'
  | 'continue_on_error'
  | 'rollback_on_error';

export type ProcessingMode = 'redis' | 'poll' | 'completed' | 'failed';

export type ActionType =
  | 'send_webhook'
  | 'send_email'
  | 'send_sms'
  | 'update_crm'
  | 'create_task'
  | 'trigger_workflow'
  | 'custom';

export type IntegrationType = 'salesforce' | 'hubspot' | 'priority' | 'sap_b1' | 'custom';

export type IntegrationStatus = 'active' | 'inactive' | 'error';

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'retrying'
  | 'cancelled';

export type DlqStatus = 'pending' | 'processing' | 'resolved' | 'failed' | 'ignored';

export interface Event {
  id: string;
  organization_id: string;
  event_type: EventType;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  data: Record<string, any>;
  processing_mode: ProcessingMode;
  retry_count?: number;
  next_retry_at?: Date | null;
  last_error?: ErrorDetails | null;
  processed_at?: Date | null;
  created_at: Date;
}

export interface EventTrigger {
  id: string;
  organization_id: string | null;
  name: string;
  level: TriggerLevel;
  event_type: EventType;
  status: TriggerStatus;
  scope: TriggerScope;
  form_ids: string[];
  conditions: TriggerCondition[];
  priority: number;
  error_handling: ErrorHandlingStrategy;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null';

export interface TriggerAction {
  id: string;
  trigger_id: string;
  action_type: ActionType;
  order: number;
  config: ActionConfig;
  retry_config: RetryConfig;
  timeout_ms: number;
  is_critical: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ActionConfig {
  [key: string]: any;
  // send_webhook
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: Record<string, any>;

  // send_email
  to?: string | string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;

  // update_crm
  integration_id?: string;
  operation?: string;
  mapping?: Record<string, string>;

  // Rollback config
  rollback_operation?: string;
}

export interface RetryConfig {
  max_attempts: number;
  backoff_multiplier: number;
  initial_delay_ms: number;
}

export interface ActionExecution {
  id: string;
  event_id: string;
  trigger_id: string;
  action_id: string;
  status: ExecutionStatus;
  attempt: number;
  started_at: Date;
  completed_at: Date | null;
  response: any | null;
  error: ErrorDetails | null;
  created_at: Date;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  statusCode?: number;
  stack?: string;
}

export interface Integration {
  id: string;
  organization_id: string;
  type: IntegrationType;
  name: string;
  config: Record<string, any>;
  credentials: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
  };
  status: IntegrationStatus;
  last_sync_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DeadLetterQueueEntry {
  id: string;
  event_id: string;
  trigger_id: string;
  action_id: string;
  failure_reason: string;
  failure_count: number;
  last_error: ErrorDetails;
  event_snapshot: Event;
  action_snapshot: TriggerAction;
  status: DlqStatus;
  retry_after: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  consecutiveSuccesses: number;
  totalRequests: number;
  successRate: number;
  lastStateChange: number;
}
