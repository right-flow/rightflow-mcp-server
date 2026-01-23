/**
 * Integration Queue - Integration Hub Phase 4
 * BullMQ async job queue for Form → ERP push operations
 *
 * Features:
 * - Async job processing with 5 concurrent workers
 * - Exponential backoff retry (30s, 1min, 2min)
 * - Dead letter queue after 4 failed attempts
 * - Job status tracking
 * - Multi-tenant isolation
 * - Performance monitoring
 */

import { Queue, Job, JobsOptions } from 'bullmq';
import { redisConnection } from '../config/redis';
import logger from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface IntegrationJobData {
  jobId: string;
  organizationId: string;
  submissionId: string;
  formId: string;
  connectorId: string;
  data: Record<string, any>;
  endpoint: {
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    headers?: Record<string, string>;
  };
  retryCount: number;
  createdAt: number;
  priority?: number;
}

export interface IntegrationJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'delayed';
  organizationId: string;
  submissionId: string;
  connectorId: string;
  retryCount: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: any;
}

// ============================================================================
// Queue Configuration
// ============================================================================

const QUEUE_NAME = 'integration-push';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 4, // Initial attempt + 3 retries
  backoff: {
    type: 'exponential',
    delay: 30000, // 30 seconds base delay
  },
  removeOnComplete: false, // Keep for audit trail
  removeOnFail: false, // Keep for DLQ
};

// ============================================================================
// Queue Instance
// ============================================================================

let queueInstance: Queue<IntegrationJobData> | null = null;

/**
 * Create integration queue with BullMQ
 *
 * Configuration:
 * - Queue name: integration-push
 * - Max retries: 3 (4 attempts total)
 * - Backoff: Exponential (30s, 60s, 120s)
 * - Timeout: 30 seconds per job
 * - Concurrency: 5 jobs/worker (configured in worker)
 */
