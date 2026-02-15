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
  status: 'pending' | 'processing' | 'resolved' | 'failed' | 'ignored';
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
  ignored: number;
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
    status?: 'pending' | 'processing' | 'resolved' | 'failed' | 'ignored';
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

  /**
   * Get single DLQ entry details
   * @param dlqId - DLQ entry ID
   * @returns DLQ entry details
   */
  async getDLQEntry(dlqId: string): Promise<DeadLetterQueueEntry> {
    const response = await apiClient.get<DeadLetterQueueEntry>(`${DLQ_API_BASE}/${dlqId}`);
    return response.data;
  },

  /**
   * Ignore DLQ entry
   * @param dlqId - DLQ entry ID
   * @param notes - Optional notes
   */
  async ignoreDLQEntry(dlqId: string, notes?: string): Promise<void> {
    await apiClient.post(`${DLQ_API_BASE}/${dlqId}/ignore`, { notes });
  },

  /**
   * Resolve DLQ entry manually
   * @param dlqId - DLQ entry ID
   * @param notes - Resolution notes
   */
  async resolveDLQEntry(dlqId: string, notes: string): Promise<void> {
    await apiClient.post(`${DLQ_API_BASE}/${dlqId}/resolve`, { notes });
  },

  // ============================================================================
  // Extended Triggers API (test, history, templates)
  // ============================================================================

  /**
   * Test trigger with sample event data
   * @param triggerId - Trigger ID
   * @param eventData - Sample event data
   * @returns Test results
   */
  async testTrigger(triggerId: string, eventData: Record<string, any>): Promise<{
    matched: boolean;
    conditionsEvaluated: Array<{
      field: string;
      operator: string;
      expected: any;
      actual: any;
      result: boolean;
    }>;
    actionsToExecute: TriggerAction[];
    estimatedDuration: number;
  }> {
    const response = await apiClient.post(`${TRIGGERS_API_BASE}/${triggerId}/test`, { eventData });
    return response.data;
  },

  /**
   * Get trigger execution history
   * @param triggerId - Trigger ID
   * @param params - Filter parameters
   * @returns Execution history
   */
  async getTriggerHistory(triggerId: string, params?: {
    from?: string;
    to?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    data: Array<{
      executionId: string;
      eventId: string;
      triggeredAt: string;
      status: string;
      actionsCompleted: number;
      actionsFailed: number;
      totalDurationMs: number;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const endpoint = `${TRIGGERS_API_BASE}/${triggerId}/history${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  /**
   * Get trigger templates
   * @param params - Filter parameters
   * @returns Templates
   */
  async getTemplates(params?: {
    category?: string;
    search?: string;
  }): Promise<{
    templates: Array<{
      id: string;
      name: string;
      nameHe: string;
      description: string;
      descriptionHe: string;
      category: string;
      eventType: EventType;
      defaultActions: Array<any>;
      popularity: number;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = `${TRIGGERS_API_BASE}/templates${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  /**
   * Export triggers
   * @param ids - Optional specific trigger IDs
   * @returns Export data
   */
  async exportTriggers(ids?: string[]): Promise<{
    triggers: EventTrigger[];
    exportedAt: string;
    version: string;
  }> {
    const queryParams = new URLSearchParams();
    if (ids && ids.length > 0) {
      queryParams.append('ids', ids.join(','));
    }

    const endpoint = `${TRIGGERS_API_BASE}/export${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  /**
   * Import triggers
   * @param triggers - Triggers to import
   * @param mode - Import mode (replace/merge)
   * @returns Import results
   */
  async importTriggers(
    triggers: Partial<EventTrigger>[],
    mode: 'replace' | 'merge' = 'merge'
  ): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ name: string; error: string }>;
  }> {
    const response = await apiClient.post(`${TRIGGERS_API_BASE}/import`, { triggers, mode });
    return response.data;
  },
};

// ============================================================================
// Health API
// ============================================================================

const HEALTH_API_BASE = '/health';

export const healthApi = {
  /**
   * Get overall system health
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      database: string;
      redis: string;
      eventbus: string;
      integrations: string;
    };
    timestamp: string;
  }> {
    const response = await apiClient.get(HEALTH_API_BASE);
    return response.data;
  },

  /**
   * Get EventBus health
   */
  async getEventBusHealth(): Promise<{
    status: string;
    redis: { connected: boolean; latency_ms: number };
    fallback: { mode: string; pending_events: number };
    circuit_breaker: { state: string; failures: number };
  }> {
    const response = await apiClient.get(`${HEALTH_API_BASE}/eventbus`);
    return response.data;
  },

  /**
   * Get integrations health summary
   */
  async getIntegrationsHealth(): Promise<{
    total: number;
    healthy: number;
    degraded: number;
    error: number;
    integrations: Array<{
      id: string;
      name: string;
      status: string;
      lastChecked: string;
    }>;
  }> {
    const response = await apiClient.get(`${HEALTH_API_BASE}/integrations`);
    return response.data;
  },
};

// ============================================================================
// Events API
// ============================================================================

const EVENTS_API_BASE = '/events';

export interface Event {
  id: string;
  organization_id: string;
  level: string;
  event_type: string;
  source_type: string;
  source_id?: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
  occurred_at: string;
}

export const eventsApi = {
  /**
   * List events
   */
  async listEvents(params?: {
    level?: string;
    eventType?: string;
    sourceType?: string;
    sourceId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    data: Event[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.level) queryParams.append('level', params.level);
    if (params?.eventType) queryParams.append('eventType', params.eventType);
    if (params?.sourceType) queryParams.append('sourceType', params.sourceType);
    if (params?.sourceId) queryParams.append('sourceId', params.sourceId);
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const endpoint = `${EVENTS_API_BASE}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<Event & {
    triggersMatched: Array<{
      triggerId: string;
      triggerName: string;
      executed: boolean;
      status?: string;
    }>;
  }> {
    const response = await apiClient.get(`${EVENTS_API_BASE}/${eventId}`);
    return response.data;
  },

  /**
   * Get available event types
   */
  async getEventTypes(): Promise<{
    eventTypes: Array<{
      type: string;
      nameEn: string;
      nameHe: string;
      descriptionEn: string;
      descriptionHe: string;
      level: string;
      category: string;
      isConfigurable: boolean;
    }>;
  }> {
    const response = await apiClient.get(`${EVENTS_API_BASE}/types`);
    return response.data;
  },
};

// ============================================================================
// Integrations API
// ============================================================================

const INTEGRATIONS_API_BASE = '/integrations';

export interface Integration {
  id: string;
  type: 'crm' | 'erp' | 'calendar' | 'messaging';
  provider: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  healthStatus: 'healthy' | 'degraded' | 'error';
  lastSyncAt?: string;
  stats: {
    successCount: number;
    failureCount: number;
  };
  createdAt: string;
}

export const integrationsApi = {
  /**
   * List integrations
   */
  async listIntegrations(params?: {
    type?: string;
    provider?: string;
    status?: string;
  }): Promise<{ integrations: Integration[] }> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.provider) queryParams.append('provider', params.provider);
    if (params?.status) queryParams.append('status', params.status);

    const endpoint = `${INTEGRATIONS_API_BASE}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  /**
   * Create integration
   */
  async createIntegration(data: {
    type: string;
    provider: string;
    name: string;
    config?: Record<string, any>;
  }): Promise<Integration> {
    const response = await apiClient.post(INTEGRATIONS_API_BASE, data);
    return response.data;
  },

  /**
   * Get integration details
   */
  async getIntegration(integrationId: string): Promise<Integration & {
    config: Record<string, any>;
    lastErrorAt?: string;
    lastErrorMessage?: string;
  }> {
    const response = await apiClient.get(`${INTEGRATIONS_API_BASE}/${integrationId}`);
    return response.data;
  },

  /**
   * Update integration
   */
  async updateIntegration(
    integrationId: string,
    updates: Partial<{ name: string; config: Record<string, any>; status: string }>
  ): Promise<Integration> {
    const response = await apiClient.put(`${INTEGRATIONS_API_BASE}/${integrationId}`, updates);
    return response.data;
  },

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    await apiClient.delete(`${INTEGRATIONS_API_BASE}/${integrationId}`);
  },

  /**
   * Test integration connection
   */
  async testIntegration(integrationId: string): Promise<{
    success: boolean;
    latency: number;
    error?: string;
  }> {
    const response = await apiClient.post(`${INTEGRATIONS_API_BASE}/${integrationId}/test`, {});
    return response.data;
  },

  /**
   * Get integration health
   */
  async getIntegrationHealth(integrationId: string): Promise<{
    status: string;
    lastCheckedAt: string;
    issues: string[];
    recommendations: string[];
  }> {
    const response = await apiClient.get(`${INTEGRATIONS_API_BASE}/${integrationId}/health`);
    return response.data;
  },

  /**
   * Get integration schema
   */
  async getIntegrationSchema(integrationId: string): Promise<{
    entities: Array<{
      name: string;
      fields: Array<{
        name: string;
        type: string;
        required: boolean;
        picklist?: string[];
      }>;
    }>;
    cachedAt: string;
  }> {
    const response = await apiClient.get(`${INTEGRATIONS_API_BASE}/${integrationId}/schema`);
    return response.data;
  },

  /**
   * Refresh OAuth tokens
   */
  async refreshIntegrationTokens(integrationId: string): Promise<{
    success: boolean;
    expiresAt: string;
  }> {
    const response = await apiClient.post(`${INTEGRATIONS_API_BASE}/${integrationId}/refresh`, {});
    return response.data;
  },
};
