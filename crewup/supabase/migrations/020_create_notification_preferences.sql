-- ============================================================================
-- Notification Preferences Table
-- ============================================================================
--
-- Purpose:
--   Stores user preferences for notifications across different channels
--   (email, desktop, push) and types (application updates, new applications).
--   Each user has a single row created automatically when their profile is
--   created via the on_profile_created_create_notification_preferences trigger.
--
-- Key Features:
--   - One-to-one relationship with profiles (user_id is primary key)
--   - Cascading delete when profile is removed
--   - Granular control over notification types and delivery methods
--   - Email digest frequency options (immediate, daily, weekly, never)
--   - Auto-created with sensible defaults for new users
--   - RLS policies ensure users can only manage their own preferences
--
-- ============================================================================

-- Create notification_preferences table
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  application_status_changes BOOLEAN DEFAULT TRUE,
  new_applications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  email_digest TEXT DEFAULT 'immediate' CHECK (email_digest IN ('immediate', 'daily', 'weekly', 'never')),
  desktop_notifications BOOLEAN DEFAULT TRUE,
  notification_sound BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-create preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on profile creation
CREATE TRIGGER on_profile_created_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
