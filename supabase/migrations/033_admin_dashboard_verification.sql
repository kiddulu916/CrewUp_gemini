-- Admin Dashboard & Certification Verification System
-- Migration 033
-- Created: 2025-12-27

-- ============================================================================
-- 1. Add admin and job posting flags to profiles
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_post_jobs BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN profiles.is_admin IS 'Grants access to /admin/* routes';
COMMENT ON COLUMN profiles.can_post_jobs IS 'Controls job posting ability (false for unverified contractors)';

-- ============================================================================
-- 2. Add verification fields to certifications table
-- ============================================================================

ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

COMMENT ON COLUMN certifications.verification_status IS 'Current verification state';
COMMENT ON COLUMN certifications.verified_at IS 'Timestamp when verification completed';
COMMENT ON COLUMN certifications.verified_by IS 'Admin user who verified (for audit trail)';
COMMENT ON COLUMN certifications.rejection_reason IS 'Displayed to user if rejected';
COMMENT ON COLUMN certifications.verification_notes IS 'Internal admin notes (not shown to user)';

CREATE INDEX IF NOT EXISTS idx_certifications_verification_status
  ON certifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_certifications_verified_by
  ON certifications(verified_by);

-- ============================================================================
-- 3. Create admin activity log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admin_activity_log IS 'Audit trail of all admin actions';
COMMENT ON COLUMN admin_activity_log.action IS 'Action type: verified_cert, rejected_cert, banned_user, etc.';
COMMENT ON COLUMN admin_activity_log.target_type IS 'Target type: certification, user, job, application, etc.';
COMMENT ON COLUMN admin_activity_log.details IS 'Flexible JSONB field for action-specific data';

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin
  ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_date
  ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target
  ON admin_activity_log(target_type, target_id);

-- ============================================================================
-- 4. Create platform settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE platform_settings IS 'Platform-wide configuration settings';

-- Seed with default settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Site-wide maintenance mode'),
  ('verification_turnaround_hours', '48', 'Expected cert verification time'),
  ('allow_signups', 'true', 'Allow new user registrations'),
  ('require_email_verification', 'true', 'Require email verification on signup')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 5. Create content reports table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_content_type TEXT NOT NULL,
  reported_content_id UUID NOT NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE content_reports IS 'User-submitted content reports for moderation';
COMMENT ON COLUMN content_reports.reported_content_type IS 'Type: job, profile, message';
COMMENT ON COLUMN content_reports.reason IS 'Reason: spam, inappropriate, fraud, harassment, other';
COMMENT ON COLUMN content_reports.action_taken IS 'Action: content_removed, user_warned, user_banned, no_action';

CREATE INDEX IF NOT EXISTS idx_content_reports_status
  ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter
  ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user
  ON content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_date
  ON content_reports(created_at DESC);

-- ============================================================================
-- 6. Create user moderation actions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  duration_days INTEGER,
  expires_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_moderation_actions IS 'User moderation history (warnings, suspensions, bans)';
COMMENT ON COLUMN user_moderation_actions.action_type IS 'Type: warning, suspension, ban, unbanned';
COMMENT ON COLUMN user_moderation_actions.duration_days IS 'For temporary suspensions (NULL = permanent ban)';

CREATE INDEX IF NOT EXISTS idx_user_moderation_user
  ON user_moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_expires
  ON user_moderation_actions(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 7. Create analytics events table (optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE analytics_events IS 'Custom analytics event tracking';
COMMENT ON COLUMN analytics_events.event_type IS 'Event: page_view, job_view, application_submitted, etc.';
COMMENT ON COLUMN analytics_events.metadata IS 'Flexible event data: {job_id, route, etc.}';

CREATE INDEX IF NOT EXISTS idx_analytics_events_type
  ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date
  ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events(user_id);

-- ============================================================================
-- 8. Row Level Security (RLS) Policies
-- ============================================================================

-- Admin Activity Log
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON admin_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can log activity"
  ON admin_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Platform Settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON platform_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Content Reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON content_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON content_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- User Moderation Actions
ALTER TABLE user_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view moderation actions"
  ON user_moderation_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create moderation actions"
  ON user_moderation_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Analytics Events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
