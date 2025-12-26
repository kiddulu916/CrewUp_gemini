#!/bin/bash

echo "=========================================="
echo "Migration 026: Ensure job_views Schema"
echo "=========================================="
echo ""
echo "This migration will ensure the job_views table has:"
echo "  - viewer_id column (for tracking who viewed the job)"
echo "  - session_id column (for anonymous tracking)"
echo ""
echo "Please run this SQL in your Supabase dashboard SQL Editor:"
echo ""
cat supabase/migrations/026_ensure_job_views_schema.sql
echo ""
echo "=========================================="
echo "After running, the job view tracking error should be fixed!"
echo "=========================================="
