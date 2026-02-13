-- ================================================================
-- Migration: 009_event_trigger_system.sql
-- Purpose: Create Event Trigger System tables
-- Created: 2026-02-13
-- Related: ADR-006, Event-Trigger-System-PRD.md
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- ENUM TYPES
-- ================================================================

-- Trigger level (3-tier system)
CREATE TYPE trigger_level AS ENUM (
  'platform',       -- Super Admin - tenant lifecycle, billing, usage
  'organization',   -- Admin - user events, settings, integrations
  'user_defined'    -- Admin/User - form events, custom triggers
);

-- Trigger scope for user-defined triggers
CREATE TYPE trigger_scope AS ENUM (
  'all_forms',       -- Apply to all forms in organization
  'specific_form',   -- Apply to one specific form
  'multiple_forms'   -- Apply to selected forms
);

-- Action execution mode (sequential or parallel)
CREATE TYPE action_execution_mode AS ENUM (
  'sequential',  -- Execute one after another (default)
  'parallel'     -- Execute concurrently
);

-- Integration type
CREATE TYPE integration_type AS ENUM (
  'crm',        -- CRM systems (Salesforce, HubSpot, etc.)
  'erp',        -- ERP systems (Priority, SAP, etc.)
  'calendar',   -- Calendar systems (Google Calendar, Outlook)
  'messaging',  -- Messaging platforms (Slack, Teams)
  'custom'      -- Custom webhook/API integration
);

-- Error handling strategy
CREATE TYPE error_handling_strategy AS ENUM (
  'stop_on_first_error',  -- Stop chain on first failure (default)
  'continue_on_error',    -- Continue to next action, log error
  'rollback_on_error',    -- Attempt to undo completed actions
  'skip_failed_action'    -- Skip failed, continue with dependency check
);

-- Action execution status
CREATE TYPE action_execution_status AS ENUM (
  'pending',      -- Queued for execution
  'running',      -- Currently executing
  'completed',    -- Successfully completed
  'failed',       -- Failed (will retry or go to DLQ)
  'compensated'   -- Rolled back via compensating transaction
);

-- ================================================================
-- EVENTS TABLE (Event Log) - WITH PARTITIONING
-- ================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event classification
  level trigger_level NOT NULL,
  event_type VARCHAR(100) NOT NULL,  -- 'form.submitted', 'user.registered', etc.

  -- Event source
  source_type VARCHAR(50) NOT NULL,  -- 'form', 'user', 'workflow', 'system', etc.
  source_id UUID,                    -- ID of the source entity

  -- Event data
  data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Deduplication
  deduplication_key VARCHAR(255),  -- Optional key for event deduplication
  UNIQUE (organization_id, deduplication_key) WHERE deduplication_key IS NOT NULL,

  -- Processing mode
  processing_mode VARCHAR(20) DEFAULT 'realtime',  -- 'realtime' | 'poll' | 'batch'
  retry_at TIMESTAMPTZ,  -- When to retry if in polling mode

  -- Timestamp
  occurred_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (occurred_at);

-- Create indexes on main table
CREATE INDEX idx_events_org_type ON events(organization_id, event_type);
CREATE INDEX idx_events_level ON events(level);
CREATE INDEX idx_events_occurred ON events(occurred_at DESC);
CREATE INDEX idx_events_processing ON events(processing_mode, retry_at)
  WHERE processing_mode != 'realtime';

-- Create monthly partitions for current year
CREATE TABLE events_2026_02 PARTITION OF events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE events_2026_03 PARTITION OF events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE events_2026_04 PARTITION OF events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE events_2026_05 PARTITION OF events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE events_2026_06 PARTITION OF events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE events_2026_07 PARTITION OF events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE events_2026_08 PARTITION OF events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE events_2026_09 PARTITION OF events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE events_2026_10 PARTITION OF events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE events_2026_11 PARTITION OF events
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE events_2026_12 PARTITION OF events
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Note: Future partitions should be created monthly via scheduled job
-- Retention: Drop partitions older than 90 days

-- ================================================================
-- EVENT TRIGGERS TABLE
-- ================================================================

