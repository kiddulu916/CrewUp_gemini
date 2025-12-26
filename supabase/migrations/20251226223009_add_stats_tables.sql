-- Add missing tables for stats functionality

-- 1. Jobs table (if not exists)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  trade TEXT NOT NULL,
  sub_trade TEXT,
  job_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  coords GEOGRAPHY(POINT),
  pay_rate TEXT NOT NULL,
  pay_min NUMERIC,
  pay_max NUMERIC,
  required_certs TEXT[],
  custom_questions JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'filled', 'expired', 'draft')),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_coords ON jobs USING GIST(coords);
CREATE INDEX IF NOT EXISTS idx_jobs_trade ON jobs(trade);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_id ON jobs(employer_id);

-- 2. Job Applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'rejected', 'hired')),
  cover_message TEXT,
  custom_answers JSONB,
  contact_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

-- Indexes for job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(job_id, status);

-- 3. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (participant_1_id < participant_2_id),
  UNIQUE(participant_1_id, participant_2_id)
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- 4. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- 5. Profile Views table
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewed_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profile_views
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_profile ON profile_views(viewed_profile_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);

-- 6. Job Views table
CREATE TABLE IF NOT EXISTS job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job_views
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_views_session ON job_views(session_id, job_id);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs
DROP POLICY IF EXISTS "Everyone can view active jobs" ON jobs;
CREATE POLICY "Everyone can view active jobs"
  ON jobs FOR SELECT
  USING (status = 'active' OR employer_id = auth.uid());

DROP POLICY IF EXISTS "Employers can insert their own jobs" ON jobs;
CREATE POLICY "Employers can insert their own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "Employers can update their own jobs" ON jobs;
CREATE POLICY "Employers can update their own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = employer_id);

DROP POLICY IF EXISTS "Employers can delete their own jobs" ON jobs;
CREATE POLICY "Employers can delete their own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = employer_id);

-- RLS Policies for job_applications
DROP POLICY IF EXISTS "Workers can view their own applications" ON job_applications;
CREATE POLICY "Workers can view their own applications"
  ON job_applications FOR SELECT
  USING (auth.uid() = applicant_id OR auth.uid() IN (
    SELECT employer_id FROM jobs WHERE id = job_id
  ));

DROP POLICY IF EXISTS "Workers can insert their own applications" ON job_applications;
CREATE POLICY "Workers can insert their own applications"
  ON job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Workers and employers can update applications" ON job_applications;
CREATE POLICY "Workers and employers can update applications"
  ON job_applications FOR UPDATE
  USING (auth.uid() = applicant_id OR auth.uid() IN (
    SELECT employer_id FROM jobs WHERE id = job_id
  ));

-- RLS Policies for conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- RLS Policies for profile_views
DROP POLICY IF EXISTS "Users can view their own profile views" ON profile_views;
CREATE POLICY "Users can view their own profile views"
  ON profile_views FOR SELECT
  USING (auth.uid() = viewed_profile_id);

DROP POLICY IF EXISTS "Users can insert profile views" ON profile_views;
CREATE POLICY "Users can insert profile views"
  ON profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- RLS Policies for job_views
DROP POLICY IF EXISTS "Job owners can view their job views" ON job_views;
CREATE POLICY "Job owners can view their job views"
  ON job_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE id = job_id AND employer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can insert job views" ON job_views;
CREATE POLICY "Anyone can insert job views"
  ON job_views FOR INSERT
  WITH CHECK (true);
