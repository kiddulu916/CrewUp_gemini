-- Migration 047: Create Portfolio Images Table
-- Created: 2026-01-02
-- Description: Table for storing worker portfolio photo metadata with RLS policies

-- Create table
CREATE TABLE IF NOT EXISTS portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_order UNIQUE(user_id, display_order)
);

-- Index for fast lookups by user with display order
CREATE INDEX IF NOT EXISTS idx_portfolio_images_user_display_order
  ON portfolio_images(user_id, display_order);

-- Enable Row Level Security
ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Portfolio images are publicly viewable" ON portfolio_images;
DROP POLICY IF EXISTS "Users can insert own portfolio images" ON portfolio_images;
DROP POLICY IF EXISTS "Users can update own portfolio images" ON portfolio_images;
DROP POLICY IF EXISTS "Users can delete own portfolio images" ON portfolio_images;
DROP POLICY IF EXISTS "Admins can delete portfolio images for moderation" ON portfolio_images;

-- RLS Policies
CREATE POLICY "Portfolio images are publicly viewable"
  ON portfolio_images FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own portfolio images"
  ON portfolio_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio images"
  ON portfolio_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio images"
  ON portfolio_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin policies for moderation
CREATE POLICY "Admins can delete portfolio images for moderation"
  ON portfolio_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Documentation
COMMENT ON TABLE portfolio_images IS 'Worker portfolio photos with display order and metadata';
COMMENT ON COLUMN portfolio_images.id IS 'Unique identifier for portfolio image';
COMMENT ON COLUMN portfolio_images.user_id IS 'Worker who uploaded the image';
COMMENT ON COLUMN portfolio_images.image_url IS 'Public URL to image in Supabase Storage';
COMMENT ON COLUMN portfolio_images.display_order IS 'Order for displaying images (0-indexed)';
COMMENT ON COLUMN portfolio_images.uploaded_at IS 'Timestamp when image was uploaded';
