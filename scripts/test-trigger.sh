#!/bin/bash

# Test the profile creation trigger directly

echo "Testing profile creation trigger..."
echo ""

# Read the connection string from .env.local
source ../.env.local

# Create a test to see what fails
echo "Attempting to manually create a profile to see what fails..."
psql "$DATABASE_URL" << 'EOF'

-- Test inserting a profile manually
BEGIN;

-- Try to insert a test profile
INSERT INTO public.profiles (
  id,
  email,
  name,
  role,
  subscription_status,
  trade,
  location,
  bio,
  phone,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  'worker',
  'free',
  'General Laborer',
  'Update your location',
  'Ready to work hard and learn new skills on site!',
  NULL,
  NOW(),
  NOW()
);

-- If we got here, the insert worked
SELECT 'SUCCESS: Profile inserted successfully!' as result;

-- Rollback so we don't actually create the test profile
ROLLBACK;

EOF

echo ""
echo "If you see 'SUCCESS' above, the profiles table structure is correct."
echo "If you see an error, that's what's breaking the signup process."
echo ""
echo "Now checking if the trigger function has the right permissions..."

psql "$DATABASE_URL" << 'EOF'

-- Check function owner and security
SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS is_security_definer
FROM pg_proc p
WHERE p.proname = 'handle_new_user';

EOF