CREATE TABLE event_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Trigger classification
  level trigger_level NOT NULL,
  event_type VARCHAR(100) NOT NULL,  -- 'form.submitted', 'user.registered', etc.
  status VARCHAR(50) DEFAULT 'active',  -- 'active', 'paused', 'orphaned', 'error'

  -- Scope (for user-defined triggers)
  scope trigger_scope DEFAULT 'all_forms',
  form_ids UUID[] DEFAULT '{}',  -- Array of form IDs (for specific_form/multiple_forms)

  -- Conditions (JSONB array of condition objects)
  conditions JSONB DEFAULT '[]',
  -- Example: [{"field": "data.amount", "operator": "gt", "value": 1000}]

  -- Execution control
  priority INTEGER DEFAULT 0,  -- Lower number = higher priority
  cooldown_ms INTEGER,  -- Minimum time between executions (ms)
  deduplication_window_ms INTEGER,  -- Deduplication window (ms)
  rate_limit_per_minute INTEGER DEFAULT 60,

  -- Error handling
  error_handling error_handling_strategy DEFAULT 'stop_on_first_error',

  -- Template & defaults
  is_default BOOLEAN DEFAULT false,  -- Default trigger for new organizations
  template_id VARCHAR(100),  -- Template identifier (e.g., 'welcome-email')

  -- Orphan tracking (when form is deleted)
  orphaned_reason TEXT,
  orphaned_at TIMESTAMPTZ,

  -- Version control
  version INTEGER DEFAULT 1,

  -- Metadata
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Execution stats
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_trigger_name UNIQUE (organization_id, name)
);

-- Indexes
CREATE INDEX idx_triggers_org ON event_triggers(organization_id);
CREATE INDEX idx_triggers_level ON event_triggers(level);
CREATE INDEX idx_triggers_event_type ON event_triggers(event_type);
CREATE INDEX idx_triggers_form_ids ON event_triggers USING GIN (form_ids);
CREATE INDEX idx_triggers_status ON event_triggers(status) WHERE status = 'active';

-- ================================================================
-- TRIGGER VERSIONS TABLE (Version History)
-- ================================================================

CREATE TABLE trigger_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- Full snapshot of trigger configuration
  snapshot JSONB NOT NULL,
  change_summary TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (trigger_id, version)
);

-- Indexes
CREATE INDEX idx_trigger_versions ON trigger_versions(trigger_id, version DESC);

-- ================================================================
-- TRIGGER ACTIONS TABLE (Action Chain)
-- ================================================================

CREATE TABLE trigger_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,

  -- Action configuration
  action_type VARCHAR(50) NOT NULL,  -- 'send_email', 'sync_to_crm', etc.
  action_config JSONB NOT NULL DEFAULT '{}',

  -- Execution order & mode
  execution_order INTEGER NOT NULL,  -- Order in the chain (1, 2, 3, ...)
  execution_mode action_execution_mode DEFAULT 'sequential',
  parallel_group INTEGER,  -- Actions with same group number execute in parallel

  -- Conditions (optional - action-level conditions)
  conditions JSONB DEFAULT '[]',

  -- Compensating transaction config
  compensatable BOOLEAN DEFAULT false,
  compensate_action_config JSONB,  -- Config for rollback action

  -- Retry policy
  max_retries INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 30000,  -- 30 seconds
  backoff_multiplier DECIMAL(3,2) DEFAULT 2.0,  -- Exponential backoff
  timeout_ms INTEGER DEFAULT 30000,  -- Action timeout

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trigger_actions_trigger ON trigger_actions(trigger_id);
CREATE INDEX idx_trigger_actions_order ON trigger_actions(trigger_id, execution_order);

-- ================================================================
-- ACTION EXECUTIONS TABLE (Audit Trail) - WITH PARTITIONING
-- ================================================================

CREATE TABLE action_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,  -- References events(id) - removed FK for partitioning
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES trigger_actions(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Execution status
  status action_execution_status DEFAULT 'pending',
  attempt_number INTEGER DEFAULT 1,

  -- Data
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  error_details JSONB,

  -- Compensation tracking
  compensated_at TIMESTAMPTZ,
  compensate_result JSONB,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Indexes
CREATE INDEX idx_executions_event ON action_executions(event_id);
CREATE INDEX idx_executions_trigger ON action_executions(trigger_id);
CREATE INDEX idx_executions_action ON action_executions(action_id);
CREATE INDEX idx_executions_status ON action_executions(status);
CREATE INDEX idx_executions_created ON action_executions(created_at DESC);

-- Create monthly partitions (30-day retention)
CREATE TABLE action_executions_2026_02 PARTITION OF action_executions
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE action_executions_2026_03 PARTITION OF action_executions
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Note: Shorter retention than events (30 days vs 90 days)

-- ================================================================
-- DEAD LETTER QUEUE TABLE
-- ================================================================

CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Original event/action info
  event_id UUID NOT NULL,  -- Reference to events(id)
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES trigger_actions(id) ON DELETE CASCADE,

  -- Failure details
  failure_reason VARCHAR(50) NOT NULL,  -- 'max_retries', 'timeout', 'permanent_error'
  error_code VARCHAR(50),
  error_message TEXT,
  error_details JSONB,

  -- Original payload for replay
  original_payload JSONB NOT NULL,

  -- Resolution tracking
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'resolved', 'ignored', 'replayed'
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Metadata
  attempts_made INTEGER NOT NULL,
  first_failure_at TIMESTAMPTZ NOT NULL,
  last_failure_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dlq_org_status ON dead_letter_queue(organization_id, status);
CREATE INDEX idx_dlq_created ON dead_letter_queue(created_at DESC);

-- ================================================================
-- INTEGRATIONS TABLE (CRM/ERP Connections)
-- ================================================================

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Integration type
  type integration_type NOT NULL,
  provider VARCHAR(50) NOT NULL,  -- 'salesforce', 'hubspot', 'priority', 'sap', etc.
  name VARCHAR(255) NOT NULL,

  -- Encrypted configuration
  config_encrypted TEXT NOT NULL,  -- AES-256-GCM encrypted JSON
  encryption_key_id VARCHAR(100),  -- Reference to key in KMS

  -- Status
  status VARCHAR(50) DEFAULT 'active',  -- 'active', 'paused', 'error', 'expired'
  health_status VARCHAR(50) DEFAULT 'unknown',  -- 'healthy', 'degraded', 'error', 'schema_changed'

  -- OAuth credentials (encrypted)
  oauth_access_token_encrypted TEXT,
  oauth_refresh_token_encrypted TEXT,
  oauth_expires_at TIMESTAMPTZ,

  -- Schema tracking (for CRM/ERP)
  schema_snapshot JSONB,
  schema_checked_at TIMESTAMPTZ,

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_integration_name UNIQUE (organization_id, name)
);

