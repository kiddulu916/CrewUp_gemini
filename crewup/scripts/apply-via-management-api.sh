#!/bin/bash

# Script to apply migration via Supabase Management API
# Usage: ./scripts/apply-via-management-api.sh <migration-file>

MIGRATION_FILE="$1"

if [ -z "$MIGRATION_FILE" ]; then
  echo "Usage: $0 <migration-file>"
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

# Load environment variables
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Extract project ref from URL
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "Project Ref: $PROJECT_REF"
echo "Migration File: $MIGRATION_FILE"
echo ""

# Read SQL content
SQL_CONTENT=$(cat "$MIGRATION_FILE")

echo "Applying migration via Supabase Management API..."
echo ""

# Try to execute via Management API
# Note: This requires a Supabase Management API token, not just service role key
echo "Note: Direct SQL execution requires database credentials or Management API token."
echo "Please apply the migration manually via one of these methods:"
echo ""
echo "Method 1 - Supabase SQL Editor (RECOMMENDED):"
echo "  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo ""
echo "Method 2 - Copy the SQL below:"
echo "=============================================================================="
cat "$MIGRATION_FILE"
echo "=============================================================================="
