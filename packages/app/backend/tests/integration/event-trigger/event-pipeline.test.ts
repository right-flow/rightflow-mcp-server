/**
 * Integration Tests for Event Trigger System Pipeline
 * Tests end-to-end flow: Event emission → Trigger matching → Action execution → DLQ
 *
 * Coverage target: 85%+
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { EventBus } from '../../../src/services/event-trigger/EventBus';
import { TriggerMatcher } from '../../../src/services/event-trigger/TriggerMatcher';
import { ActionChainExecutor } from '../../../src/services/event-trigger/ActionChainExecutor';
import { DeadLetterQueue } from '../../../src/services/event-trigger/DeadLetterQueue';
import { CircuitBreaker } from '../../../src/services/event-trigger/CircuitBreaker';
import db from '../../../src/config/database';
import Redis from 'ioredis';
import {
  testEvents,
  testTriggers,
  testActions,
  testOrganizations,
  testForms,
  createTestEvent
} from '../../fixtures/event-trigger/events';

describe('Event Trigger Pipeline Integration', () => {
  let eventBus: EventBus;
  let triggerMatcher: TriggerMatcher;
  let actionChainExecutor: ActionChainExecutor;
  let dlq: DeadLetterQueue;
  let redis: Redis;
  let circuitBreaker: CircuitBreaker;

  beforeAll(async () => {
    // Initialize Redis
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3
    });

    // Initialize Circuit Breaker
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      resetTimeout: 30000
    });

    // Initialize services
    eventBus = new EventBus({ redis, db, circuitBreaker });
    triggerMatcher = new TriggerMatcher(db);
    dlq = new DeadLetterQueue(db);
    actionChainExecutor = new ActionChainExecutor({
      db,
      actionExecutor: null, // Will be mocked in tests
      integrationHub: null,
      dlq
    });

    // Setup test database tables
    await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    // Run migration 009_event_trigger_system.sql would go here
  });

  afterAll(async () => {
    await redis.quit();
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean up test data
    await db('action_executions').del();
    await db('dead_letter_queue').del();
    await db('events').del();
    await db('trigger_actions').del();
    await db('event_triggers').del();

    // Insert test organization and forms
    await db('organizations').insert(testOrganizations.org1).onConflict('id').ignore();
    await db('forms').insert([testForms.form1, testForms.form2]).onConflict('id').ignore();
  });

  afterEach(async () => {
    // Clean up after each test
    await db('action_executions').del();
    await db('dead_letter_queue').del();
    await db('events').del();
    await db('trigger_actions').del();
    await db('event_triggers').del();
  });

  describe('End-to-End Event Flow', () => {
    it('should process event from emission to action execution', async () => {
      // 1. Setup trigger and action
      const trigger = await db('event_triggers')
        .insert(testTriggers.userTrigger)
        .returning('*');

      const action = await db('trigger_actions')
        .insert(testActions.sendWebhook)
        .returning('*');

      // 2. Emit event
      const event = createTestEvent(testEvents.formSubmitted);
      const emitResult = await eventBus.emit(event);

      expect(emitResult.event_id).toBeDefined();
      expect(emitResult.processing_mode).toMatch(/redis|polling/);

      // 3. Verify event persisted
      const persistedEvent = await db('events')
        .where('id', emitResult.event_id)
        .first();

      expect(persistedEvent).toBeDefined();
      expect(persistedEvent.event_type).toBe('form.submitted');

      // 4. Match triggers
      const matchedTriggers = await triggerMatcher.matchTriggers(persistedEvent);

      expect(matchedTriggers).toHaveLength(1);
      expect(matchedTriggers[0].id).toBe(trigger[0].id);

      // 5. Execute actions (with mock executor)
      const mockActionExecutor = {
        execute: async () => ({ success: true, data: { webhookId: '123' } })
      };

      actionChainExecutor = new ActionChainExecutor({
        db,
        actionExecutor: mockActionExecutor,
        integrationHub: null,
        dlq
      });

      await actionChainExecutor.executeChain(persistedEvent, matchedTriggers[0]);

      // 6. Verify action execution recorded
      const executions = await db('action_executions')
        .where('event_id', persistedEvent.id);

      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('success');
    });

    it('should handle event with multiple triggers in priority order', async () => {
      // Setup 3 triggers with different priorities
      const triggers = [
        { ...testTriggers.platformTrigger, priority: 10, event_type: 'form.submitted' },
        {
          ...testTriggers.organizationTrigger,
          id: '00000000-0000-0000-0000-000000000002',
          priority: 5,
          event_type: 'form.submitted',
          conditions: []
        },
        {
          ...testTriggers.userTrigger,
          id: '00000000-0000-0000-0000-000000000003',
          priority: 15,
          event_type: 'form.submitted'
        }
      ];

      await db('event_triggers').insert(triggers);

      // Emit event
      const event = createTestEvent(testEvents.formSubmitted);
      const emitResult = await eventBus.emit(event);

      const persistedEvent = await db('events')
        .where('id', emitResult.event_id)
        .first();

      // Match triggers
      const matchedTriggers = await triggerMatcher.matchTriggers(persistedEvent);

      expect(matchedTriggers).toHaveLength(3);
      // Should be ordered by priority (ascending)
      expect(matchedTriggers[0].priority).toBe(5);
      expect(matchedTriggers[1].priority).toBe(10);
      expect(matchedTriggers[2].priority).toBe(15);
    });

    it('should send failed action to DLQ after max retries', async () => {
      // Setup trigger and action
      const trigger = await db('event_triggers')
        .insert(testTriggers.userTrigger)
        .returning('*');

      const action = await db('trigger_actions')
        .insert({
          ...testActions.sendWebhook,
          retry_config: {
            max_attempts: 2,
            backoff_multiplier: 1,
            initial_delay_ms: 100
          }
        })
        .returning('*');

      // Emit event
      const event = createTestEvent(testEvents.formSubmitted);
      const emitResult = await eventBus.emit(event);

      const persistedEvent = await db('events')
        .where('id', emitResult.event_id)
        .first();

      // Execute with failing action
      const mockActionExecutor = {
        execute: async () => {
          throw new Error('Webhook endpoint unavailable');
        }
      };

      actionChainExecutor = new ActionChainExecutor({
        db,
        actionExecutor: mockActionExecutor,
        integrationHub: null,
        dlq
      });

      const matchedTriggers = await triggerMatcher.matchTriggers(persistedEvent);

      await expect(
        actionChainExecutor.executeChain(persistedEvent, matchedTriggers[0])
      ).rejects.toThrow();

      // Verify DLQ entry created
      const dlqEntries = await db('dead_letter_queue')
        .where('event_id', persistedEvent.id);

      expect(dlqEntries).toHaveLength(1);
      expect(dlqEntries[0].failure_reason).toContain('Max retry attempts');
      expect(dlqEntries[0].status).toBe('pending');
    });

    it('should handle Hebrew text throughout the pipeline', async () => {
      // Setup trigger with Hebrew name
      const trigger = await db('event_triggers')
        .insert({
          ...testTriggers.userTrigger,
          name: 'טריגר לטפסים דחופים'
        })
        .returning('*');

      const action = await db('trigger_actions')
        .insert({
          ...testActions.sendEmail,
          config: {
            to: 'manager@example.com',
            subject: 'טופס חדש: {{event.data.fields.name}}',
            body: 'תיאור: {{event.data.fields.description}}'
          }
        })
        .returning('*');

      // Emit event with Hebrew data
      const event = createTestEvent(testEvents.hebrewTextEvent);
      const emitResult = await eventBus.emit(event);

      const persistedEvent = await db('events')
        .where('id', emitResult.event_id)
        .first();

      expect(persistedEvent.data.fields.name).toBe('שלום עולם');

      // Match and execute
      const matchedTriggers = await triggerMatcher.matchTriggers(persistedEvent);
      expect(matchedTriggers[0].name).toBe('טריגר לטפסים דחופים');

      const mockActionExecutor = {
        execute: async (action: any) => {
          expect(action.config.subject).toContain('שלום עולם');
          return { success: true };
        }
      };

      actionChainExecutor = new ActionChainExecutor({
        db,
        actionExecutor: mockActionExecutor,
        integrationHub: null,
        dlq
      });

      await actionChainExecutor.executeChain(persistedEvent, matchedTriggers[0]);
    });
  });

  describe('Redis Pub/Sub vs PostgreSQL Polling', () => {
    it('should use Redis when available', async () => {
      const event = createTestEvent(testEvents.formSubmitted);

      const emitResult = await eventBus.emit(event);

      expect(emitResult.processing_mode).toBe('redis');

      const persistedEvent = await db('events')
        .where('id', emitResult.event_id)
        .first();

      expect(persistedEvent.processing_mode).toBe('redis');
    });

    it('should fallback to polling when Redis unavailable', async () => {
      // Disconnect Redis
      await redis.disconnect();

      const event = createTestEvent(testEvents.formSubmitted);

      const emitResult = await eventBus.emit(event);

      expect(emitResult.processing_mode).toBe('polling');

      const persistedEvent = await db('events')
        .where('id', emitResult.event_id)
        .first();

      expect(persistedEvent.processing_mode).toBe('poll');

      // Reconnect Redis
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      });
      eventBus = new EventBus({ redis, db, circuitBreaker });
    });

    it('should poll pending events and process them', async () => {
      // Create event with poll mode
      const event = createTestEvent(testEvents.formSubmitted, {
        processing_mode: 'poll',
        next_retry_at: new Date(Date.now() - 1000) // Ready to retry
      });

      await db('events').insert(event);

      // Setup trigger
      await db('event_triggers').insert(testTriggers.userTrigger);
      await db('trigger_actions').insert(testActions.sendWebhook);

      // Poll pending events
      await eventBus.pollPendingEvents();

      // Verify event processed
      const processedEvent = await db('events').where('id', event.id).first();

      expect(processedEvent.processing_mode).toMatch(/completed|redis/);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit after repeated Redis failures', async () => {
      // Force Redis failures
      await redis.disconnect();

      const events = Array.from({ length: 5 }, () =>
        createTestEvent(testEvents.formSubmitted)
      );

      for (const event of events) {
        await eventBus.emit(event);
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Reconnect Redis
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      });
      eventBus = new EventBus({ redis, db, circuitBreaker });
      circuitBreaker.reset();
    });

    it('should use polling when circuit is open', async () => {
      circuitBreaker.open();

      const event = createTestEvent(testEvents.formSubmitted);
      const emitResult = await eventBus.emit(event);

      expect(emitResult.processing_mode).toBe('polling');

      circuitBreaker.close();
    });
  });

  describe('DLQ Retry Flow', () => {
    it('should successfully retry failed action from DLQ', async () => {
      // Create DLQ entry
      const event = createTestEvent(testEvents.formSubmitted);
      await db('events').insert(event);

      const trigger = await db('event_triggers')
        .insert(testTriggers.userTrigger)
        .returning('*');

      const action = await db('trigger_actions')
        .insert(testActions.sendWebhook)
        .returning('*');

      const dlqEntry = await db('dead_letter_queue')
        .insert({
          event_id: event.id,
          trigger_id: trigger[0].id,
          action_id: action[0].id,
          failure_reason: 'Temporary error',
          failure_count: 3,
          last_error: { message: 'Timeout' },
          event_snapshot: event,
          action_snapshot: action[0],
          status: 'pending'
        })
        .returning('*');

      // Retry with successful executor
      const mockActionExecutor = {
        execute: async () => ({ success: true })
      };

      await dlq.retry(dlqEntry[0].id, mockActionExecutor);

      // Verify resolved
      const resolvedEntry = await db('dead_letter_queue')
        .where('id', dlqEntry[0].id)
        .first();

      expect(resolvedEntry.status).toBe('resolved');
      expect(resolvedEntry.resolved_at).toBeDefined();
    });

    it('should track failed retry attempts', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      await db('events').insert(event);

      const trigger = await db('event_triggers')
        .insert(testTriggers.userTrigger)
        .returning('*');

      const action = await db('trigger_actions')
        .insert(testActions.sendWebhook)
        .returning('*');

      const dlqEntry = await db('dead_letter_queue')
        .insert({
          event_id: event.id,
          trigger_id: trigger[0].id,
          action_id: action[0].id,
          failure_reason: 'Initial failure',
          failure_count: 1,
          last_error: { message: 'Error' },
          event_snapshot: event,
          action_snapshot: action[0],
          status: 'pending'
        })
        .returning('*');

      // Retry with failing executor
      const mockActionExecutor = {
        execute: async () => {
          throw new Error('Still failing');
        }
      };

      await expect(dlq.retry(dlqEntry[0].id, mockActionExecutor)).rejects.toThrow();

      // Verify failure count incremented
      const updatedEntry = await db('dead_letter_queue')
        .where('id', dlqEntry[0].id)
        .first();

      expect(updatedEntry.failure_count).toBe(2);
      expect(updatedEntry.status).toBe('pending');
    });
  });

  describe('Performance & Load Testing', () => {
    it('should handle 100 concurrent events', async () => {
      const events = Array.from({ length: 100 }, () =>
        createTestEvent(testEvents.formSubmitted)
      );

      const startTime = Date.now();
      const results = await Promise.all(events.map(e => eventBus.emit(e)));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all events persisted
      const count = await db('events').count('* as count');
      expect(parseInt(count[0].count as string)).toBeGreaterThanOrEqual(100);
    });

    it('should process trigger matching efficiently for 50 events', async () => {
      // Setup 10 triggers
      const triggers = Array.from({ length: 10 }, (_, i) => ({
        ...testTriggers.userTrigger,
        id: `trigger-${i}`,
        priority: i
      }));

      await db('event_triggers').insert(triggers);

      // Create and match 50 events
      const events = Array.from({ length: 50 }, () =>
        createTestEvent(testEvents.formSubmitted)
      );

      await db('events').insert(events);

      const startTime = Date.now();
      const results = await Promise.all(
        events.map(e => triggerMatcher.matchTriggers(e))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(2000); // Should be fast
    });
  });
});
