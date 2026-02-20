-- Migration 010: MCP Cowork Integration Schema
-- Created: 2026-02-19
-- Reference: ADR-008 Cowork Integration Architecture
-- Purpose: Database schema for Cowork MCP Connector - Hebrew PDF Infrastructure

-- ============================================================================
-- MCP Templates Table
-- Stores PDF templates available through MCP connector
-- ============================================================================
CREATE TABLE mcp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template Identification
  name TEXT NOT NULL,                    -- English name for API
  name_he TEXT,                          -- Hebrew display name
  description TEXT,                      -- Template description
  description_he TEXT,                   -- Hebrew description
  category TEXT NOT NULL DEFAULT 'general', -- 'legal', 'accounting', 'hr', 'real_estate', 'general'

  -- Storage
  s3_key TEXT NOT NULL,                  -- S3 object key for PDF template
  s3_bucket TEXT NOT NULL DEFAULT 'rightflow-templates',
  file_size INTEGER,                     -- File size in bytes
  checksum TEXT,                         -- SHA-256 checksum for integrity

  -- Field Definitions (JSONB for flexibility)
  fields JSONB NOT NULL DEFAULT '[]',    -- Array of FieldDefinition objects
  -- Structure: [{ id, name, name_he, type, x, y, width, height, page, required, validation, crmMapping }]

  -- Template Metadata
  version INTEGER NOT NULL DEFAULT 1,    -- Version number for updates
  is_active BOOLEAN DEFAULT true,        -- Active/inactive toggle
  is_public BOOLEAN DEFAULT false,       -- Available in public marketplace
  language TEXT NOT NULL DEFAULT 'he',   -- Primary language: 'he', 'en', 'he-en'

  -- CRM/ERP Integration
  crm_mappings JSONB DEFAULT '{}',       -- Field to CRM field mappings
  erp_mappings JSONB DEFAULT '{}',       -- Field to ERP field mappings
  supported_crms TEXT[] DEFAULT '{}',    -- Array of supported CRM types
  supported_erps TEXT[] DEFAULT '{}',    -- Array of supported ERP types

  -- Usage Statistics
  fill_count INTEGER DEFAULT 0,          -- Number of times template was filled
  last_used_at TIMESTAMPTZ,              -- Last time template was used

  -- Audit Fields
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for MCP Templates
CREATE INDEX idx_mcp_templates_org_id ON mcp_templates(organization_id);
CREATE INDEX idx_mcp_templates_category ON mcp_templates(category);
CREATE INDEX idx_mcp_templates_active ON mcp_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_mcp_templates_public ON mcp_templates(is_public) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX idx_mcp_templates_language ON mcp_templates(language);
CREATE INDEX idx_mcp_templates_fields ON mcp_templates USING GIN (fields);
CREATE INDEX idx_mcp_templates_crm_mappings ON mcp_templates USING GIN (crm_mappings);
CREATE INDEX idx_mcp_templates_supported_crms ON mcp_templates USING GIN (supported_crms);

-- Unique constraint: one template name per organization
CREATE UNIQUE INDEX idx_mcp_templates_org_name ON mcp_templates(organization_id, name) WHERE deleted_at IS NULL;

-- ============================================================================
-- MCP API Keys Table
-- Authentication credentials for MCP connector access
-- ============================================================================
CREATE TABLE mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Key Identification
  name TEXT NOT NULL,                    -- Human-readable name for the key
  key_prefix TEXT NOT NULL,              -- First 8 chars of key (for identification)
  key_hash TEXT NOT NULL,                -- bcrypt hash of the full API key

  -- Key Metadata
  description TEXT,                      -- Purpose description
  environment TEXT NOT NULL DEFAULT 'production', -- 'development', 'staging', 'production'

  -- Permissions (JSONB for flexibility)
  permissions JSONB NOT NULL DEFAULT '{
    "templates": {"read": true, "write": false},
    "fill": true,
    "batch": false,
    "audit": false
  }',

  -- Rate Limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- JWT Configuration
  jwt_secret_hash TEXT,                  -- bcrypt hash of JWT signing secret
  jwt_algorithm TEXT DEFAULT 'RS256',    -- JWT algorithm: RS256, ES256
  jwt_expires_in INTEGER DEFAULT 900,    -- JWT expiration in seconds (15 min default)
  jwt_refresh_enabled BOOLEAN DEFAULT true,

  -- Usage Tracking
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  total_requests INTEGER DEFAULT 0,
  requests_today INTEGER DEFAULT 0,
  requests_reset_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,                -- Optional expiration date
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- Audit Fields
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for MCP API Keys
CREATE INDEX idx_mcp_api_keys_org_id ON mcp_api_keys(organization_id);
CREATE INDEX idx_mcp_api_keys_prefix ON mcp_api_keys(key_prefix);
CREATE INDEX idx_mcp_api_keys_active ON mcp_api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_mcp_api_keys_environment ON mcp_api_keys(environment);
CREATE INDEX idx_mcp_api_keys_expires ON mcp_api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Unique constraint: one key name per organization
CREATE UNIQUE INDEX idx_mcp_api_keys_org_name ON mcp_api_keys(organization_id, name);

