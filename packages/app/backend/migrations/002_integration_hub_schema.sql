-- ============================================================================
-- Migration 002: Integration Hub Schema
-- Description: Tables for ERP/CRM integration with field mapping
-- Use Case: Field agent forms - enrollment, changes, agreements
-- ============================================================================

-- ============================================================================
-- 1. CONNECTOR DEFINITIONS (Global Templates)
-- ============================================================================
-- System-wide connector templates (e.g., "Priority ERP", "SAP B1")
-- Created by admins, available to all organizations

CREATE TABLE connector_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  slug TEXT NOT NULL UNIQUE,                    -- "priority-cloud", "sap-b1"
  name TEXT NOT NULL,                           -- "Priority Cloud"
  description TEXT,
  icon_url TEXT,
  documentation_url TEXT,

  -- Categorization
  category TEXT NOT NULL DEFAULT 'erp',         -- 'erp', 'crm', 'accounting', 'custom'
  vendor TEXT,                                  -- "Priority Software", "SAP"

  -- Configuration Schema (JSON Schema format)
  config_schema JSONB NOT NULL DEFAULT '{}',    -- What settings user must provide
  auth_schema JSONB NOT NULL DEFAULT '{}',      -- Auth method requirements

  -- Capabilities
  supports_pull BOOLEAN DEFAULT true,           -- Can fetch data FROM system
  supports_push BOOLEAN DEFAULT true,           -- Can send data TO system
  supports_webhook BOOLEAN DEFAULT false,       -- Can receive webhooks FROM system
  supports_batch BOOLEAN DEFAULT false,         -- Can handle batch operations
  supports_hebrew BOOLEAN DEFAULT true,         -- Hebrew text support

  -- Rate Limiting Defaults
  default_rate_limit_requests INT DEFAULT 100,  -- Requests per window
  default_rate_limit_window_seconds INT DEFAULT 60,
  default_timeout_ms INT DEFAULT 30000,         -- 30 seconds

  -- Endpoint Templates
  endpoints JSONB NOT NULL DEFAULT '{}',        -- Named endpoint templates

  -- Encoding
  field_encoding TEXT DEFAULT 'utf-8',          -- Some legacy ERPs use ISO-8859-8

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_beta BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connector_defs_slug ON connector_definitions(slug);
CREATE INDEX idx_connector_defs_category ON connector_definitions(category);
CREATE INDEX idx_connector_defs_active ON connector_definitions(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_connector_definitions_updated_at
BEFORE UPDATE ON connector_definitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. CONNECTORS (Organization Instances)
-- ============================================================================
-- When an org configures a connector, they create an instance

CREATE TABLE connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES connector_definitions(id) ON DELETE RESTRICT,

  -- Instance Configuration
  name TEXT NOT NULL,                           -- User-friendly name "Production Priority"
  config JSONB NOT NULL DEFAULT '{}',           -- Instance-specific config (base URL, company, etc.)

  -- Rate Limiting (Override defaults)
  rate_limit_requests INT,                      -- NULL = use default
  rate_limit_window_seconds INT,
  timeout_ms INT,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  health_status TEXT DEFAULT 'unknown',         -- 'healthy', 'degraded', 'unhealthy', 'unknown'
  last_health_check_at TIMESTAMPTZ,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  -- NOTE: Cannot use UNIQUE constraint with WHERE clause in PostgreSQL
  -- Using partial unique index instead (see idx_connectors_org_name_active below)
  CONSTRAINT chk_health_status CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown'))
);

