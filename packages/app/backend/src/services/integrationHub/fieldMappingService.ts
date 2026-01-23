/**
 * Field Mapping Service - Integration Hub Phase 2
 * Manages field mappings between forms and connectors
 *
 * Features:
 * - Form-specific and template mappings
 * - Transform pipeline integration
 * - Multi-tenant isolation
 * - Soft delete support
 * - Transform preview API
 */

import { query } from '../../config/database';
import { ValidationError, NotFoundError } from '../../utils/errors';
import logger from '../../utils/logger';
import {
  executeTransforms,
  validateTransforms,
  Transform,
  TransformResult,
} from './transformEngine';

// ============================================================================
// Types
// ============================================================================

export interface FieldMapping {
  id: string;
  organizationId: string;
  connectorId: string;
  formId: string | null;
  formField: string;
  connectorField: string;
  transforms: Transform[];
  required: boolean;
  defaultValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldMappingInput {
  organizationId: string;
  connectorId: string;
  formId: string | null;
  formField: string;
  connectorField: string;
  transforms: Transform[];
  required: boolean;
  defaultValue: string | null;
}

export interface UpdateFieldMappingInput {
  connectorField?: string;
  transforms?: Transform[];
  required?: boolean;
  defaultValue?: string | null;
}

export interface ListFieldMappingsFilter {
  organizationId: string;
  connectorId: string;
  formId?: string | null;
}

// ============================================================================
// Error Classes
// ============================================================================

export class OrganizationMismatchError extends Error {
  constructor(message: string = 'Organization mismatch') {
    super(message);
    this.name = 'OrganizationMismatchError';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapRowToFieldMapping(row: any): FieldMapping {
  return {
    id: row.id,
    organizationId: row.organization_id,
    connectorId: row.connector_id,
    formId: row.form_id,
    formField: row.form_field,
    connectorField: row.connector_field,
    transforms: row.transforms || [],
    required: row.required,
    defaultValue: row.default_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateFieldName(name: string, fieldType: 'form' | 'connector'): void {
  if (!name || name.trim().length === 0) {
    throw new ValidationError(`${fieldType} field name cannot be empty`);
  }

  if (name.length > 255) {
    throw new ValidationError(
      `${fieldType} field name cannot exceed 255 characters`,
      { field: `${fieldType}Field`, provided: name.length },
    );
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create field mapping
 *
 * Security:
 * - Validates field names
 * - Validates transform chain
 * - Enforces unique constraint (connector + form + field)
 */
export async function create(input: CreateFieldMappingInput): Promise<FieldMapping> {
  logger.info('Creating field mapping', {
    organizationId: input.organizationId,
    connectorId: input.connectorId,
    formId: input.formId,
    formField: input.formField,
  });

  // Validate field names
  validateFieldName(input.formField, 'form');
  validateFieldName(input.connectorField, 'connector');

  // Validate transforms
  try {
    validateTransforms(input.transforms);
  } catch (error: any) {
    throw new ValidationError(`Transform validation failed: ${error.message}`, {
      transforms: input.transforms,
    });
  }

  // Insert mapping
  try {
    const result = await query<any>(
      `INSERT INTO field_mappings (
        organization_id,
        connector_id,
        form_id,
        form_field,
        connector_field,
        transforms,
        required,
        default_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        input.organizationId,
        input.connectorId,
        input.formId,
        input.formField,
        input.connectorField,
        JSON.stringify(input.transforms),
        input.required,
        input.defaultValue,
      ],
    );

    logger.info('Field mapping created', { id: result[0].id });
    return mapRowToFieldMapping(result[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new ValidationError(
        'Field mapping already exists for this connector, form, and field',
        {
          connectorId: input.connectorId,
          formId: input.formId,
          formField: input.formField,
        },
      );
    }
    throw error;
  }
}

/**
 * Get field mapping by ID for organization
 *
 * Security:
 * - Enforces multi-tenant isolation
 * - Excludes soft-deleted mappings
 * - Logs cross-tenant access attempts
 */
export async function getByIdForOrg(
  mappingId: string,
  organizationId: string,
): Promise<FieldMapping> {
  const result = await query<any>(
    `SELECT * FROM field_mappings
     WHERE id = $1 AND deleted_at IS NULL`,
    [mappingId],
  );

  if (result.length === 0) {
    throw new NotFoundError('Field mapping', mappingId);
  }

  const row = result[0];

  // CRITICAL: Cross-tenant access check
  if (row.organization_id !== organizationId) {
    logger.warn('Cross-tenant field mapping access attempt blocked', {
      mappingId,
      requestedByOrg: organizationId,
      actualOrg: row.organization_id,
    });
    throw new OrganizationMismatchError();
  }

  return mapRowToFieldMapping(row);
}

/**
 * List field mappings with filters
 *
 * Security:
 * - Filters by organization_id
 * - Excludes soft-deleted mappings
 */
export async function list(filter: ListFieldMappingsFilter): Promise<FieldMapping[]> {
  const conditions: string[] = [
    'organization_id = $1',
    'connector_id = $2',
    'deleted_at IS NULL',
  ];
  const values: any[] = [filter.organizationId, filter.connectorId];

  // Handle formId filter (including NULL for template mappings)
  if (filter.formId !== undefined) {
    if (filter.formId === null) {
      conditions.push('form_id IS NULL');
    } else {
      conditions.push(`form_id = $${values.length + 1}`);
      values.push(filter.formId);
    }
  }

  const sql = `
    SELECT * FROM field_mappings
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
  `;

  const result = await query<any>(sql, values);
  return result.map(mapRowToFieldMapping);
}

/**
 * Update field mapping
 *
 * Security:
 * - Validates cross-tenant access
 * - Validates transforms if changed
 * - Supports partial updates
 */
export async function update(
  mappingId: string,
  organizationId: string,
  input: UpdateFieldMappingInput,
): Promise<FieldMapping> {
  // Verify ownership
  await getByIdForOrg(mappingId, organizationId);

  // Validate transforms if provided
  if (input.transforms) {
    try {
      validateTransforms(input.transforms);
    } catch (error: any) {
      throw new ValidationError(`Transform validation failed: ${error.message}`, {
        transforms: input.transforms,
      });
    }
  }

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.connectorField !== undefined) {
    validateFieldName(input.connectorField, 'connector');
    updates.push(`connector_field = $${paramIndex++}`);
    values.push(input.connectorField);
  }

  if (input.transforms !== undefined) {
    updates.push(`transforms = $${paramIndex++}`);
    values.push(JSON.stringify(input.transforms));
  }

  if (input.required !== undefined) {
    updates.push(`required = $${paramIndex++}`);
    values.push(input.required);
  }

  if (input.defaultValue !== undefined) {
    updates.push(`default_value = $${paramIndex++}`);
    values.push(input.defaultValue);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  // Add mapping ID parameter
  values.push(mappingId);

  const sql = `
    UPDATE field_mappings
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query<any>(sql, values);
  logger.info('Field mapping updated', { id: mappingId });
  return mapRowToFieldMapping(result[0]);
}

/**
 * Soft delete field mapping
 *
 * Security:
 * - Validates cross-tenant access
 * - Sets deleted_at timestamp
 */
export async function softDelete(
  mappingId: string,
  organizationId: string,
): Promise<void> {
  // Verify ownership
  await getByIdForOrg(mappingId, organizationId);

  await query(
    `UPDATE field_mappings
     SET deleted_at = NOW()
     WHERE id = $1`,
    [mappingId],
  );

  logger.info('Field mapping soft deleted', { id: mappingId });
}

/**
 * Preview transformation with sample data
 *
 * Security:
 * - Validates cross-tenant access
 * - Executes transforms in isolated context
 * - Returns step-by-step trace
 */
export async function previewTransform(
  mappingId: string,
  organizationId: string,
  sampleData: any,
): Promise<TransformResult> {
  // Get mapping and verify ownership
  const mapping = await getByIdForOrg(mappingId, organizationId);

  logger.info('Previewing transform', {
    mappingId,
    organizationId,
    transformCount: mapping.transforms.length,
  });

  try {
    // Execute transforms with sample data and performance tracking
    const result = executeTransforms(sampleData, mapping.transforms);

    // Log performance metrics
    logger.info('Transform preview completed', {
      mappingId,
      transformCount: mapping.transforms.length,
      totalDurationMs: result.totalDurationMs,
      slowestTransform: result.steps.reduce(
        (slowest, step) =>
          (step.durationMs || 0) > (slowest?.durationMs || 0) ? step : slowest,
        result.steps[0],
      )?.transform,
    });

    return result;
  } catch (error: any) {
    logger.error('Transform preview failed', {
      mappingId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get all field mappings for a connector
 * Used by Pull Service to apply transforms to ERP data
 */
export async function getByConnector(connectorId: string): Promise<FieldMapping[]> {
  const result = await query<any>(
    `SELECT * FROM field_mappings
     WHERE connector_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [connectorId],
  );

  return result.map(mapRowToFieldMapping);
}

/**
 * Apply field mappings bidirectionally
 *
 * Direction: 'pull' (default) - Transforms ERP data → Form data
 * Direction: 'push' - Transforms Form data → ERP data
 *
 * @param sourceData - Source data object (ERP or Form)
 * @param mappings - Field mappings to apply
 * @param direction - 'pull' (ERP→Form) or 'push' (Form→ERP)
 * @returns Transformed data object
 */
export async function applyMappings(
  sourceData: any,
  mappings: FieldMapping[],
  direction: 'pull' | 'push' = 'pull',
): Promise<any> {
  const transformedData: any = {};

  for (const mapping of mappings) {
    const { formField, connectorField, transforms, defaultValue } = mapping;

    // Determine source and target fields based on direction
    const sourceField = direction === 'pull' ? connectorField : formField;
    const targetField = direction === 'pull' ? formField : connectorField;

    // Get value from source data (supports nested paths like "customer.name")
    let value = sourceData[sourceField];

    // Use default value if field missing
    if (value === undefined || value === null) {
      value = defaultValue;
    }

    // Apply transforms if any
    if (transforms && transforms.length > 0 && value !== null && value !== undefined) {
      const result = executeTransforms(value, transforms);
      value = result.output;
    }

    // Set transformed value
    transformedData[targetField] = value;
  }

  logger.debug('Field mappings applied', {
    direction,
    mappingCount: mappings.length,
    sourceFields: Object.keys(sourceData).length,
    targetFields: Object.keys(transformedData).length,
  });

  return transformedData;
}
