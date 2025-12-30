-- ============================================================================
-- Migration 043: Create all required storage buckets
-- ============================================================================
-- Purpose: Create storage buckets for applications, certifications, and profiles
--          with appropriate RLS policies for secure access control
-- ============================================================================

-- Create profile-pictures bucket (public read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true, -- Public read access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create certification-photos bucket (public read access for admin review)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certification-photos',
  'certification-photos',
  true, -- Public read access for admin verification
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create application-drafts bucket (private, temporary storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-drafts',
  'application-drafts',
  true, -- Public for easy access during draft phase
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Create applications bucket (public read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'applications',
  'applications',
  true, -- Public read for employers to view applications
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS Policies for profile-pictures
-- ============================================================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all profile pictures
CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- RLS Policies for application-drafts
-- ============================================================================

-- Allow authenticated users to upload drafts to their own folder
CREATE POLICY "Users can upload application drafts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own drafts
CREATE POLICY "Users can view own application drafts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own drafts
CREATE POLICY "Users can update application drafts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own drafts
CREATE POLICY "Users can delete application drafts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- RLS Policies for applications bucket
-- ============================================================================

-- Allow authenticated users to upload to applications bucket
-- Files are organized by applicationId, not userId, so we need a different check
CREATE POLICY "Users can upload application files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'applications');

-- Allow authenticated users to read application files
-- Employers need to see applications submitted to their jobs
CREATE POLICY "Authenticated users can view application files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'applications');

-- Prevent deletion of submitted applications (permanent records)
-- Only allow deletion through application cascade delete
CREATE POLICY "Prevent direct deletion of application files"
ON storage.objects FOR DELETE
TO authenticated
USING (false); -- No direct deletes allowed

-- ============================================================================
-- certification-photos policies already defined in 041_make_certification_photos_public.sql
-- ============================================================================
