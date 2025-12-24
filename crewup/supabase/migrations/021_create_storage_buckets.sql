-- ============================================================================
-- STORAGE BUCKET FOLDER STRUCTURE DOCUMENTATION
-- ============================================================================
--
-- application-drafts bucket:
--   Stores temporary files while users fill out job application forms
--   Folder structure: /{user_id}/{filename}
--   - user_id: The UUID of the authenticated user creating the draft
--   - filename: Original filename with extension (e.g., resume.pdf, cert.jpg)
--   Lifecycle: Files are moved to 'applications' bucket upon form submission
--   Cleanup: Users can delete their own drafts; system cleans up abandoned drafts
--
-- applications bucket:
--   Stores finalized application files after submission
--   Folder structure: /{application_id}/{filename}
--   - application_id: The UUID of the job_applications record
--   - filename: Original filename with extension
--   Lifecycle: Permanent storage linked to job_applications table
--   Access: Workers can view their own files; employers can view files for their jobs
--   Compliance: System can delete files for GDPR compliance and data retention
--
-- File constraints:
--   - Maximum file size: 10MB per file
--   - Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
--   - Enforced at application layer and storage bucket configuration
--
-- ============================================================================

-- Create application-drafts bucket with file constraints
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-drafts',
  'application-drafts',
  false,
  10485760, -- 10MB in bytes
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Create applications bucket with file constraints
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'applications',
  'applications',
  false,
  10485760, -- 10MB in bytes
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage policies for application-drafts bucket
-- Users can upload to their own folder only
CREATE POLICY "Users upload to own draft folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own draft files
CREATE POLICY "Users view own draft files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own draft files
CREATE POLICY "Users update own draft files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own draft files
CREATE POLICY "Users delete own draft files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'application-drafts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for applications bucket
-- System can upload (via service role)
CREATE POLICY "System uploads application files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'applications'
  );

-- Worker or employer can view application files
CREATE POLICY "Worker or employer views application files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'applications'
    AND (
      -- Worker who submitted
      auth.uid() IN (
        SELECT worker_id FROM job_applications
        WHERE id::text = (storage.foldername(name))[1]
      )
      OR
      -- Employer of the job
      auth.uid() IN (
        SELECT j.employer_id FROM job_applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id::text = (storage.foldername(name))[1]
      )
    )
  );

-- System can update application files (via service role)
-- Used for file metadata updates, migrations, or corrections
CREATE POLICY "System updates application files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'applications'
  );

-- System can delete application files (via service role)
-- Required for GDPR compliance (right to be forgotten)
-- Required for data retention policy enforcement
-- Required for cleanup of withdrawn applications
CREATE POLICY "System deletes application files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'applications'
  );
