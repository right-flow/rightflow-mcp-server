-- Create form_versions table for version management
-- Each publish creates a new version snapshot

CREATE TABLE IF NOT EXISTS form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Snapshot of form content at publish time
  title VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  stations JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',

  -- Version metadata
  published_by UUID NOT NULL REFERENCES users(id),
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  notes TEXT, -- Optional release notes

  -- Prevent duplicate version numbers per form
  UNIQUE(form_id, version_number),

  -- Index for fast lookups
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for finding current version quickly
CREATE INDEX idx_form_versions_current ON form_versions(form_id, is_current) WHERE is_current = true;

-- Index for version history queries
CREATE INDEX idx_form_versions_form_id ON form_versions(form_id, version_number DESC);

-- Index for user's published versions
CREATE INDEX idx_form_versions_published_by ON form_versions(published_by, published_at DESC);

COMMENT ON TABLE form_versions IS 'Version history for published forms. Each publish creates a new immutable snapshot.';
COMMENT ON COLUMN form_versions.version_number IS 'Sequential version number (1, 2, 3...) per form';
COMMENT ON COLUMN form_versions.is_current IS 'Only one version per form should be true - the currently published version';
COMMENT ON COLUMN form_versions.notes IS 'Optional release notes explaining what changed in this version';
