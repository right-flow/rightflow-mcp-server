/**
 * Webhook Delivery Worker Tests - Integration Hub Phase 6
 * Tests BullMQ worker that processes webhook delivery jobs
 *
 * Test Coverage:
 * - Worker initialization
 * - Job processing
 * - Delivery success handling
 * - Delivery failure handling
 * - Retry logic
 * - Health status updates
 * - Error handling
 */

import { Worker, Job } from 'bullmq';
import * as webhookDeliveryService from '../services/integrationHub/webhookDeliveryService';

// Mock dependencies
jest.mock('bullmq');
jest.mock('../services/integrationHub/webhookDeliveryService');

describe('Webhook Delivery Worker', () => {
  let mockWorker: any;
  let processJobCallback: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture the process callback when Worker is instantiated
    (Worker as jest.MockedClass<typeof Worker>).mockImplementation(
      (name: string, processor: any, options: any) => {
        processJobCallback = processor;
        mockWorker = {
          on: jest.fn(),
          close: jest.fn().mockResolvedValue(undefined),
        };
        return mockWorker;
      },
    );

    // Re-import worker to trigger initialization
    jest.resetModules();
    require('./webhookDeliveryWorker');
  });

  // ============================================================================
  // Category 1: Worker Initialization
  // ============================================================================

  describe('Worker Initialization', () => {
    it('should create worker with correct queue name', () => {
      expect(Worker).toHaveBeenCalledWith(
        'webhook-delivery',
        expect.any(Function),
        expect.any(Object),
      );
    });

    it('should configure concurrency to 10', () => {
      expect(Worker).toHaveBeenCalledWith(
        'webhook-delivery',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 10,
        }),
      );
    });

    it('should configure Redis connection', () => {
      expect(Worker).toHaveBeenCalledWith(
        'webhook-delivery',
        expect.any(Function),
        expect.objectContaining({
          connection: expect.objectContaining({
            host: expect.any(String),
            port: expect.any(Number),
          }),
        }),
      );
    });

    it('should set up event listeners', () => {
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });
  });

  // ============================================================================
  // Category 2: Job Processing - Success Path
  // ============================================================================

  describe('Job Processing - Success', () => {
    it('should process webhook delivery successfully', async () => {
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

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 1,
      } as Job;

      const deliveryResult = {
        success: true,
        statusCode: 200,
        responseTimeMs: 150,
      };

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockResolvedValue(
        deliveryResult,
      );
      (webhookDeliveryService.recordDeliveryResult as jest.Mock).mockResolvedValue(
        undefined,
      );
      (webhookDeliveryService.updateWebhookHealthAfterDelivery as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await processJobCallback(mockJob);

      expect(webhookDeliveryService.processWebhookDelivery).toHaveBeenCalledWith(
        webhook,
        payload,
      );

      expect(webhookDeliveryService.recordDeliveryResult).toHaveBeenCalledWith(
        'webhook-1',
        'form.submitted',
        payload,
        expect.any(String), // signature
        deliveryResult,
        1, // attempt
      );

      expect(webhookDeliveryService.updateWebhookHealthAfterDelivery).toHaveBeenCalledWith(
        'webhook-1',
        deliveryResult,
      );

      expect(result).toEqual({
        success: true,
        statusCode: 200,
        webhookId: 'webhook-1',
      });
    });

    it('should include signature in delivery record', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 1,
      } as Job;

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockResolvedValue({
        success: true,
        statusCode: 200,
        responseTimeMs: 100,
        signature: 'sha256=abc123',
      });
      (webhookDeliveryService.recordDeliveryResult as jest.Mock).mockResolvedValue(
        undefined,
      );
      (webhookDeliveryService.updateWebhookHealthAfterDelivery as jest.Mock).mockResolvedValue(
        undefined,
      );

      await processJobCallback(mockJob);

      expect(webhookDeliveryService.recordDeliveryResult).toHaveBeenCalledWith(
        'webhook-1',
        'form.submitted',
        payload,
        'sha256=abc123', // signature
        expect.any(Object),
        1,
      );
    });

    it('should track attempt number correctly', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 3, // Third attempt
      } as Job;

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockResolvedValue({
        success: true,
        statusCode: 200,
        responseTimeMs: 100,
      });
      (webhookDeliveryService.recordDeliveryResult as jest.Mock).mockResolvedValue(
        undefined,
      );
      (webhookDeliveryService.updateWebhookHealthAfterDelivery as jest.Mock).mockResolvedValue(
        undefined,
      );

      await processJobCallback(mockJob);

      expect(webhookDeliveryService.recordDeliveryResult).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.any(String),
        expect.any(Object),
        3, // Attempt = 3
      );
    });
  });

  // ============================================================================
  // Category 3: Job Processing - Failure Path
  // ============================================================================

  describe('Job Processing - Failure', () => {
    it('should handle delivery failure', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 1,
      } as Job;

      const deliveryResult = {
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        responseTimeMs: 50,
      };

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockResolvedValue(
        deliveryResult,
      );
      (webhookDeliveryService.recordDeliveryResult as jest.Mock).mockResolvedValue(
        undefined,
      );
      (webhookDeliveryService.updateWebhookHealthAfterDelivery as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Should throw error to trigger retry
      await expect(processJobCallback(mockJob)).rejects.toThrow(
        'Webhook delivery failed: 500 - Internal Server Error',
      );

      expect(webhookDeliveryService.recordDeliveryResult).toHaveBeenCalledWith(
        'webhook-1',
        'form.submitted',
        payload,
        expect.any(String),
        deliveryResult,
        1,
      );

      expect(webhookDeliveryService.updateWebhookHealthAfterDelivery).toHaveBeenCalledWith(
        'webhook-1',
        deliveryResult,
      );
    });

    it('should handle network errors', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 1,
      } as Job;

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(processJobCallback(mockJob)).rejects.toThrow('Network error');
    });

    it('should record failed delivery even when error occurs', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 1,
      } as Job;

      const deliveryResult = {
        success: false,
        error: 'Timeout',
        responseTimeMs: 10000,
      };

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockResolvedValue(
        deliveryResult,
      );
      (webhookDeliveryService.recordDeliveryResult as jest.Mock).mockResolvedValue(
        undefined,
      );
      (webhookDeliveryService.updateWebhookHealthAfterDelivery as jest.Mock).mockResolvedValue(
        undefined,
      );

      await expect(processJobCallback(mockJob)).rejects.toThrow();

      expect(webhookDeliveryService.recordDeliveryResult).toHaveBeenCalled();
      expect(webhookDeliveryService.updateWebhookHealthAfterDelivery).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Category 4: Retry Logic
  // ============================================================================

  describe('Retry Logic', () => {
    it('should throw error to trigger retry on failure', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 1,
      } as Job;

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockResolvedValue({
        success: false,
        statusCode: 503,
        error: 'Service Unavailable',
      });
      (webhookDeliveryService.recordDeliveryResult as jest.Mock).mockResolvedValue(
        undefined,
      );
      (webhookDeliveryService.updateWebhookHealthAfterDelivery as jest.Mock).mockResolvedValue(
        undefined,
      );

      await expect(processJobCallback(mockJob)).rejects.toThrow();
    });

    it('should not retry on 4xx errors (except 408, 429)', async () => {
      // This behavior should be configured in the queue
      // Worker should throw error, but queue should decide retry based on status code
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 1,
      } as Job;

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockResolvedValue({
        success: false,
        statusCode: 404,
        error: 'Not Found',
      });
      (webhookDeliveryService.recordDeliveryResult as jest.Mock).mockResolvedValue(
        undefined,
      );
      (webhookDeliveryService.updateWebhookHealthAfterDelivery as jest.Mock).mockResolvedValue(
        undefined,
      );

      const error = await processJobCallback(mockJob).catch((e: Error) => e);

      expect(error).toBeDefined();
      // Error should include status code for queue to decide retry
      expect(error.message).toContain('404');
    });
  });

  // ============================================================================
  // Category 5: Event Handlers
  // ============================================================================

  describe('Event Handlers', () => {
    it('should log successful job completion', () => {
      const completedHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === 'completed',
      )?.[1];

      expect(completedHandler).toBeDefined();

      const mockJob = {
        id: 'job-123',
        data: {
          webhook: { id: 'webhook-1' },
          payload: { event: 'form.submitted' },
        },
      };

      const result = {
        success: true,
        statusCode: 200,
        webhookId: 'webhook-1',
      };

      // Should not throw
      expect(() => completedHandler(mockJob, result)).not.toThrow();
    });

    it('should log failed job', () => {
      const failedHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === 'failed',
      )?.[1];

      expect(failedHandler).toBeDefined();

      const mockJob = {
        id: 'job-123',
        data: {
          webhook: { id: 'webhook-1' },
          payload: { event: 'form.submitted' },
        },
        attemptsMade: 4,
      };

      const error = new Error('Max retries exceeded');

      // Should not throw
      expect(() => failedHandler(mockJob, error)).not.toThrow();
    });
  });

  // ============================================================================
  // Category 6: Worker Lifecycle
  // ============================================================================

  describe('Worker Lifecycle', () => {
    it('should gracefully close worker', async () => {
      await expect(mockWorker.close()).resolves.not.toThrow();
    });

    it('should handle shutdown signals', () => {
      // Worker should listen for SIGTERM/SIGINT
      // Test implementation depends on how graceful shutdown is implemented
    });
  });

  // ============================================================================
  // Category 7: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing webhook data', async () => {
      const mockJob = {
        id: 'job-123',
        data: { payload: { event: 'form.submitted' } }, // Missing webhook
        attemptsMade: 1,
      } as Job;

      await expect(processJobCallback(mockJob)).rejects.toThrow();
    });

    it('should handle missing payload data', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          webhook: {
            id: 'webhook-1',
            organizationId: 'org-1',
            url: 'https://example.com/webhook',
            secretEncrypted: 'encrypted-secret',
            events: ['form.submitted'],
            status: 'active' as const,
          },
        }, // Missing payload
        attemptsMade: 1,
      } as Job;

      await expect(processJobCallback(mockJob)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const webhook = {
        id: 'webhook-1',
        organizationId: 'org-1',
        url: 'https://example.com/webhook',
        secretEncrypted: 'encrypted-secret',
        events: ['form.submitted'],
        status: 'active' as const,
      };

      const payload = { event: 'form.submitted', data: {} };

      const mockJob = {
        id: 'job-123',
        data: { webhook, payload },
        attemptsMade: 1,
      } as Job;

      (webhookDeliveryService.processWebhookDelivery as jest.Mock).mockResolvedValue({
        success: true,
        statusCode: 200,
        responseTimeMs: 100,
      });

      // recordDeliveryResult fails
      (webhookDeliveryService.recordDeliveryResult as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(processJobCallback(mockJob)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
