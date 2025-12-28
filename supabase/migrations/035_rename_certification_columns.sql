-- Rename certification columns to match code expectations
-- Change 'name' to 'certification_type' and 'photo_url' to 'image_url'

ALTER TABLE certifications
  RENAME COLUMN name TO certification_type;

ALTER TABLE certifications
  RENAME COLUMN photo_url TO image_url;

-- Update any indexes that reference these columns
DROP INDEX IF EXISTS idx_certifications_name;
CREATE INDEX IF NOT EXISTS idx_certifications_type ON certifications(certification_type);
