/**
 * Webhook Service - Integration Hub Phase 6
 * Manages webhook CRUD operations and signature verification
 *
 * Features:
 * - HMAC-SHA256 signature generation/verification
 * - Webhook CRUD with multi-tenant isolation
 * - Secret encryption (AES-256-GCM)
 * - URL validation (no localhost, private IPs, self-referencing)
 */

import { query, queryWithMeta } from '../../config/database';
import crypto from 'crypto';
import { encrypt, decrypt } from './credentialService';

// ============================================================================
// Types
// ============================================================================

export interface Webhook {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  formId?: string | null;
  description?: string | null;
  status: 'active' | 'paused' | 'disabled';
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  consecutiveFailures: number;
  lastTriggeredAt?: Date | null;
  lastSuccessAt?: Date | null;
  successCount: number;
  failureCount: number;
  averageLatencyMs?: number | null;
  createdAt: Date;
  updatedAt: Date;
  secret?: string; // Only included on creation
}

export interface CreateWebhookParams {
  url: string;
  events: string[];
  formId?: string;
  description?: string;
}

export interface WebhookFilters {
  formId?: string;
  status?: 'active' | 'paused' | 'disabled';
  event?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ENCRYPTION_KEY = process.env.WEBHOOK_SECRET_KEY || process.env.ENCRYPTION_KEY || 'default-key-for-dev';

// Private IP ranges (RFC 1918)
const PRIVATE_IP_RANGES = [
  /^127\./,          // 127.0.0.0/8 (localhost)
  /^10\./,           // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
  /^192\.168\./,      // 192.168.0.0/16
];

// ============================================================================
// Signature Generation & Verification
// ============================================================================

/**
 * Generate HMAC-SHA256 signature for payload
 * @param payload - Stringified JSON payload
 * @param secret - Webhook secret
 * @returns Hex-encoded signature
 */
export function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Verify HMAC-SHA256 signature
 * Uses timing-safe comparison to prevent timing attacks
 *
 * @param payload - Stringified JSON payload
 * @param signatureHeader - Signature from X-RightFlow-Signature header (format: "sha256=...")
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export function verifySignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): boolean {
  try {
    // Trim whitespace and convert to lowercase
    const header = signatureHeader.trim().toLowerCase();

    // Extract signature (remove 'sha256=' prefix)
    if (!header.startsWith('sha256=')) {
      return false;
    }

    const receivedSignature = header.replace(/^sha256=/, '');

    // Generate expected signature
    const expectedSignature = generateSignature(payload, secret);

    // Timing-safe comparison (prevents timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch (error) {
    // Any error (invalid hex, length mismatch, etc.) = invalid signature
    return false;
  }
}

// ============================================================================
// Secret Management
// ============================================================================

/**
 * Generate cryptographically random webhook secret
 * Format: whsec_[32+ base64url characters]
 */
export function generateSecret(): string {
  const randomBytes = crypto.randomBytes(32);
  const base64url = randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `whsec_${base64url}`;
}

/**
 * Encrypt webhook secret using AES-256-GCM
 * Reuses encryption from credentialService
 */
export async function encryptSecret(secret: string): Promise<string> {
  return await encrypt(secret, ENCRYPTION_KEY);
}

/**
 * Decrypt webhook secret
 * Reuses decryption from credentialService
 */
export async function decryptSecret(encrypted: string): Promise<string> {
  return await decrypt(encrypted, ENCRYPTION_KEY);
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate webhook URL
 * Rejects: localhost, private IPs, self-referencing URLs
 *
 * @param url - Webhook URL to validate
 * @throws Error if URL is invalid
 */
function validateWebhookUrl(url: string): void {
  try {
    const parsed = new URL(url);

    // Check for localhost
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      throw new Error('Webhook URL cannot be localhost');
    }

    // Check for private IP ranges
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(parsed.hostname)) {
        throw new Error('Webhook URL cannot be a private IP address');
      }
    }

    // Check for self-referencing URL
    if (
      parsed.hostname.includes('rightflow.app') ||
      parsed.hostname.includes('rightflow.com')
    ) {
      throw new Error('Webhook URL cannot be self-referencing (RightFlow domain)');
    }

    // Validate protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Webhook URL must use HTTP or HTTPS protocol');
    }
  } catch (error: any) {
    if (error.message.includes('Invalid URL')) {
      throw new Error('Invalid webhook URL format');
    }
    throw error;
  }
}

// ============================================================================
// Webhook CRUD Operations
// ============================================================================

/**
 * Create webhook
 * @returns Webhook with secret (one-time display)
 */
