-- supabase/migrations/046_analytics_indexes.sql
-- Add indexes for analytics performance

-- Profile views indexes
CREATE INDEX IF NOT EXISTS idx_profile_views_date
  ON profile_views(viewed_profile_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer
  ON profile_views(viewer_id, viewed_at DESC);

-- Job applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_status
  ON job_applications(job_id, status, created_at DESC);

-- Index for filtering applications by applicant
CREATE INDEX IF NOT EXISTS idx_applications_applicant
  ON job_applications(applicant_id, created_at DESC);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_employer
  ON jobs(employer_id, created_at DESC);

-- Compatibility scoring indexes
CREATE INDEX IF NOT EXISTS idx_certifications_user
  ON certifications(user_id, certification_type);

CREATE INDEX IF NOT EXISTS idx_experiences_user
  ON experiences(user_id);
