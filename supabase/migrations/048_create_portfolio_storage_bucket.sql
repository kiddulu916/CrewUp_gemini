-- Migration 048: Create Portfolio Images Storage Bucket
-- Created: 2026-01-02
-- Description: Storage bucket for portfolio images with RLS policies

-- Create storage bucket with size and type restrictions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  true,
  5242880, -- 5MB limit per image
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "portfolio_images_select" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_images_update" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_images_delete" ON storage.objects;

-- RLS Policies for storage.objects
CREATE POLICY "portfolio_images_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'portfolio-images');

CREATE POLICY "portfolio_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolio_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolio_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
