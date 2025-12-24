-- Make employer_name nullable in jobs table
-- We fetch employer_name via JOIN with profiles table when displaying jobs
-- So we don't need to store it denormalized in the jobs table

ALTER TABLE jobs
ALTER COLUMN employer_name DROP NOT NULL;

COMMENT ON COLUMN jobs.employer_name IS 'Deprecated: Employer name is now fetched via JOIN with profiles table';
