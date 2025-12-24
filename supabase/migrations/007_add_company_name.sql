-- Add company_name to profiles table for employers
-- This allows employers to have a business name separate from their personal name
-- NULLABLE because only employers need this field (workers will have NULL)
ALTER TABLE profiles
ADD COLUMN company_name TEXT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN profiles.company_name IS 'Business/company name for employers. NULL for workers.';
