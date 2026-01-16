-- Add short_url field to forms table
-- For premium users only

ALTER TABLE forms ADD COLUMN IF NOT EXISTS short_url VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_forms_short_url ON forms(short_url) WHERE short_url IS NOT NULL;

COMMENT ON COLUMN forms.short_url IS 'Shortened URL for published forms (premium feature only)';
