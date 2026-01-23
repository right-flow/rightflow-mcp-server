/**
 * Webhook Delivery Worker - Integration Hub Phase 6
 * BullMQ worker that processes webhook delivery jobs
 *
 * Features:
 * - Processes webhook HTTP POST requests
 * - Records delivery results
 * - Updates webhook health status
 * - Handles retries automatically via BullMQ
 * - Concurrent processing (10 workers)
 */

import { Worker, Job } from 'bullmq';
import * as webhookDeliveryService from '../services/integrationHub/webhookDeliveryService';
import logger from '../utils/logger';

// ============================================================================
// Worker Configuration
// ============================================================================

const worker = new Worker(
  'webhook-delivery',
  async (job: Job) => {
    const { webhook, payload } = job.data;

    logger.info('Processing webhook delivery job', {
      jobId: job.id,
      webhookId: webhook.id,
      event: payload.event,
      attempt: job.attemptsMade,
    });

    try {
      // Validate job data
      if (!webhook || !payload) {
        throw new Error('Invalid job data: missing webhook or payload');
      }

      // 1. Process webhook delivery (HTTP POST)
      const deliveryResult = await webhookDeliveryService.processWebhookDelivery(
        webhook,
        payload,
      );

      logger.info('Webhook delivery processed', {
        jobId: job.id,
        webhookId: webhook.id,
        success: deliveryResult.success,
        statusCode: deliveryResult.statusCode,
        responseTimeMs: deliveryResult.responseTimeMs,
      });

      // 2. Record delivery result
      await webhookDeliveryService.recordDeliveryResult(
        webhook.id,
        payload.event,
        payload,
        deliveryResult.signature || '',
        deliveryResult,
        job.attemptsMade,
      );

      // 3. Update webhook health status
      await webhookDeliveryService.updateWebhookHealthAfterDelivery(
        webhook.id,
        deliveryResult,
      );

      // 4. If delivery failed, throw error to trigger retry
      if (!deliveryResult.success) {
        throw new Error(
          `Webhook delivery failed: ${deliveryResult.statusCode || 'N/A'} - ${
            deliveryResult.error || 'Unknown error'
          }`,
        );
      }

      // 5. Return success result
      return {
        success: true,
        statusCode: deliveryResult.statusCode,
        webhookId: webhook.id,
      };
    } catch (error: any) {
      logger.error('Webhook delivery job failed', {
        jobId: job.id,
        webhookId: webhook?.id,
        error: error.message,
        attempt: job.attemptsMade,
      });

      // Re-throw error to trigger BullMQ retry
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 10, // Process 10 jobs concurrently
    limiter: {
      max: 100, // Max 100 jobs per minute
      duration: 60000,
    },
  },
);

// ============================================================================
// Event Handlers
// ============================================================================

worker.on('completed', (job: Job, result: any) => {
  logger.info('Webhook delivery job completed successfully', {
    jobId: job.id,
    webhookId: result.webhookId,
    statusCode: result.statusCode,
  });
});

worker.on('failed', (job: Job | undefined, error: Error) => {
  if (!job) {
    logger.error('Webhook delivery job failed (no job data)', {
      error: error.message,
    });
    return;
  }

  logger.error('Webhook delivery job failed', {
    jobId: job.id,
    webhookId: job.data.webhook?.id,
    attempt: job.attemptsMade,
    error: error.message,
    willRetry: job.attemptsMade < 4,
  });

  // If this was the final attempt, log as critical
  if (job.attemptsMade >= 4) {
    logger.error('Webhook delivery job exhausted all retries', {
      jobId: job.id,
      webhookId: job.data.webhook?.id,
    });
  }
});

worker.on('error', (error: Error) => {
  logger.error('Webhook delivery worker error', {
    error: error.message,
  });
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function gracefulShutdown() {
  logger.info('Webhook delivery worker shutting down gracefully...');

  try {
    await worker.close();
    logger.info('Webhook delivery worker closed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error closing webhook delivery worker', {
      error: error.message,
    });
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ============================================================================
// Export Worker
// ============================================================================

export default worker;