-- Indexes
CREATE INDEX idx_integrations_org ON integrations(organization_id);
CREATE INDEX idx_integrations_type ON integrations(type, provider);
CREATE INDEX idx_integrations_health ON integrations(health_status) WHERE health_status != 'healthy';

-- ================================================================
-- SCHEDULED TRIGGERS TABLE (CRON-based)
-- ================================================================

CREATE TABLE scheduled_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,

  -- Schedule configuration
  cron_expression VARCHAR(100) NOT NULL,  -- '0 9 * * 1' = Every Monday at 9:00
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jerusalem',

  -- Next/last run tracking
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,

  -- Control
  is_paused BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_scheduled_next_run ON scheduled_triggers(next_run_at) WHERE is_paused = false;

-- ================================================================
-- TIME-DELAYED TRIGGERS TABLE
-- ================================================================

CREATE TABLE delayed_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,
  base_event_id UUID NOT NULL,  -- Event that initiated the delay

  -- Execution time
  scheduled_at TIMESTAMPTZ NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'executed', 'cancelled'
  executed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_delayed_scheduled ON delayed_triggers(scheduled_at) WHERE status = 'pending';

-- ================================================================
-- SYSTEM TRIGGER REGISTRY (Seed Data for System Events)
-- ================================================================

CREATE TABLE system_trigger_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL UNIQUE,
  level trigger_level NOT NULL,

  -- Display names
  event_name_en VARCHAR(100) NOT NULL,
  event_name_he VARCHAR(100) NOT NULL,
  description_en TEXT,
  description_he TEXT,

  -- Categorization
  category VARCHAR(50) NOT NULL,  -- 'platform', 'user', 'form', 'workflow', etc.

  -- Schema
  payload_schema JSONB NOT NULL,  -- JSON Schema for event data
  default_actions JSONB DEFAULT '[]',  -- Suggested default actions

  -- Configurability
  is_configurable BOOLEAN DEFAULT true,  -- Can users create triggers for this event?

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TRIGGERS (Auto-update timestamps)
-- ================================================================

-- Auto-update updated_at for event_triggers
CREATE OR REPLACE FUNCTION update_event_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_triggers_updated_at
BEFORE UPDATE ON event_triggers
FOR EACH ROW
EXECUTE FUNCTION update_event_triggers_updated_at();

-- Auto-update updated_at for trigger_actions
CREATE OR REPLACE FUNCTION update_trigger_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actions_updated_at
BEFORE UPDATE ON trigger_actions
FOR EACH ROW
EXECUTE FUNCTION update_trigger_actions_updated_at();

-- Auto-update updated_at for integrations
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integrations_updated_at
BEFORE UPDATE ON integrations
FOR EACH ROW
EXECUTE FUNCTION update_integrations_updated_at();

-- Handle form deletion (mark triggers as orphaned)
CREATE OR REPLACE FUNCTION handle_form_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark triggers referencing deleted form as orphaned
  UPDATE event_triggers
  SET status = 'orphaned',
      orphaned_reason = 'Form deleted: ' || OLD.id,
      orphaned_at = NOW()
  WHERE OLD.id = ANY(form_ids);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_form_delete
BEFORE DELETE ON forms
FOR EACH ROW
EXECUTE FUNCTION handle_form_deletion();

-- ================================================================
-- SEED DATA - System Trigger Registry
-- ================================================================

