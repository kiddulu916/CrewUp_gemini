-- ============================================================================
-- Migration 044: Fix Storage RLS Policies
-- ============================================================================
-- Purpose: Drop conflicting policies and recreate them properly
--          Fix issues where files aren't uploading to certain buckets
-- ============================================================================

-- ============================================================================
-- Drop ALL existing storage policies to start fresh
-- ============================================================================

-- Profile pictures policies
DROP POLICY IF EXISTS "Users can upload own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile pictures" ON storage.objects;

-- Certification photos policies
DROP POLICY IF EXISTS "Users can upload certification photos to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own certification photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view certification photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own certification photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all certification photos" ON storage.objects;

-- Application drafts policies
DROP POLICY IF EXISTS "Users can upload application drafts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own application drafts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update application drafts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete application drafts" ON storage.objects;

-- Applications policies
DROP POLICY IF EXISTS "Users can upload application files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view application files" ON storage.objects;
DROP POLICY IF EXISTS "Prevent direct deletion of application files" ON storage.objects;

-- ============================================================================
-- Recreate policies for PROFILE-PICTURES bucket
-- ============================================================================

CREATE POLICY "profile_pictures_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "profile_pictures_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "profile_pictures_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "profile_pictures_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- Recreate policies for CERTIFICATION-PHOTOS bucket
-- ============================================================================

CREATE POLICY "certification_photos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certification-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "certification_photos_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certification-photos');

CREATE POLICY "certification_photos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certification-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'certification-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "certification_photos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certification-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- Recreate policies for APPLICATION-DRAFTS bucket
-- ============================================================================

CREATE POLICY "application_drafts_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "application_drafts_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "application_drafts_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "application_drafts_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-drafts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- Recreate policies for APPLICATIONS bucket (permanent storage)
-- ============================================================================

CREATE POLICY "applications_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'applications');

CREATE POLICY "applications_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'applications');

CREATE POLICY "applications_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'applications')
WITH CHECK (bucket_id = 'applications');

-- Allow deletion only for application owners (files organized by applicationId)
-- This will be controlled at application level, not storage level
CREATE POLICY "applications_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'applications');

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this to verify all policies are created:
-- SELECT policyname, cmd, tablename
-- FROM pg_policies
-- WHERE tablename = 'objects'
-- AND policyname LIKE '%profile_pictures%'
--    OR policyname LIKE '%certification_photos%'
--    OR policyname LIKE '%application_drafts%'
--    OR policyname LIKE '%applications_%'
-- ORDER BY policyname;