CREATE INDEX idx_connectors_org ON connectors(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_connectors_definition ON connectors(definition_id);
CREATE INDEX idx_connectors_health ON connectors(health_status) WHERE deleted_at IS NULL;
-- Partial unique index to allow reusing connector names after soft delete
CREATE UNIQUE INDEX idx_connectors_org_name_active ON connectors(organization_id, name) WHERE deleted_at IS NULL;

CREATE TRIGGER update_connectors_updated_at
BEFORE UPDATE ON connectors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. CONNECTOR CREDENTIALS (Encrypted)
-- ============================================================================
-- Stored separately for security, encrypted at rest with AES-256

CREATE TABLE connector_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Credential Type
  auth_type TEXT NOT NULL,                      -- 'oauth2', 'api_key', 'basic', 'session', 'custom'

  -- Encrypted Storage (AES-256-GCM)
  -- Key stored in environment variable: INTEGRATION_ENCRYPTION_KEY
  credentials_encrypted BYTEA NOT NULL,         -- Encrypted JSON blob
  encryption_key_version INT NOT NULL DEFAULT 1,-- For key rotation

  -- OAuth2 Specific (encrypted separately for refresh without full decrypt)
  oauth_access_token_encrypted BYTEA,
  oauth_refresh_token_encrypted BYTEA,
  oauth_expires_at TIMESTAMPTZ,
  oauth_token_url TEXT,

  -- Session-based (SAP B1)
  session_cookie_encrypted BYTEA,
  session_expires_at TIMESTAMPTZ,

  -- Metadata
  last_used_at TIMESTAMPTZ,
  last_rotated_at TIMESTAMPTZ,
  rotation_reminder_sent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_connector_credentials UNIQUE (connector_id),
  CONSTRAINT chk_auth_type CHECK (auth_type IN ('oauth2', 'api_key', 'basic', 'session', 'custom'))
);

CREATE INDEX idx_connector_creds_connector ON connector_credentials(connector_id);
CREATE INDEX idx_connector_creds_oauth_expiry ON connector_credentials(oauth_expires_at)
  WHERE oauth_expires_at IS NOT NULL;

CREATE TRIGGER update_connector_credentials_updated_at
BEFORE UPDATE ON connector_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. FIELD MAPPINGS
-- ============================================================================
-- Maps form fields to connector fields (per form, per connector)

CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Mapping Identification
  name TEXT NOT NULL,
  description TEXT,
  direction TEXT NOT NULL,                      -- 'pull', 'push', 'bidirectional'

  -- Mapping Rules (Array of field mappings)
  mappings JSONB NOT NULL DEFAULT '[]',
  -- Example:
  -- [
  --   {
  --     "formField": "customer_name",
  --     "connectorField": "CUSTDES",
  --     "transforms": [{"type": "trim"}],
  --     "required": true,
  --     "defaultValue": null
  --   }
  -- ]

  -- Pull Configuration (ERP → Form)
  pull_trigger TEXT DEFAULT 'manual',           -- 'on_load', 'on_field_change', 'manual'
  pull_trigger_field TEXT,                      -- Form field that triggers pull (for on_field_change)
  pull_endpoint TEXT,                           -- Named endpoint from connector definition
  pull_query_template JSONB,                    -- Query parameters template with placeholders
  pull_cache_ttl_minutes INT DEFAULT 60,        -- Cache duration

  -- Push Configuration (Form → ERP)
  push_trigger TEXT DEFAULT 'manual',           -- 'on_submit', 'on_approve', 'manual'
  push_endpoint TEXT,
  push_format TEXT DEFAULT 'json',              -- 'json', 'xml', 'form-data'
  push_include_pdf BOOLEAN DEFAULT false,       -- Include signed PDF in push
  push_success_condition TEXT,                  -- JSONPath to check success in response

  -- Status
  is_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT uq_field_mappings UNIQUE (form_id, connector_id, direction),
  CONSTRAINT chk_direction CHECK (direction IN ('pull', 'push', 'bidirectional')),
  CONSTRAINT chk_pull_trigger CHECK (pull_trigger IN ('on_load', 'on_field_change', 'manual')),
  CONSTRAINT chk_push_trigger CHECK (push_trigger IN ('on_submit', 'on_approve', 'manual')),
  CONSTRAINT chk_push_format CHECK (push_format IN ('json', 'xml', 'form-data'))
);

