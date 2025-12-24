-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, subscription_status, trade, location, bio)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User-' || substring(NEW.id::text, 1, 8)),
    'worker',
    'free',
    'General Laborer',
    'Update your location',
    'Ready to work hard and learn new skills on site!'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute handle_new_user on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at on tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proximity_alerts_updated_at
  BEFORE UPDATE ON proximity_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function to increment job view count
CREATE OR REPLACE FUNCTION increment_job_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs
  SET view_count = view_count + 1
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment view count on job view
CREATE TRIGGER increment_job_views
  AFTER INSERT ON job_views
  FOR EACH ROW EXECUTE FUNCTION increment_job_view_count();

-- Function to increment job application count
CREATE OR REPLACE FUNCTION increment_application_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs
  SET application_count = application_count + 1
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment application count on new application
CREATE TRIGGER increment_applications
  AFTER INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION increment_application_count();