-- Platform-level events
INSERT INTO system_trigger_registry (event_type, level, event_name_en, event_name_he, description_en, description_he, category, payload_schema, is_configurable) VALUES
('platform.tenant.created', 'platform', 'Tenant Created', 'דייר חדש נוצר', 'New organization registered', 'ארגון חדש נרשם לפלטפורמה', 'platform', '{"type": "object", "properties": {"tenantId": {"type": "string"}, "planType": {"type": "string"}}}', false),
('platform.tenant.trial_ending', 'platform', 'Trial Ending', 'תקופת ניסיון מסתיימת', 'Trial period ending in 3 days', '3 ימים לפני סיום Trial', 'platform', '{"type": "object", "properties": {"tenantId": {"type": "string"}, "daysRemaining": {"type": "number"}}}', false),
('platform.tenant.suspended', 'platform', 'Tenant Suspended', 'דייר הושעה', 'Tenant account suspended', 'חשבון הושעה (אי-תשלום וכו)', 'platform', '{"type": "object", "properties": {"tenantId": {"type": "string"}, "reason": {"type": "string"}}}', false),
('platform.billing.payment_failed', 'platform', 'Payment Failed', 'תשלום נכשל', 'Payment transaction failed', 'תשלום לא עבר', 'platform', '{"type": "object", "properties": {"tenantId": {"type": "string"}, "amount": {"type": "number"}}}', false);

-- Organization-level events
INSERT INTO system_trigger_registry (event_type, level, event_name_en, event_name_he, description_en, description_he, category, payload_schema, is_configurable) VALUES
('org.user.registered', 'organization', 'User Registered', 'משתמש נרשם', 'New user registered', 'משתמש חדש נרשם', 'user', '{"type": "object", "properties": {"userId": {"type": "string"}, "email": {"type": "string"}}}', true),
('org.user.login_failed', 'organization', 'Login Failed', 'כניסה נכשלה', '3 failed login attempts', '3 ניסיונות כניסה כושלים', 'user', '{"type": "object", "properties": {"userId": {"type": "string"}, "attempts": {"type": "number"}}}', true),
('org.settings_updated', 'organization', 'Settings Updated', 'הגדרות עודכנו', 'Organization settings changed', 'הגדרות משתנות', 'settings', '{"type": "object", "properties": {"changedBy": {"type": "string"}, "changes": {"type": "object"}}}', true);

-- User-defined events (form-related)
INSERT INTO system_trigger_registry (event_type, level, event_name_en, event_name_he, description_en, description_he, category, payload_schema, is_configurable) VALUES
('form.submitted', 'user_defined', 'Form Submitted', 'טופס הוגש', 'Form submission received', 'טופס הוגש', 'form', '{"type": "object", "properties": {"formId": {"type": "string"}, "submissionId": {"type": "string"}, "data": {"type": "object"}}}', true),
('form.opened', 'user_defined', 'Form Opened', 'טופס נפתח', 'Form viewed by user', 'טופס נפתח', 'form', '{"type": "object", "properties": {"formId": {"type": "string"}, "userId": {"type": "string"}}}', true),
('form.opened_not_submitted', 'user_defined', 'Form Abandoned', 'טופס ננטש', 'Form opened but not submitted', 'טופס נפתח אך לא הוגש', 'form', '{"type": "object", "properties": {"formId": {"type": "string"}, "timeoutMinutes": {"type": "number"}}}', true),
('task.assigned', 'user_defined', 'Task Assigned', 'משימה הוקצתה', 'Task assigned to user', 'משימה מוקצית', 'task', '{"type": "object", "properties": {"taskId": {"type": "string"}, "assigneeId": {"type": "string"}}}', true),
('task.overdue', 'user_defined', 'Task Overdue', 'משימה באיחור', 'Task past due date', 'משימה עברה את מועד היעד', 'task', '{"type": "object", "properties": {"taskId": {"type": "string"}, "daysOverdue": {"type": "number"}}}', true);

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE events IS 'Event log with 90-day retention (partitioned monthly)';
COMMENT ON TABLE event_triggers IS 'Trigger definitions (platform, organization, user-defined)';
COMMENT ON TABLE trigger_actions IS 'Action chains for triggers (sequential/parallel execution)';
COMMENT ON TABLE action_executions IS 'Action execution audit trail with 30-day retention';
COMMENT ON TABLE dead_letter_queue IS 'Failed actions requiring manual intervention';
COMMENT ON TABLE integrations IS 'CRM/ERP connection configurations';
COMMENT ON TABLE scheduled_triggers IS 'CRON-based scheduled triggers';
COMMENT ON TABLE delayed_triggers IS 'Time-delayed trigger executions';
COMMENT ON TABLE system_trigger_registry IS 'System event type catalog (seed data)';

-- ================================================================
-- Migration Complete
-- ================================================================
