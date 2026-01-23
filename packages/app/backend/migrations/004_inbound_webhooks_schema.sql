-- ============================================================================
-- Migration: 004_inbound_webhooks_schema.sql
-- Description: Inbound Webhooks for Activepieces Integration (Phase 6)
-- Author: Integration Hub Team
-- Date: 2026-01-23
-- Dependencies: 002_integration_hub_schema.sql, 003_israeli_erp_connectors.sql
-- ============================================================================

-- ============================================================================
-- 1. INBOUND WEBHOOKS
-- ============================================================================

/**
 * Inbound webhooks table
 * Stores webhook configurations for external systems (Activepieces, Zapier, etc.)
 * to receive events from RightFlow
 */
CREATE TABLE inbound_webhooks (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id VARCHAR(255) NOT NULL,

  -- Webhook Configuration
  url TEXT NOT NULL,                              -- External URL to POST to
  secret_encrypted TEXT NOT NULL,                 -- AES-256 encrypted HMAC secret
  events TEXT[] NOT NULL,                         -- Events to trigger: ['form.submitted', 'form.updated']
  form_id UUID,                                   -- Optional: Filter by specific form
  description TEXT,                               -- Human-readable description

  -- Status & Health
  status VARCHAR(50) DEFAULT 'active',            -- active, paused, disabled
  health_status VARCHAR(50) DEFAULT 'unknown',    -- healthy, degraded, unhealthy, unknown
  consecutive_failures INTEGER DEFAULT 0,         -- Circuit breaker counter
  last_triggered_at TIMESTAMPTZ,                  -- Last delivery attempt
  last_success_at TIMESTAMPTZ,                    -- Last successful delivery

  -- Metrics
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  average_latency_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_inbound_webhook_status CHECK (status IN ('active', 'paused', 'disabled')),
  CONSTRAINT chk_inbound_webhook_health CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  CONSTRAINT chk_inbound_webhook_events CHECK (array_length(events, 1) > 0)
);

-- Indexes for inbound_webhooks
CREATE INDEX idx_inbound_webhooks_org
ON inbound_webhooks(organization_id)
WHERE deleted_at IS NULL;

CREATE INDEX idx_inbound_webhooks_form
ON inbound_webhooks(form_id)
WHERE deleted_at IS NULL AND form_id IS NOT NULL;

CREATE INDEX idx_inbound_webhooks_status
ON inbound_webhooks(status)
WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX idx_inbound_webhooks_events
ON inbound_webhooks USING GIN(events);

CREATE INDEX idx_inbound_webhooks_health
ON inbound_webhooks(health_status)
WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_inbound_webhooks_updated_at
BEFORE UPDATE ON inbound_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. WEBHOOK DELIVERIES (Audit Trail)
-- ============================================================================

/**
 * Webhook deliveries table
 * Audit trail of webhook delivery attempts
 * Retention: Last 100 deliveries per webhook
 */
CREATE TABLE webhook_deliveries (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES inbound_webhooks(id) ON DELETE CASCADE,

  -- Delivery Details
  event VARCHAR(100) NOT NULL,                    -- Event type: 'form.submitted'
  payload_hash TEXT,                              -- SHA-256 hash of payload (for deduplication)
  signature TEXT,                                 -- HMAC signature sent to webhook

  -- Status
  status VARCHAR(50) NOT NULL,                    -- pending, delivered, failed, retrying, dead
  status_code INTEGER,                            -- HTTP status code (if delivered)
  error_message TEXT,                             -- Error details (if failed)
  response_time_ms INTEGER,                       -- Delivery latency in milliseconds

  -- Retry Logic
  attempt INTEGER DEFAULT 1,                      -- Attempt number (1, 2, 3)
  next_retry_at TIMESTAMPTZ,                      -- When to retry (if failed)

  -- Timestamps
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_webhook_delivery_status CHECK (status IN ('pending', 'delivered', 'failed', 'retrying', 'dead')),
  CONSTRAINT chk_webhook_delivery_attempt CHECK (attempt >= 1 AND attempt <= 3)
);

-- Indexes for webhook_deliveries
CREATE INDEX idx_webhook_deliveries_webhook
ON webhook_deliveries(webhook_id);

CREATE INDEX idx_webhook_deliveries_status
ON webhook_deliveries(status)
WHERE status IN ('pending', 'retrying');

CREATE INDEX idx_webhook_deliveries_created
ON webhook_deliveries(created_at DESC);

CREATE INDEX idx_webhook_deliveries_next_retry
ON webhook_deliveries(next_retry_at)
WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- Retention index: Keep last 100 deliveries per webhook
CREATE INDEX idx_webhook_deliveries_retention
ON webhook_deliveries(webhook_id, created_at DESC);

-- ============================================================================
-- 3. CLEANUP FUNCTIONS
-- ============================================================================

/**
 * Function: cleanup_old_webhook_deliveries
 * Purpose: Keep only last 100 delivery attempts per webhook
 * Schedule: Run daily at 02:00 AM
 */
CREATE OR REPLACE FUNCTION cleanup_old_webhook_deliveries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  webhook_rec RECORD;
BEGIN
  -- For each webhook, delete old delivery records
  FOR webhook_rec IN
    SELECT DISTINCT webhook_id FROM webhook_deliveries
  LOOP
    DELETE FROM webhook_deliveries
    WHERE id IN (
      SELECT id FROM webhook_deliveries
      WHERE webhook_id = webhook_rec.webhook_id
      ORDER BY created_at DESC
      OFFSET 100
    );

    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  END LOOP;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. SAMPLE DATA (for development/testing)
-- ============================================================================

-- Note: No sample data inserted for production database
-- Sample webhooks should be created via API during testing

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inbound_webhooks') THEN
    RAISE EXCEPTION 'Table inbound_webhooks was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_deliveries') THEN
    RAISE EXCEPTION 'Table webhook_deliveries was not created';
  END IF;

  RAISE NOTICE 'Migration 004: Inbound webhooks schema created successfully';
END $$;

-- ============================================================================
-- 6. ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS webhook_deliveries CASCADE;
-- DROP TABLE IF EXISTS inbound_webhooks CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_old_webhook_deliveries();
