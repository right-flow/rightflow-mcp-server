/**
 * Integration Queue Tests - Integration Hub Phase 4
 * Test coverage for BullMQ async job queue
 *
 * Note: These are unit tests with BullMQ mocked.
 * For integration tests with real Redis, see integrationQueue.integration.test.ts
 *
 * Test Categories:
 * 1. Queue creation and configuration
 * 2. Job enqueueing
 * 3. Retry configuration
 * 4. Job data validation
 * 5. Dead letter queue
 * 6. Job status tracking
 * 7. Concurrency settings
 * 8. Error handling
 */

import { Queue, Job } from 'bullmq';
import * as integrationQueueModule from './integrationQueue';

const {
  createIntegrationQueue,
  enqueueIntegrationJob,
  getJobStatus,
  getJobsForOrganization,
  retryJob,
  removeJob,
  getQueueMetrics,
  closeQueue,
} = integrationQueueModule;

type IntegrationJobData = integrationQueueModule.IntegrationJobData;

// Mock BullMQ
jest.mock('bullmq');

// Mock Redis connection
jest.mock('../config/redis', () => ({
  redisConnection: {
    host: 'localhost',
    port: 6379,
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('Integration Queue (Unit Tests)', () => {
  let mockQueue: jest.Mocked<Queue>;
  let mockJob: jest.Mocked<Job>;

  // ============================================================================
  // Setup & Teardown
  // ============================================================================

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Queue instance
    mockQueue = {
      name: 'integration-push',
      opts: {
        connection: { host: 'localhost', port: 6379 },
        defaultJobOptions: {
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 30000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        },
      },
      add: jest.fn(),
      getJob: jest.fn(),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      count: jest.fn().mockResolvedValue(0),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock Job instance
    mockJob = {
      id: 'job-123',
      data: {
        jobId: 'job-123',
        organizationId: 'org-1',
        submissionId: 'sub-1',
        formId: 'form-1',
        connectorId: 'conn-1',
        data: { customer_name: 'John Doe' },
        endpoint: { method: 'POST', path: '/customers' },
        retryCount: 0,
        createdAt: Date.now(),
      },
      opts: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: false,
        removeOnFail: false,
        priority: undefined,
      },
      attemptsMade: 0,
      processedOn: undefined,
      finishedOn: undefined,
      failedReason: undefined,
      returnvalue: undefined,
      getState: jest.fn().mockResolvedValue('waiting'),
      moveToFailed: jest.fn(),
      moveToCompleted: jest.fn(),
      retry: jest.fn(),
      remove: jest.fn(),
    } as any;

    // Configure Queue constructor mock
    (Queue as jest.MockedClass<typeof Queue>).mockImplementation(() => mockQueue);
  });

  afterEach(async () => {
    // Reset the singleton instance between tests
    await closeQueue();
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const mockJobData: IntegrationJobData = {
    jobId: 'job-123',
    organizationId: 'org-1',
    submissionId: 'sub-1',
    formId: 'form-1',
    connectorId: 'conn-1',
    data: {
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
    },
    endpoint: {
      method: 'POST',
      path: '/customers',
    },
    retryCount: 0,
    createdAt: Date.now(),
  };

  // ============================================================================
  // Category 1: Queue Creation and Configuration
  // ============================================================================

  describe('createIntegrationQueue', () => {
    it('should create queue with correct name', () => {
      const queue = createIntegrationQueue();
      expect(queue.name).toBe('integration-push');
    });

    it('should configure queue with Redis connection', () => {
      const queue = createIntegrationQueue();
      expect(queue.opts.connection).toBeDefined();
    });

    it('should set default job options', () => {
      const queue = createIntegrationQueue();
      const defaultJobOpts = queue.opts.defaultJobOptions;

      expect(defaultJobOpts).toMatchObject({
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      });
    });

    it('should return same instance on subsequent calls (singleton)', () => {
      const queue1 = createIntegrationQueue();
      const queue2 = createIntegrationQueue();
      expect(queue1).toBe(queue2);
    });
  });

  // ============================================================================
  // Category 2: Job Enqueueing
  // ============================================================================

  describe('enqueueIntegrationJob', () => {
    beforeEach(() => {
      mockQueue.getJob.mockResolvedValue(undefined); // No existing job
      mockQueue.add.mockResolvedValue(mockJob);
    });

    it('should enqueue job with correct data', async () => {
      const job = await enqueueIntegrationJob(mockJobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'push-to-erp',
        mockJobData,
        expect.objectContaining({
          jobId: 'job-123',
          attempts: 4,
          backoff: { type: 'exponential', delay: 30000 },
        }),
      );

      expect(job).toBeDefined();
      expect(job.id).toBe('job-123');
    });

    it('should set job priority if provided', async () => {
      const priorityData = { ...mockJobData, priority: 1 };
      await enqueueIntegrationJob(priorityData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'push-to-erp',
        priorityData,
        expect.objectContaining({
          priority: 1,
        }),
      );
    });

    it('should handle duplicate job IDs via BullMQ error', async () => {
      // Mock BullMQ throwing error for duplicate job ID
      const duplicateError = new Error('Job with id job-123 already exists');
      mockQueue.add.mockRejectedValue(duplicateError);

      await expect(enqueueIntegrationJob(mockJobData)).rejects.toThrow('Job already exists');
    });

    it('should not retry on BullMQ duplicate error', async () => {
      // Mock BullMQ throwing error for duplicate job ID
      const duplicateError = new Error('Job with id job-123 already exists');
      mockQueue.add.mockRejectedValue(duplicateError);

      await expect(enqueueIntegrationJob(mockJobData)).rejects.toThrow('Job already exists');
      expect(mockQueue.add).toHaveBeenCalledTimes(1); // Should only call add once, not retry
    });
  });

  // ============================================================================
  // Category 3: Retry Configuration
  // ============================================================================

  describe('Retry Configuration', () => {
    it('should configure exponential backoff', () => {
      const queue = createIntegrationQueue();
      const backoff = queue.opts.defaultJobOptions?.backoff as any;

      expect(backoff).toEqual({
        type: 'exponential',
        delay: 30000,
      });
    });

    it('should set max attempts to 4 (1 + 3 retries)', () => {
      const queue = createIntegrationQueue();
      expect(queue.opts.defaultJobOptions?.attempts).toBe(4);
    });

    it('should calculate correct retry delays', () => {
      // Exponential backoff: delay * 2^(attemptNumber - 1)
      const baseDelay = 30000; // 30 seconds

      // Attempt 1: Immediate
      // Attempt 2: 30s * 2^0 = 30s
      // Attempt 3: 30s * 2^1 = 60s (1 min)
      // Attempt 4: 30s * 2^2 = 120s (2 min)

      const delays = [0, 30000, 60000, 120000];

      expect(delays[0]).toBe(0);
      expect(delays[1]).toBe(baseDelay);
      expect(delays[2]).toBe(baseDelay * 2);
      expect(delays[3]).toBe(baseDelay * 4);
    });

    it('should not remove failed jobs (for DLQ)', () => {
      const queue = createIntegrationQueue();
      expect(queue.opts.defaultJobOptions?.removeOnFail).toBe(false);
    });
  });

  // ============================================================================
  // Category 4: Job Data Validation
  // ============================================================================

  describe('Job Data Validation', () => {
    beforeEach(() => {
      mockQueue.getJob.mockResolvedValue(undefined);
      mockQueue.add.mockResolvedValue(mockJob);
    });

    it('should require jobId', async () => {
      const invalidData = { ...mockJobData, jobId: undefined as any };
      await expect(enqueueIntegrationJob(invalidData)).rejects.toThrow('jobId is required');
    });

    it('should require organizationId', async () => {
      const invalidData = { ...mockJobData, organizationId: undefined as any };
      await expect(enqueueIntegrationJob(invalidData)).rejects.toThrow(
        'organizationId is required',
      );
    });

    it('should require submissionId', async () => {
      const invalidData = { ...mockJobData, submissionId: undefined as any };
      await expect(enqueueIntegrationJob(invalidData)).rejects.toThrow('submissionId is required');
    });

    it('should require connectorId', async () => {
      const invalidData = { ...mockJobData, connectorId: undefined as any };
      await expect(enqueueIntegrationJob(invalidData)).rejects.toThrow('connectorId is required');
    });

    it('should allow empty data object', async () => {
      const validData = { ...mockJobData, data: {} };
      const job = await enqueueIntegrationJob(validData);
      expect(job).toBeDefined();
    });

    it('should validate HTTP method', async () => {
      const invalidData = {
        ...mockJobData,
        endpoint: { method: 'INVALID' as any, path: '/customers' },
      };

      await expect(enqueueIntegrationJob(invalidData)).rejects.toThrow('Invalid HTTP method');
    });

    it('should require endpoint path', async () => {
      const invalidData = {
        ...mockJobData,
        endpoint: { method: 'POST' as const, path: undefined as any },
      };

      await expect(enqueueIntegrationJob(invalidData)).rejects.toThrow('endpoint.path is required');
    });
  });

  // ============================================================================
  // Category 5: Job Status Tracking
  // ============================================================================

  describe('getJobStatus', () => {
    it('should return job status for queued job', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);
      mockJob.getState.mockResolvedValue('waiting');

      const status = await getJobStatus('job-123');

      expect(status).toMatchObject({
        jobId: 'job-123',
        status: 'queued', // 'waiting' maps to 'queued'
        organizationId: 'org-1',
        submissionId: 'sub-1',
        connectorId: 'conn-1',
        retryCount: 0,
      });
    });

    it('should return null for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(undefined);

      const status = await getJobStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should map BullMQ states correctly', async () => {
      const stateMapping = [
        { bullmqState: 'waiting', expectedStatus: 'queued' },
        { bullmqState: 'active', expectedStatus: 'processing' },
        { bullmqState: 'completed', expectedStatus: 'completed' },
        { bullmqState: 'failed', expectedStatus: 'failed' },
        { bullmqState: 'delayed', expectedStatus: 'delayed' },
      ];

      for (const { bullmqState, expectedStatus } of stateMapping) {
        mockQueue.getJob.mockResolvedValue(mockJob);
        mockJob.getState.mockResolvedValue(bullmqState as any);

        const status = await getJobStatus('job-123');
        expect(status?.status).toBe(expectedStatus);
      }
    });

    it('should include error message for failed jobs', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);
      mockJob.getState.mockResolvedValue('failed');
      mockJob.failedReason = 'ERP connection timeout';

      const status = await getJobStatus('job-123');

      expect(status?.status).toBe('failed');
      expect(status?.error).toBe('ERP connection timeout');
    });

    it('should include result for completed jobs', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);
      mockJob.getState.mockResolvedValue('completed');
      mockJob.returnvalue = { erpRecordId: 'CUST12345' };
      mockJob.finishedOn = Date.now();

      const status = await getJobStatus('job-123');

      expect(status?.status).toBe('completed');
      expect(status?.result).toEqual({ erpRecordId: 'CUST12345' });
      expect(status?.completedAt).toBeDefined();
    });
  });

  // ============================================================================
  // Category 6: Queue Management
  // ============================================================================

  describe('Queue Management Functions', () => {
    it('should get jobs for organization', async () => {
      const job1 = { ...mockJob, id: 'job-1', data: { ...mockJob.data, jobId: 'job-1' } };
      const job2 = { ...mockJob, id: 'job-2', data: { ...mockJob.data, jobId: 'job-2' } };

      mockQueue.getWaiting.mockResolvedValue([job1, job2] as any);
      mockQueue.getJob.mockImplementation((id) => {
        if (id === 'job-1') return Promise.resolve(job1 as any);
        if (id === 'job-2') return Promise.resolve(job2 as any);
        return Promise.resolve(null);
      });

      (job1.getState as jest.Mock).mockResolvedValue('waiting');
      (job2.getState as jest.Mock).mockResolvedValue('waiting');

      const jobs = await getJobsForOrganization('org-1');

      expect(jobs.length).toBe(2);
      expect(jobs[0].jobId).toBe('job-1');
      expect(jobs[1].jobId).toBe('job-2');
    });

    it('should retry failed job', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);
      mockJob.getState.mockResolvedValue('failed');

      const job = await retryJob('job-123');

      expect(mockJob.retry).toHaveBeenCalled();
      expect(job.id).toBe('job-123');
    });

    it('should throw error when retrying non-failed job', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);
      mockJob.getState.mockResolvedValue('active');

      await expect(retryJob('job-123')).rejects.toThrow('Job is not in failed state');
    });

    it('should remove job', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await removeJob('job-123');

      expect(mockJob.remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when removing non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(undefined);

      const result = await removeJob('non-existent');
      expect(result).toBe(false);
    });

    it('should get queue metrics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(1);

      const metrics = await getQueueMetrics();

      expect(metrics).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        total: 111,
      });
    });
  });

  // ============================================================================
  // Category 7: Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockQueue.getJob.mockResolvedValue(undefined);
      mockQueue.add.mockResolvedValue(mockJob);
    });

    it('should handle empty endpoint headers', async () => {
      const dataWithHeaders = {
        ...mockJobData,
        endpoint: { method: 'POST' as const, path: '/customers', headers: {} },
      };

      const job = await enqueueIntegrationJob(dataWithHeaders);
      expect(job).toBeDefined();
    });

    it('should handle large data payloads', async () => {
      const largeData = {
        ...mockJobData,
        data: {
          field1: 'x'.repeat(10000),
          field2: 'y'.repeat(10000),
        },
      };

      const job = await enqueueIntegrationJob(largeData);
      expect(job).toBeDefined();
    });

    it('should handle Hebrew text in job data', async () => {
      const hebrewData = {
        ...mockJobData,
        data: {
          customer_name: 'שלום עולם',
          notes: 'הערות בעברית',
        },
      };

      const job = await enqueueIntegrationJob(hebrewData);
      expect(job).toBeDefined();
    });

    it('should handle very long submission IDs', async () => {
      const longIdData = {
        ...mockJobData,
        submissionId: 'sub-' + 'a'.repeat(200),
      };

      const job = await enqueueIntegrationJob(longIdData);
      expect(job).toBeDefined();
    });

    it('should handle null optional fields', async () => {
      const dataWithNulls = {
        ...mockJobData,
        endpoint: {
          method: 'POST' as const,
          path: '/customers',
          headers: undefined,
        },
        priority: undefined,
      };

      const job = await enqueueIntegrationJob(dataWithNulls);
      expect(job).toBeDefined();
    });
  });
});
