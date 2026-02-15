/**
 * Event Triggers API Client
 * API methods for trigger management, actions, executions, and DLQ
 */

import { apiClient } from './client';

const TRIGGERS_API_BASE = '/triggers';
const DLQ_API_BASE = '/dlq';

// ============================================================================
// TypeScript Types
// ============================================================================

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

export type TriggerStatus = 'active' | 'inactive' | 'draft';
export type TriggerLevel = 'system' | 'user_defined';
export type TriggerScope = 'all_forms' | 'specific_forms';
export type ErrorHandlingStrategy = 'stop_on_first_error' | 'continue_on_error' | 'retry_failed';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches_regex';

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

export interface EventTrigger {
  id: string;
  organization_id: string;
  name: string;
  level: TriggerLevel;
  event_type: EventType;
  status: TriggerStatus;
  scope: TriggerScope;
  form_ids?: string[];
  conditions?: TriggerCondition[];
  priority: number;
  error_handling: ErrorHandlingStrategy;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TriggerWithActions extends EventTrigger {
  actions: TriggerAction[];
  statistics?: TriggerStatistics;
}

export type ActionType = 'send_webhook' | 'send_email' | 'send_sms' | 'update_record' | 'trigger_workflow';

export interface TriggerAction {
  id: string;
  trigger_id: string;
  action_type: ActionType;
  order: number;
  config: Record<string, any>;
  retry_config?: {
    max_retries: number;
    backoff_multiplier: number;
  };
  timeout_ms: number;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriggerStatistics {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime?: number;
  lastExecutionAt?: string;
}

export interface ActionExecution {
  id: string;
  event_id: string;
  trigger_id: string;
  action_id: string;
  status: 'pending' | 'success' | 'failed';
  attempt: number;
  started_at?: string;
  completed_at?: string;
  response?: any;
  error?: any;
  created_at: string;
}

export interface ExecutionStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
}

export interface DeadLetterQueueEntry {
  id: string;
  event_id: string;
  trigger_id: string;
  action_id: string;
  failure_reason: string;
  failure_count: number;
  last_error: any;
  event_snapshot: any;
  action_snapshot: any;
  status: 'pending' | 'processing' | 'resolved' | 'failed';
  retry_after?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DLQStats {
  total: number;
  pending: number;
  processing: number;
  resolved: number;
  failed: number;
}

// ============================================================================
// Triggers API
// ============================================================================

export const triggersApi = {
  /**
   * List all triggers for organization
   * @param params - Filter parameters
   * @returns Array of triggers
   */
  async listTriggers(params?: {
    status?: TriggerStatus;
    event_type?: EventType;
    search?: string;
  }): Promise<EventTrigger[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.event_type) queryParams.append('event_type', params.event_type);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = `${TRIGGERS_API_BASE}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<EventTrigger[]>(endpoint);

    return response.data;
  },

  /**
   * Get trigger by ID with actions
   * @param triggerId - Trigger ID
   * @returns Trigger with actions
   */
  async getTrigger(triggerId: string): Promise<TriggerWithActions> {
    const response = await apiClient.get<TriggerWithActions>(`${TRIGGERS_API_BASE}/${triggerId}`);
    return response.data;
  },

  /**
   * Create new trigger
   * @param trigger - Trigger data
   * @returns Created trigger
   */
  async createTrigger(trigger: Partial<EventTrigger>): Promise<EventTrigger> {
    const response = await apiClient.post<EventTrigger>(TRIGGERS_API_BASE, trigger);
    return response.data;
  },

  /**
   * Update trigger
   * @param triggerId - Trigger ID
   * @param updates - Fields to update
   * @returns Updated trigger
   */
  async updateTrigger(triggerId: string, updates: Partial<EventTrigger>): Promise<EventTrigger> {
    const response = await apiClient.put<EventTrigger>(`${TRIGGERS_API_BASE}/${triggerId}`, updates);
    return response.data;
  },

  /**
   * Delete trigger
   * @param triggerId - Trigger ID
   */
  async deleteTrigger(triggerId: string): Promise<void> {
    await apiClient.delete(`${TRIGGERS_API_BASE}/${triggerId}`);
  },

  /**
   * Toggle trigger status (active/inactive)
   * @param triggerId - Trigger ID
   * @returns Updated trigger
   */
  async toggleTrigger(triggerId: string): Promise<EventTrigger> {
    const response = await apiClient.patch<EventTrigger>(`${TRIGGERS_API_BASE}/${triggerId}/toggle`, {});
    return response.data;
  },

  // ============================================================================
  // Trigger Actions API
  // ============================================================================

  /**
   * List actions for a trigger
   * @param triggerId - Trigger ID
   * @returns Array of actions
   */
  async listActions(triggerId: string): Promise<TriggerAction[]> {
    const response = await apiClient.get<TriggerAction[]>(`${TRIGGERS_API_BASE}/${triggerId}/actions`);
    return response.data;
  },

  /**
   * Create new action for trigger
   * @param triggerId - Trigger ID
   * @param action - Action data
   * @returns Created action
   */
  async createAction(triggerId: string, action: Partial<TriggerAction>): Promise<TriggerAction> {
    const response = await apiClient.post<TriggerAction>(
      `${TRIGGERS_API_BASE}/${triggerId}/actions`,
      action
    );
    return response.data;
  },

  /**
   * Update action
   * @param triggerId - Trigger ID
   * @param actionId - Action ID
   * @param updates - Fields to update
   * @returns Updated action
   */
  async updateAction(
    triggerId: string,
    actionId: string,
    updates: Partial<TriggerAction>
  ): Promise<TriggerAction> {
    const response = await apiClient.put<TriggerAction>(
      `${TRIGGERS_API_BASE}/${triggerId}/actions/${actionId}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete action
   * @param triggerId - Trigger ID
   * @param actionId - Action ID
   */
  async deleteAction(triggerId: string, actionId: string): Promise<void> {
    await apiClient.delete(`${TRIGGERS_API_BASE}/${triggerId}/actions/${actionId}`);
  },

  /**
   * Reorder actions
   * @param triggerId - Trigger ID
   * @param actionIds - Array of action IDs in desired order
   */
  async reorderActions(triggerId: string, actionIds: string[]): Promise<void> {
    await apiClient.post(`${TRIGGERS_API_BASE}/${triggerId}/actions/reorder`, {
      action_ids: actionIds,
    });
  },

  // ============================================================================
  // Executions API
  // ============================================================================

  /**
   * Get execution statistics for trigger
   * @param triggerId - Trigger ID
   * @returns Execution stats
   */
  async getExecutionStats(triggerId: string): Promise<ExecutionStats> {
    const response = await apiClient.get<ExecutionStats>(
      `${TRIGGERS_API_BASE}/${triggerId}/executions/stats`
    );
    return response.data;
  },

  /**
   * List executions for trigger
   * @param triggerId - Trigger ID
   * @param params - Filter parameters
   * @returns Array of executions
   */
  async listExecutions(
    triggerId: string,
    params?: {
      status?: 'pending' | 'success' | 'failed';
      limit?: number;
      offset?: number;
    }
  ): Promise<ActionExecution[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const endpoint = `${TRIGGERS_API_BASE}/${triggerId}/executions${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<ActionExecution[]>(endpoint);

    return response.data;
  },

  /**
   * Get single execution details
   * @param triggerId - Trigger ID
   * @param executionId - Execution ID
   * @returns Execution details
   */
  async getExecution(triggerId: string, executionId: string): Promise<ActionExecution> {
    const response = await apiClient.get<ActionExecution>(
      `${TRIGGERS_API_BASE}/${triggerId}/executions/${executionId}`
    );
    return response.data;
  },

  // ============================================================================
  // Dead Letter Queue API
  // ============================================================================

  /**
   * Get DLQ statistics
   * @returns DLQ stats
   */
  async getDLQStats(): Promise<DLQStats> {
    const response = await apiClient.get<DLQStats>(`${DLQ_API_BASE}/stats`);
    return response.data;
  },

  /**
   * List DLQ entries
   * @param params - Filter parameters
   * @returns Array of DLQ entries
   */
  async listDLQEntries(params?: {
    status?: 'pending' | 'processing' | 'resolved' | 'failed';
  }): Promise<DeadLetterQueueEntry[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);

    const endpoint = `${DLQ_API_BASE}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<DeadLetterQueueEntry[]>(endpoint);

    return response.data;
  },

  /**
   * Retry single DLQ entry
   * @param dlqId - DLQ entry ID
   * @returns Success result
   */
  async retryDLQEntry(dlqId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${DLQ_API_BASE}/${dlqId}/retry`,
      {}
    );
    return response.data;
  },

  /**
   * Bulk retry DLQ entries
   * @param dlqIds - Array of DLQ entry IDs
   * @returns Retry results
   */
  async bulkRetryDLQEntries(
    dlqIds: string[]
  ): Promise<{ succeeded: number; failed: number }> {
    const response = await apiClient.post<{ succeeded: number; failed: number }>(
      `${DLQ_API_BASE}/bulk-retry`,
      { ids: dlqIds }
    );
    return response.data;
  },
};
