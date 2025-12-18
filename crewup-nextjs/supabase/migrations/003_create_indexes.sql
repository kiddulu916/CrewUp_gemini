-- Indexes for profiles table
CREATE INDEX idx_profiles_coords ON profiles USING GIST(coords);
CREATE INDEX idx_profiles_trade ON profiles(trade);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_subscription_status ON profiles(subscription_status);

-- Indexes for certifications table
CREATE INDEX idx_certifications_user_id ON certifications(user_id);
CREATE INDEX idx_certifications_type ON certifications(certification_type);
CREATE INDEX idx_certifications_verified ON certifications(is_verified);

-- Indexes for work_experience table
CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);

-- Indexes for jobs table
CREATE INDEX idx_jobs_coords ON jobs USING GIST(coords);
CREATE INDEX idx_jobs_trade ON jobs(trade);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);

-- Indexes for job_applications table
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_worker_id ON job_applications(worker_id);
CREATE INDEX idx_job_applications_status ON job_applications(job_id, status);

-- Indexes for conversations table
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Indexes for messages table
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- Indexes for subscriptions table
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);

-- Indexes for profile_views table
CREATE INDEX idx_profile_views_viewed_profile ON profile_views(viewed_profile_id, viewed_at DESC);
CREATE INDEX idx_profile_views_viewer ON profile_views(viewer_id);

-- Indexes for job_views table
CREATE INDEX idx_job_views_job_id ON job_views(job_id, viewed_at DESC);
CREATE INDEX idx_job_views_session ON job_views(session_id, job_id);

-- Indexes for proximity_alerts table
CREATE INDEX idx_proximity_alerts_user_id ON proximity_alerts(user_id);
CREATE INDEX idx_proximity_alerts_active ON proximity_alerts(is_active);

-- Indexes for notifications table
CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(user_id, read_at);
