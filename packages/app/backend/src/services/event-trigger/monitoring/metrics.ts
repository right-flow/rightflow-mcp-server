/**
 * Prometheus Metrics for Event Trigger System
 * Includes P0/P1 mitigations for high-cardinality and performance issues
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import type { Knex } from 'knex';

// Create custom registry for Event Trigger metrics
export const eventTriggerRegistry = new Registry();

/**
 * P0 Mitigation: Normalize event types to prevent cardinality explosion
 * Limits unbounded user-generated event types to predefined categories
 */
export function normalizeEventType(eventType: string): string {
  // Standard event types (keep as-is)
  const standardTypes = [
    'form.submitted',
    'form.updated',
    'form.deleted',
    'user.registered',
    'user.updated',
    'user.deleted',
    'order.created',
    'order.updated',
    'order.cancelled',
    'payment.received',
    'payment.failed',
    'workflow.started',
    'workflow.completed',
    'workflow.failed',
    'email.sent',
    'email.bounced',
    'sms.sent',
    'sms.failed',
    'webhook.triggered',
    'webhook.failed',
  ];

  if (standardTypes.includes(eventType)) {
    return eventType;
  }

  // Normalize custom/dynamic event types
  // Pattern: custom_event_* → custom_event
  if (eventType.startsWith('custom_event_') || eventType.startsWith('custom.')) {
    return 'custom_event';
  }

  // Pattern: dynamic_* → dynamic_event
  if (eventType.startsWith('dynamic_') || eventType.startsWith('dynamic.')) {
    return 'dynamic_event';
  }

  // Pattern: contains UUID → generic_uuid_event
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (uuidPattern.test(eventType)) {
    return 'generic_uuid_event';
  }

  // Pattern: contains random numbers → generic_random_event
  const randomPattern = /\d{10,}/; // 10+ consecutive digits
  if (randomPattern.test(eventType)) {
    return 'generic_random_event';
  }

  // Extract base type (before first dot or underscore)
  const baseType = eventType.split(/[._]/)[0];

  // If base type is recognized category, use it
  const recognizedCategories = ['form', 'user', 'order', 'payment', 'workflow', 'email', 'sms', 'webhook'];
  if (recognizedCategories.includes(baseType)) {
    return `${baseType}.other`;
  }

  // Default: unknown_event (catch-all)
  return 'unknown_event';
}

/**
 * P0 Mitigation: Normalize error types to prevent cardinality explosion
 * Normalizes error messages with dynamic values (IPs, IDs, etc.) to categories
 */
export function normalizeErrorType(error: Error): string {
  const errorCode = (error as any).code;
  const errorName = error.name;
  const errorMessage = error.message;

  // Network errors
  if (errorCode === 'ETIMEDOUT' || errorMessage.includes('ETIMEDOUT')) {
    return 'network_timeout';
  }

  if (errorCode === 'ECONNREFUSED' || errorMessage.includes('ECONNREFUSED')) {
    return 'connection_refused';
  }

  if (errorCode === 'ECONNRESET' || errorMessage.includes('ECONNRESET')) {
    return 'connection_reset';
  }

  if (errorCode === 'ENOTFOUND' || errorMessage.includes('ENOTFOUND')) {
    return 'dns_resolution_failed';
  }

  if (errorMessage.includes('Network error') || errorMessage.includes('network')) {
    return 'network_error';
  }

  // Validation errors
  if (errorName === 'ValidationError' || errorMessage.includes('validation')) {
    return 'validation_error';
  }

  // Database errors
  if (errorName === 'DatabaseError' || errorMessage.includes('database') || errorMessage.includes('query')) {
    return 'database_error';
  }

  if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
    return 'database_constraint_violation';
  }

  // Authentication/Authorization errors
  if (errorName === 'UnauthorizedError' || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    return 'auth_unauthorized';
  }

  if (errorName === 'ForbiddenError' || errorMessage.includes('forbidden') || errorMessage.includes('403')) {
    return 'auth_forbidden';
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return 'timeout_error';
  }

  // Rate limit errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'rate_limit_exceeded';
  }

  // Default: unknown_error
  return 'unknown_error';
}

