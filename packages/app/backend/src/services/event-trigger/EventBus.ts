/**
 * EventBus Service
 * Handles event emission with hybrid Redis Pub/Sub + PostgreSQL fallback
 * Implements Circuit Breaker pattern for fault tolerance
 */

import type { Knex } from 'knex';
import type Redis from 'ioredis';
import type { Event, ProcessingMode } from '../../types/event-trigger';
import type { CircuitBreaker } from './CircuitBreaker';

interface EventBusConfig {
  redis: Redis;
  db: Knex;
  circuitBreaker: CircuitBreaker;
}

interface EmitResult {
  event_id: string;
  processing_mode: ProcessingMode;
}

export class EventBus {
  private redis: Redis;
  private db: Knex;
  private circuitBreaker: CircuitBreaker;
  private subscribers: Map<string, Array<(event: Event) => Promise<void>>> = new Map();
  private readonly DEDUPLICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_POLLING_RETRIES = 10;

  constructor(config: EventBusConfig) {
    this.redis = config.redis;
    this.db = config.db;
    this.circuitBreaker = config.circuitBreaker;
    this.setupRedisSubscription();
  }

  /**
   * Emit an event with hybrid Redis + PostgreSQL persistence
   */
  async emit(event: Event): Promise<EmitResult> {
    // 1. Check for duplicates
    await this.checkDuplicateEvent(event);

    // 2. Normalize Unicode in event data (remove dangerous control characters)
    const normalizedEvent = this.normalizeEventData(event);

    // 3. Always persist to PostgreSQL first (source of truth)
    const persistedEvent = await this.persistEvent(normalizedEvent);

    // 4. Try to publish to Redis (with Circuit Breaker)
    let processingMode: ProcessingMode = 'poll';

    try {
      await this.circuitBreaker.execute(async () => {
        const subscribers = await this.redis.publish(
          'rightflow:events',
          JSON.stringify(persistedEvent)
        );
        return subscribers;
      });

      // Successfully published to Redis
      processingMode = 'redis';

      // Update event processing mode
      await this.db('events')
        .where('id', persistedEvent.id)
        .update({ processing_mode: 'redis' });
    } catch (error) {
      // Redis failed or circuit is open - fallback to polling
      console.error('EventBus: Redis publish failed, using polling fallback', error);

      await this.markForPolling(persistedEvent.id);
    }

    return {
      event_id: persistedEvent.id,
      processing_mode: processingMode
    };
  }

  /**
   * Check for duplicate events within deduplication window
   */
  private async checkDuplicateEvent(event: Event): Promise<void> {
    const deduplicationCutoff = new Date(Date.now() - this.DEDUPLICATION_WINDOW_MS);

    const existingEvent = await this.db('events')
      .where({
        organization_id: event.organization_id,
        event_type: event.event_type,
        entity_id: event.entity_id
      })
      .where('created_at', '>', deduplicationCutoff)
      .first();

    if (existingEvent) {
      throw new Error(
        `Duplicate event detected: ${event.event_type} for entity ${event.entity_id}`
      );
    }
  }

  /**
   * Normalize Unicode control characters in event data
   * Removes dangerous RTL/LTR marks that could hide malicious content
   */
  private normalizeEventData(event: Event): Event {
    const dangerousUnicode = /[\u202A-\u202E\u2066-\u2069]/g;

    const normalizeValue = (value: any): any => {
      if (typeof value === 'string') {
        return value.replace(dangerousUnicode, '');
      }
      if (Array.isArray(value)) {
        return value.map(normalizeValue);
      }
      if (value && typeof value === 'object') {
        const normalized: any = {};
        for (const [key, val] of Object.entries(value)) {
          normalized[key] = normalizeValue(val);
        }
        return normalized;
      }
      return value;
    };

    return {
      ...event,
      data: normalizeValue(event.data)
    };
  }

