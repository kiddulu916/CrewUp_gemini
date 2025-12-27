-- Add credential_category field to distinguish contractor licenses from worker certifications
-- Migration 032: Add credential category support

-- Add credential_category column with constraint
ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS credential_category TEXT
  CHECK (credential_category IN ('license', 'certification'));

-- Backfill existing records (all current records are worker certifications)
UPDATE certifications
  SET credential_category = 'certification'
  WHERE credential_category IS NULL;

-- Make field required after backfill
ALTER TABLE certifications
  ALTER COLUMN credential_category SET NOT NULL;

-- Add index for performance on filtering by category
CREATE INDEX IF NOT EXISTS idx_certifications_category
  ON certifications(credential_category);

-- Create function to enforce role-based credential types
CREATE OR REPLACE FUNCTION check_credential_category()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_employer_type TEXT;
BEGIN
  -- Get user's role and employer type from profiles
  SELECT role, employer_type INTO user_role, user_employer_type
  FROM profiles WHERE id = NEW.user_id;

  -- Workers can only have certifications
  IF user_role = 'worker' AND NEW.credential_category != 'certification' THEN
    RAISE EXCEPTION 'Workers can only add certifications';
  END IF;

  -- Contractors can only have licenses
  IF user_role = 'employer' AND user_employer_type = 'contractor'
     AND NEW.credential_category != 'license' THEN
    RAISE EXCEPTION 'Contractors can only add licenses';
  END IF;

  -- Recruiters cannot add any credentials
  IF user_role = 'employer' AND user_employer_type = 'recruiter' THEN
    RAISE EXCEPTION 'Recruiters cannot add credentials';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce validation
DROP TRIGGER IF EXISTS enforce_credential_category ON certifications;
CREATE TRIGGER enforce_credential_category
  BEFORE INSERT OR UPDATE ON certifications
  FOR EACH ROW
  EXECUTE FUNCTION check_credential_category();

-- Add comment for documentation
COMMENT ON COLUMN certifications.credential_category IS
  'Type of credential: license (for contractors) or certification (for workers)';
