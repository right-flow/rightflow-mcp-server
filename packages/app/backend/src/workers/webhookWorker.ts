import { Worker, Job } from 'bullmq';
import fetch from 'node-fetch';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { WebhookJob } from '../queues/webhookQueue';
import logger from '../utils/logger';
import { config } from '../config/env';

// Create webhook delivery worker
export const webhookWorker = new Worker<WebhookJob>(
  'webhook-delivery',
  async (job: Job<WebhookJob>) => {
    const { webhookId, url, payload, signature } = job.data;

    logger.info('Delivering webhook', {
      jobId: job.id,
      webhookId,
      url,
      eventType: payload.type,
      attempt: job.attemptsMade + 1,
    });

    try {
      // Send HTTP POST to customer's webhook URL
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RightFlow-Signature': signature,
          'X-RightFlow-Event-Type': payload.type,
          'X-RightFlow-Event-Id': payload.id,
          'X-RightFlow-Delivery-Attempt': (job.attemptsMade + 1).toString(),
          'User-Agent': 'RightFlow-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        timeout: config.WEBHOOK_TIMEOUT_MS,
      });

      const responseBody = await response.text();

      // Check if delivery was successful
      if (response.ok) {
        // Success: HTTP 200-299
        await logWebhookEvent(webhookId, payload.id, 'delivered', {
          eventType: payload.type,
          statusCode: response.status,
          responseBody: responseBody.substring(0, 1000), // Limit to 1000 chars
          attempt: job.attemptsMade + 1,
        });

        logger.info('Webhook delivered successfully', {
          jobId: job.id,
          webhookId,
          statusCode: response.status,
        });

        return { success: true, statusCode: response.status };
      } else {
        // Failure: HTTP 4xx/5xx
        await logWebhookEvent(webhookId, payload.id, 'failed', {
          eventType: payload.type,
          statusCode: response.status,
          responseBody: responseBody.substring(0, 1000),
          attempt: job.attemptsMade + 1,
        });

        throw new Error(
          `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
        );
      }
    } catch (error: any) {
      // Network error, timeout, or DNS error
      await logWebhookEvent(webhookId, payload.id, 'failed', {
        eventType: payload.type,
        error: error.message,
        attempt: job.attemptsMade + 1,
      });

      logger.error('Webhook delivery failed', {
        jobId: job.id,
        webhookId,
        error: error.message,
        attempt: job.attemptsMade + 1,
      });

      throw error; // Re-throw to trigger BullMQ retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 10, // Process 10 webhooks concurrently
    limiter: {
      max: 100, // Max 100 jobs per duration
      duration: 1000, // 1 second (rate limiting)
    },
  },
);

// Worker event listeners
webhookWorker.on('completed', (job) => {
  logger.debug('Webhook job completed', {
    jobId: job.id,
    webhookId: job.data.webhookId,
  });
});

webhookWorker.on('failed', (job, error) => {
  if (job) {
    logger.error('Webhook job failed after all retries', {
      jobId: job.id,
      webhookId: job.data.webhookId,
      error: error.message,
      attempts: job.attemptsMade,
    });

    // TODO: Send alert to admin (email/Slack) when webhook permanently fails
  }
});

webhookWorker.on('error', (error) => {
  logger.error('Webhook worker error', { error: error.message });
});

// Log webhook event to database
async function logWebhookEvent(
  webhookId: string,
  eventId: string,
  status: 'pending' | 'delivered' | 'failed',
  metadata: any,
) {
  try {
    await query(
      `
      INSERT INTO webhook_events (
        webhook_id,
        event_id,
        event_type,
        payload,
        status,
        attempts,
        last_attempt_at,
        last_error,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
      ON CONFLICT (webhook_id, event_id) DO UPDATE
      SET
        status = $5,
        attempts = webhook_events.attempts + 1,
        last_attempt_at = NOW(),
        last_error = $7,
        metadata = $8,
        updated_at = NOW()
    `,
      [
        webhookId,
        eventId,
        metadata.eventType || 'unknown',
        JSON.stringify({}), // Payload stored separately
        status,
        metadata.attempt || 1,
        status === 'failed' ? metadata.error || metadata.responseBody : null,
        JSON.stringify(metadata),
      ],
    );
  } catch (error: any) {
    logger.error('Failed to log webhook event', {
      webhookId,
      eventId,
      error: error.message,
    });
  }
}

export default webhookWorker;
