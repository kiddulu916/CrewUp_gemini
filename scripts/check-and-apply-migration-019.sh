#!/bin/bash

# Script to check if migration 019 has been applied and apply it if needed

echo "Checking if migration 019 columns exist in job_applications table..."

# Check if running migrations via Supabase CLI
if command -v supabase &> /dev/null; then
    echo "Supabase CLI found. Applying pending migrations..."
    supabase db push
    echo "Migration check complete!"
else
    echo "Supabase CLI not found. Please run migrations manually."
    echo ""
    echo "To apply migrations:"
    echo "1. Install Supabase CLI: npm install -g supabase"
    echo "2. Link to your project: supabase link --project-ref YOUR_PROJECT_REF"
    echo "3. Apply migrations: supabase db push"
    echo ""
    echo "Or apply migration 019 directly via SQL in Supabase dashboard:"
    echo "Run the SQL from: supabase/migrations/019_update_job_applications.sql"
fi
