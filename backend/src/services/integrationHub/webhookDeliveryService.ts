/**
 * Webhook Delivery Service - Integration Hub Phase 6
 * Handles webhook delivery enqueueing, processing, and health tracking
 *
 * Features:
 * - Find webhooks for specific events
 * - Enqueue webhook delivery jobs via BullMQ
 * - Process HTTP POST with HMAC signature
 * - Record delivery results
 * - Update webhook health status
 */

import { query } from '../../config/database';
import * as webhookService from './webhookService';
import crypto from 'crypto';
import { addWebhookDeliveryJob } from '../../queues/webhookDeliveryQueue';

// ============================================================================
// Types
// ============================================================================

export interface WebhookForDelivery {
  id: string;
  organizationId: string;
  url: string;
  secretEncrypted: string;
  events: string[];
  formId?: string | null;
  status: 'active' | 'paused' | 'disabled';
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

export interface WebhookPayload {
  event: string;
  formId?: string;
  timestamp?: string;
  data: any;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  responseTimeMs: number;
  signature?: string;
}

// ============================================================================
// Find Webhooks for Event
// ============================================================================

/**
 * Find all active webhooks for a specific organization and event
 * @param organizationId - Organization ID
 * @param event - Event name (e.g., 'form.submitted')
 * @param formId - Optional form ID filter
 * @returns Array of webhooks
 */
export async function findWebhooksForEvent(
  organizationId: string,
  event: string,
  formId?: string,
): Promise<WebhookForDelivery[]> {
  let sql = `
    SELECT
      id,
      organization_id as "organizationId",
      url,
      secret_encrypted as "secretEncrypted",
      events,
      form_id as "formId",
      status,
      health_status as "healthStatus"
    FROM inbound_webhooks
    WHERE organization_id = $1
      AND $2 = ANY(events)
      AND status = 'active'
      AND deleted_at IS NULL
  `;

  const params: any[] = [organizationId, event];

  if (formId) {
    sql += ' AND (form_id = $3 OR form_id IS NULL)';
    params.push(formId);
  }

  sql += ' ORDER BY created_at ASC';

  const rows = await query(sql, params);
  return rows as WebhookForDelivery[];
}

// ============================================================================
// Enqueue Webhook Delivery
// ============================================================================

/**
 * Enqueue webhook delivery jobs for all matching webhooks
 * @param organizationId - Organization ID
 * @param event - Event name
 * @param payload - Event payload
 * @param formId - Optional form ID
 * @returns Array of job IDs
 */
export async function enqueueWebhookDelivery(
  organizationId: string,
  event: string,
  payload: WebhookPayload,
  formId?: string,
): Promise<string[]> {
  // Find all matching webhooks
  const webhooks = await findWebhooksForEvent(organizationId, event, formId);

  if (webhooks.length === 0) {
    return [];
  }

  // Add timestamp if not present
  if (!payload.timestamp) {
    payload.timestamp = new Date().toISOString();
  }

  // Enqueue delivery job for each webhook
  const jobIds: string[] = [];

  for (const webhook of webhooks) {
    try {
      const jobId = await addWebhookDeliveryJob(webhook, payload);
      jobIds.push(jobId);
    } catch (error: any) {
      // Log error but don't fail entire batch
      console.error('Failed to enqueue webhook delivery job', {
        webhookId: webhook.id,
        error: error.message,
      });
    }
  }

  return jobIds;
}

// ============================================================================
// Process Webhook Delivery (HTTP POST)
// ============================================================================

/**
 * Process webhook delivery by making HTTP POST request
 * @param webhook - Webhook configuration
 * @param payload - Event payload
 * @returns Delivery result
 */
export async function processWebhookDelivery(
  webhook: WebhookForDelivery,
  payload: WebhookPayload,
): Promise<DeliveryResult> {
  const startTime = Date.now();

  try {
    // 1. Decrypt webhook secret
    const secret = await webhookService.decryptSecret(webhook.secretEncrypted);

    // 2. Generate HMAC signature
    const payloadString = JSON.stringify(payload);
    const signature = webhookService.generateSignature(payloadString, secret);
    const signatureHeader = `sha256=${signature}`;

    // 3. Make HTTP POST request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RightFlow-Signature': signatureHeader,
          'User-Agent': 'RightFlow-Webhook/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          responseTimeMs,
          signature: signatureHeader,
        };
      } else {
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTimeMs,
          signature: signatureHeader,
        };
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;

      if (fetchError.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout (10s)',
          responseTimeMs,
          signature: signatureHeader,
        };
      }

      throw fetchError;
    }
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;

    return {
      success: false,
      error: error.message || 'Unknown error',
      responseTimeMs,
    };
  }
}

// ============================================================================
// Record Delivery Result
// ============================================================================

/**
 * Record webhook delivery attempt in database
 * @param webhookId - Webhook ID
 * @param event - Event name
 * @param payload - Event payload
 * @param signature - HMAC signature
 * @param result - Delivery result
 * @param attempt - Attempt number (1-4)
 */
export async function recordDeliveryResult(
  webhookId: string,
  event: string,
  payload: WebhookPayload,
  signature: string,
  result: DeliveryResult,
  attempt: number = 1,
): Promise<void> {
  // Calculate payload hash (SHA-256)
  const payloadString = JSON.stringify(payload);
  const payloadHash = crypto
    .createHash('sha256')
    .update(payloadString)
    .digest('hex');

  // Determine status
  const status = result.success ? 'delivered' : 'failed';

  // Insert delivery record
  await query(
    `INSERT INTO webhook_deliveries (
      webhook_id,
      event,
      payload_hash,
      signature,
      status,
      status_code,
      error_message,
      response_time_ms,
      attempt,
      delivered_at,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      webhookId,
      event,
      payloadHash,
      signature,
      status,
      result.statusCode || null,
      result.error || null,
      result.responseTimeMs,
      attempt,
      result.success ? new Date() : null,
    ],
  );
}

// ============================================================================
// Update Webhook Health
// ============================================================================

/**
 * Update webhook health status after delivery attempt
 * @param webhookId - Webhook ID
 * @param result - Delivery result
 */
export async function updateWebhookHealthAfterDelivery(
  webhookId: string,
  result: DeliveryResult,
): Promise<void> {
  await webhookService.updateWebhookHealth(webhookId, result.success);
}
