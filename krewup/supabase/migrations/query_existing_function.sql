-- Query to find the exact signature(s) of create_job_with_coords
SELECT
  pg_get_functiondef(oid) as function_definition,
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_identity_arguments(oid) as identity_arguments
FROM pg_proc
WHERE proname = 'create_job_with_coords';
