-- Add missing is_current column to work_experience table
-- This column tracks whether the job is currently active

ALTER TABLE work_experience
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN work_experience.is_current IS 'Whether this is the workers current job (end_date will be NULL if true)';

-- Update existing records: if end_date is NULL, assume is_current = true
UPDATE work_experience
SET is_current = true
WHERE end_date IS NULL;
