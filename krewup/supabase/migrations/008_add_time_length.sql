-- Add time_length field to jobs table for contract/temporary positions
-- This field stores the duration/length of the contract or temporary job
ALTER TABLE jobs
ADD COLUMN time_length TEXT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN jobs.time_length IS 'Duration of contract or temporary job (e.g., "3 months", "6 weeks"). NULL for permanent positions.';
