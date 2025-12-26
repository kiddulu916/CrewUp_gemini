#!/bin/bash

echo "=========================================="
echo "Applying Migration 025"
echo "Renames worker_id to applicant_id in job_applications"
echo "=========================================="
echo ""
echo "This migration will fix the column name mismatch that's preventing"
echo "applications from being saved properly."
echo ""
echo "Please run this SQL in your Supabase dashboard:"
echo ""
cat supabase/migrations/025_rename_worker_id_to_applicant_id.sql
echo ""
echo "=========================================="
echo "After running the migration, applications should save properly!"
echo "=========================================="
