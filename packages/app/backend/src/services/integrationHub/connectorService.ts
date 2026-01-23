/**
 * Connector Service - Integration Hub
 * Manages connector instances (organization-level ERP/CRM connections)
 *
 * Security:
 * - All operations validate organization_id (multi-tenant isolation)
 * - Soft deletes with deleted_at timestamp
 * - Unique constraint on (organization_id, name) where deleted_at IS NULL
 */

import { query } from '../../config/database';
import {
  ValidationError,
  NotFoundError,
  OrganizationMismatchError,
  ConflictError,
} from '../../utils/errors';
import logger from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface CreateConnectorInput {
  organizationId: string;
  definitionSlug: string;
  name: string;
  config: Record<string, any>;
  rateLimitRequests?: number;
  rateLimitWindowSeconds?: number;
  timeoutMs?: number;
}

export interface UpdateConnectorInput {
  name?: string;
  config?: Record<string, any>;
  isEnabled?: boolean;
  rateLimitRequests?: number;
  rateLimitWindowSeconds?: number;
  timeoutMs?: number;
}

export interface Connector {
  id: string;
  organizationId: string;
  definitionId: string;
  name: string;
  config: Record<string, any>;
  rateLimitRequests: number | null;
  rateLimitWindowSeconds: number | null;
  timeoutMs: number | null;
  isEnabled: boolean;
  healthStatus: string;
  lastHealthCheckAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize dangerous BiDi Unicode marks from text
 * Security: Prevents BiDi override attacks
 */
function sanitizeBidiMarks(text: string): string {
  // Remove dangerous BiDi control characters: U+202A through U+202E
  // LRE (‪), RLE (‫), PDF (‬), LRO (‭), RLO (‮)
  return text.replace(/[\u202A-\u202E]/g, '');
}

/**
 * Get connector definition ID by slug
 */
async function getDefinitionIdBySlug(slug: string): Promise<string> {
  const result = await query<{ id: string }>(
    `SELECT id FROM connector_definitions WHERE slug = $1 AND is_active = true`,
    [slug],
  );

  if (result.length === 0) {
    throw new ValidationError('Invalid connector definition', { slug });
  }

  return result[0].id;
}

/**
 * Validate connector name length
 */
function validateConnectorName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Connector name is required');
  }

  if (name.length > 255) {
    throw new ValidationError('Name must be 255 characters or less');
  }
}

/**
 * Check if connector name already exists for organization
 */
async function checkDuplicateName(
  organizationId: string,
  name: string,
  excludeConnectorId?: string,
): Promise<void> {
  const sql = excludeConnectorId
    ? `SELECT id FROM connectors
       WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL AND id != $3`
    : `SELECT id FROM connectors
       WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL`;

  const params = excludeConnectorId
    ? [organizationId, name, excludeConnectorId]
    : [organizationId, name];

  const result = await query(sql, params);

  if (result.length > 0) {
    throw new ConflictError('Connector name already exists', { name });
  }
}

/**
 * Map database row to Connector object
 */
