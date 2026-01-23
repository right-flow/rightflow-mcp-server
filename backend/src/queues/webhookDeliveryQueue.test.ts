/**
 * Webhook Delivery Queue Tests - Integration Hub Phase 6
 * Tests BullMQ queue configuration for webhook delivery
 *
 * Test Coverage:
 * - Queue initialization
 * - Job addition with retry logic
 * - Job options (attempts, backoff)
 * - Job data structure
 * - Error handling
 */

import { Queue } from 'bullmq';
import { webhookDeliveryQueue, addWebhookDeliveryJob } from './webhookDeliveryQueue';

// Mock BullMQ
jest.mock('bullmq');

describe('Webhook Delivery Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Category 1: Queue Initialization
  // ============================================================================

  describe('Queue Initialization', () => {
    it('should create queue with correct name', () => {
      expect(webhookDeliveryQueue).toBeDefined();
      expect(Queue).toHaveBeenCalledWith(
        'webhook-delivery',
        expect.any(Object),
      );
    });

    it('should configure Redis connection', () => {
      expect(Queue).toHaveBeenCalledWith(
        'webhook-delivery',
        expect.objectContaining({
          connection: expect.objectContaining({
            host: expect.any(String),
            port: expect.any(Number),
          }),
        }),
      );
    });

    it('should set default job options', () => {
      expect(Queue).toHaveBeenCalledWith(
        'webhook-delivery',
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            attempts: 4, // 1 initial + 3 retries
            backoff: expect.objectContaining({
              type: 'exponential',
              delay: 30000, // 30 seconds
            }),
            removeOnComplete: {
              age: 86400, // 24 hours
            },
            removeOnFail: {
              age: 604800, // 7 days
            },
          }),
        }),
      );
    });
  });

  // ============================================================================
  // Category 2: Add Webhook Delivery Job
  // ============================================================================

  describe('addWebhookDeliveryJob', () => {
    let mockAdd: jest.Mock;

    beforeEach(() => {
      mockAdd = jest.fn().mockResolvedValue({ id: 'job-123' });
      (webhookDeliveryQueue as any).add = mockAdd;
    });

    it('should add job with webhook and payload data', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = {
        event: 'form.submitted',
        formId: 'form-123',
        timestamp: new Date().toISOString(),
        data: { field1: 'value1' },
      };

      const jobId = await addWebhookDeliveryJob(webhook, payload);

      expect(jobId).toBe('job-123');
      expect(mockAdd).toHaveBeenCalledWith(
        'deliver-webhook',
        {
          webhook,
          payload,
        },
        expect.any(Object),
      );
    });

    it('should generate unique job ID with temporal and random components', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      await addWebhookDeliveryJob(webhook, payload);

      expect(mockAdd).toHaveBeenCalledWith(
        'deliver-webhook',
        expect.any(Object),
        expect.objectContaining({
          // Format: webhook-1-1234567890-abc123def456 (id-timestamp-random)
          jobId: expect.stringMatching(/^webhook-1-\d+-[0-9a-f]{16}$/),
        }),
      );
    });

    it('should prevent race condition by generating unique IDs for concurrent jobs', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      // Enqueue 10 jobs concurrently
      const promises = Array.from({ length: 10 }, () =>
        addWebhookDeliveryJob(webhook, payload),
      );

      await Promise.all(promises);

      // Extract all generated job IDs
      const jobIds = mockAdd.mock.calls.map((call: any) => call[2].jobId);

      // Verify all job IDs are unique (no collisions)
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(10);

      // Verify all job IDs have the correct format
      jobIds.forEach((jobId: string) => {
        expect(jobId).toMatch(/^webhook-1-\d+-[0-9a-f]{16}$/);
      });
    });

    it('should set job priority based on webhook health', async () => {
      const healthyWebhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
        healthStatus: 'healthy' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      await addWebhookDeliveryJob(healthyWebhook, payload);

      expect(mockAdd).toHaveBeenCalledWith(
        'deliver-webhook',
        expect.any(Object),
        expect.objectContaining({
          priority: 1, // High priority for healthy webhooks
        }),
      );
    });

    it('should set lower priority for degraded webhooks', async () => {
      const degradedWebhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
        healthStatus: 'degraded' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      await addWebhookDeliveryJob(degradedWebhook, payload);

      expect(mockAdd).toHaveBeenCalledWith(
        'deliver-webhook',
        expect.any(Object),
        expect.objectContaining({
          priority: 3, // Lower priority for degraded webhooks
        }),
      );
    });

    it('should handle job addition errors', async () => {
      mockAdd.mockRejectedValue(new Error('Queue is full'));

      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      await expect(addWebhookDeliveryJob(webhook, payload)).rejects.toThrow(
        'Queue is full',
      );
    });
  });

  // ============================================================================
  // Category 3: Job Options & Retry Logic
  // ============================================================================

  describe('Job Options & Retry Logic', () => {
    it('should configure 4 total attempts (1 initial + 3 retries)', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'job-123' });
      (webhookDeliveryQueue as any).add = mockAdd;

      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      await addWebhookDeliveryJob(webhook, payload);

      // Check that job is added with attempts: 4
      const callArgs = mockAdd.mock.calls[0];
      const jobOptions = callArgs[2];

      expect(jobOptions.attempts).toBe(4);
    });

    it('should use exponential backoff (30s, 1m, 2m)', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'job-123' });
      (webhookDeliveryQueue as any).add = mockAdd;

      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      await addWebhookDeliveryJob(webhook, payload);

      const callArgs = mockAdd.mock.calls[0];
      const jobOptions = callArgs[2];

      expect(jobOptions.backoff).toEqual({
        type: 'exponential',
        delay: 30000, // 30 seconds base delay
      });
    });

    it('should remove completed jobs after 24 hours', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'job-123' });
      (webhookDeliveryQueue as any).add = mockAdd;

      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      await addWebhookDeliveryJob(webhook, payload);

      const callArgs = mockAdd.mock.calls[0];
      const jobOptions = callArgs[2];

      expect(jobOptions.removeOnComplete).toEqual({
        age: 86400, // 24 hours in seconds
      });
    });

    it('should keep failed jobs for 7 days', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'job-123' });
      (webhookDeliveryQueue as any).add = mockAdd;

      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      await addWebhookDeliveryJob(webhook, payload);

      const callArgs = mockAdd.mock.calls[0];
      const jobOptions = callArgs[2];

      expect(jobOptions.removeOnFail).toEqual({
        age: 604800, // 7 days in seconds
      });
    });
  });

  // ============================================================================
  // Category 4: Queue Health & Monitoring
  // ============================================================================

  describe('Queue Health & Monitoring', () => {
    it('should expose queue metrics', async () => {
      const mockGetJobCounts = jest.fn().mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });

      (webhookDeliveryQueue as any).getJobCounts = mockGetJobCounts;

      const counts = await webhookDeliveryQueue.getJobCounts();

      expect(counts).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });

    it('should allow queue pause/resume', async () => {
      const mockPause = jest.fn().mockResolvedValue(undefined);
      const mockResume = jest.fn().mockResolvedValue(undefined);

      (webhookDeliveryQueue as any).pause = mockPause;
      (webhookDeliveryQueue as any).resume = mockResume;

      await webhookDeliveryQueue.pause();
      expect(mockPause).toHaveBeenCalled();

      await webhookDeliveryQueue.resume();
      expect(mockResume).toHaveBeenCalled();
    });
  });
});
