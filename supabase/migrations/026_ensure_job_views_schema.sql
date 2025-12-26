-- ============================================================================
-- Migration 026: Ensure job_views has all required columns
-- ============================================================================
-- Purpose: Fix missing viewer_id column in job_views table
-- ============================================================================

-- Ensure viewer_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'job_views'
    AND column_name = 'viewer_id'
  ) THEN
    ALTER TABLE job_views ADD COLUMN viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added viewer_id column to job_views';
  ELSE
    RAISE NOTICE 'viewer_id column already exists in job_views';
  END IF;
END $$;

-- Ensure session_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'job_views'
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE job_views ADD COLUMN session_id TEXT NOT NULL DEFAULT gen_random_uuid()::text;
    CREATE INDEX IF NOT EXISTS idx_job_views_session ON job_views(session_id);
    RAISE NOTICE 'Added session_id column to job_views';
  ELSE
    RAISE NOTICE 'session_id column already exists in job_views';
  END IF;
END $$;

-- Ensure viewed_at column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'job_views'
    AND column_name = 'viewed_at'
  ) THEN
    ALTER TABLE job_views ADD COLUMN viewed_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added viewed_at column to job_views';
  ELSE
    RAISE NOTICE 'viewed_at column already exists in job_views';
  END IF;
END $$;

-- Create indexes if missing (only if columns exist)
CREATE INDEX IF NOT EXISTS idx_job_views_viewer_id ON job_views(viewer_id);

DO $$
BEGIN
  -- Only create this index if viewed_at column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'job_views'
    AND column_name = 'viewed_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id, viewed_at DESC);
    RAISE NOTICE 'Created index on job_id and viewed_at';
  END IF;
END $$;

-- Verify the schema
DO $$
DECLARE
  viewer_id_exists BOOLEAN;
  session_id_exists BOOLEAN;
  viewed_at_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'job_views'
    AND column_name = 'viewer_id'
  ) INTO viewer_id_exists;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'job_views'
    AND column_name = 'session_id'
  ) INTO session_id_exists;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'job_views'
    AND column_name = 'viewed_at'
  ) INTO viewed_at_exists;

  IF viewer_id_exists AND session_id_exists AND viewed_at_exists THEN
    RAISE NOTICE '✓ Migration successful: job_views schema is correct';
  ELSE
    IF NOT viewer_id_exists THEN
      RAISE WARNING '✗ viewer_id column still missing!';
    END IF;
    IF NOT session_id_exists THEN
      RAISE WARNING '✗ session_id column still missing!';
    END IF;
    IF NOT viewed_at_exists THEN
      RAISE WARNING '✗ viewed_at column still missing!';
    END IF;
  END IF;
END $$;
