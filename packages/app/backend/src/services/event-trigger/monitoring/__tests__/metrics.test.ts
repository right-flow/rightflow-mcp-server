/**
 * Metrics Tests (TDD - RED Phase)
 * Tests for Prometheus metrics with P0/P1 edge case mitigations
 */

import {
  eventMetrics,
  circuitBreakerMetrics,
  dlqMetrics,
  actionMetrics,
  redisMetrics,
  updateDLQSizeMetrics,
  getMetrics,
  resetMetrics,
  normalizeEventType,
  normalizeErrorType,
} from '../metrics';
import { Registry } from 'prom-client';

describe('Event Trigger Metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  afterEach(() => {
    resetMetrics();
  });

  describe('P0: High-Cardinality Label Prevention', () => {
    describe('normalizeEventType', () => {
      it('should normalize unbounded event types to prevent cardinality explosion', () => {
        // Test with dynamic event types
        const normalized1 = normalizeEventType('custom_event_12345');
        const normalized2 = normalizeEventType('custom_event_67890');

        // Should normalize to same category
        expect(normalized1).toBe('custom_event');
        expect(normalized2).toBe('custom_event');
      });

      it('should preserve standard event types', () => {
        expect(normalizeEventType('form.submitted')).toBe('form.submitted');
        expect(normalizeEventType('user.registered')).toBe('user.registered');
        expect(normalizeEventType('order.created')).toBe('order.created');
      });

      it('should handle UUID-based event types', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const normalized = normalizeEventType(`dynamic_${uuid}`);

        expect(normalized).toBe('dynamic_event');
      });

      it('should limit total unique event types to < 100', () => {
        const uniqueTypes = new Set<string>();

        // Generate 10,000 random event types
        for (let i = 0; i < 10000; i++) {
          const randomType = `event_${Math.random()}_${i}`;
          const normalized = normalizeEventType(randomType);
          uniqueTypes.add(normalized);
        }

        // Should normalize to limited set
        expect(uniqueTypes.size).toBeLessThan(100);
      });
    });

    describe('normalizeErrorType', () => {
      it('should normalize network errors with different IPs to same category', () => {
        const error1 = new Error('Network error: connect ETIMEDOUT 192.168.1.100:5432');
        const error2 = new Error('Network error: connect ETIMEDOUT 10.0.0.50:5432');

        (error1 as any).code = 'ETIMEDOUT';
        (error2 as any).code = 'ETIMEDOUT';

        expect(normalizeErrorType(error1)).toBe('network_timeout');
        expect(normalizeErrorType(error2)).toBe('network_timeout');
      });

      it('should normalize validation errors', () => {
        const error = new Error('Validation failed: email is invalid');
        error.name = 'ValidationError';

        expect(normalizeErrorType(error)).toBe('validation_error');
      });

      it('should normalize connection refused errors', () => {
        const error = new Error('connect ECONNREFUSED');
        (error as any).code = 'ECONNREFUSED';

        expect(normalizeErrorType(error)).toBe('connection_refused');
      });

      it('should limit unique error types to < 50', () => {
        const uniqueErrors = new Set<string>();

        // Generate many different errors
        for (let i = 0; i < 1000; i++) {
          const error = new Error(`Random error ${i} with unique message ${Math.random()}`);
          const normalized = normalizeErrorType(error);
          uniqueErrors.add(normalized);
        }

        expect(uniqueErrors.size).toBeLessThan(50);
      });
    });

    describe('Metrics Cardinality Enforcement', () => {
      it('should prevent cardinality explosion from unbounded event types', () => {
        // Simulate 50,000 unique event types
        for (let i = 0; i < 50000; i++) {
          eventMetrics.eventsTotal.inc({
            organization_id: 'org_test',
            event_type: normalizeEventType(`dynamic_event_${i}`),
          });
        }

        // Count unique time series
        const metric = eventMetrics.eventsTotal as any;
        const timeSeriesCount = Object.keys(metric.hashMap).length;

        // Should normalize to limited set
        expect(timeSeriesCount).toBeLessThan(10000);
      });

      it('should handle large number of organizations without explosion', async () => {
        const orgCount = 100000;

        // This should complete without OOM
        for (let i = 0; i < orgCount; i++) {
          eventMetrics.eventsTotal.inc({
            organization_id: `org_${i}`,
            event_type: 'test_event',
          });
        }

        // Should still export metrics
        const metricsExport = await getMetrics();
        expect(metricsExport).toContain('event_trigger_events_total');
      });
    });
  });

  describe('P0: Metrics Scrape Timeout Prevention', () => {
    it('should complete DLQ size update within timeout', async () => {
      // Mock database with 100K DLQ entries
      const mockDb = {
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue(
          Array.from({ length: 10000 }, (_, i) => ({
            organization_id: `org_${i % 1000}`,
            status: i % 2 === 0 ? 'pending' : 'failed',
            count: Math.floor(Math.random() * 100),
          }))
        ),
      };

      const startTime = Date.now();
      await updateDLQSizeMetrics(mockDb as any);
      const duration = Date.now() - startTime;

      // Must complete in < 5 seconds (Prometheus timeout is 10s, leave margin)
      expect(duration).toBeLessThan(5000);
    });

    it('should not exceed Prometheus body size limit (10MB)', async () => {
      // Create high cardinality metrics
      for (let i = 0; i < 10000; i++) {
        eventMetrics.eventsTotal.inc({
          organization_id: `org_${i}`,
          event_type: 'test',
        });
      }

      const metrics = await getMetrics();
      const sizeInBytes = Buffer.byteLength(metrics, 'utf8');

      // Should be under 10MB
      expect(sizeInBytes).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Basic Metrics Functionality', () => {
    describe('eventMetrics.eventsTotal', () => {
      it('should increment event counter', async () => {
        eventMetrics.eventsTotal.inc({
          organization_id: 'org_123',
          event_type: normalizeEventType('form.submitted'),
        });

        const metrics = await getMetrics();
        expect(metrics).toContain('event_trigger_events_total');
        expect(metrics).toContain('organization_id="org_123"');
        expect(metrics).toContain('event_type="form.submitted"');
      });
    });

    describe('circuitBreakerMetrics.state', () => {
      it('should update circuit breaker state gauge', async () => {
        circuitBreakerMetrics.state.set(1); // OPEN

        const metrics = await getMetrics();
        expect(metrics).toContain('event_trigger_circuit_breaker_state 1');
      });
    });

    describe('dlqMetrics.size', () => {
      it('should track DLQ size by status', async () => {
        dlqMetrics.size.set({
          organization_id: 'org_123',
          status: 'pending',
        }, 150);

        const metrics = await getMetrics();
        expect(metrics).toContain('event_trigger_dlq_size');
        expect(metrics).toContain('organization_id="org_123"');
        expect(metrics).toContain('status="pending"');
      });
    });

    describe('actionMetrics.executionsTotal', () => {
      it('should track action executions', async () => {
        actionMetrics.executionsTotal.inc({
          action_type: 'webhook',
          status: 'success',
          organization_id: 'org_123',
        });

        const metrics = await getMetrics();
        expect(metrics).toContain('event_trigger_action_executions_total');
        expect(metrics).toContain('action_type="webhook"');
      });
    });
  });

  describe('Histogram Buckets', () => {
    it('should use correct buckets for processing duration', async () => {
      eventMetrics.processingDuration.observe({
        organization_id: 'org_test',
        event_type: 'test',
        status: 'success',
      }, 1.5);

      const metrics = await getMetrics();

      // Verify buckets exist
      expect(metrics).toContain('le="0.01"');
      expect(metrics).toContain('le="0.05"');
      expect(metrics).toContain('le="0.1"');
      expect(metrics).toContain('le="0.5"');
      expect(metrics).toContain('le="1"');
      expect(metrics).toContain('le="2"');
      expect(metrics).toContain('le="5"');
      expect(metrics).toContain('le="10"');
    });

    it('should handle values exceeding all buckets', async () => {
      // Observe very large value (60 seconds)
      eventMetrics.processingDuration.observe({
        organization_id: 'org_test',
        event_type: 'slow_event',
        status: 'success',
      }, 60);

      const metrics = await getMetrics();
      expect(metrics).toContain('event_trigger_processing_duration_seconds');
      // Should record in +Inf bucket
      expect(metrics).toContain('+Inf');
    });
  });
});
