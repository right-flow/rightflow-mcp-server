/**
 * Webhook Delivery Queue - Integration Hub Phase 6
 * BullMQ queue configuration for webhook delivery
 *
 * Features:
 * - Async webhook delivery processing
 * - Exponential backoff retry (30s, 1m, 2m)
 * - 4 total attempts (1 initial + 3 retries)
 * - Job prioritization based on webhook health
 * - Automatic cleanup of old jobs
 */

import { Queue } from 'bullmq';
import crypto from 'crypto';
import { redisConnection } from '../config/redis';
import type { WebhookForDelivery, WebhookPayload } from '../services/integrationHub/webhookDeliveryService';

// ============================================================================
// Queue Configuration
// ============================================================================

/**
 * Webhook delivery queue
 * Processes webhook HTTP POST requests asynchronously
 */
export const webhookDeliveryQueue = new Queue('webhook-delivery', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    ...(redisConnection as any).options, // Reuse existing Redis config
  },
  defaultJobOptions: {
    attempts: 4, // 1 initial + 3 retries
    backoff: {
      type: 'exponential',
      delay: 30000, // 30 seconds base delay (30s, 1m, 2m)
    },
    removeOnComplete: {
      age: 86400, // Remove completed jobs after 24 hours
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days (debugging)
    },
  },
});

// ============================================================================
// Job Management
// ============================================================================

/**
 * Add webhook delivery job to queue
 * @param webhook - Webhook configuration
 * @param payload - Event payload
 * @returns Job ID
 */
export async function addWebhookDeliveryJob(
  webhook: WebhookForDelivery,
  payload: WebhookPayload,
): Promise<string> {
  // Generate unique job ID with temporal + random components
  // This prevents race conditions when multiple jobs are enqueued within the same millisecond
  const jobId = `${webhook.id}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

  // Determine priority based on webhook health status
  let priority = 2; // Default priority

  if (webhook.healthStatus === 'healthy') {
    priority = 1; // High priority for healthy webhooks
  } else if (webhook.healthStatus === 'degraded') {
    priority = 3; // Lower priority for degraded webhooks
  } else if (webhook.healthStatus === 'unhealthy') {
    priority = 5; // Lowest priority for unhealthy webhooks
  }

  // Add job to queue
  const job = await webhookDeliveryQueue.add(
    'deliver-webhook',
    {
      webhook,
      payload,
    },
    {
      jobId,
      priority,
      attempts: 4,
      backoff: {
        type: 'exponential',
        delay: 30000,
      },
    },
  );

  return job.id!;
}

// ============================================================================
// Queue Lifecycle
// ============================================================================

/**
 * Close the queue gracefully
 */
export async function closeQueue(): Promise<void> {
  await webhookDeliveryQueue.close();
}

/**
 * Pause the queue (stop processing jobs)
 */
export async function pauseQueue(): Promise<void> {
  await webhookDeliveryQueue.pause();
}

/**
 * Resume the queue (start processing jobs)
 */
export async function resumeQueue(): Promise<void> {
  await webhookDeliveryQueue.resume();
}

// ============================================================================
// Queue Monitoring
// ============================================================================

/**
 * Get queue job counts
 */
export async function getQueueStats() {
  return await webhookDeliveryQueue.getJobCounts();
}