/**
 * Event Metrics
 */
export const eventMetrics = {
  // Counter: Total events emitted
  eventsTotal: new Counter({
    name: 'event_trigger_events_total',
    help: 'Total number of events emitted to EventBus',
    labelNames: ['organization_id', 'event_type'],
    registers: [eventTriggerRegistry],
  }),

  // Counter: Events successfully processed
  eventsProcessed: new Counter({
    name: 'event_trigger_events_processed',
    help: 'Total number of events successfully processed',
    labelNames: ['organization_id', 'event_type', 'status'],
    registers: [eventTriggerRegistry],
  }),

  // Counter: Events failed processing
  eventsFailed: new Counter({
    name: 'event_trigger_events_failed',
    help: 'Total number of events that failed processing',
    labelNames: ['organization_id', 'event_type', 'error_type'],
    registers: [eventTriggerRegistry],
  }),

  // Histogram: Event processing duration
  processingDuration: new Histogram({
    name: 'event_trigger_processing_duration_seconds',
    help: 'Event processing duration in seconds (emit to completion)',
    labelNames: ['organization_id', 'event_type', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // 10ms to 10s
    registers: [eventTriggerRegistry],
  }),
};

/**
 * Circuit Breaker Metrics
 */
export const circuitBreakerMetrics = {
  // Gauge: Circuit Breaker state (0=closed, 1=open, 2=half-open)
  state: new Gauge({
    name: 'event_trigger_circuit_breaker_state',
    help: 'Circuit Breaker state (0=closed, 1=open, 2=half-open)',
    registers: [eventTriggerRegistry],
  }),

  // Counter: State transitions
  stateTransitions: new Counter({
    name: 'event_trigger_circuit_breaker_transitions_total',
    help: 'Total number of Circuit Breaker state transitions',
    labelNames: ['from_state', 'to_state'],
    registers: [eventTriggerRegistry],
  }),

  // Counter: Total requests through circuit breaker
  requests: new Counter({
    name: 'event_trigger_circuit_breaker_requests_total',
    help: 'Total requests through Circuit Breaker',
    labelNames: ['status'], // success, failure, rejected
    registers: [eventTriggerRegistry],
  }),
};

/**
 * Dead Letter Queue Metrics
 */
export const dlqMetrics = {
  // Gauge: Current DLQ size by status
  size: new Gauge({
    name: 'event_trigger_dlq_size',
    help: 'Current Dead Letter Queue size by status',
    labelNames: ['organization_id', 'status'], // pending, processing, resolved, failed
    registers: [eventTriggerRegistry],
  }),

  // Counter: DLQ entries added
  entriesAdded: new Counter({
    name: 'event_trigger_dlq_entries_added_total',
    help: 'Total number of entries added to Dead Letter Queue',
    labelNames: ['organization_id', 'error_type'],
    registers: [eventTriggerRegistry],
  }),

  // Counter: DLQ retry attempts
  retries: new Counter({
    name: 'event_trigger_dlq_retries_total',
    help: 'Total number of DLQ retry attempts',
    labelNames: ['organization_id', 'status'], // success, failure
    registers: [eventTriggerRegistry],
  }),
};

/**
 * Action Execution Metrics
 */
export const actionMetrics = {
  // Counter: Total action executions
  executionsTotal: new Counter({
    name: 'event_trigger_action_executions_total',
    help: 'Total number of action executions',
    labelNames: ['action_type', 'status', 'organization_id'], // status: success, failure, retry
    registers: [eventTriggerRegistry],
  }),

  // Histogram: Action execution duration
  duration: new Histogram({
    name: 'event_trigger_action_duration_seconds',
    help: 'Action execution duration in seconds',
    labelNames: ['action_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // 100ms to 30s
    registers: [eventTriggerRegistry],
  }),

  // Counter: Action retries
  retriesTotal: new Counter({
    name: 'event_trigger_action_retries_total',
    help: 'Total number of action retry attempts',
    labelNames: ['action_type', 'organization_id'],
    registers: [eventTriggerRegistry],
  }),

  // Counter: Compensating transactions executed
  compensationsTotal: new Counter({
    name: 'event_trigger_action_compensations_total',
    help: 'Total number of compensating transactions executed',
    labelNames: ['action_type', 'organization_id'],
    registers: [eventTriggerRegistry],
  }),
};

/**
 * Redis Metrics
 */
export const redisMetrics = {
  // Counter: Redis publish attempts
  publishesTotal: new Counter({
    name: 'event_trigger_redis_publishes_total',
    help: 'Total Redis Pub/Sub publish attempts',
    labelNames: ['status'], // success, failure
    registers: [eventTriggerRegistry],
  }),

  // Counter: Redis publish failures
  publishesFailed: new Counter({
    name: 'event_trigger_redis_publishes_failed',
    help: 'Total Redis publish failures',
    labelNames: ['error_type'],
    registers: [eventTriggerRegistry],
  }),

  // Counter: PostgreSQL polling queries
  pollsTotal: new Counter({
    name: 'event_trigger_postgres_polls_total',
    help: 'Total PostgreSQL polling queries executed',
    labelNames: ['organization_id'],
    registers: [eventTriggerRegistry],
  }),

  // Counter: Events retrieved via polling
  eventsPolled: new Counter({
    name: 'event_trigger_postgres_events_polled',
    help: 'Total events retrieved via PostgreSQL polling',
    labelNames: ['organization_id'],
    registers: [eventTriggerRegistry],
  }),
};

/**
 * P0 Mitigation: Cached DLQ size to prevent slow scrapes
 * Cache DLQ metrics to avoid slow database queries on every Prometheus scrape
 */
let dlqSizeCache: Map<string, { size: number; timestamp: number }> = new Map();
const DLQ_CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Update DLQ size gauge with caching
 * P0 Mitigation: Prevents metrics scrape timeout from slow DB queries
 */
export async function updateDLQSizeMetrics(db: Knex): Promise<void> {
  const now = Date.now();

  // Check cache freshness
  const cacheKey = 'dlq_size';
  const cached = dlqSizeCache.get(cacheKey);

  if (cached && (now - cached.timestamp) < DLQ_CACHE_TTL_MS) {
    // Use cached value (no DB query)
    return;
  }

  try {
    // Query DLQ size with timeout (5 seconds max)
    const dlqCountsPromise = db('dead_letter_queue')
      .select('organization_id', 'status')
      .count('* as count')
      .groupBy('organization_id', 'status')
      .timeout(5000); // 5 second timeout

    const dlqCounts = await dlqCountsPromise;

    // Reset gauge before updating
    dlqMetrics.size.reset();

    // Update gauge for each organization+status combination
    for (const row of dlqCounts) {
      dlqMetrics.size.set(
        {
          organization_id: row.organization_id,
          status: row.status as string,
        },
        Number(row.count)
      );
    }

    // Update cache
    dlqSizeCache.set(cacheKey, {
      size: dlqCounts.length,
      timestamp: now,
    });
  } catch (error) {
    // If query fails or times out, use cached value or log error
    console.error('Failed to update DLQ size metrics:', error);

    // Don't fail the entire metrics scrape
    // Just skip DLQ size update
  }
}

/**
 * Export metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return await eventTriggerRegistry.metrics();
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  // Reset individual metrics instead of clearing the entire registry
  eventMetrics.eventsTotal.reset();
  eventMetrics.eventsProcessed.reset();
  eventMetrics.eventsFailed.reset();
  eventMetrics.processingDuration.reset();

  circuitBreakerMetrics.state.set(0);
  circuitBreakerMetrics.stateTransitions.reset();
  circuitBreakerMetrics.requests.reset();

  dlqMetrics.size.reset();
  dlqMetrics.entriesAdded.reset();
  dlqMetrics.retries.reset();

  actionMetrics.executionsTotal.reset();
  actionMetrics.duration.reset();
  actionMetrics.retriesTotal.reset();
  actionMetrics.compensationsTotal.reset();

  redisMetrics.publishesTotal.reset();
  redisMetrics.publishesFailed.reset();
  redisMetrics.pollsTotal.reset();
  redisMetrics.eventsPolled.reset();

  dlqSizeCache.clear();
}
