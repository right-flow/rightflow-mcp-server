/**
 * Event Processing Queue
 * Handles asynchronous event processing for the Event Trigger System
 */

import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// Event job data structure
export interface EventJob {
  eventId: string;
  organizationId: string;
  eventType: string;
  sourceType: string;
  sourceId?: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
  occurredAt: string;
}

// Create event processing queue
export const eventQueue = new Queue<EventJob>('event-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start at 2 seconds
    },
    removeOnComplete: 1000, // Keep last 1000 completed jobs
    removeOnFail: 1000, // Keep last 1000 failed jobs
  },
});

// Export for monitoring
export default eventQueue;
