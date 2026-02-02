-- ================================================================
-- Migration: 006_workflow_schema.sql
-- Purpose: Create workflow management system tables
-- Created: 2026-01-31
-- ================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- ENUM TYPES
-- ================================================================

-- Workflow status enum
CREATE TYPE workflow_status AS ENUM (
  'draft',      -- Workflow is being designed
  'published',  -- Available for execution
  'archived'    -- Soft deleted
);

-- Node types enum
CREATE TYPE workflow_node_type AS ENUM (
  'form',       -- Form filling node
  'condition',  -- Conditional branching
  'action',     -- Automated action
  'wait',       -- Time delay or wait for event
  'approval',   -- Approval required
  'start',      -- Workflow entry point
  'end'         -- Workflow completion
);

-- Workflow instance status
CREATE TYPE workflow_instance_status AS ENUM (
  'pending',    -- Waiting to start
  'running',    -- Currently executing
  'paused',     -- Temporarily paused
  'waiting',    -- Waiting for external event
  'completed',  -- Successfully finished
  'failed',     -- Execution failed
  'cancelled'   -- Manually cancelled
);

-- Action types enum
CREATE TYPE workflow_action_type AS ENUM (
  'send_whatsapp',
  'send_email',
  'generate_pdf',
  'call_webhook',
  'update_database',
  'create_task',
  'notify_user'
);

-- WhatsApp session status
CREATE TYPE whatsapp_session_status AS ENUM (
  'active',
  'paused',
  'completed',
  'expired',
  'abandoned'
);

-- ================================================================
-- MAIN TABLES
-- ================================================================

-- Workflow definitions table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status workflow_status DEFAULT 'draft',
  version INTEGER DEFAULT 1,

  -- Workflow definition (nodes, connections, variables)
  definition JSONB NOT NULL DEFAULT '{}',

  -- Configuration
  config JSONB DEFAULT '{}',
  triggers JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]',

  -- Metadata
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  published_by UUID REFERENCES users(id),
  published_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_workflow_name_per_org UNIQUE (organization_id, name)
);

-- Workflow instances (executions)
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- User who triggered the workflow (optional)
  user_id UUID REFERENCES users(id),

  -- Execution state
  status workflow_instance_status DEFAULT 'pending',
  current_node_id VARCHAR(255),
  progress INTEGER DEFAULT 0, -- Percentage 0-100

  -- Runtime context and data
  context JSONB DEFAULT '{}', -- Current execution context
  form_data JSONB DEFAULT '{}', -- Collected form data
  variables JSONB DEFAULT '{}', -- Runtime variables

  -- Execution metadata
  triggered_by VARCHAR(100), -- 'manual', 'webhook', 'schedule', 'api'
  trigger_data JSONB DEFAULT '{}',

  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  failed_at TIMESTAMP,

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  paused_at TIMESTAMP,
  resumed_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Performance metrics
  execution_time_ms INTEGER, -- Total execution time in milliseconds

  -- Indexes for querying
  INDEX idx_workflow_instances_workflow_id (workflow_id),
  INDEX idx_workflow_instances_status (status),
  INDEX idx_workflow_instances_user_id (user_id),
  INDEX idx_workflow_instances_started_at (started_at)
);

-- Workflow instance history (audit trail)
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,

  -- Event details
  node_id VARCHAR(255),
  node_type workflow_node_type,
  action VARCHAR(100) NOT NULL, -- 'entered', 'completed', 'failed', 'skipped'

  -- Event data
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_data JSONB,

  -- Timing
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Index for querying
  INDEX idx_workflow_history_instance_id (instance_id),
  INDEX idx_workflow_history_created_at (created_at)
);

-- WhatsApp workflow sessions
CREATE TABLE whatsapp_workflow_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- WhatsApp details
  channel_id UUID REFERENCES whatsapp_channels(id),
  phone_number VARCHAR(50) NOT NULL,
  language VARCHAR(10) DEFAULT 'he', -- Hebrew default

  -- Session state
  status whatsapp_session_status DEFAULT 'active',
  current_node_id VARCHAR(255),
  current_field VARCHAR(255),

  -- Collected data
  form_data JSONB DEFAULT '{}',

  -- Message tracking
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,

  -- Session management
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  reminder_sent_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Indexes
  INDEX idx_whatsapp_sessions_phone (phone_number),
  INDEX idx_whatsapp_sessions_status (status),
  INDEX idx_whatsapp_sessions_expires_at (expires_at)
);

-- Workflow templates
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for global templates

  -- Template details
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Template definition
  definition JSONB NOT NULL,
  required_forms JSONB DEFAULT '[]', -- List of form types needed
  variables JSONB DEFAULT '[]',

  -- Metadata
  is_public BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false, -- RightFlow provided
  popularity INTEGER DEFAULT 0, -- Usage count
  estimated_duration INTEGER, -- Seconds

  -- Versioning
  version VARCHAR(20) DEFAULT '1.0.0',

  -- Timestamps
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_template_name UNIQUE (organization_id, name)
);