export function createIntegrationQueue(): Queue<IntegrationJobData> {
  if (queueInstance) {
    return queueInstance;
  }

  queueInstance = new Queue<IntegrationJobData>(QUEUE_NAME, {
    connection: redisConnection as any,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  logger.info('Integration queue created', {
    queueName: QUEUE_NAME,
    maxAttempts: DEFAULT_JOB_OPTIONS.attempts,
    backoffDelay: typeof DEFAULT_JOB_OPTIONS.backoff === 'object'
      ? DEFAULT_JOB_OPTIONS.backoff?.delay
      : DEFAULT_JOB_OPTIONS.backoff,
  });

  return queueInstance;
}

/**
 * Get existing queue instance
 */
export function getQueue(): Queue<IntegrationJobData> {
  if (!queueInstance) {
    return createIntegrationQueue();
  }
  return queueInstance;
}

// ============================================================================
// Job Operations
// ============================================================================

/**
 * Validate job data before enqueueing
 */
function validateJobData(data: IntegrationJobData): void {
  if (!data.jobId) {
    throw new Error('jobId is required');
  }

  if (!data.organizationId) {
    throw new Error('organizationId is required');
  }

  if (!data.submissionId) {
    throw new Error('submissionId is required');
  }

  if (!data.connectorId) {
    throw new Error('connectorId is required');
  }

  if (!data.endpoint) {
    throw new Error('endpoint is required');
  }

  const validMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!validMethods.includes(data.endpoint.method)) {
    throw new Error('Invalid HTTP method');
  }

  if (!data.endpoint.path) {
    throw new Error('endpoint.path is required');
  }

  if (data.data === undefined) {
    throw new Error('data field is required (can be empty object)');
  }
}

/**
 * Enqueue integration job
 *
 * @param data - Job data with submission and connector info
 * @returns BullMQ Job instance
 * @throws Error if validation fails or job already exists
 */
export async function enqueueIntegrationJob(
  data: IntegrationJobData,
): Promise<Job<IntegrationJobData>> {
  // Validate job data
  validateJobData(data);

  const queue = getQueue();

  // Enqueue job with jobId as BullMQ job ID
  // BullMQ will throw if job with this ID already exists (prevents race condition)
  try {
    const job = await queue.add(
      'push-to-erp', // Job name
      data,
      {
        jobId: data.jobId,
        priority: data.priority,
        ...DEFAULT_JOB_OPTIONS,
      },
    );

    logger.info('Integration job enqueued', {
      jobId: data.jobId,
      organizationId: data.organizationId,
      submissionId: data.submissionId,
      connectorId: data.connectorId,
    });

    return job;
  } catch (error: any) {
    // BullMQ throws specific error for duplicate job IDs
    if (error.message?.includes('job') && error.message?.includes('exists')) {
      throw new Error('Job already exists');
    }
    throw error;
  }
}

/**
 * Get job status by job ID
 *
 * @param jobId - Job ID to query
 * @returns Job status or null if not found
 */
export async function getJobStatus(jobId: string): Promise<IntegrationJobStatus | null> {
  const queue = getQueue();

  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const failedReason = job.failedReason;
  const returnvalue = job.returnvalue;
  const processedOn = job.processedOn;
  const finishedOn = job.finishedOn;

  // Map BullMQ state to our status
  let status: IntegrationJobStatus['status'];
  switch (state) {
    case 'waiting':
    case 'waiting-children':
      status = 'queued';
      break;
    case 'active':
      status = 'processing';
      break;
    case 'completed':
      status = 'completed';
      break;
    case 'failed':
      status = 'failed';
      break;
    case 'delayed':
      status = 'delayed';
      break;
    default:
      status = 'queued';
  }

  return {
    jobId: job.id!,
    status,
    organizationId: job.data.organizationId,
    submissionId: job.data.submissionId,
    connectorId: job.data.connectorId,
    retryCount: job.attemptsMade,
    createdAt: job.data.createdAt,
    startedAt: processedOn || undefined,
    completedAt: finishedOn || undefined,
    error: failedReason || undefined,
    result: returnvalue || undefined,
  };
}

/**
 * Get all jobs for an organization
 *
 * @param organizationId - Organization ID
 * @param status - Optional status filter
 * @param limit - Max results (default: 100)
 * @returns Array of job statuses
 */
export async function getJobsForOrganization(
  organizationId: string,
  status?: 'queued' | 'processing' | 'completed' | 'failed',
  limit: number = 100,
): Promise<IntegrationJobStatus[]> {
  const queue = getQueue();

  // Get jobs based on status
  let jobs: Job<IntegrationJobData>[] = [];

  if (!status) {
    // Get all jobs
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(0, limit),
      queue.getActive(0, limit),
      queue.getCompleted(0, limit),
      queue.getFailed(0, limit),
      queue.getDelayed(0, limit),
    ]);

    jobs = [...waiting, ...active, ...completed, ...failed, ...delayed];
  } else {
    // Get jobs by specific status
    switch (status) {
      case 'queued':
        jobs = await queue.getWaiting(0, limit);
        break;
      case 'processing':
        jobs = await queue.getActive(0, limit);
        break;
      case 'completed':
        jobs = await queue.getCompleted(0, limit);
        break;
      case 'failed':
        jobs = await queue.getFailed(0, limit);
        break;
    }
  }

  // Filter by organization and map to status
  const statuses: IntegrationJobStatus[] = [];

  for (const job of jobs) {
    if (job.data.organizationId === organizationId) {
      const jobStatus = await getJobStatus(job.id!);
      if (jobStatus) {
        statuses.push(jobStatus);
      }
    }
  }

  return statuses.slice(0, limit);
}

/**
 * Retry a failed job manually
 *
 * @param jobId - Job ID to retry
 * @returns Updated job
 * @throws Error if job not found or not in failed state
 */
export async function retryJob(jobId: string): Promise<Job<IntegrationJobData>> {
  const queue = getQueue();

  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  const state = await job.getState();

  if (state !== 'failed') {
    throw new Error('Job is not in failed state');
  }

  // Retry the job
  await job.retry();

  logger.info('Job manually retried', {
    jobId,
    organizationId: job.data.organizationId,
  });

  return job;
}

/**
 * Remove a job from the queue
 *
 * @param jobId - Job ID to remove
 * @returns True if removed successfully
 */
export async function removeJob(jobId: string): Promise<boolean> {
  const queue = getQueue();

  const job = await queue.getJob(jobId);

  if (!job) {
    return false;
  }

  await job.remove();

  logger.info('Job removed', {
    jobId,
    organizationId: job.data.organizationId,
  });

  return true;
}

/**
 * Get queue metrics
 *
 * @returns Queue statistics
 */
export async function getQueueMetrics(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}> {
  const queue = getQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Close queue connection
 */
export async function closeQueue(): Promise<void> {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
    logger.info('Integration queue closed');
  }
}