-- ============================================================================
-- MCP Audit Logs Table
-- Comprehensive audit trail for all MCP operations
-- ============================================================================
CREATE TABLE mcp_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Operation Details
  action TEXT NOT NULL,                  -- 'template.fill', 'template.create', 'template.update', 'key.create', etc.
  resource_type TEXT NOT NULL,           -- 'template', 'api_key', 'pdf', 'batch'
  resource_id UUID,                      -- Reference to the affected resource

  -- Request Context
  api_key_id UUID REFERENCES mcp_api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,                       -- Cowork session identifier

  -- Request Details
  request_method TEXT,                   -- HTTP method
  request_path TEXT,                     -- API endpoint
  request_headers JSONB DEFAULT '{}',    -- Sanitized headers (no secrets)
  request_body_hash TEXT,                -- SHA-256 of request body (for PII protection)

  -- Response Details
  response_status INTEGER,               -- HTTP status code
  response_time_ms INTEGER,              -- Response time in milliseconds

  -- Operation Data (no PII)
  operation_data JSONB DEFAULT '{}',     -- Operation-specific metadata
  -- Examples:
  -- For template.fill: { templateId, fieldCount, outputSize, language }
  -- For batch: { batchId, documentCount, successCount, failureCount }

  -- Error Information
  error_code TEXT,
  error_message TEXT,

  -- Security & Compliance
  ip_address INET,
  user_agent TEXT,
  geo_location JSONB DEFAULT '{}',       -- { country, city } if available

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for MCP Audit Logs (optimized for queries)
CREATE INDEX idx_mcp_audit_logs_org_id ON mcp_audit_logs(organization_id);
CREATE INDEX idx_mcp_audit_logs_action ON mcp_audit_logs(action);
CREATE INDEX idx_mcp_audit_logs_resource ON mcp_audit_logs(resource_type, resource_id);
CREATE INDEX idx_mcp_audit_logs_api_key ON mcp_audit_logs(api_key_id);
CREATE INDEX idx_mcp_audit_logs_created_at ON mcp_audit_logs(created_at DESC);
CREATE INDEX idx_mcp_audit_logs_status ON mcp_audit_logs(response_status);

-- Composite index for common audit queries
CREATE INDEX idx_mcp_audit_logs_org_time ON mcp_audit_logs(organization_id, created_at DESC);

-- ============================================================================
-- MCP Batch Jobs Table
-- Track batch PDF generation jobs
-- ============================================================================
CREATE TABLE mcp_batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Job Identification
  template_id UUID NOT NULL REFERENCES mcp_templates(id) ON DELETE RESTRICT,
  api_key_id UUID REFERENCES mcp_api_keys(id) ON DELETE SET NULL,

  -- Job Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'

  -- Job Configuration
  total_documents INTEGER NOT NULL,      -- Total documents to generate
  processed_count INTEGER DEFAULT 0,     -- Documents processed so far
  success_count INTEGER DEFAULT 0,       -- Successful generations
  failure_count INTEGER DEFAULT 0,       -- Failed generations

  -- Input/Output
  input_s3_key TEXT,                     -- S3 key for input data (CSV/JSON)
  output_s3_prefix TEXT,                 -- S3 prefix for generated PDFs
  output_archive_key TEXT,               -- S3 key for ZIP archive (if requested)

  -- Processing Options
  options JSONB DEFAULT '{}',            -- { format, compression, naming_pattern, etc. }

  -- Error Tracking
  errors JSONB DEFAULT '[]',             -- Array of { documentIndex, error, timestamp }

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,

  -- Audit Fields
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for MCP Batch Jobs
CREATE INDEX idx_mcp_batch_jobs_org_id ON mcp_batch_jobs(organization_id);
CREATE INDEX idx_mcp_batch_jobs_template ON mcp_batch_jobs(template_id);
CREATE INDEX idx_mcp_batch_jobs_status ON mcp_batch_jobs(status);
CREATE INDEX idx_mcp_batch_jobs_created_at ON mcp_batch_jobs(created_at DESC);

