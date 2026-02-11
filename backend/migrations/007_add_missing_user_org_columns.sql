-- Migration 007: Add Missing User and Organization Columns
-- Created: 2026-02-07
-- Purpose: Add columns needed for role-based access control

-- ============================================================================
-- Update Organizations Table
-- ============================================================================

-- Add clerk_organization_id column (map from clerk_org_id)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS clerk_organization_id TEXT;

-- Copy data from clerk_org_id to clerk_organization_id
UPDATE organizations SET clerk_organization_id = clerk_org_id WHERE clerk_organization_id IS NULL;

-- Make it NOT NULL after data copy
ALTER TABLE organizations ALTER COLUMN clerk_organization_id SET NOT NULL;

-- Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'organizations_clerk_organization_id_key'
    ) THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_clerk_organization_id_key UNIQUE (clerk_organization_id);
    END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_organization_id ON organizations(clerk_organization_id);

-- ============================================================================
-- Update Users Table
-- ============================================================================

-- Add clerk_user_id column (map from clerk_id)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Copy data from clerk_id to clerk_user_id
UPDATE users SET clerk_user_id = clerk_id WHERE clerk_user_id IS NULL;

-- Make it NOT NULL and UNIQUE
ALTER TABLE users ALTER COLUMN clerk_user_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_clerk_user_id_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id);
    END IF;
END $$;

-- Add organization_id column (reference to organizations table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add name column
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

-- Add role column with default 'worker'
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker';

-- Create indices
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

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
  AND table_name IN ('users', 'organizations')
  AND column_name IN ('clerk_organization_id', 'clerk_user_id', 'organization_id', 'name', 'role')
ORDER BY table_name, column_name;