-- Workflow scheduled tasks (for wait nodes and scheduled actions)
CREATE TABLE workflow_scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,

  -- Task details
  task_type VARCHAR(50) NOT NULL, -- 'wait', 'reminder', 'timeout'
  scheduled_for TIMESTAMP NOT NULL,

  -- Task data
  data JSONB DEFAULT '{}',

  -- Execution status
  is_executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMP,

  -- Error handling
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_scheduled_tasks_scheduled_for (scheduled_for),
  INDEX idx_scheduled_tasks_is_executed (is_executed)
);

-- Workflow analytics (aggregated metrics)
CREATE TABLE workflow_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Time period
  date DATE NOT NULL,

  -- Execution metrics
  total_executions INTEGER DEFAULT 0,
  completed_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  cancelled_executions INTEGER DEFAULT 0,

  -- Performance metrics
  avg_duration_ms INTEGER,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,

  -- Success metrics
  completion_rate DECIMAL(5, 2), -- Percentage

  -- Node-level metrics (JSONB for flexibility)
  node_metrics JSONB DEFAULT '{}',

  -- Bottleneck analysis
  bottleneck_nodes JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT unique_workflow_analytics_date UNIQUE (workflow_id, date),

  -- Indexes
  INDEX idx_workflow_analytics_date (date)
);

-- Workflow webhooks configuration
CREATE TABLE workflow_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Webhook configuration
  url TEXT NOT NULL,
  method VARCHAR(10) DEFAULT 'POST',
  headers JSONB DEFAULT '{}',

  -- Authentication
  auth_type VARCHAR(50), -- 'bearer', 'basic', 'api_key', 'custom'
  auth_config JSONB DEFAULT '{}', -- Encrypted sensitive data

  -- Events to trigger on
  events TEXT[] NOT NULL, -- Array of event types

  -- Webhook status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_workflow_webhooks_workflow_id (workflow_id)
);

-- ================================================================
-- INDEXES
-- ================================================================

-- Workflows indexes
CREATE INDEX idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_at ON workflows(created_at);

-- Workflow instances indexes
CREATE INDEX idx_instances_organization_id ON workflow_instances(organization_id);
CREATE INDEX idx_instances_current_node ON workflow_instances(current_node_id);
CREATE INDEX idx_instances_completed_at ON workflow_instances(completed_at);

-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_workflow_sessions
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workflow_analytics_updated_at
  BEFORE UPDATE ON workflow_analytics
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_workflow_webhooks_updated_at
  BEFORE UPDATE ON workflow_webhooks
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- ================================================================
-- INITIAL DATA
-- ================================================================

-- Insert default workflow templates
INSERT INTO workflow_templates (name, category, description, is_public, is_official, definition) VALUES
(
  'Customer Onboarding',
  'sales',
  'Standard customer onboarding workflow with verification and welcome message',
  true,
  true,
  '{
    "nodes": [
      {"id": "start", "type": "start", "position": {"x": 100, "y": 100}},
      {"id": "form1", "type": "form", "position": {"x": 250, "y": 100}, "data": {"formName": "Customer Details"}},
      {"id": "end", "type": "end", "position": {"x": 400, "y": 100}}
    ],
    "connections": [
      {"from": "start", "to": "form1"},
      {"from": "form1", "to": "end"}
    ]
  }'::JSONB
),
(
  'Leave Request',
  'hr',
  'Employee leave request with manager approval',
  true,
  true,
  '{
    "nodes": [
      {"id": "start", "type": "start", "position": {"x": 100, "y": 100}},
      {"id": "form1", "type": "form", "position": {"x": 250, "y": 100}, "data": {"formName": "Leave Request"}},
      {"id": "approval1", "type": "approval", "position": {"x": 400, "y": 100}, "data": {"approverRole": "manager"}},
      {"id": "end", "type": "end", "position": {"x": 550, "y": 100}}
    ],
    "connections": [
      {"from": "start", "to": "form1"},
      {"from": "form1", "to": "approval1"},
      {"from": "approval1", "to": "end"}
    ]
  }'::JSONB
);

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE workflows IS 'Workflow definitions created by organizations';
COMMENT ON TABLE workflow_instances IS 'Running instances of workflows';
COMMENT ON TABLE workflow_history IS 'Audit trail of workflow execution events';
COMMENT ON TABLE whatsapp_workflow_sessions IS 'WhatsApp interactive form filling sessions';
COMMENT ON TABLE workflow_templates IS 'Pre-built workflow templates';
COMMENT ON TABLE workflow_scheduled_tasks IS 'Scheduled tasks for wait nodes and reminders';
COMMENT ON TABLE workflow_analytics IS 'Aggregated metrics for workflow performance';
COMMENT ON TABLE workflow_webhooks IS 'Webhook configurations for workflow events';