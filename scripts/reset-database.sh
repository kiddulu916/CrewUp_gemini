#!/bin/bash

# Reset Supabase database using the reset script
# This will DELETE ALL DATA and rebuild the schema

echo "⚠️  WARNING: This will DELETE ALL DATA in your Supabase database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "Reading database reset script..."
RESET_SQL=$(cat supabase/database-reset.sql)

echo "Connecting to Supabase..."
psql "$DATABASE_URL" -c "$RESET_SQL"

if [ $? -eq 0 ]; then
    echo "✅ Database reset successfully!"
else
    echo "❌ Database reset failed. Check the error above."
fi
