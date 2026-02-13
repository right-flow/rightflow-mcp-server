-- ================================================================
-- Migration: 009_event_trigger_system_fixed.sql
-- Purpose: Create Event Trigger System tables (Fixed version matching TypeScript types)
-- Created: 2026-02-13
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- EVENTS TABLE (Simplified - matches TypeScript Event interface)
-- ================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}',
  processing_mode VARCHAR(20) DEFAULT 'poll',
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_org_type ON events(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_events_processing ON events(processing_mode, next_retry_at) WHERE processing_mode = 'poll';
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id);

-- Partial unique index for deduplication (5-minute window)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_dedup ON events(organization_id, event_type, entity_id, created_at)
  WHERE created_at > (NOW() - INTERVAL '5 minutes');

-- ================================================================
-- EVENT_TRIGGERS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS event_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'user_defined',
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  scope VARCHAR(20) DEFAULT 'all_forms',
  form_ids UUID[] DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  priority INTEGER DEFAULT 0,
  error_handling VARCHAR(50) DEFAULT 'stop_on_first_error',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for event_triggers
CREATE INDEX IF NOT EXISTS idx_triggers_org_event ON event_triggers(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_triggers_status ON event_triggers(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_triggers_level ON event_triggers(level);
CREATE INDEX IF NOT EXISTS idx_triggers_priority ON event_triggers(priority);

-- ================================================================
-- TRIGGER_ACTIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS trigger_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  retry_config JSONB NOT NULL DEFAULT '{"max_attempts": 3, "backoff_multiplier": 2, "initial_delay_ms": 1000}',
  timeout_ms INTEGER DEFAULT 30000,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trigger_actions
CREATE INDEX IF NOT EXISTS idx_actions_trigger ON trigger_actions(trigger_id, "order");
CREATE INDEX IF NOT EXISTS idx_actions_type ON trigger_actions(action_type);

-- ================================================================
-- ACTION_EXECUTIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS action_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES trigger_actions(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  attempt INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  response JSONB,
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for action_executions
CREATE INDEX IF NOT EXISTS idx_executions_event ON action_executions(event_id);
CREATE INDEX IF NOT EXISTS idx_executions_trigger ON action_executions(trigger_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON action_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created ON action_executions(created_at DESC);

-- ================================================================
-- DEAD_LETTER_QUEUE TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  trigger_id UUID,
  action_id UUID NOT NULL,
  failure_reason TEXT NOT NULL,
  failure_count INTEGER DEFAULT 1,
  last_error JSONB NOT NULL,
  event_snapshot JSONB NOT NULL,
  action_snapshot JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  retry_after TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dead_letter_queue
CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dlq_event ON dead_letter_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_dlq_created ON dead_letter_queue(created_at DESC);

-- ================================================================
-- INTEGRATIONS TABLE (if not exists)
-- ================================================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  credentials JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status) WHERE status = 'active';

-- ================================================================
-- SCHEDULED_TRIGGERS TABLE (for delayed/scheduled events)
-- ================================================================

CREATE TABLE IF NOT EXISTS scheduled_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID NOT NULL REFERENCES event_triggers(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scheduled_triggers
CREATE INDEX IF NOT EXISTS idx_scheduled_pending ON scheduled_triggers(scheduled_at) WHERE status = 'pending';

-- ================================================================
-- SYSTEM_TRIGGER_REGISTRY (Platform-level triggers)
-- ================================================================

CREATE TABLE IF NOT EXISTS system_trigger_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) NOT NULL,
  default_actions JSONB DEFAULT '[]',
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- AUTO-UPDATE TRIGGERS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_event_triggers_updated_at BEFORE UPDATE ON event_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trigger_actions_updated_at BEFORE UPDATE ON trigger_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dead_letter_queue_updated_at BEFORE UPDATE ON dead_letter_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- SEED DATA - Platform System Triggers
-- ================================================================

-- Insert default platform-level system triggers
INSERT INTO system_trigger_registry (trigger_key, name, description, event_type, is_required) VALUES
  ('org.created', 'Organization Created', 'Triggered when new organization is created', 'organization.created', true),
  ('org.deleted', 'Organization Deleted', 'Triggered when organization is deleted', 'organization.deleted', true),
  ('user.registered', 'User Registered', 'Triggered when new user registers', 'user.created', false),
  ('form.submitted', 'Form Submitted', 'Triggered when form is submitted', 'form.submitted', false)
ON CONFLICT (trigger_key) DO NOTHING;

-- ================================================================
-- COMMENTS (Documentation)
-- ================================================================

COMMENT ON TABLE events IS 'Event log for trigger system - stores all events with 5-minute deduplication';
COMMENT ON TABLE event_triggers IS '3-tier trigger definitions (platform/organization/user-defined)';
COMMENT ON TABLE trigger_actions IS 'Action chains for triggers - executed sequentially by order';
COMMENT ON TABLE action_executions IS 'Execution history for all actions with retry tracking';
COMMENT ON TABLE dead_letter_queue IS 'Failed actions requiring manual intervention';
COMMENT ON TABLE integrations IS 'External system integrations (CRM, ERP, Calendar, Messaging)';
COMMENT ON TABLE scheduled_triggers IS 'Delayed/scheduled trigger executions';
COMMENT ON TABLE system_trigger_registry IS 'Platform-level required system triggers';
