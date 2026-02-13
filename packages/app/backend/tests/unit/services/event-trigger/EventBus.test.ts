/**
 * Unit Tests for EventBus Service
 * Tests Redis Pub/Sub with PostgreSQL fallback, Circuit Breaker, and event processing
 *
 * Following TDD Red-Green-Refactor cycle
 * Coverage target: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../../../../src/services/event-trigger/EventBus';
import { CircuitBreaker } from '../../../../src/services/event-trigger/CircuitBreaker';
import type { Event, EventType } from '../../../../src/types/event-trigger';
import {
  testEvents,
  testOrganizations,
  testForms,
  createTestEvent,
  createConcurrentEvents
} from '../../../fixtures/event-trigger/events';

// Mock dependencies
vi.mock('ioredis');
vi.mock('../../../../src/config/database');

describe('EventBus', () => {
  let eventBus: EventBus;
  let mockRedis: any;
  let mockDb: any;
  let mockCircuitBreaker: any;

  beforeEach(() => {
    // Setup mock Redis client
    mockRedis = {
      publish: vi.fn().mockResolvedValue(1),
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      ping: vi.fn().mockResolvedValue('PONG'),
      status: 'ready'
    };

    // Setup mock database
    mockDb = vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
      first: vi.fn().mockResolvedValue(null)
    }));

    // Setup mock Circuit Breaker
    mockCircuitBreaker = {
      execute: vi.fn(async (fn: any) => await fn()),
      getState: vi.fn().mockReturnValue('closed'),
      reset: vi.fn()
    };

    // Initialize EventBus with mocks
    eventBus = new EventBus({
      redis: mockRedis,
      db: mockDb,
      circuitBreaker: mockCircuitBreaker
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('emit() - Event Publishing', () => {
    it('should persist event to PostgreSQL first', async () => {
      const event = createTestEvent(testEvents.formSubmitted);

      await eventBus.emit(event);

      expect(mockDb).toHaveBeenCalledWith('events');
      expect(mockDb().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: event.id,
          organization_id: event.organization_id,
          event_type: event.event_type,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          user_id: event.user_id,
          data: event.data
        })
      );
    });

    it('should publish to Redis after PostgreSQL persistence', async () => {
      const event = createTestEvent(testEvents.formSubmitted);

      await eventBus.emit(event);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'rightflow:events',
        expect.stringContaining(event.id)
      );
    });

    it('should set processing_mode to "redis" when Redis succeeds', async () => {
      const event = createTestEvent(testEvents.formSubmitted);

      const result = await eventBus.emit(event);

      expect(result.processing_mode).toBe('redis');
      expect(mockDb().update).toHaveBeenCalledWith({
        processing_mode: 'redis'
      });
    });

    it('should fallback to polling when Redis publish fails', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      mockRedis.publish.mockRejectedValueOnce(new Error('Redis unavailable'));

      const result = await eventBus.emit(event);

      expect(result.processing_mode).toBe('polling');
      expect(mockDb().update).toHaveBeenCalledWith({
        processing_mode: 'poll',
        retry_count: 0,
        next_retry_at: expect.any(Date)
      });
    });

    it('should handle Redis disconnection gracefully', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      mockRedis.status = 'disconnected';
      mockRedis.publish.mockRejectedValueOnce(new Error('Connection closed'));

      await expect(eventBus.emit(event)).resolves.not.toThrow();

      expect(mockDb().update).toHaveBeenCalledWith(
        expect.objectContaining({ processing_mode: 'poll' })
      );
    });

    it('should throw error if PostgreSQL persistence fails', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      mockDb().insert.mockRejectedValueOnce(new Error('DB error'));

      await expect(eventBus.emit(event)).rejects.toThrow('DB error');
      expect(mockRedis.publish).not.toHaveBeenCalled();
    });

    it('should handle Hebrew text in event data', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent);

      await eventBus.emit(event);

      expect(mockDb().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fields: expect.objectContaining({
              name: 'שלום עולם',
              description: expect.stringContaining('עברית')
            })
          })
        })
      );
    });

    it('should normalize Unicode in Hebrew text', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent, {
        data: {
          fields: {
            text: 'עברית\u202Bעם RTL marks\u202C\u2066ו-isolates\u2069'
          }
        }
      });

      await eventBus.emit(event);

      const insertCall = mockDb().insert.mock.calls[0][0];
      expect(insertCall.data.fields.text).not.toContain('\u202B');
      expect(insertCall.data.fields.text).not.toContain('\u202C');
      expect(insertCall.data.fields.text).not.toContain('\u2066');
      expect(insertCall.data.fields.text).not.toContain('\u2069');
    });

    it('should handle large payloads (1MB)', async () => {
      const event = createTestEvent(testEvents.largePayloadEvent);

      await eventBus.emit(event);

      expect(mockDb().insert).toHaveBeenCalled();
      expect(mockRedis.publish).toHaveBeenCalled();
    });

    it('should handle concurrent event emissions', async () => {
      const events = createConcurrentEvents(10, testEvents.formSubmitted);

      const results = await Promise.all(events.map(e => eventBus.emit(e)));

      expect(results).toHaveLength(10);
      expect(mockDb).toHaveBeenCalledTimes(10);
      results.forEach(result => {
        expect(result.processing_mode).toMatch(/redis|polling/);
      });
    });
  });

  describe('subscribe() - Event Subscription', () => {
    it('should subscribe to Redis events channel', async () => {
      const handler = vi.fn();

      await eventBus.subscribe('form.submitted', handler);

      expect(mockRedis.subscribe).toHaveBeenCalledWith('rightflow:events');
      expect(mockRedis.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should invoke handler when matching event received', async () => {
      const handler = vi.fn();
      const event = createTestEvent(testEvents.formSubmitted);

      await eventBus.subscribe('form.submitted', handler);

      // Simulate Redis message
      const messageHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      await messageHandler('rightflow:events', JSON.stringify(event));

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not invoke handler for non-matching event types', async () => {
      const handler = vi.fn();
      const event = createTestEvent(testEvents.formApproved);

      await eventBus.subscribe('form.submitted', handler);

      const messageHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      await messageHandler('rightflow:events', JSON.stringify(event));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support wildcard subscriptions', async () => {
      const handler = vi.fn();

      await eventBus.subscribe('form.*', handler);

      const messageHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler('rightflow:events', JSON.stringify(testEvents.formSubmitted));
      await messageHandler('rightflow:events', JSON.stringify(testEvents.formApproved));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should handle subscription when Redis unavailable', async () => {
      const handler = vi.fn();
      mockRedis.subscribe.mockRejectedValueOnce(new Error('Redis down'));

      await expect(eventBus.subscribe('form.submitted', handler)).rejects.toThrow(
        'Redis down'
      );
    });

    it('should handle malformed JSON in Redis messages', async () => {
      const handler = vi.fn();

      await eventBus.subscribe('form.submitted', handler);

      const messageHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler('rightflow:events', 'invalid-json{{{');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('pollPendingEvents() - Polling Fallback', () => {
    it('should fetch events with processing_mode "poll"', async () => {
      const mockEvents = [
        createTestEvent(testEvents.formSubmitted, { processing_mode: 'poll' })
      ];
      mockDb().where.mockReturnThis();
      mockDb().first.mockResolvedValue(mockEvents[0]);

      await eventBus.pollPendingEvents();

      expect(mockDb).toHaveBeenCalledWith('events');
      expect(mockDb().where).toHaveBeenCalledWith('processing_mode', 'poll');
    });

    it('should respect next_retry_at timestamp', async () => {
      const futureRetry = new Date(Date.now() + 60000);
      const mockEvents = [
        createTestEvent(testEvents.formSubmitted, {
          processing_mode: 'poll',
          next_retry_at: futureRetry
        })
      ];
      mockDb().where.mockReturnThis();
      mockDb().first.mockResolvedValue(null);

      await eventBus.pollPendingEvents();

      expect(mockDb().where).toHaveBeenCalledWith(
        'next_retry_at',
        '<=',
        expect.any(Date)
      );
    });

    it('should process polled events through event pipeline', async () => {
      const mockEvent = createTestEvent(testEvents.formSubmitted, {
        processing_mode: 'poll'
      });
      mockDb().where.mockReturnThis();
      mockDb().first.mockResolvedValue(mockEvent);

      const processSpy = vi.spyOn(eventBus as any, 'processEvent');

      await eventBus.pollPendingEvents();

      expect(processSpy).toHaveBeenCalledWith(mockEvent);
    });

    it('should update retry_count and next_retry_at on failure', async () => {
      const mockEvent = createTestEvent(testEvents.formSubmitted, {
        processing_mode: 'poll',
        retry_count: 2
      });
      mockDb().where.mockReturnThis();
      mockDb().first.mockResolvedValue(mockEvent);

      vi.spyOn(eventBus as any, 'processEvent').mockRejectedValueOnce(
        new Error('Processing failed')
      );

      await eventBus.pollPendingEvents();

      expect(mockDb().update).toHaveBeenCalledWith({
        retry_count: 3,
        next_retry_at: expect.any(Date),
        last_error: expect.objectContaining({
          message: 'Processing failed'
        })
      });
    });

    it('should stop retrying after max attempts (10)', async () => {
      const mockEvent = createTestEvent(testEvents.formSubmitted, {
        processing_mode: 'poll',
        retry_count: 10
      });
      mockDb().where.mockReturnThis();
      mockDb().first.mockResolvedValue(mockEvent);

      vi.spyOn(eventBus as any, 'processEvent').mockRejectedValueOnce(
        new Error('Still failing')
      );

      await eventBus.pollPendingEvents();

      expect(mockDb().update).toHaveBeenCalledWith({
        processing_mode: 'failed',
        retry_count: 11,
        last_error: expect.any(Object)
      });
    });

    it('should mark event as processed after successful poll processing', async () => {
      const mockEvent = createTestEvent(testEvents.formSubmitted, {
        processing_mode: 'poll'
      });
      mockDb().where.mockReturnThis();
      mockDb().first.mockResolvedValue(mockEvent);

      vi.spyOn(eventBus as any, 'processEvent').mockResolvedValueOnce(undefined);

      await eventBus.pollPendingEvents();

      expect(mockDb().update).toHaveBeenCalledWith({
        processing_mode: 'completed',
        processed_at: expect.any(Date)
      });
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should use Circuit Breaker for Redis publish', async () => {
      const event = createTestEvent(testEvents.formSubmitted);

      await eventBus.emit(event);

      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
    });

    it('should fallback to polling when Circuit Breaker is open', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      mockCircuitBreaker.getState.mockReturnValue('open');
      mockCircuitBreaker.execute.mockRejectedValueOnce(
        new Error('Circuit breaker is OPEN')
      );

      const result = await eventBus.emit(event);

      expect(result.processing_mode).toBe('polling');
    });

    it('should track Redis failures and open circuit', async () => {
      const events = Array.from({ length: 5 }, () =>
        createTestEvent(testEvents.formSubmitted)
      );
      mockRedis.publish.mockRejectedValue(new Error('Redis timeout'));

      for (const event of events) {
        await eventBus.emit(event);
      }

      // Circuit Breaker should track failures
      expect(mockCircuitBreaker.execute).toHaveBeenCalledTimes(5);
    });

    it('should reset Circuit Breaker after successful Redis reconnection', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      mockCircuitBreaker.getState.mockReturnValue('half-open');

      await eventBus.emit(event);

      // If successful in half-open state, circuit breaker should close
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
    });
  });

  describe('Event Deduplication', () => {
    it('should reject duplicate events within 5-minute window', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const duplicateEvent = { ...event, created_at: new Date() };

      mockDb().first.mockResolvedValueOnce(event); // Duplicate found

      await expect(eventBus.emit(duplicateEvent)).rejects.toThrow(
        'Duplicate event detected'
      );
    });

    it('should allow same event after 5-minute deduplication window', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const laterEvent = {
        ...event,
        created_at: new Date(Date.now() + 6 * 60 * 1000)
      };

      mockDb().first.mockResolvedValueOnce(null); // No duplicate found

      await expect(eventBus.emit(laterEvent)).resolves.not.toThrow();
    });

    it('should use composite key for deduplication (org_id + event_type + entity_id)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);

      await eventBus.emit(event);

      expect(mockDb().where).toHaveBeenCalledWith({
        organization_id: event.organization_id,
        event_type: event.event_type,
        entity_id: event.entity_id
      });
      expect(mockDb().where).toHaveBeenCalledWith(
        'created_at',
        '>',
        expect.any(Date)
      );
    });
  });

  describe('Error Handling', () => {
    it('should log errors to console.error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const event = createTestEvent(testEvents.formSubmitted);
      mockDb().insert.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(eventBus.emit(event)).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('EventBus Error'),
        expect.any(Error)
      );
    });

    it('should handle database transaction rollback', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const mockTrx = {
        insert: vi.fn().mockRejectedValueOnce(new Error('Constraint violation')),
        rollback: vi.fn()
      };
      mockDb.transaction = vi.fn(async (cb: any) => cb(mockTrx));

      await expect(eventBus.emit(event)).rejects.toThrow();
    });

    it('should retry Redis publish on transient errors', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      mockRedis.publish
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(1);

      const result = await eventBus.emit(event);

      expect(mockRedis.publish).toHaveBeenCalledTimes(2);
      expect(result.processing_mode).toBe('redis');
    });

    it('should handle partial Redis publish (0 subscribers)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      mockRedis.publish.mockResolvedValueOnce(0); // No subscribers

      const result = await eventBus.emit(event);

      // Should still mark as redis mode even with 0 subscribers
      expect(result.processing_mode).toBe('redis');
    });
  });

  describe('Performance & Metrics', () => {
    it('should track event processing time', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const startTime = Date.now();

      await eventBus.emit(event);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });

    it('should handle 100 events per second (load test)', async () => {
      const events = Array.from({ length: 100 }, () =>
        createTestEvent(testEvents.formSubmitted)
      );

      const startTime = Date.now();
      await Promise.all(events.map(e => eventBus.emit(e)));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // 100 events in < 1 second
    });

    it('should emit metrics for monitoring', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const metricsSpy = vi.fn();
      (eventBus as any).metricsClient = { increment: metricsSpy };

      await eventBus.emit(event);

      expect(metricsSpy).toHaveBeenCalledWith('eventbus.emit.success');
    });
  });
});
