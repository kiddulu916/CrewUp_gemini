-- Rename certification columns to match code expectations
-- Change 'name' to 'certification_type' and 'photo_url' to 'image_url'

-- Only rename if the old columns exist
DO $$
BEGIN
  -- Rename 'name' to 'certification_type' if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certifications' AND column_name = 'name'
  ) THEN
    ALTER TABLE certifications RENAME COLUMN name TO certification_type;
    RAISE NOTICE 'Renamed name to certification_type';
  END IF;

  -- Rename 'photo_url' to 'image_url' if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certifications' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE certifications RENAME COLUMN photo_url TO image_url;
    RAISE NOTICE 'Renamed photo_url to image_url';
  END IF;
END $$;

-- Update any indexes that reference these columns
DROP INDEX IF EXISTS idx_certifications_name;
CREATE INDEX IF NOT EXISTS idx_certifications_type ON certifications(certification_type);
