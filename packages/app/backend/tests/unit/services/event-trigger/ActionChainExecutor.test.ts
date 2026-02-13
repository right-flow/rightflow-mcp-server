/**
 * Unit Tests for ActionChainExecutor Service
 * Tests action execution, retry logic, compensating transactions, and error handling
 *
 * Coverage target: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionChainExecutor } from '../../../../src/services/event-trigger/ActionChainExecutor';
import type { Event, EventTrigger, TriggerAction } from '../../../../src/types/event-trigger';
import {
  testEvents,
  testTriggers,
  testActions,
  createTestEvent
} from '../../../fixtures/event-trigger/events';

vi.mock('../../../../src/config/database');
vi.mock('../../../../src/services/ActionExecutor');
vi.mock('../../../../src/services/IntegrationHub');

describe('ActionChainExecutor', () => {
  let actionChainExecutor: ActionChainExecutor;
  let mockDb: any;
  let mockActionExecutor: any;
  let mockIntegrationHub: any;
  let mockDlq: any;

  beforeEach(() => {
    mockDb = vi.fn(() => ({
      insert: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
      update: vi.fn().mockResolvedValue(1),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null)
    }));

    mockActionExecutor = {
      execute: vi.fn().mockResolvedValue({ success: true, data: { result: 'ok' } })
    };

    mockIntegrationHub = {
      executeIntegration: vi.fn().mockResolvedValue({ success: true })
    };

    mockDlq = {
      addEntry: vi.fn().mockResolvedValue({ id: 'dlq-entry-id' })
    };

    actionChainExecutor = new ActionChainExecutor({
      db: mockDb,
      actionExecutor: mockActionExecutor,
      integrationHub: mockIntegrationHub,
      dlq: mockDlq
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('executeChain() - Basic Execution', () => {
    it('should execute actions in order (by order field)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const actions = [
        { ...testActions.sendWebhook, order: 1 },
        { ...testActions.updateCrm, order: 2 },
        { ...testActions.sendEmail, order: 3 }
      ];

      mockDb().orderBy.mockResolvedValue(actions);

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(3);

      // Verify execution order
      const calls = mockActionExecutor.execute.mock.calls;
      expect(calls[0][0].order).toBe(1);
      expect(calls[1][0].order).toBe(2);
      expect(calls[2][0].order).toBe(3);
    });

    it('should record action execution start in database', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const actions = [testActions.sendWebhook];

      mockDb().orderBy.mockResolvedValue(actions);

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockDb).toHaveBeenCalledWith('action_executions');
      expect(mockDb().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: event.id,
          trigger_id: trigger.id,
          action_id: actions[0].id,
          status: 'running',
          attempt: 1,
          started_at: expect.any(Date)
        })
      );
    });

    it('should update execution status to "success" on completion', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const actions = [testActions.sendWebhook];

      mockDb().orderBy.mockResolvedValue(actions);

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockDb().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          completed_at: expect.any(Date),
          response: expect.any(Object)
        })
      );
    });

    it('should interpolate event data in action config using templates', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: {
          formId: 'form-123',
          fields: { name: 'יוסי', email: 'yossi@test.com' }
        }
      });
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        config: {
          url: 'https://example.com/webhook',
          body: {
            formId: '{{event.data.formId}}',
            userName: '{{event.data.fields.name}}',
            userEmail: '{{event.data.fields.email}}'
          }
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockActionExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            body: {
              formId: 'form-123',
              userName: 'יוסי',
              userEmail: 'yossi@test.com'
            }
          })
        }),
        event
      );
    });

    it('should handle actions with no templating', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendEmail,
        config: {
          to: 'static@example.com',
          subject: 'Static subject',
          body: 'Static body'
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockActionExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          config: {
            to: 'static@example.com',
            subject: 'Static subject',
            body: 'Static body'
          }
        }),
        event
      );
    });
  });

  describe('Error Handling Strategy', () => {
    it('should stop execution on first error when error_handling="stop_on_first_error"', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.userTrigger,
        error_handling: 'stop_on_first_error' as const
      };
      const actions = [
        { ...testActions.sendWebhook, order: 1 },
        { ...testActions.updateCrm, order: 2 },
        { ...testActions.sendEmail, order: 3 }
      ];

      mockDb().orderBy.mockResolvedValue(actions);
      mockActionExecutor.execute
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('CRM API failed'))
        .mockResolvedValueOnce({ success: true });

      await expect(actionChainExecutor.executeChain(event, trigger)).rejects.toThrow(
        'CRM API failed'
      );

      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(2); // Stopped after 2nd
    });

    it('should continue on error when error_handling="continue_on_error"', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.organizationTrigger,
        error_handling: 'continue_on_error' as const
      };
      const actions = [
        { ...testActions.sendWebhook, order: 1 },
        { ...testActions.updateCrm, order: 2 },
        { ...testActions.sendEmail, order: 3 }
      ];

      mockDb().orderBy.mockResolvedValue(actions);
      mockActionExecutor.execute
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('CRM API failed'))
        .mockResolvedValueOnce({ success: true });

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(3); // All 3 executed
    });

    it('should rollback on error when error_handling="rollback_on_error"', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.userTrigger,
        error_handling: 'rollback_on_error' as const
      };
      const actions = [
        { ...testActions.sendWebhook, order: 1, is_critical: true },
        { ...testActions.updateCrm, order: 2, is_critical: true },
        { ...testActions.sendEmail, order: 3, is_critical: false }
      ];

      mockDb().orderBy.mockResolvedValue(actions);
      mockActionExecutor.execute
        .mockResolvedValueOnce({ success: true, rollbackData: { webhookId: '123' } })
        .mockRejectedValueOnce(new Error('CRM API failed'));

      const rollbackSpy = vi.spyOn(actionChainExecutor as any, 'rollbackAction');

      await expect(actionChainExecutor.executeChain(event, trigger)).rejects.toThrow();

      expect(rollbackSpy).toHaveBeenCalledTimes(1); // Rollback action 1
    });

    it('should NOT rollback non-critical actions', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.userTrigger,
        error_handling: 'rollback_on_error' as const
      };
      const actions = [
        { ...testActions.sendEmail, order: 1, is_critical: false }, // Not critical
        { ...testActions.updateCrm, order: 2, is_critical: true }
      ];

      mockDb().orderBy.mockResolvedValue(actions);
      mockActionExecutor.execute
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('CRM failed'));

      const rollbackSpy = vi.spyOn(actionChainExecutor as any, 'rollbackAction');

      await expect(actionChainExecutor.executeChain(event, trigger)).rejects.toThrow();

      expect(rollbackSpy).not.toHaveBeenCalled(); // No rollback for non-critical
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed actions up to max_attempts', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        retry_config: {
          max_attempts: 3,
          backoff_multiplier: 2,
          initial_delay_ms: 100
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);
      mockActionExecutor.execute
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ success: true });

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(3);
      expect(mockDb().update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      );
    });

    it('should apply exponential backoff between retries', async () => {
      vi.useFakeTimers();

      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        retry_config: {
          max_attempts: 3,
          backoff_multiplier: 2,
          initial_delay_ms: 1000
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);
      mockActionExecutor.execute
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce({ success: true });

      const promise = actionChainExecutor.executeChain(event, trigger);

      // First attempt: immediate
      await vi.advanceTimersByTimeAsync(0);

      // Second attempt: after 1000ms (initial_delay_ms)
      await vi.advanceTimersByTimeAsync(1000);

      // Third attempt: after 2000ms (initial_delay_ms * backoff_multiplier)
      await vi.advanceTimersByTimeAsync(2000);

      await promise;

      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('should send to DLQ after max retry attempts exceeded', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        retry_config: {
          max_attempts: 3,
          backoff_multiplier: 2,
          initial_delay_ms: 100
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);
      mockActionExecutor.execute.mockRejectedValue(new Error('Persistent failure'));

      await expect(actionChainExecutor.executeChain(event, trigger)).rejects.toThrow();

      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(3);
      expect(mockDlq.addEntry).toHaveBeenCalledWith({
        event,
        trigger,
        action,
        failureReason: 'Max retry attempts (3) exceeded',
        lastError: expect.objectContaining({ message: 'Persistent failure' })
      });
    });

    it('should NOT retry on non-retryable errors (4xx)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = testActions.sendWebhook;

      mockDb().orderBy.mockResolvedValue([action]);

      const error = new Error('Bad Request');
      (error as any).statusCode = 400;
      mockActionExecutor.execute.mockRejectedValue(error);

      await expect(actionChainExecutor.executeChain(event, trigger)).rejects.toThrow();

      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(1); // No retry
      expect(mockDlq.addEntry).toHaveBeenCalled();
    });

    it('should retry on transient errors (5xx, network)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        retry_config: {
          max_attempts: 2,
          backoff_multiplier: 2,
          initial_delay_ms: 100
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);

      const error = new Error('Internal Server Error');
      (error as any).statusCode = 500;
      mockActionExecutor.execute
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true });

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('Action Timeouts', () => {
    it('should timeout action after configured timeout_ms', async () => {
      vi.useFakeTimers();

      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.updateCrm,
        timeout_ms: 5000
      };

      mockDb().orderBy.mockResolvedValue([action]);
      mockActionExecutor.execute.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ success: true }), 10000);
          })
      );

      const promise = actionChainExecutor.executeChain(event, trigger);

      await vi.advanceTimersByTimeAsync(5000);

      await expect(promise).rejects.toThrow('Action timeout');

      vi.useRealTimers();
    });

    it('should NOT timeout if action completes within timeout_ms', async () => {
      vi.useFakeTimers();

      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        timeout_ms: 5000
      };

      mockDb().orderBy.mockResolvedValue([action]);
      mockActionExecutor.execute.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ success: true }), 1000);
          })
      );

      const promise = actionChainExecutor.executeChain(event, trigger);

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).resolves.not.toThrow();

      vi.useRealTimers();
    });

    it('should record timeout in action_executions table', async () => {
      vi.useFakeTimers();

      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.updateCrm,
        timeout_ms: 3000
      };

      mockDb().orderBy.mockResolvedValue([action]);
      mockActionExecutor.execute.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const promise = actionChainExecutor.executeChain(event, trigger);

      await vi.advanceTimersByTimeAsync(3000);

      await expect(promise).rejects.toThrow();

      expect(mockDb().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: expect.objectContaining({
            message: expect.stringContaining('timeout')
          })
        })
      );

      vi.useRealTimers();
    });
  });

  describe('Compensating Transactions (Rollback)', () => {
    it('should execute compensating action for failed rollback', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.userTrigger,
        error_handling: 'rollback_on_error' as const
      };
      const action = {
        ...testActions.updateCrm,
        is_critical: true,
        config: {
          operation: 'create_lead',
          rollback_operation: 'delete_lead'
        }
      };

      const executionResult = {
        success: true,
        rollbackData: { leadId: 'lead-123' }
      };

      await (actionChainExecutor as any).rollbackAction(action, event, executionResult);

      expect(mockActionExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'rollback',
          config: expect.objectContaining({
            operation: 'delete_lead',
            leadId: 'lead-123'
          })
        }),
        event
      );
    });

    it('should handle rollback failures gracefully', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const action = {
        ...testActions.updateCrm,
        is_critical: true
      };

      mockActionExecutor.execute.mockRejectedValueOnce(new Error('Rollback failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await (actionChainExecutor as any).rollbackAction(action, event, {
        success: true,
        rollbackData: {}
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rollback failed'),
        expect.any(Error)
      );
    });

    it('should send failed rollback to DLQ for manual intervention', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.updateCrm,
        is_critical: true
      };

      mockActionExecutor.execute.mockRejectedValueOnce(new Error('Rollback impossible'));

      await (actionChainExecutor as any).rollbackAction(action, event, {
        success: true,
        rollbackData: { leadId: 'lead-123' }
      });

      expect(mockDlq.addEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          event,
          action,
          failureReason: expect.stringContaining('Rollback failed')
        })
      );
    });
  });

  describe('Integration with IntegrationHub', () => {
    it('should delegate CRM actions to IntegrationHub', async () => {
      const event = createTestEvent(testEvents.formApproved);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.updateCrm,
        action_type: 'update_crm' as const
      };

      mockDb().orderBy.mockResolvedValue([action]);

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockIntegrationHub.executeIntegration).toHaveBeenCalledWith(
        action.config.integration_id,
        action.config.operation,
        expect.any(Object),
        event
      );
    });

    it('should handle IntegrationHub errors', async () => {
      const event = createTestEvent(testEvents.formApproved);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.updateCrm,
        action_type: 'update_crm' as const
      };

      mockDb().orderBy.mockResolvedValue([action]);
      mockIntegrationHub.executeIntegration.mockRejectedValueOnce(
        new Error('Salesforce API error')
      );

      await expect(actionChainExecutor.executeChain(event, trigger)).rejects.toThrow(
        'Salesforce API error'
      );
    });

    it('should refresh expired OAuth tokens before CRM actions', async () => {
      const event = createTestEvent(testEvents.formApproved);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.updateCrm,
        config: {
          integration_id: 'integration-123',
          operation: 'create_lead'
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);

      const refreshTokenSpy = vi.spyOn(mockIntegrationHub, 'refreshToken');
      mockIntegrationHub.executeIntegration.mockRejectedValueOnce({
        code: 'TOKEN_EXPIRED'
      });
      mockIntegrationHub.executeIntegration.mockResolvedValueOnce({ success: true });

      await actionChainExecutor.executeChain(event, trigger);

      expect(refreshTokenSpy).toHaveBeenCalled();
      expect(mockIntegrationHub.executeIntegration).toHaveBeenCalledTimes(2);
    });
  });

  describe('Hebrew Text Handling', () => {
    it('should preserve Hebrew text in action templates', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent, {
        data: {
          fields: {
            customerName: 'יוסי כהן',
            message: 'זה טופס דחוף'
          }
        }
      });
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendEmail,
        config: {
          to: 'manager@example.com',
          subject: 'טופס חדש מ-{{event.data.fields.customerName}}',
          body: 'הודעה: {{event.data.fields.message}}'
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);

      await actionChainExecutor.executeChain(event, trigger);

      expect(mockActionExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            subject: 'טופס חדש מ-יוסי כהן',
            body: 'הודעה: זה טופס דחוף'
          })
        }),
        event
      );
    });

    it('should normalize Unicode control characters in Hebrew text', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent, {
        data: {
          fields: {
            text: 'עברית\u202Bעם סימני RTL\u202C'
          }
        }
      });
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        config: {
          body: { text: '{{event.data.fields.text}}' }
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);

      await actionChainExecutor.executeChain(event, trigger);

      const executedConfig = mockActionExecutor.execute.mock.calls[0][0].config;
      expect(executedConfig.body.text).not.toContain('\u202B');
      expect(executedConfig.body.text).not.toContain('\u202C');
    });
  });

  describe('Performance & Concurrency', () => {
    it('should execute actions sequentially (not parallel)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const actions = [
        { ...testActions.sendWebhook, order: 1 },
        { ...testActions.updateCrm, order: 2 },
        { ...testActions.sendEmail, order: 3 }
      ];

      mockDb().orderBy.mockResolvedValue(actions);

      let executionOrder: number[] = [];
      mockActionExecutor.execute.mockImplementation(async (action: any) => {
        executionOrder.push(action.order);
        return { success: true };
      });

      await actionChainExecutor.executeChain(event, trigger);

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should handle large action chains efficiently', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const actions = Array.from({ length: 20 }, (_, i) => ({
        ...testActions.sendWebhook,
        id: `action-${i}`,
        order: i + 1
      }));

      mockDb().orderBy.mockResolvedValue(actions);

      const startTime = Date.now();
      await actionChainExecutor.executeChain(event, trigger);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should be fast
      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(20);
    });

    it('should handle concurrent chain executions', async () => {
      const events = Array.from({ length: 5 }, () =>
        createTestEvent(testEvents.formSubmitted)
      );
      const trigger = testTriggers.userTrigger;
      const actions = [testActions.sendWebhook];

      mockDb().orderBy.mockResolvedValue(actions);

      const results = await Promise.all(
        events.map(e => actionChainExecutor.executeChain(e, trigger))
      );

      expect(results).toHaveLength(5);
      expect(mockActionExecutor.execute).toHaveBeenCalledTimes(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty action chain gracefully', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;

      mockDb().orderBy.mockResolvedValue([]);

      await expect(
        actionChainExecutor.executeChain(event, trigger)
      ).resolves.not.toThrow();

      expect(mockActionExecutor.execute).not.toHaveBeenCalled();
    });

    it('should handle actions with missing config fields', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        config: null // Invalid config
      };

      mockDb().orderBy.mockResolvedValue([action]);

      await expect(actionChainExecutor.executeChain(event, trigger)).rejects.toThrow();
    });

    it('should handle template interpolation errors', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const action = {
        ...testActions.sendWebhook,
        config: {
          body: {
            field: '{{event.data.nonexistent.deeply.nested.field}}'
          }
        }
      };

      mockDb().orderBy.mockResolvedValue([action]);

      await actionChainExecutor.executeChain(event, trigger);

      const executedConfig = mockActionExecutor.execute.mock.calls[0][0].config;
      expect(executedConfig.body.field).toBe(''); // Should handle gracefully
    });

    it('should handle database errors during execution recording', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = testTriggers.userTrigger;
      const actions = [testActions.sendWebhook];

      mockDb().orderBy.mockResolvedValue(actions);
      mockDb().insert.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(actionChainExecutor.executeChain(event, trigger)).rejects.toThrow(
        'DB connection lost'
      );
    });
  });
});