CREATE INDEX idx_field_mappings_org ON field_mappings(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_field_mappings_form ON field_mappings(form_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_field_mappings_connector ON field_mappings(connector_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_field_mappings_enabled ON field_mappings(is_enabled) WHERE deleted_at IS NULL AND is_enabled = true;

CREATE TRIGGER update_field_mappings_updated_at
BEFORE UPDATE ON field_mappings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. INTEGRATION JOBS (Async Operations Tracking)
-- ============================================================================

CREATE TABLE integration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Job Context
  job_type TEXT NOT NULL,                       -- 'pull', 'push', 'health_check'
  direction TEXT NOT NULL,                      -- 'inbound', 'outbound'

  -- Related Entities
  form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  mapping_id UUID REFERENCES field_mappings(id) ON DELETE SET NULL,

  -- Ephemeral Data Reference (Redis key - data NOT stored here)
  redis_key TEXT,
  redis_expires_at TIMESTAMPTZ,

  -- Idempotency
  idempotency_key TEXT,                         -- Client-provided key to prevent duplicates

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending', 'processing', 'completed', 'failed', 'dead_letter'
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,

  -- Progress
  progress_percent INT DEFAULT 0,
  progress_message TEXT,

  -- Result (metadata only, no PII)
  result_record_id TEXT,                        -- ID of created/updated record in ERP
  result_metadata JSONB,                        -- Non-sensitive metadata

  -- Error Handling
  last_error TEXT,
  error_code TEXT,                              -- Classified error code
  error_details JSONB,                          -- Non-sensitive error context
  is_retryable BOOLEAN DEFAULT true,

  -- Timing
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_job_type CHECK (job_type IN ('pull', 'push', 'health_check')),
  CONSTRAINT chk_job_direction CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT chk_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter'))
);

CREATE INDEX idx_integration_jobs_org ON integration_jobs(organization_id);
CREATE INDEX idx_integration_jobs_status ON integration_jobs(status)
  WHERE status IN ('pending', 'processing');
CREATE INDEX idx_integration_jobs_connector ON integration_jobs(connector_id);
CREATE INDEX idx_integration_jobs_submission ON integration_jobs(submission_id)
  WHERE submission_id IS NOT NULL;
CREATE INDEX idx_integration_jobs_next_retry ON integration_jobs(next_retry_at)
  WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_integration_jobs_idempotency ON integration_jobs(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_integration_jobs_created ON integration_jobs(created_at DESC);
CREATE INDEX idx_integration_jobs_dead_letter ON integration_jobs(status, created_at)
  WHERE status = 'dead_letter';

CREATE TRIGGER update_integration_jobs_updated_at
BEFORE UPDATE ON integration_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. SYNC LOGS (Audit Trail - NO PII)
-- ============================================================================

CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  job_id UUID REFERENCES integration_jobs(id) ON DELETE SET NULL,

  -- Log Entry
  action TEXT NOT NULL,                         -- 'pull.started', 'push.completed', 'credential.accessed', etc.
  severity TEXT DEFAULT 'info',                 -- 'debug', 'info', 'warn', 'error'
  message TEXT NOT NULL,

  -- Context (NO PII - only IDs and counts)
  context JSONB DEFAULT '{}',
  -- Example: { "formId": "...", "submissionId": "...", "recordCount": 5 }

  -- Performance Metrics
  duration_ms INT,
  records_processed INT,
  bytes_transferred INT,

  -- Request Details (non-sensitive)
  endpoint TEXT,
  http_status INT,

  -- Actor
  triggered_by TEXT,                            -- 'user', 'system', 'webhook', 'scheduler'
  user_id UUID,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_org ON sync_logs(organization_id);
CREATE INDEX idx_sync_logs_connector ON sync_logs(connector_id);
CREATE INDEX idx_sync_logs_job ON sync_logs(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_sync_logs_action ON sync_logs(action);
CREATE INDEX idx_sync_logs_severity ON sync_logs(severity) WHERE severity IN ('warn', 'error');
CREATE INDEX idx_sync_logs_created ON sync_logs(created_at DESC);

-- Partition by month for large-scale deployments (optional)
-- CREATE TABLE sync_logs_2026_01 PARTITION OF sync_logs
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ============================================================================
-- 7. INBOUND WEBHOOKS (Receiving webhooks FROM external systems)
-- ============================================================================
-- SECURITY: Uses unique token instead of orgId in URL

CREATE TABLE inbound_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Secure Endpoint (token-based, NOT orgId-based)
  webhook_token TEXT NOT NULL UNIQUE,           -- Unique token for URL: /webhooks/inbound/{token}

  -- Signature Verification
  signature_secret TEXT NOT NULL,               -- HMAC secret for payload verification
  signature_header TEXT DEFAULT 'X-Signature',  -- Header name containing signature
  signature_algorithm TEXT DEFAULT 'sha256',    -- 'sha256', 'sha1'

  -- Event Handling
  event_types TEXT[] NOT NULL,                  -- Which events to accept
  mapping_id UUID REFERENCES field_mappings(id) ON DELETE SET NULL,

  -- Processing
  transform_template JSONB,                     -- Transform incoming payload to standard format

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  last_received_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  received_count INT DEFAULT 0,
  error_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_inbound_webhooks_org ON inbound_webhooks(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inbound_webhooks_token ON inbound_webhooks(webhook_token) WHERE deleted_at IS NULL;
CREATE INDEX idx_inbound_webhooks_connector ON inbound_webhooks(connector_id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_inbound_webhooks_updated_at
BEFORE UPDATE ON inbound_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. RATE LIMIT TRACKING
-- ============================================================================

CREATE TABLE rate_limit_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,

  -- Window
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  -- Counts
  request_count INT DEFAULT 0,
  max_requests INT NOT NULL,

  -- Status
  is_exceeded BOOLEAN DEFAULT false,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_rate_limit_window UNIQUE (connector_id, window_start)
);

CREATE INDEX idx_rate_limits_connector ON rate_limit_windows(connector_id);
CREATE INDEX idx_rate_limits_window ON rate_limit_windows(window_start, window_end);
CREATE INDEX idx_rate_limits_exceeded ON rate_limit_windows(is_exceeded) WHERE is_exceeded = true;

-- Cleanup old windows (keep last 24 hours)
-- Run daily: DELETE FROM rate_limit_windows WHERE window_end < NOW() - INTERVAL '24 hours';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate secure webhook token
CREATE OR REPLACE FUNCTION generate_webhook_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to generate signature secret
CREATE OR REPLACE FUNCTION generate_signature_secret()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(64), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA: Connector Definitions
-- ============================================================================

-- Priority Cloud
INSERT INTO connector_definitions (
  slug, name, description, category, vendor,
  config_schema, auth_schema, endpoints,
  default_rate_limit_requests, default_rate_limit_window_seconds,
  supports_hebrew
) VALUES (
  'priority-cloud',
  'Priority Cloud',
  'Integration with Priority ERP Cloud (REST API)',
  'erp',
  'Priority Software',
  '{
    "type": "object",
    "required": ["baseUrl", "company"],
    "properties": {
      "baseUrl": {
        "type": "string",
        "title": "Priority Server URL",
        "format": "uri"
      },
      "company": {
        "type": "string",
        "title": "Company Code"
      },
      "environment": {
        "type": "string",
        "title": "Environment",
        "enum": ["production", "test"],
        "default": "production"
      }
    }
  }'::JSONB,
  '{
    "type": "basic",
    "fields": {
      "username": {"title": "Priority Username", "type": "string"},
      "password": {"title": "Priority Password", "type": "string", "format": "password"}
    }
  }'::JSONB,
  '{
    "getCustomer": {
      "path": "/odata/Priority/{company}/CUSTOMERS(''{customerId}'')",
      "method": "GET",
      "description": "Get customer by ID"
    },
    "searchCustomers": {
      "path": "/odata/Priority/{company}/CUSTOMERS",
      "method": "GET",
      "description": "Search customers"
    },
    "createOrder": {
      "path": "/odata/Priority/{company}/ORDERS",
      "method": "POST",
      "description": "Create new order"
    }
  }'::JSONB,
  100,  -- 100 requests
  60,   -- per 60 seconds
  true
);

-- Priority On-Premise
INSERT INTO connector_definitions (
  slug, name, description, category, vendor,
  config_schema, auth_schema, endpoints,
  default_rate_limit_requests, default_rate_limit_window_seconds,
  supports_hebrew, field_encoding
) VALUES (
  'priority-onpremise',
  'Priority On-Premise',
  'Integration with Priority ERP On-Premise (OData)',
  'erp',
  'Priority Software',
  '{
    "type": "object",
    "required": ["baseUrl", "company", "environment"],
    "properties": {
      "baseUrl": {
        "type": "string",
        "title": "Priority Server URL",
        "format": "uri"
      },
      "company": {
        "type": "string",
        "title": "Company Code"
      },
      "environment": {
        "type": "string",
        "title": "Environment File",
        "description": "e.g., tabula.ini"
      }
    }
  }'::JSONB,
  '{
    "type": "basic",
    "fields": {
      "username": {"title": "Priority Username", "type": "string"},
      "password": {"title": "Priority Password", "type": "string", "format": "password"}
    }
  }'::JSONB,
  '{
    "getCustomer": {
      "path": "/odata/Priority/{environment}/{company}/CUSTOMERS(''{customerId}'')",
      "method": "GET"
    },
    "searchCustomers": {
      "path": "/odata/Priority/{environment}/{company}/CUSTOMERS",
      "method": "GET"
    }
  }'::JSONB,
  100,
  60,
  true,
  'utf-8'
);