-- ============================================================================
-- MCP Rate Limit Tracking Table
-- Real-time rate limiting state
-- ============================================================================
CREATE TABLE mcp_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES mcp_api_keys(id) ON DELETE CASCADE,

  -- Minute-level tracking
  minute_window TIMESTAMPTZ NOT NULL,    -- Start of the minute window
  minute_count INTEGER DEFAULT 1,

  -- Day-level tracking
  day_window DATE NOT NULL,              -- Date for daily limit
  day_count INTEGER DEFAULT 1,

  -- Last request details
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  last_request_ip INET,

  UNIQUE(api_key_id, minute_window),
  UNIQUE(api_key_id, day_window)
);

-- Indexes for MCP Rate Limits
CREATE INDEX idx_mcp_rate_limits_key ON mcp_rate_limits(api_key_id);
CREATE INDEX idx_mcp_rate_limits_minute ON mcp_rate_limits(minute_window);
CREATE INDEX idx_mcp_rate_limits_day ON mcp_rate_limits(day_window);

-- ============================================================================
-- Trigger Functions
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION mcp_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER mcp_templates_updated_at
  BEFORE UPDATE ON mcp_templates
  FOR EACH ROW EXECUTE FUNCTION mcp_update_updated_at();

CREATE TRIGGER mcp_api_keys_updated_at
  BEFORE UPDATE ON mcp_api_keys
  FOR EACH ROW EXECUTE FUNCTION mcp_update_updated_at();

CREATE TRIGGER mcp_batch_jobs_updated_at
  BEFORE UPDATE ON mcp_batch_jobs
  FOR EACH ROW EXECUTE FUNCTION mcp_update_updated_at();

-- ============================================================================
-- Increment template fill count
-- ============================================================================
CREATE OR REPLACE FUNCTION mcp_increment_template_usage(p_template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE mcp_templates
  SET
    fill_count = fill_count + 1,
    last_used_at = NOW()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Reset daily rate limits (to be called by cron job)
-- ============================================================================
CREATE OR REPLACE FUNCTION mcp_reset_daily_rate_limits()
RETURNS void AS $$
BEGIN
  UPDATE mcp_api_keys
  SET
    requests_today = 0,
    requests_reset_at = NOW()
  WHERE requests_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Clean up old audit logs (retention policy)
-- ============================================================================
CREATE OR REPLACE FUNCTION mcp_cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mcp_audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on MCP tables
ALTER TABLE mcp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their organization's data
CREATE POLICY mcp_templates_org_isolation ON mcp_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
    OR is_public = true
  );

CREATE POLICY mcp_api_keys_org_isolation ON mcp_api_keys
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY mcp_audit_logs_org_isolation ON mcp_audit_logs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY mcp_batch_jobs_org_isolation ON mcp_batch_jobs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true)
    )
  );

-- ============================================================================
-- Sample Data for Development (optional - uncomment if needed)
-- ============================================================================

-- INSERT INTO mcp_templates (organization_id, name, name_he, category, s3_key, fields, language)
-- SELECT
--   id as organization_id,
--   'employment-contract' as name,
--   'חוזה העסקה' as name_he,
--   'hr' as category,
--   'templates/default/employment-contract.pdf' as s3_key,
--   '[
--     {"id": "employee_name", "name": "Employee Name", "name_he": "שם העובד", "type": "text", "required": true},
--     {"id": "id_number", "name": "ID Number", "name_he": "תעודת זהות", "type": "text", "required": true, "validation": "israeli_id"},
--     {"id": "start_date", "name": "Start Date", "name_he": "תאריך התחלה", "type": "date", "required": true},
--     {"id": "salary", "name": "Salary", "name_he": "שכר", "type": "number", "required": true}
--   ]'::jsonb as fields,
--   'he' as language
-- FROM organizations
-- LIMIT 1;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE mcp_templates IS 'PDF templates available through MCP connector for Cowork integration';
COMMENT ON TABLE mcp_api_keys IS 'API authentication keys for MCP connector access with rate limiting';
COMMENT ON TABLE mcp_audit_logs IS 'Comprehensive audit trail for all MCP operations - PII-safe';
COMMENT ON TABLE mcp_batch_jobs IS 'Batch PDF generation jobs for bulk processing';
COMMENT ON TABLE mcp_rate_limits IS 'Real-time rate limiting tracking per API key';

COMMENT ON COLUMN mcp_templates.fields IS 'Array of FieldDefinition: {id, name, name_he, type, x, y, width, height, page, required, validation, crmMapping}';
COMMENT ON COLUMN mcp_api_keys.key_hash IS 'bcrypt hash of API key - never store plaintext';
COMMENT ON COLUMN mcp_audit_logs.request_body_hash IS 'SHA-256 hash of request body - no PII stored';
