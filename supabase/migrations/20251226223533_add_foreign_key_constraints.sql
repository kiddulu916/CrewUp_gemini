-- Add foreign key constraints to profile_views table if they don't exist

-- Add foreign key constraint for viewer_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profile_views_viewer_id_fkey'
  ) THEN
    ALTER TABLE profile_views
      ADD CONSTRAINT profile_views_viewer_id_fkey
      FOREIGN KEY (viewer_id)
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for viewed_profile_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profile_views_viewed_profile_id_fkey'
  ) THEN
    ALTER TABLE profile_views
      ADD CONSTRAINT profile_views_viewed_profile_id_fkey
      FOREIGN KEY (viewed_profile_id)
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraints to conversations table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_participant_1_id_fkey'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_participant_1_id_fkey
      FOREIGN KEY (participant_1_id)
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_participant_2_id_fkey'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_participant_2_id_fkey
      FOREIGN KEY (participant_2_id)
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraints to messages table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_conversation_id_fkey'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES conversations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_sender_id_fkey'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_sender_id_fkey
      FOREIGN KEY (sender_id)
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraints to job_views table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_views_job_id_fkey'
  ) THEN
    ALTER TABLE job_views
      ADD CONSTRAINT job_views_job_id_fkey
      FOREIGN KEY (job_id)
      REFERENCES jobs(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_views_viewer_id_fkey'
  ) THEN
    ALTER TABLE job_views
      ADD CONSTRAINT job_views_viewer_id_fkey
      FOREIGN KEY (viewer_id)
      REFERENCES profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;
