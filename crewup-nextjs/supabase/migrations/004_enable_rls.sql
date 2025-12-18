-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE proximity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Certifications RLS Policies
CREATE POLICY "Users can view all certifications"
  ON certifications FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own certifications"
  ON certifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own certifications"
  ON certifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own certifications"
  ON certifications FOR DELETE
  USING (auth.uid() = user_id);

-- Work Experience RLS Policies
CREATE POLICY "Users can view all work experience"
  ON work_experience FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own work experience"
  ON work_experience FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work experience"
  ON work_experience FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own work experience"
  ON work_experience FOR DELETE
  USING (auth.uid() = user_id);

-- Jobs RLS Policies
CREATE POLICY "Users can view active jobs"
  ON jobs FOR SELECT
  USING (status = 'active' OR employer_id = auth.uid());

CREATE POLICY "Employers can insert jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    auth.uid() = employer_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'employer'
    )
  );

CREATE POLICY "Employers can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = employer_id);

-- Job Applications RLS Policies
CREATE POLICY "Workers can view own applications"
  ON job_applications FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Employers can view applications to their jobs"
  ON job_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_applications.job_id
      AND jobs.employer_id = auth.uid()
    )
  );

CREATE POLICY "Workers can insert own applications"
  ON job_applications FOR INSERT
  WITH CHECK (
    auth.uid() = worker_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'worker'
    )
  );

CREATE POLICY "Employers can update applications to their jobs"
  ON job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_applications.job_id
      AND jobs.employer_id = auth.uid()
    )
  );

-- Conversations RLS Policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    auth.uid() = participant_1_id
    OR auth.uid() = participant_2_id
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = participant_1_id
    OR auth.uid() = participant_2_id
  );

-- Messages RLS Policies
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.participant_1_id = auth.uid()
        OR conversations.participant_2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.participant_1_id = auth.uid()
        OR conversations.participant_2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Subscriptions RLS Policies
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Profile Views RLS Policies
CREATE POLICY "Users can view who viewed their profile"
  ON profile_views FOR SELECT
  USING (auth.uid() = viewed_profile_id);

CREATE POLICY "Users can insert profile views"
  ON profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Job Views RLS Policies
CREATE POLICY "Anyone can insert job views"
  ON job_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Employers can view analytics for own jobs"
  ON job_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_views.job_id
      AND jobs.employer_id = auth.uid()
    )
  );

-- Proximity Alerts RLS Policies
CREATE POLICY "Users can view own proximity alerts"
  ON proximity_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proximity alerts"
  ON proximity_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proximity alerts"
  ON proximity_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proximity alerts"
  ON proximity_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications RLS Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
