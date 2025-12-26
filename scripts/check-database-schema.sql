-- Check what columns exist in application_drafts table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'application_drafts'
ORDER BY ordinal_position;

-- Check what columns exist in job_views table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'job_views'
ORDER BY ordinal_position;
