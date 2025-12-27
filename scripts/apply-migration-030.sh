#!/bin/bash

# Apply migration 030 - Create profile trigger
# This fixes the "Database error saving new user" issue

echo "Applying migration 030: Create profile trigger..."

# Read the connection string from .env.local
source .env.local

# Apply the migration
psql "$DATABASE_URL" -f supabase/migrations/030_create_profile_trigger.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 030 applied successfully!"
    echo "The handle_new_user() trigger has been created."
    echo "New user signups should now work correctly."
else
    echo "❌ Failed to apply migration 030"
    echo "Please check your DATABASE_URL in .env.local"
fi
