-- ============================================================================
-- Migration 041: Make certification-photos bucket public
-- ============================================================================
-- Purpose: Allow public read access to certification photos so they can be
--          displayed in the admin verification interface and user profiles
-- ============================================================================

-- Make the bucket public
UPDATE storage.buckets
SET public = true
WHERE name = 'certification-photos';

-- Add RLS policies for the bucket
-- Note: Even though the bucket is public, we still want RLS to control uploads/deletes

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can upload certification photos to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own certification photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view certification photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own certification photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all certification photos" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload certification photos to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certification-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow PUBLIC read access to all certification photos (for admin review)
CREATE POLICY "Public can view certification photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certification-photos');

-- Allow authenticated users to delete their own certification photos
CREATE POLICY "Users can delete own certification photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certification-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