function mapRowToConnector(row: any): Connector {
  return {
    id: row.id,
    organizationId: row.organization_id,
    definitionId: row.definition_id,
    name: row.name,
    config: row.config,
    rateLimitRequests: row.rate_limit_requests,
    rateLimitWindowSeconds: row.rate_limit_window_seconds,
    timeoutMs: row.timeout_ms,
    isEnabled: row.is_enabled,
    healthStatus: row.health_status,
    lastHealthCheckAt: row.last_health_check_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create new connector instance
 *
 * Security:
 * - Validates definition exists
 * - Prevents duplicate names within organization
 * - Sanitizes BiDi marks from name
 * - Validates name length
 */
export async function create(input: CreateConnectorInput): Promise<Connector> {
  logger.info('Creating connector', {
    organizationId: input.organizationId,
    definitionSlug: input.definitionSlug,
    name: input.name,
  });

  // Validate name
  validateConnectorName(input.name);

  // Sanitize name (remove dangerous BiDi marks)
  const sanitizedName = sanitizeBidiMarks(input.name);

  // Get definition ID
  const definitionId = await getDefinitionIdBySlug(input.definitionSlug);

  // Check for duplicate name
  await checkDuplicateName(input.organizationId, sanitizedName);

  // Insert connector
  const result = await query<any>(
    `INSERT INTO connectors (
      organization_id,
      definition_id,
      name,
      config,
      rate_limit_requests,
      rate_limit_window_seconds,
      timeout_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      input.organizationId,
      definitionId,
      sanitizedName,
      JSON.stringify(input.config),
      input.rateLimitRequests ?? null,
      input.rateLimitWindowSeconds ?? null,
      input.timeoutMs ?? null,
    ],
  );

  logger.info('Connector created successfully', {
    connectorId: result[0].id,
    organizationId: input.organizationId,
  });

  return mapRowToConnector(result[0]);
}

/**
 * Get connector by ID for specific organization
 *
 * Security:
 * - CRITICAL: Validates connector belongs to organization (multi-tenant isolation)
 * - Filters out soft-deleted connectors
 */
export async function getByIdForOrg(
  connectorId: string,
  organizationId: string,
): Promise<Connector> {
  const result = await query<any>(
    `SELECT * FROM connectors
     WHERE id = $1 AND deleted_at IS NULL`,
    [connectorId],
  );

  if (result.length === 0) {
    throw new NotFoundError('Connector', connectorId);
  }

  const connector = result[0];

  // CRITICAL: Cross-tenant access prevention
  if (connector.organization_id !== organizationId) {
    logger.warn('Cross-tenant connector access attempt blocked', {
      connectorId,
      requestedByOrg: organizationId,
      actualOrg: connector.organization_id,
    });
    throw new OrganizationMismatchError();
  }

  return mapRowToConnector(connector);
}

/**
 * Get connector by ID (alias for getByIdForOrg with swapped parameter order)
 * Used by Pull Service for cleaner API
 */
export async function getById(
  connectorId: string,
  organizationId: string,
): Promise<Connector> {
  return getByIdForOrg(connectorId, organizationId);
}

/**
 * List all connectors for organization
 *
 * Security:
 * - Filters by organization_id (multi-tenant isolation)
 * - Excludes soft-deleted connectors
 */
export async function listForOrg(organizationId: string): Promise<Connector[]> {
  const result = await query<any>(
    `SELECT c.*, cd.name as definition_name, cd.slug as definition_slug
     FROM connectors c
     INNER JOIN connector_definitions cd ON c.definition_id = cd.id
     WHERE c.organization_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.created_at DESC`,
    [organizationId],
  );

  return result.map(mapRowToConnector);
}

/**
 * Update connector configuration
 *
 * Security:
 * - Validates connector belongs to organization (cross-tenant prevention)
 * - Prevents duplicate names within organization
 * - Sanitizes BiDi marks from name
 */
export async function update(
  connectorId: string,
  organizationId: string,
  input: UpdateConnectorInput,
): Promise<Connector> {
  logger.info('Updating connector', { connectorId, organizationId });

  // First, verify connector exists and belongs to organization
  await getByIdForOrg(connectorId, organizationId);

  // Validate name if provided
  if (input.name) {
    validateConnectorName(input.name);

    // Sanitize name
    const sanitizedName = sanitizeBidiMarks(input.name);

    // Check for duplicate name (excluding current connector)
    await checkDuplicateName(organizationId, sanitizedName, connectorId);

    input.name = sanitizedName;
  }

  // Build dynamic UPDATE query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }

  if (input.config !== undefined) {
    updates.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(input.config));
  }

  if (input.isEnabled !== undefined) {
    updates.push(`is_enabled = $${paramIndex++}`);
    values.push(input.isEnabled);
  }

  if (input.rateLimitRequests !== undefined) {
    updates.push(`rate_limit_requests = $${paramIndex++}`);
    values.push(input.rateLimitRequests);
  }

  if (input.rateLimitWindowSeconds !== undefined) {
    updates.push(`rate_limit_window_seconds = $${paramIndex++}`);
    values.push(input.rateLimitWindowSeconds);
  }

  if (input.timeoutMs !== undefined) {
    updates.push(`timeout_ms = $${paramIndex++}`);
    values.push(input.timeoutMs);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  // Add connector ID to params
  values.push(connectorId);

  const sql = `
    UPDATE connectors
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING *
  `;

  const result = await query<any>(sql, values);

  logger.info('Connector updated successfully', { connectorId });

  return mapRowToConnector(result[0]);
}

/**
 * Soft delete connector
 *
 * Security:
 * - Validates connector belongs to organization (cross-tenant prevention)
 * - Sets deleted_at timestamp (allows name reuse)
 */
export async function softDelete(
  connectorId: string,
  organizationId: string,
): Promise<void> {
  logger.info('Soft deleting connector', { connectorId, organizationId });

  // Verify connector exists and belongs to organization
  await getByIdForOrg(connectorId, organizationId);

  // Soft delete
  await query(
    `UPDATE connectors
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [connectorId],
  );

  logger.info('Connector soft deleted successfully', { connectorId });
}
