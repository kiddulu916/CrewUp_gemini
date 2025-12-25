-- ============================================================================
-- Migration 022: Add Pro Features Schema
-- ============================================================================
-- Adds all missing database schema for Pro subscription features:
-- - Profile boost columns
-- - Custom screening questions
-- - Profile views tracking
-- - Notifications system
-- - Work history endorsements
-- - Experience calculation functions
-- ============================================================================

-- ============================================================================
-- 1. PROFILE BOOST FEATURE
-- ============================================================================

-- Add profile boost columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_profile_boosted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;

-- Create index for efficient boost queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_profile_boosted
ON profiles(is_profile_boosted, created_at DESC);

-- ============================================================================
-- 2. CUSTOM SCREENING QUESTIONS FEATURE
-- ============================================================================

-- Add custom questions to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS custom_questions JSONB;

-- Add custom answers to job_applications table
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS custom_answers JSONB;

-- ============================================================================
-- 3. WHO VIEWED MY PROFILE FEATURE
-- ============================================================================

-- Create profile_views table
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewed_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for profile_views
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_profile_id
ON profile_views(viewed_profile_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id
ON profile_views(viewer_id);

-- Prevent self-views (add constraint only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_no_self_view'
  ) THEN
    ALTER TABLE profile_views
    ADD CONSTRAINT check_no_self_view
    CHECK (viewed_profile_id != viewer_id);
  END IF;
END $$;

-- ============================================================================
-- 4. NOTIFICATIONS SYSTEM
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_job',
    'message',
    'application_update',
    'profile_view',
    'endorsement_request',
    'endorsement_approved'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_read_at
ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================================
-- 5. WORK HISTORY ENDORSEMENTS FEATURE
-- ============================================================================

-- Add endorsement columns to experiences table
ALTER TABLE experiences
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS endorsement_count INTEGER DEFAULT 0;

-- Create endorsement_requests table
CREATE TABLE IF NOT EXISTS endorsement_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  request_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint for endorsement requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_endorsement_request'
  ) THEN
    ALTER TABLE endorsement_requests
    ADD CONSTRAINT unique_endorsement_request UNIQUE(experience_id, employer_id);
  END IF;
END $$;

-- Indexes for endorsement_requests
CREATE INDEX IF NOT EXISTS idx_endorsement_requests_worker_id
ON endorsement_requests(worker_id);

CREATE INDEX IF NOT EXISTS idx_endorsement_requests_employer_id
ON endorsement_requests(employer_id, status);

CREATE INDEX IF NOT EXISTS idx_endorsement_requests_experience_id
ON endorsement_requests(experience_id);

-- Create endorsements table
CREATE TABLE IF NOT EXISTS endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  endorsed_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endorsed_by_name TEXT NOT NULL,
  endorsed_by_company TEXT,
  recommendation_text TEXT,
  verified_dates_worked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add check constraint for recommendation text length
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_recommendation_length'
  ) THEN
    ALTER TABLE endorsements
    ADD CONSTRAINT check_recommendation_length
    CHECK (LENGTH(recommendation_text) <= 200);
  END IF;
END $$;

-- Add unique constraint for endorsements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_endorsement'
  ) THEN
    ALTER TABLE endorsements
    ADD CONSTRAINT unique_endorsement UNIQUE(experience_id, endorsed_by_user_id);
  END IF;
END $$;

-- Indexes for endorsements
CREATE INDEX IF NOT EXISTS idx_endorsements_experience_id
ON endorsements(experience_id);

CREATE INDEX IF NOT EXISTS idx_endorsements_endorsed_by_user_id
ON endorsements(endorsed_by_user_id);

-- ============================================================================
-- 6. TRIGGERS FOR ENDORSEMENT COUNT
-- ============================================================================

-- Function to update endorsement count
CREATE OR REPLACE FUNCTION update_endorsement_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE experiences
    SET
      endorsement_count = endorsement_count + 1,
      is_verified = TRUE
    WHERE id = NEW.experience_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE experiences
    SET endorsement_count = GREATEST(0, endorsement_count - 1)
    WHERE id = OLD.experience_id;

    -- Unverify if no more endorsements
    UPDATE experiences
    SET is_verified = FALSE
    WHERE id = OLD.experience_id
    AND endorsement_count = 0;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for endorsement count
DROP TRIGGER IF EXISTS endorsement_count_trigger ON endorsements;
CREATE TRIGGER endorsement_count_trigger
AFTER INSERT OR DELETE ON endorsements
FOR EACH ROW
EXECUTE FUNCTION update_endorsement_count();

-- ============================================================================
-- 7. EXPERIENCE CALCULATION FUNCTIONS
-- ============================================================================

-- Function to calculate total experience in years
CREATE OR REPLACE FUNCTION calculate_total_experience(
  p_user_id UUID,
  p_trade_filter TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  total_months INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    EXTRACT(YEAR FROM AGE(
      COALESCE(end_date, NOW()::DATE),
      start_date
    ))::INTEGER * 12 +
    EXTRACT(MONTH FROM AGE(
      COALESCE(end_date, NOW()::DATE),
      start_date
    ))::INTEGER
  ), 0)
  INTO total_months
  FROM experiences e
  WHERE e.user_id = p_user_id
  AND (p_trade_filter IS NULL OR
       EXISTS (
         SELECT 1 FROM profiles p
         WHERE p.id = e.user_id
         AND p.trade = p_trade_filter
       ));

  RETURN total_months / 12; -- Return years
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_total_experience TO authenticated;

-- Function to search workers by experience
CREATE OR REPLACE FUNCTION get_workers_by_experience(
  p_min_years INTEGER DEFAULT 0,
  p_trade_filter TEXT DEFAULT NULL,
  p_limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  trade TEXT,
  sub_trade TEXT,
  location TEXT,
  coords GEOGRAPHY,
  total_experience_years INTEGER,
  subscription_status TEXT,
  is_profile_boosted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.trade,
    p.sub_trade,
    p.location,
    p.coords,
    calculate_total_experience(p.id, p_trade_filter) as total_experience_years,
    p.subscription_status,
    p.is_profile_boosted
  FROM profiles p
  WHERE p.role = 'worker'
  AND calculate_total_experience(p.id, p_trade_filter) >= p_min_years
  AND (p_trade_filter IS NULL OR p.trade = p_trade_filter)
  ORDER BY total_experience_years DESC, is_profile_boosted DESC
  LIMIT p_limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_workers_by_experience TO authenticated;

-- ============================================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

-- Profile Views Policies
CREATE POLICY "Users can insert profile views"
  ON profile_views FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "Users can view all profile views"
  ON profile_views FOR SELECT
  TO authenticated
  USING (true);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Endorsement Requests Policies
CREATE POLICY "Pro workers can create endorsement requests"
  ON endorsement_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    worker_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'worker'
      AND profiles.subscription_status = 'pro'
    )
  );

CREATE POLICY "Users can view endorsement requests they're involved in"
  ON endorsement_requests FOR SELECT
  TO authenticated
  USING (
    worker_id = auth.uid() OR employer_id = auth.uid()
  );

CREATE POLICY "Employers can update endorsement requests"
  ON endorsement_requests FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid());

-- Endorsements Policies
CREATE POLICY "Employers can create endorsements"
  ON endorsements FOR INSERT
  TO authenticated
  WITH CHECK (endorsed_by_user_id = auth.uid());

CREATE POLICY "Anyone can view endorsements"
  ON endorsements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Endorsers can update their endorsements"
  ON endorsements FOR UPDATE
  TO authenticated
  USING (endorsed_by_user_id = auth.uid());

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