  /**
   * Persist event to PostgreSQL
   */
  private async persistEvent(event: Event): Promise<Event> {
    const [persistedEvent] = await this.db('events')
      .insert({
        id: event.id,
        organization_id: event.organization_id,
        event_type: event.event_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        user_id: event.user_id,
        data: JSON.stringify(event.data),
        processing_mode: 'poll', // Default to polling
        retry_count: 0,
        created_at: event.created_at || new Date()
      })
      .returning('*');

    return {
      ...persistedEvent,
      data: JSON.parse(persistedEvent.data)
    };
  }

  /**
   * Mark event for polling-based processing
   */
  private async markForPolling(eventId: string): Promise<void> {
    await this.db('events').where('id', eventId).update({
      processing_mode: 'poll',
      retry_count: 0,
      next_retry_at: new Date()
    });
  }

  /**
   * Subscribe to events by type
   * Supports wildcards (e.g., "form.*" matches "form.submitted", "form.approved")
   */
  async subscribe(
    eventType: string,
    handler: (event: Event) => Promise<void>
  ): Promise<void> {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType)!.push(handler);
  }

  /**
   * Setup Redis subscription for real-time events
   */
  private setupRedisSubscription(): void {
    this.redis.subscribe('rightflow:events', (err, count) => {
      if (err) {
        console.error('EventBus: Failed to subscribe to Redis channel', err);
      }
    });

    this.redis.on('message', async (channel, message) => {
      if (channel !== 'rightflow:events') return;

      try {
        const event: Event = JSON.parse(message);
        await this.notifySubscribers(event);
      } catch (error) {
        console.error('EventBus: Failed to process Redis message', error);
      }
    });
  }

  /**
   * Notify all matching subscribers
   */
  private async notifySubscribers(event: Event): Promise<void> {
    for (const [pattern, handlers] of this.subscribers.entries()) {
      if (this.matchesPattern(event.event_type, pattern)) {
        for (const handler of handlers) {
          try {
            await handler(event);
          } catch (error) {
            console.error(`EventBus: Subscriber error for ${event.event_type}`, error);
          }
        }
      }
    }
  }

  /**
   * Check if event type matches subscription pattern
   * Supports wildcards: "form.*" matches "form.submitted", "form.approved"
   */
  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === eventType) return true;

    // Handle wildcard patterns
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(eventType);
    }

    return false;
  }

  /**
   * Poll for pending events (PostgreSQL fallback)
   * Called periodically when Redis is unavailable
   */
  async pollPendingEvents(): Promise<void> {
    const pendingEvents = await this.db('events')
      .where('processing_mode', 'poll')
      .where('next_retry_at', '<=', new Date())
      .orderBy('created_at', 'asc')
      .limit(10); // Process in batches

    for (const eventRow of pendingEvents) {
      const event: Event = {
        ...eventRow,
        data: JSON.parse(eventRow.data)
      };

      try {
        await this.processEvent(event);

        // Mark as completed
        await this.db('events').where('id', event.id).update({
          processing_mode: 'completed',
          processed_at: new Date()
        });
      } catch (error) {
        // Increment retry count
        const newRetryCount = (event.retry_count || 0) + 1;

        if (newRetryCount >= this.MAX_POLLING_RETRIES) {
          // Max retries exceeded, mark as failed
          await this.db('events').where('id', event.id).update({
            processing_mode: 'failed',
            retry_count: newRetryCount,
            last_error: JSON.stringify({
              message: (error as Error).message,
              code: 'MAX_RETRIES_EXCEEDED'
            })
          });
        } else {
          // Schedule next retry with exponential backoff
          const nextRetryDelay = Math.pow(2, newRetryCount) * 1000; // 2^n seconds
          const nextRetryAt = new Date(Date.now() + nextRetryDelay);

          await this.db('events').where('id', event.id).update({
            retry_count: newRetryCount,
            next_retry_at: nextRetryAt,
            last_error: JSON.stringify({
              message: (error as Error).message
            })
          });
        }
      }
    }
  }

  /**
   * Process event through the trigger pipeline
   */
  private async processEvent(event: Event): Promise<void> {
    // This will be called by the EventProcessor
    // For now, just notify subscribers
    await this.notifySubscribers(event);
  }
}