export async function createWebhook(
  params: CreateWebhookParams,
  organizationId: string,
): Promise<Webhook> {
  // Validate URL
  validateWebhookUrl(params.url);

  // Validate events
  if (!params.events || params.events.length === 0) {
    throw new Error('At least one event is required');
  }

  // Generate and encrypt secret
  const secret = generateSecret();
  const secretEncrypted = await encryptSecret(secret);

  // Insert webhook
  const rows = await query(
    `INSERT INTO inbound_webhooks (
      organization_id,
      url,
      secret_encrypted,
      events,
      form_id,
      description,
      status,
      health_status,
      consecutive_failures,
      success_count,
      failure_count
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id,
      organization_id as "organizationId",
      url,
      events,
      form_id as "formId",
      description,
      status,
      health_status as "healthStatus",
      consecutive_failures as "consecutiveFailures",
      last_triggered_at as "lastTriggeredAt",
      last_success_at as "lastSuccessAt",
      success_count as "successCount",
      failure_count as "failureCount",
      average_latency_ms as "averageLatencyMs",
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [
      organizationId,
      params.url,
      secretEncrypted,
      params.events,
      params.formId || null,
      params.description || null,
      'active',
      'unknown',
      0,
      0,
      0,
    ],
  );

  const webhook = rows[0] as Webhook;

  // Include secret in response (one-time display)
  webhook.secret = secret;

  return webhook;
}

/**
 * List webhooks for organization
 * @param organizationId - Organization ID
 * @param filters - Optional filters (formId, status, event)
 * @returns Array of webhooks (without secrets)
 */
export async function listWebhooks(
  organizationId: string,
  filters?: WebhookFilters,
): Promise<Webhook[]> {
  let sql = `
    SELECT
      id,
      organization_id as "organizationId",
      url,
      events,
      form_id as "formId",
      description,
      status,
      health_status as "healthStatus",
      consecutive_failures as "consecutiveFailures",
      last_triggered_at as "lastTriggeredAt",
      last_success_at as "lastSuccessAt",
      success_count as "successCount",
      failure_count as "failureCount",
      average_latency_ms as "averageLatencyMs",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM inbound_webhooks
    WHERE organization_id = $1
      AND deleted_at IS NULL
  `;

  const params: any[] = [organizationId];
  let paramIndex = 2;

  // Apply filters
  if (filters?.formId) {
    sql += ` AND form_id = $${paramIndex}`;
    params.push(filters.formId);
    paramIndex++;
  }

  if (filters?.status) {
    sql += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.event) {
    sql += ` AND $${paramIndex} = ANY(events)`;
    params.push(filters.event);
    paramIndex++;
  }

  sql += ' ORDER BY created_at DESC';

  const rows = await query(sql, params);
  return rows as Webhook[];
}

/**
 * Get webhook by ID
 * @param id - Webhook ID
 * @param organizationId - Organization ID (for multi-tenant isolation)
 * @returns Webhook or null if not found
 */
export async function getWebhook(
  id: string,
  organizationId: string,
): Promise<Webhook | null> {
  const rows = await query(
    `SELECT
      id,
      organization_id as "organizationId",
      url,
      events,
      form_id as "formId",
      description,
      status,
      health_status as "healthStatus",
      consecutive_failures as "consecutiveFailures",
      last_triggered_at as "lastTriggeredAt",
      last_success_at as "lastSuccessAt",
      success_count as "successCount",
      failure_count as "failureCount",
      average_latency_ms as "averageLatencyMs",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM inbound_webhooks
    WHERE id = $1
      AND organization_id = $2
      AND deleted_at IS NULL`,
    [id, organizationId],
  );

  return rows.length > 0 ? (rows[0] as Webhook) : null;
}

/**
 * Delete webhook (soft delete)
 * @param id - Webhook ID
 * @param organizationId - Organization ID (for multi-tenant isolation)
 */
export async function deleteWebhook(
  id: string,
  organizationId: string,
): Promise<void> {
  const result = await queryWithMeta(
    `UPDATE inbound_webhooks
     SET deleted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
       AND organization_id = $2
       AND deleted_at IS NULL`,
    [id, organizationId],
  );

  if (result.rowCount === 0) {
    throw new Error('Webhook not found or already deleted');
  }
}

/**
 * Update webhook health status
 * Called by webhook delivery worker after each delivery attempt
 *
 * @param webhookId - Webhook ID
 * @param success - True if delivery succeeded
 */
export async function updateWebhookHealth(
  webhookId: string,
  success: boolean,
): Promise<void> {
  if (success) {
    // Reset consecutive failures on success
    await query(
      `UPDATE inbound_webhooks
       SET consecutive_failures = 0,
           health_status = 'healthy',
           last_success_at = NOW(),
           success_count = success_count + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [webhookId],
    );
  } else {
    // Increment consecutive failures
    const rows = await query(
      `UPDATE inbound_webhooks
       SET consecutive_failures = consecutive_failures + 1,
           failure_count = failure_count + 1,
           health_status = CASE
             WHEN consecutive_failures + 1 >= 10 THEN 'unhealthy'
             WHEN consecutive_failures + 1 >= 5 THEN 'degraded'
             ELSE health_status
           END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING consecutive_failures, health_status`,
      [webhookId],
    );

    // Circuit breaker: Disable after 10 consecutive failures
    if (rows.length > 0 && rows[0].consecutive_failures >= 10) {
      await query(
        `UPDATE inbound_webhooks
         SET status = 'disabled',
             updated_at = NOW()
         WHERE id = $1`,
        [webhookId],
      );

      // TODO: Send admin notification (Phase 6.1)
      console.warn(`Circuit breaker activated: Webhook ${webhookId} disabled after 10 consecutive failures`);
    }
  }
}

/**
 * Get webhook with encrypted secret (for delivery worker)
 * @param id - Webhook ID
 * @returns Webhook with encrypted secret or null
 */
export async function getWebhookWithSecret(
  id: string,
): Promise<(Webhook & { secretEncrypted: string }) | null> {
  const rows = await query(
    `SELECT
      id,
      organization_id as "organizationId",
      url,
      secret_encrypted as "secretEncrypted",
      events,
      form_id as "formId",
      description,
      status,
      health_status as "healthStatus",
      consecutive_failures as "consecutiveFailures",
      last_triggered_at as "lastTriggeredAt",
      last_success_at as "lastSuccessAt",
      success_count as "successCount",
      failure_count as "failureCount",
      average_latency_ms as "averageLatencyMs",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM inbound_webhooks
    WHERE id = $1
      AND deleted_at IS NULL`,
    [id],
  );

  return rows.length > 0 ? rows[0] : null;
}
