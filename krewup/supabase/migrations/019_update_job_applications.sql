/*
 * Migration: Update job_applications table for enhanced application management
 *
 * PURPOSE:
 * - Add structured form_data storage for standard application form fields
 * - Add support for resume/cover letter file uploads
 * - Add resume text extraction for searchability
 * - Migrate legacy cover_message data to new structure
 * - Add 'withdrawn' status for worker-initiated application cancellation
 *
 * COLUMN USAGE CLARIFICATION:
 *
 * 1. form_data (JSONB):
 *    - Stores standard application form fields that are ALWAYS collected
 *    - Example fields: coverLetterText, availability, startDate, etc.
 *    - This is the structured replacement for the deprecated cover_message column
 *    - Schema is defined by the application's standard job application form
 *
 * 2. custom_answers (JSONB) [existing column]:
 *    - Stores answers to EMPLOYER-DEFINED custom screening questions
 *    - These are optional, job-specific questions that employers can add
 *    - Example: "Do you have experience with commercial roofing?"
 *    - Completely separate from the standard application form in form_data
 *
 * 3. cover_message (TEXT) [DEPRECATED]:
 *    - Legacy column for unstructured cover letter text
 *    - DEPRECATED in favor of form_data.coverLetterText
 *    - Kept for backward compatibility but should not be used in new code
 *    - All existing data is migrated to form_data during this migration
 *
 * DEPRECATION NOTICE:
 * The cover_message column is now deprecated. Use form_data.coverLetterText instead.
 * This allows for structured storage of all application form fields in a single JSON object.
 */

-- Add new columns to job_applications table
ALTER TABLE job_applications
  ADD COLUMN form_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN resume_url TEXT,
  ADD COLUMN cover_letter_url TEXT,
  ADD COLUMN resume_extracted_text TEXT;

-- Add comment to mark cover_message as deprecated
COMMENT ON COLUMN job_applications.cover_message IS
  'DEPRECATED: Use form_data.coverLetterText instead. Kept for backward compatibility only.';

-- Migrate existing cover_message to form_data
UPDATE job_applications
SET form_data = jsonb_build_object('coverLetterText', cover_message)
WHERE cover_message IS NOT NULL AND cover_message != '';

-- Add indexes for performance
CREATE INDEX idx_job_applications_job_status ON job_applications(job_id, status);
CREATE INDEX idx_job_applications_applicant_created ON job_applications(applicant_id, created_at DESC);

-- Add new status value 'withdrawn' to check constraint
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE job_applications ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending', 'viewed', 'contacted', 'rejected', 'hired', 'withdrawn'));

/*
 * ROLLBACK PROCEDURE:
 *
 * To rollback this migration:
 *
 * 1. Migrate data back from form_data to cover_message:
 *    UPDATE job_applications
 *    SET cover_message = form_data->>'coverLetterText'
 *    WHERE form_data->>'coverLetterText' IS NOT NULL
 *      AND (cover_message IS NULL OR cover_message = '');
 *
 * 2. Drop the new columns:
 *    ALTER TABLE job_applications
 *      DROP COLUMN form_data,
 *      DROP COLUMN resume_url,
 *      DROP COLUMN cover_letter_url,
 *      DROP COLUMN resume_extracted_text;
 *
 * 3. Drop the new indexes:
 *    DROP INDEX IF EXISTS idx_job_applications_job_status;
 *    DROP INDEX IF EXISTS idx_job_applications_worker_created;
 *
 * 4. Restore the original status check constraint:
 *    ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;
 *    ALTER TABLE job_applications ADD CONSTRAINT job_applications_status_check
 *      CHECK (status IN ('pending', 'viewed', 'contacted', 'rejected', 'hired'));
 *
 * Note: Rollback will lose any resume_url, cover_letter_url, and resume_extracted_text data.
 */
