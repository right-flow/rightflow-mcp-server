-- ============================================================================
-- Migration: 003_field_mappings_schema.sql
-- Description: Field Mapping Engine - Transform Pipeline
-- Phase: 2 of 8
-- Created: 2026-01-22
-- ============================================================================

-- Purpose: Enable admins to map form fields to connector fields with
--          intelligent transformations, supporting Hebrew-specific operations.

-- ============================================================================
-- Table: field_mappings
-- ============================================================================

-- Stores field mappings between forms and connectors with transform chains
--
-- Design decisions:
-- - Multi-tenant isolation with organization_id
-- - Soft delete support (deleted_at)
-- - Transform chain stored as JSONB array
-- - Unique constraint per connector + form + field (when not deleted)
-- - NULL form_id = template mapping (reusable across forms)

CREATE TABLE field_mappings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant Isolation
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Foreign Keys
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    -- NULL form_id = template mapping (reusable)
    -- Non-NULL = specific form mapping

  -- Field Names
  form_field TEXT NOT NULL,
    -- Field name in the form (e.g., "customer_name", "order_date")
    -- Case-sensitive to match actual form field names

  connector_field TEXT NOT NULL,
    -- Field name in the connector/ERP system (e.g., "CUSTDES", "ORDERDATE")
    -- Case-sensitive to match ERP field names

  -- Transform Pipeline
  transforms JSONB NOT NULL DEFAULT '[]',
    -- Array of transform objects: [{"type": "trim"}, {"type": "uppercase"}]
    -- Executed in order (chained pipeline)
    -- Empty array = no transformation (direct mapping)
    -- Example: [
    --   {"type": "trim"},
    --   {"type": "uppercase"},
    --   {"type": "truncate", "params": {"maxLength": 50}}
    -- ]

  -- Validation Rules
  required BOOLEAN NOT NULL DEFAULT false,
    -- If true, submission fails if form field is missing
    -- If false, uses default_value or skips field

  default_value TEXT,
    -- Value to use if form field is missing/empty
    -- Applied before transforms
    -- NULL = no default (field skipped if missing)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
    -- Soft delete support
    -- NULL = active mapping
    -- Non-NULL = deleted (excluded from queries)

  -- Constraints
  CONSTRAINT chk_mapping_field_names CHECK (
    LENGTH(form_field) > 0 AND LENGTH(form_field) <= 255 AND
    LENGTH(connector_field) > 0 AND LENGTH(connector_field) <= 255
  ),
    -- Field names must be 1-255 characters

  CONSTRAINT chk_mapping_transforms_array CHECK (
    jsonb_typeof(transforms) = 'array'
  )
    -- Transforms must be a JSONB array
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Performance: Filter by connector_id (most common query)
CREATE INDEX idx_mappings_connector
ON field_mappings(connector_id)
WHERE deleted_at IS NULL;

-- Performance: Filter by form_id (form-specific mappings)
CREATE INDEX idx_mappings_form
ON field_mappings(form_id)
WHERE deleted_at IS NULL;

-- Performance: Filter by organization (multi-tenant queries)
CREATE INDEX idx_mappings_organization
ON field_mappings(organization_id)
WHERE deleted_at IS NULL;

-- Uniqueness: Prevent duplicate mappings for same field
-- Constraint: (connector_id, form_id, form_field) must be unique per active mapping
-- Allows same mapping after soft delete
CREATE UNIQUE INDEX idx_mappings_unique_field
ON field_mappings(connector_id, COALESCE(form_id, '00000000-0000-0000-0000-000000000000'::UUID), form_field)
WHERE deleted_at IS NULL;
  -- COALESCE handles NULL form_id for template mappings
  -- Uses dummy UUID for NULL to ensure uniqueness

-- Performance: Find template mappings (form_id IS NULL)
CREATE INDEX idx_mappings_templates
ON field_mappings(connector_id, organization_id)
WHERE form_id IS NULL AND deleted_at IS NULL;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_field_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_field_mappings_updated_at
BEFORE UPDATE ON field_mappings
FOR EACH ROW
EXECUTE FUNCTION update_field_mappings_updated_at();

-- ============================================================================
-- Comments (Database Documentation)
-- ============================================================================

COMMENT ON TABLE field_mappings IS
'Field mappings between forms and connectors with transform pipelines. Supports template mappings (form_id = NULL) reusable across multiple forms.';

COMMENT ON COLUMN field_mappings.organization_id IS
'Multi-tenant isolation - all queries must filter by this field';

COMMENT ON COLUMN field_mappings.connector_id IS
'Reference to connector instance (not definition)';

COMMENT ON COLUMN field_mappings.form_id IS
'NULL = template mapping (reusable), Non-NULL = form-specific mapping';

COMMENT ON COLUMN field_mappings.form_field IS
'Field name in the form (case-sensitive). Example: "customer_name", "invoice_date"';

COMMENT ON COLUMN field_mappings.connector_field IS
'Field name in ERP/CRM system (case-sensitive). Example: "CUSTDES", "IVDATE" (Priority)';

COMMENT ON COLUMN field_mappings.transforms IS
'JSONB array of transform objects executed in order. Example: [{"type": "trim"}, {"type": "uppercase"}]';

COMMENT ON COLUMN field_mappings.required IS
'If true, submission fails if form field missing. If false, uses default_value or skips field.';

COMMENT ON COLUMN field_mappings.default_value IS
'Value to use if form field missing. Applied before transforms. NULL = skip field if missing.';

COMMENT ON COLUMN field_mappings.deleted_at IS
'Soft delete timestamp. NULL = active, Non-NULL = deleted (excluded from queries)';

-- ============================================================================
-- Initial Data (None for Phase 2)
-- ============================================================================

-- No seed data for field_mappings table
-- Mappings are created by users via API

-- ============================================================================
-- Validation Queries (Development/Testing)
-- ============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'field_mappings'
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'field_mappings';

-- Verify triggers
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'field_mappings';

-- Test template mapping insertion (form_id = NULL)
-- INSERT INTO field_mappings (organization_id, connector_id, form_id, form_field, connector_field, transforms)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001'::UUID,
--   '00000000-0000-0000-0000-000000000002'::UUID,
--   NULL,  -- Template mapping
--   'customer_name',
--   'CUSTDES',
--   '[{"type": "trim"}, {"type": "uppercase"}]'::JSONB
-- );

-- Test form-specific mapping insertion
-- INSERT INTO field_mappings (organization_id, connector_id, form_id, form_field, connector_field, transforms)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001'::UUID,
--   '00000000-0000-0000-0000-000000000002'::UUID,
--   '00000000-0000-0000-0000-000000000003'::UUID,
--   'invoice_date',
--   'IVDATE',
--   '[{"type": "date_format", "params": {"from": "DD/MM/YYYY", "to": "YYYY-MM-DD"}}]'::JSONB
-- );

-- Test soft delete (should allow name reuse)
-- UPDATE field_mappings SET deleted_at = NOW() WHERE id = '...';
-- INSERT INTO field_mappings (organization_id, connector_id, form_id, form_field, connector_field, transforms)
-- VALUES (...);  -- Same field name, should succeed

-- ============================================================================
-- Rollback
-- ============================================================================

-- To rollback this migration:
-- DROP TRIGGER IF EXISTS trg_field_mappings_updated_at ON field_mappings;
-- DROP FUNCTION IF EXISTS update_field_mappings_updated_at();
-- DROP TABLE IF EXISTS field_mappings;

-- ============================================================================
-- Migration Complete
-- ============================================================================
