#!/bin/bash

echo "=========================================="
echo "Migration 028: Add custom_questions to create_job_with_coords"
echo "=========================================="
echo ""
echo "This migration will update the create_job_with_coords database function"
echo "to accept and save the custom_questions parameter."
echo ""
echo "This fixes the bug where custom screening questions were not saved"
echo "when creating jobs with coordinates (which is most jobs)."
echo ""
echo "Please run this SQL in your Supabase dashboard SQL Editor:"
echo ""
cat supabase/migrations/028_add_custom_questions_to_create_job_function.sql
echo ""
echo "=========================================="
echo "After running, custom screening questions will be saved correctly!"
echo "=========================================="
