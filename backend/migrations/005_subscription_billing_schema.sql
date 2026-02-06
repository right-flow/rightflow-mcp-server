-- Migration 005: Subscription & Billing Schema
-- Created: 2026-02-05
-- Reference: PRD-Self-Service-Subscriptions.md
-- Purpose: Add tables for subscription plans, usage tracking, billing, and grace periods

-- ============================================================================
-- Table 1: Subscription Plans
-- ============================================================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    price_monthly_cents INTEGER NOT NULL DEFAULT 0,
    price_yearly_cents INTEGER,
    max_forms INTEGER NOT NULL,
    max_submissions_per_month INTEGER NOT NULL,
    max_storage_mb INTEGER NOT NULL,
    max_members INTEGER NOT NULL,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);

-- Seed initial plans
INSERT INTO subscription_plans (name, display_name, price_monthly_cents, price_yearly_cents, max_forms, max_submissions_per_month, max_storage_mb, max_members, features) VALUES
('FREE', 'Free Plan', 0, NULL, 3, 50, 1024, 1, '{"description": "Perfect for trying out RightFlow"}'),
('BASIC', 'Basic Plan', 30000, 288000, 10, 100, 5120, 3, '{"description": "For small teams getting started", "priority_support": false}'),
('EXPANDED', 'Expanded Plan', 40000, 384000, 50, 500, 10240, 10, '{"description": "For growing teams", "priority_support": true, "whitelabel": true}'),
('ENTERPRISE', 'Enterprise Plan', 0, NULL, 999999, 999999, 102400, 999999, '{"description": "Custom pricing and features", "priority_support": true, "whitelabel": true, "custom_sla": true, "dedicated_support": true}');

-- ============================================================================
-- Table 2: Organization Subscriptions
-- ============================================================================
CREATE TABLE organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'grace_period', 'suspended', 'pending_deletion', 'cancelled'
    billing_cycle VARCHAR(10) DEFAULT 'monthly', -- 'monthly', 'yearly'
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    grow_customer_id VARCHAR(100), -- GROW/Meshulam customer ID
    grow_subscription_id VARCHAR(100), -- GROW/Meshulam subscription ID
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_subscriptions_org_id ON organization_subscriptions(org_id);
CREATE INDEX idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX idx_org_subscriptions_period_end ON organization_subscriptions(current_period_end);
CREATE INDEX idx_org_subscriptions_grow_customer ON organization_subscriptions(grow_customer_id);

-- ============================================================================
-- Table 3: Organization Usage (Total quota per organization)
-- ============================================================================
CREATE TABLE organization_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_submissions INTEGER DEFAULT 0,
    quota_limit INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, billing_period_start)
);

CREATE INDEX idx_org_usage_org_id ON organization_usage(org_id);
CREATE INDEX idx_org_usage_period ON organization_usage(billing_period_start, billing_period_end);

-- ============================================================================
-- Table 4: Form Usage Details (Analytics breakdown per form)
-- ============================================================================
CREATE TABLE form_usage_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    submissions_count INTEGER DEFAULT 0,
    UNIQUE(form_id, billing_period_start)
);

CREATE INDEX idx_form_usage_org_id ON form_usage_details(org_id);
CREATE INDEX idx_form_usage_form_id ON form_usage_details(form_id);
CREATE INDEX idx_form_usage_period ON form_usage_details(billing_period_start);

-- ============================================================================
-- Table 5: Payment Attempts
-- ============================================================================
CREATE TABLE payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'ILS',
    status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'failed', 'cancelled'
    failure_reason VARCHAR(255),
    grow_transaction_id VARCHAR(100),
    attempt_number INTEGER DEFAULT 1,
    scheduled_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_attempts_org_id ON payment_attempts(org_id);
CREATE INDEX idx_payment_attempts_subscription_id ON payment_attempts(subscription_id);
CREATE INDEX idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX idx_payment_attempts_grow_txn ON payment_attempts(grow_transaction_id);

-- ============================================================================
-- Table 6: Grace Periods
-- ============================================================================
CREATE TABLE grace_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL, -- started_at + 14 days
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'expired'
    resolved_at TIMESTAMPTZ,
    resolution_reason VARCHAR(50), -- 'payment_success', 'manual_resolution', 'downgrade'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, subscription_id, started_at)
);

CREATE INDEX idx_grace_periods_org_id ON grace_periods(org_id);
CREATE INDEX idx_grace_periods_subscription_id ON grace_periods(subscription_id);
CREATE INDEX idx_grace_periods_status ON grace_periods(status);
CREATE INDEX idx_grace_periods_ends_at ON grace_periods(ends_at);

-- ============================================================================
-- Table 7: Invoices
-- ============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'ILS',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    grow_invoice_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_period ON invoices(billing_period_start, billing_period_end);
CREATE INDEX idx_invoices_grow_id ON invoices(grow_invoice_id);

-- ============================================================================
-- Table 8: Overage Charges
-- ============================================================================
CREATE TABLE overage_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    submissions_over_limit INTEGER NOT NULL,
    charge_cents INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'charged', 'waived'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_overage_charges_org_id ON overage_charges(org_id);
CREATE INDEX idx_overage_charges_period ON overage_charges(billing_period_start);
CREATE INDEX idx_overage_charges_status ON overage_charges(status);

-- ============================================================================
-- Add archived columns to forms table (for downgrade flow)
-- ============================================================================
ALTER TABLE forms ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS archived_reason VARCHAR(100);

CREATE INDEX idx_forms_archived ON forms(org_id, archived_at) WHERE archived_at IS NOT NULL;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE subscription_plans IS 'Available subscription plans (FREE, BASIC, EXPANDED, ENTERPRISE)';
COMMENT ON TABLE organization_subscriptions IS 'Current subscription for each organization';
COMMENT ON TABLE organization_usage IS 'Total usage per organization per billing period (ADR-001: Total Quota)';
COMMENT ON TABLE form_usage_details IS 'Per-form usage breakdown for analytics';
COMMENT ON TABLE payment_attempts IS 'Payment charge attempts and results';
COMMENT ON TABLE grace_periods IS 'Grace period tracking for failed payments (ADR-003: 14-day grace period)';
COMMENT ON TABLE invoices IS 'Billing invoices for each period';
COMMENT ON TABLE overage_charges IS 'Charges for usage over quota limit';

COMMENT ON COLUMN forms.archived_at IS 'When form was archived (ADR-002: Archive on downgrade, not delete)';
COMMENT ON COLUMN forms.archived_reason IS 'Why form was archived: user_action, downgrade_from_BASIC, downgrade_from_EXPANDED, payment_failed';