-- SAP Business One
INSERT INTO connector_definitions (
  slug, name, description, category, vendor,
  config_schema, auth_schema, endpoints,
  default_rate_limit_requests, default_rate_limit_window_seconds,
  default_timeout_ms, supports_hebrew
) VALUES (
  'sap-b1',
  'SAP Business One',
  'Integration with SAP Business One Service Layer',
  'erp',
  'SAP',
  '{
    "type": "object",
    "required": ["serviceLayerUrl", "companyDB"],
    "properties": {
      "serviceLayerUrl": {
        "type": "string",
        "title": "Service Layer URL",
        "format": "uri"
      },
      "companyDB": {
        "type": "string",
        "title": "Company Database Name"
      },
      "sslValidation": {
        "type": "boolean",
        "title": "Validate SSL Certificate",
        "default": true
      }
    }
  }'::JSONB,
  '{
    "type": "session",
    "loginEndpoint": "/b1s/v2/Login",
    "logoutEndpoint": "/b1s/v2/Logout",
    "sessionCookies": ["B1SESSION", "ROUTEID"],
    "fields": {
      "username": {"title": "SAP B1 Username", "type": "string"},
      "password": {"title": "SAP B1 Password", "type": "string", "format": "password"}
    }
  }'::JSONB,
  '{
    "getBusinessPartner": {
      "path": "/b1s/v2/BusinessPartners(''{cardCode}'')",
      "method": "GET"
    },
    "searchBusinessPartners": {
      "path": "/b1s/v2/BusinessPartners",
      "method": "GET"
    },
    "createSalesOrder": {
      "path": "/b1s/v2/Orders",
      "method": "POST"
    }
  }'::JSONB,
  1000,   -- Higher limit for SAP
  60,
  60000,  -- 60 second timeout (SAP can be slow)
  true
);

