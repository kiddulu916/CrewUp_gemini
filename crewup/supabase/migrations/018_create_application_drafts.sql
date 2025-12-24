-- Create application_drafts table
CREATE TABLE application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}',
  resume_url TEXT,
  cover_letter_url TEXT,
  resume_extracted_text TEXT,
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, worker_id)
);

-- Create indexes for performance
CREATE INDEX idx_application_drafts_worker ON application_drafts(worker_id);
CREATE INDEX idx_application_drafts_job ON application_drafts(job_id);
CREATE INDEX idx_application_drafts_expires ON application_drafts(expires_at);

-- Enable RLS
ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;

-- Workers can only see/manage their own drafts
CREATE POLICY "Workers can view own drafts"
  ON application_drafts FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create own drafts"
  ON application_drafts FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can update own drafts"
  ON application_drafts FOR UPDATE
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can delete own drafts"
  ON application_drafts FOR DELETE
  USING (auth.uid() = worker_id);
