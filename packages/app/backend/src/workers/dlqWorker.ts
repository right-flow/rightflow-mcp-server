/**
 * Dead Letter Queue Retry Worker
 * Processes retry requests for failed actions
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { DLQRetryJob } from '../queues/dlqQueue';
import logger from '../utils/logger';

// DLQ retry worker
export const dlqWorker = new Worker<DLQRetryJob>(
  'dlq-retry',
  async (job: Job<DLQRetryJob>) => {
    const { dlqEntryId, eventId, triggerId, actionId, eventSnapshot, actionSnapshot, attemptNumber } = job.data;

    logger.info('Processing DLQ retry', {
      jobId: job.id,
      dlqEntryId,
      actionId,
      attempt: attemptNumber,
    });

    try {
      // Get DLQ entry status
      const dlqEntries = await query(
        `SELECT status FROM dead_letter_queue WHERE id = $1`,
        [dlqEntryId]
      );

      if (dlqEntries.length === 0) {
        logger.warn('DLQ entry not found', { dlqEntryId });
        return { success: false, message: 'DLQ entry not found' };
      }

      const dlqEntry = dlqEntries[0];

      // Skip if already resolved, failed, or ignored
      if (dlqEntry.status === 'resolved' || dlqEntry.status === 'failed' || dlqEntry.status === 'ignored') {
        logger.info('DLQ entry already resolved/failed/ignored, skipping', { dlqEntryId, status: dlqEntry.status });
        return { success: true, message: 'Already processed' };
      }

      // Execute the action
      const actionConfig = actionSnapshot.config || {};
      const eventData = eventSnapshot.data || {};

      let result;
      try {
        result = await executeAction(actionSnapshot.action_type, actionConfig, eventData);

        // Success - mark DLQ entry as resolved
        await query(
          `UPDATE dead_letter_queue
           SET status = 'resolved',
               resolved_at = NOW(),
               resolution_notes = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [`Retry succeeded on attempt ${attemptNumber}`, dlqEntryId]
        );

        // Also update the action execution record
        await query(
          `UPDATE action_executions
           SET status = 'success',
               response = $1,
               completed_at = NOW(),
               attempt = $2
           WHERE event_id = $3 AND action_id = $4`,
          [JSON.stringify(result), attemptNumber, eventId, actionId]
        );

        logger.info('DLQ retry succeeded', {
          dlqEntryId,
          attemptNumber,
        });

        return { success: true, result };
      } catch (actionError: any) {
        // Update failure count
        await query(
          `UPDATE dead_letter_queue
           SET failure_count = failure_count + 1,
               last_error = $1,
               status = CASE WHEN failure_count >= 5 THEN 'failed' ELSE 'pending' END,
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify({ message: actionError.message }), dlqEntryId]
        );

        logger.error('DLQ retry failed', {
          dlqEntryId,
          attemptNumber,
          error: actionError.message,
        });

        throw actionError;
      }
    } catch (error: any) {
      logger.error('DLQ processing error', {
        dlqEntryId,
        error: error.message,
      });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
    limiter: {
      max: 20,
      duration: 1000,
    },
  }
);

// Execute action based on type
async function executeAction(
  actionType: string,
  config: any,
  eventData: Record<string, any>
): Promise<any> {
  switch (actionType) {
    case 'send_webhook':
      return await executeWebhook(config, eventData);
    case 'send_email':
      return await executeEmail(config, eventData);
    case 'send_sms':
      return await executeSMS(config, eventData);
    case 'update_crm':
      return await executeUpdateCRM(config, eventData);
    case 'create_task':
      return await executeCreateTask(config, eventData);
    default:
      logger.warn(`Unknown action type: ${actionType}`);
      return { success: true, message: 'Action type not implemented' };
  }
}

// Action executors (same as eventWorker)
async function executeWebhook(config: any, eventData: any): Promise<any> {
  const response = await fetch(config.url, {
    method: config.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: HTTP ${response.status}`);
  }

  return { status: response.status, body: await response.text() };
}

async function executeEmail(config: any, eventData: any): Promise<any> {
  logger.info('Would send email', { to: config.to, subject: config.subject });
  return { success: true, message: 'Email queued' };
}

async function executeSMS(config: any, eventData: any): Promise<any> {
  logger.info('Would send SMS', { to: config.to });
  return { success: true, message: 'SMS queued' };
}

async function executeUpdateCRM(config: any, eventData: any): Promise<any> {
  logger.info('Would update CRM', { crmType: config.crmType, operation: config.operation });
  return { success: true, message: 'CRM update queued' };
}

async function executeCreateTask(config: any, eventData: any): Promise<any> {
  logger.info('Would create task', { title: config.title });
  return { success: true, message: 'Task created' };
}

// Worker event listeners
dlqWorker.on('completed', (job) => {
  logger.debug('DLQ job completed', { jobId: job.id, dlqEntryId: job.data.dlqEntryId });
});

dlqWorker.on('failed', (job, error) => {
  if (job) {
    logger.error('DLQ job failed after all retries', {
      jobId: job.id,
      dlqEntryId: job.data.dlqEntryId,
      error: error.message,
    });
  }
});

dlqWorker.on('error', (error) => {
  logger.error('DLQ worker error', { error: error.message });
});

export default dlqWorker;
