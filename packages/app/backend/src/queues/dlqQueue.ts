/**
 * Dead Letter Queue Processing Queue
 * Handles retry processing for failed actions
 */

import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// DLQ retry job data structure
export interface DLQRetryJob {
  dlqEntryId: string;
  eventId: string;
  triggerId: string;
  actionId: string;
  eventSnapshot: Record<string, any>;
  actionSnapshot: Record<string, any>;
  attemptNumber: number;
}

// Create DLQ retry queue
export const dlqQueue = new Queue<DLQRetryJob>('dlq-retry', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start at 5 seconds
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

// Export for monitoring
export default dlqQueue;
