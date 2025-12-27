#!/bin/bash

# Check if the profile trigger exists and is working

echo "Checking database trigger status..."
echo ""

# Read the connection string from .env.local
source .env.local

# Check if trigger exists
echo "1. Checking if trigger exists..."
psql "$DATABASE_URL" -c "
SELECT
  t.tgname AS trigger_name,
  p.proname AS function_name,
  t.tgenabled AS enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';
"

echo ""
echo "2. Checking if function exists..."
psql "$DATABASE_URL" -c "
SELECT
  proname AS function_name,
  prosrc AS source_code_preview
FROM pg_proc
WHERE proname = 'handle_new_user';
"

echo ""
echo "3. Checking profiles table structure..."
psql "$DATABASE_URL" -c "
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
"

echo ""
echo "4. Testing profile creation (checking recent profiles)..."
psql "$DATABASE_URL" -c "
SELECT id, email, name, role, subscription_status, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
"
