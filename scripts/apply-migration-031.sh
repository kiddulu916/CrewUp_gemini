#!/bin/bash

# Apply migration 031 - Fix profile trigger with better error handling

echo "Applying migration 031: Fix profile trigger..."

# Read the connection string from .env.local
source .env.local

# Apply the migration
psql "$DATABASE_URL" -f supabase/migrations/031_fix_profile_trigger.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 031 applied successfully!"
    echo ""
    echo "The improved handle_new_user() trigger has been created with:"
    echo "  - Better error handling"
    echo "  - Support for different metadata formats"
    echo "  - ON CONFLICT handling to prevent duplicates"
    echo "  - Error logging"
    echo ""
    echo "Please try signing up again."
else
    echo "❌ Failed to apply migration 031"
    echo "Please check your DATABASE_URL in .env.local"
fi
