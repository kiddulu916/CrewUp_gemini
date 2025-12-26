#!/bin/bash

# Apply migration 023 to fix schema mismatches
# This migration:
#   1. Adds session_id to job_views if missing
#   2. Renames workers_id to applicant_id in application_drafts

MIGRATION_FILE="supabase/migrations/023_fix_schema_mismatches.sql"

echo "=================================================="
echo "  Applying Migration 023: Fix Schema Mismatches"
echo "=================================================="
echo ""
echo "This migration will:"
echo "  ✓ Add session_id column to job_views (if missing)"
echo "  ✓ Rename workers_id → applicant_id in application_drafts"
echo ""
echo "This is SAFE and will NOT delete any data."
echo ""
echo "Press Enter to continue, or Ctrl+C to cancel..."
read

echo ""
echo "Reading migration file..."

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

MIGRATION_SQL=$(cat "$MIGRATION_FILE")

echo "✓ Migration file loaded"
echo ""
echo "To apply this migration:"
echo ""
echo "METHOD 1: Supabase SQL Editor (Recommended)"
echo "  1. Go to https://supabase.com/dashboard"
echo "  2. Select your KrewUp project"
echo "  3. Click 'SQL Editor' → 'New query'"
echo "  4. Copy and paste this SQL:"
echo ""
echo "------- COPY BELOW THIS LINE -------"
cat "$MIGRATION_FILE"
echo "------- COPY ABOVE THIS LINE -------"
echo ""
echo "  5. Click 'Run' or press Ctrl+Enter"
echo ""
echo "METHOD 2: Command Line (if DATABASE_URL is set)"
echo "  Run: psql \$DATABASE_URL -f $MIGRATION_FILE"
echo ""
