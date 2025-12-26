-- ============================================================================
-- Migration 027: Fix job_views RLS Policy
-- ============================================================================
-- Purpose: Allow anyone to insert job views (both authenticated and anonymous)
-- ============================================================================

-- Enable RLS on job_views if not already enabled
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert job views" ON job_views;
DROP POLICY IF EXISTS "Anyone can view job views" ON job_views;
DROP POLICY IF EXISTS "Job owners can view their job views" ON job_views;

-- Policy 1: Allow anyone (authenticated or anonymous) to insert job views
CREATE POLICY "Anyone can insert job views"
  ON job_views
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policy 2: Job owners can view all views for their jobs
CREATE POLICY "Job owners can view their job views"
  ON job_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_views.job_id
      AND jobs.employer_id = auth.uid()
    )
  );

-- Verify policies were created
DO $$
BEGIN
  RAISE NOTICE '✓ RLS policies created for job_views';
  RAISE NOTICE '  - Anyone can insert job views';
  RAISE NOTICE '  - Job owners can view their job views';
END $$;