-- Hashavshevet
INSERT INTO connector_definitions (
  slug, name, description, category, vendor,
  config_schema, auth_schema, endpoints,
  supports_hebrew, is_beta
) VALUES (
  'hashavshevet',
  'Hashavshevet',
  'Integration with Hashavshevet accounting system',
  'accounting',
  'Hilan',
  '{
    "type": "object",
    "required": ["baseUrl"],
    "properties": {
      "baseUrl": {
        "type": "string",
        "title": "API URL",
        "format": "uri"
      },
      "companyId": {
        "type": "string",
        "title": "Company ID"
      }
    }
  }'::JSONB,
  '{
    "type": "api_key",
    "fields": {
      "apiKey": {"title": "API Key", "type": "string", "format": "password"}
    },
    "headerName": "Authorization",
    "prefix": "Bearer "
  }'::JSONB,
  '{}'::JSONB,
  true,
  true  -- Beta until we get full API documentation
);

-- Generic REST
INSERT INTO connector_definitions (
  slug, name, description, category,
  config_schema, auth_schema, endpoints,
  supports_hebrew
) VALUES (
  'generic-rest',
  'Generic REST API',
  'Connect to any REST API with custom configuration',
  'custom',
  '{
    "type": "object",
    "required": ["baseUrl"],
    "properties": {
      "baseUrl": {
        "type": "string",
        "title": "API Base URL",
        "format": "uri"
      },
      "defaultHeaders": {
        "type": "object",
        "title": "Default Headers",
        "additionalProperties": {"type": "string"}
      },
      "timeout": {
        "type": "integer",
        "title": "Request Timeout (ms)",
        "default": 30000
      }
    }
  }'::JSONB,
  '{
    "type": "api_key",
    "fields": {
      "apiKey": {"title": "API Key", "type": "string", "format": "password"}
    },
    "headerName": "Authorization",
    "prefix": "Bearer "
  }'::JSONB,
  '{
    "customGet": {
      "path": "/{path}",
      "method": "GET"
    },
    "customPost": {
      "path": "/{path}",
      "method": "POST"
    }
  }'::JSONB,
  true
);
```
