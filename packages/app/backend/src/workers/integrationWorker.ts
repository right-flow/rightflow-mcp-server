/**
 * Integration Worker - Integration Hub Phase 4
 * Background processor for ERP push jobs
 *
 * Features:
 * - Processes jobs from integration queue
 * - Calls Push Service for each job
 * - Handles retries automatically (BullMQ)
 * - Cleans up Redis on success
 * - Error handling and logging
 * - Multi-tenant isolation
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import * as pushService from '../services/integrationHub/pushService';
import { IntegrationJobData } from '../queues/integrationQueue';
import logger from '../utils/logger';

// ============================================================================
// Worker Configuration
// ============================================================================

const QUEUE_NAME = 'integration-push';
const CONCURRENCY = 5; // Process 5 jobs concurrently

let workerInstance: Worker | null = null;

// ============================================================================
// Worker Creation
// ============================================================================

/**
 * Create and start integration worker
 *
 * Configuration:
 * - Queue: integration-push
 * - Concurrency: 5 jobs
 * - Auto-retry: Handled by BullMQ (configured in queue)
 */
export function createIntegrationWorker(): Worker {
  if (workerInstance) {
    return workerInstance;
  }

  workerInstance = new Worker<IntegrationJobData>(
    QUEUE_NAME,
    async (job: Job<IntegrationJobData>) => {
      return await processJob(job);
    },
    {
      connection: redisConnection as any,
      concurrency: CONCURRENCY,
    },
  );

  // Event listeners
  workerInstance.on('completed', (job: Job) => {
    logger.info('Job completed successfully', {
      jobId: job.id,
      organizationId: job.data.organizationId,
      submissionId: job.data.submissionId,
      attemptsMade: job.attemptsMade,
    });
  });

  workerInstance.on('failed', (job: Job | undefined, error: Error) => {
    if (job) {
      logger.error('Job failed', {
        jobId: job.id,
        organizationId: job.data.organizationId,
        submissionId: job.data.submissionId,
        attemptsMade: job.attemptsMade,
        error: error.message,
      });
    } else {
      logger.error('Job failed without job data', { error: error.message });
    }
  });

  workerInstance.on('error', (error: Error) => {
    logger.error('Worker error', { error: error.message });
  });

  logger.info('Integration worker created', {
    queueName: QUEUE_NAME,
    concurrency: CONCURRENCY,
  });

  return workerInstance;
}

/**
 * Get existing worker instance
 */
export function getWorker(): Worker | null {
  return workerInstance;
}

// ============================================================================
// Job Processing
// ============================================================================

/**
 * Process integration job
 *
 * Flow:
 * 1. Load job data (already in job.data)
 * 2. Call Push Service
 * 3. Return result
 *
 * Note: Retry logic is handled by BullMQ automatically
 *
 * @param job - BullMQ job
 * @returns Push result
 * @throws Error on push failure (triggers BullMQ retry)
 */
async function processJob(job: Job<IntegrationJobData>): Promise<any> {
  const { jobId, organizationId, submissionId, connectorId, data, endpoint } = job.data;

  logger.info('Processing integration job', {
    jobId,
    organizationId,
    submissionId,
    connectorId,
    attemptsMade: job.attemptsMade,
  });

  try {
    // Build push request from job data
    const pushRequest: pushService.PushRequest = {
      organizationId,
      connectorId,
      formId: job.data.formId,
      submissionId,
      data,
      endpoint,
    };

    // Call Push Service
    const result = await pushService.pushData(pushRequest);

    logger.info('Push successful', {
      jobId,
      organizationId,
      submissionId,
      erpRecordId: result.erpRecordId,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
    });

    // Return result (stored in BullMQ job.returnvalue)
    return {
      success: true,
      erpRecordId: result.erpRecordId,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
    };
  } catch (error: any) {
    logger.error('Push failed', {
      jobId,
      organizationId,
      submissionId,
      error: error.message,
      attemptsMade: job.attemptsMade,
    });

    // Throw error to trigger BullMQ retry
    throw error;
  }
}

// ============================================================================
// Worker Lifecycle
// ============================================================================

/**
 * Start worker
 * (Worker starts automatically on creation, this is for explicit start after pause)
 */
export async function startWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.run();
    logger.info('Integration worker started');
  }
}

/**
 * Pause worker (stop processing new jobs)
 */
export async function pauseWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.pause();
    logger.info('Integration worker paused');
  }
}

/**
 * Resume worker (continue processing jobs)
 */
export async function resumeWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.resume();
    logger.info('Integration worker resumed');
  }
}

/**
 * Close worker (graceful shutdown)
 */
export async function closeWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    logger.info('Integration worker closed');
  }
}

/**
 * Get worker status
 */
export function getWorkerStatus(): {
  isRunning: boolean;
  isPaused: boolean;
  concurrency: number;
} {
  if (!workerInstance) {
    return {
      isRunning: false,
      isPaused: false,
      concurrency: 0,
    };
  }

  return {
    isRunning: workerInstance.isRunning(),
    isPaused: workerInstance.isPaused(),
    concurrency: CONCURRENCY,
  };
}
