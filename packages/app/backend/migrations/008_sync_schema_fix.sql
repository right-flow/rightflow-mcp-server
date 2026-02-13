-- Migration 008: Schema Synchronization Fix
-- Created: 2026-02-13
-- Purpose: Add missing columns to match syncUser middleware expectations

-- ============================================================================
-- Add clerk_org_id to organizations (for syncUser middleware)
-- ============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS clerk_org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id ON organizations(clerk_org_id);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'organizations_clerk_org_id_unique'
    ) THEN
        -- Only add unique constraint if all existing values are either null or unique
        ALTER TABLE organizations ADD CONSTRAINT organizations_clerk_org_id_unique UNIQUE (clerk_org_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, do nothing
    NULL;
END $$;

-- ============================================================================
-- Add missing columns to users table
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker';

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- Create submissions table if it doesn't exist
-- ============================================================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    form_id UUID REFERENCES forms(id),
    submitted_by_id UUID REFERENCES users(id),
    data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_submissions_organization_id ON submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by_id ON submissions(submitted_by_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

-- ============================================================================
-- Verification
-- ============================================================================
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('users', 'organizations', 'submissions')
    AND column_name IN ('clerk_org_id', 'organization_id', 'name', 'role')
ORDER BY table_name, column_name;
