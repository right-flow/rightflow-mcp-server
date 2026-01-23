import crypto from 'crypto';
import { query } from '../config/database';
import { webhookQueue } from '../queues/webhookQueue';
import logger from '../utils/logger';
import { WebhookEvent } from '../types';

/**
 * Emit webhook event to all subscribed webhooks
 *
 * @param organizationId - Organization ID
 * @param eventType - Event type (e.g., 'submission.created')
 * @param data - Event data (e.g., submission object)
 */
export async function emitWebhookEvent(
  organizationId: string,
  eventType: WebhookEvent,
  data: any,
): Promise<void> {
  try {
    // Find all webhooks subscribed to this event
    const webhooks = await query<{
      id: string;
      url: string;
      secret: string;
    }>(
      `
      SELECT id, url, secret
      FROM webhooks
      WHERE organization_id = $1
        AND $2 = ANY(events)
        AND enabled = true
        AND deleted_at IS NULL
    `,
      [organizationId, eventType],
    );

    if (webhooks.length === 0) {
      logger.debug('No webhooks subscribed to event', {
        organizationId,
        eventType,
      });
      return;
    }

    logger.info('Emitting webhook event', {
      organizationId,
      eventType,
      webhookCount: webhooks.length,
    });

    // Generate webhook payload
    const payload = {
      id: `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      organizationId,
      data,
    };

    // Queue webhook jobs for each subscribed webhook
    for (const webhook of webhooks) {
      try {
        // Generate HMAC signature
        const signature = generateHMACSignature(payload, webhook.secret);

        // Add job to BullMQ queue
        await webhookQueue.add(
          'delivery',
          {
            webhookId: webhook.id,
            url: webhook.url,
            payload,
            signature,
          },
          {
            jobId: `${webhook.id}_${payload.id}`, // Unique job ID (prevents duplicates)
          },
        );

        logger.debug('Webhook job queued', {
          webhookId: webhook.id,
          eventType,
          eventId: payload.id,
        });
      } catch (error: any) {
        logger.error('Failed to queue webhook job', {
          webhookId: webhook.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Failed to emit webhook event', {
      organizationId,
      eventType,
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - webhook failures should not block main operations
  }
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 *
 * @param payload - Webhook payload object
 * @param secret - Webhook secret
 * @returns Signature in format "sha256=<hex>"
 */
function generateHMACSignature(payload: any, secret: string): string {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify HMAC signature (for testing or webhook receivers)
 *
 * @param payload - Webhook payload object
 * @param signature - Signature from header (e.g., "sha256=abc123...")
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = generateHMACSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}
