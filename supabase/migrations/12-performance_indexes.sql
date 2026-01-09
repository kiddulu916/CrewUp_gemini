-- Migration: Add performance indexes for frequently queried columns
-- These indexes will improve query performance for common operations

-- Jobs table: Index on status for filtering active/filled/closed jobs
CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "public"."jobs" ("status");

-- Jobs table: Composite index on employer_id + status for employer's job listings
CREATE INDEX IF NOT EXISTS "idx_jobs_employer_status" ON "public"."jobs" ("employer_id", "status");

-- Jobs table: Index on created_at for sorting recent jobs
CREATE INDEX IF NOT EXISTS "idx_jobs_created_at" ON "public"."jobs" ("created_at" DESC);

-- Job Applications: Index on status for filtering applications by status
CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "public"."job_applications" ("status");

-- Job Applications: Composite index on applicant_id + status for worker's applications
CREATE INDEX IF NOT EXISTS "idx_applications_applicant_status" ON "public"."job_applications" ("applicant_id", "status");

-- Job Applications: Composite index on job_id + status for employer's received applications
CREATE INDEX IF NOT EXISTS "idx_applications_job_status" ON "public"."job_applications" ("job_id", "status");

-- Job Applications: Index on created_at for sorting recent applications
CREATE INDEX IF NOT EXISTS "idx_applications_created_at" ON "public"."job_applications" ("created_at" DESC);

-- Experiences: Index on user_id (if not already exists)
CREATE INDEX IF NOT EXISTS "idx_experiences_user" ON "public"."experiences" ("user_id");

-- Education: Index on user_id (if not already exists)
CREATE INDEX IF NOT EXISTS "idx_education_user" ON "public"."education" ("user_id");

-- Portfolio Images: Index on user_id (if not already exists)
CREATE INDEX IF NOT EXISTS "idx_portfolio_user" ON "public"."portfolio_images" ("user_id");

-- Notifications: Index on created_at for sorting recent notifications
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "public"."notifications" ("created_at" DESC);

-- Notifications: Composite index on user_id + read_at for filtering unread notifications
-- Note: Unread notifications have read_at IS NULL
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "public"."notifications" ("user_id", "read_at");

-- Messages: Index on created_at for sorting recent messages
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "public"."messages" ("created_at" DESC);

-- Messages: Index on sender_id for sender's sent messages
CREATE INDEX IF NOT EXISTS "idx_messages_sender" ON "public"."messages" ("sender_id");

-- Job Views: Index on session_id for deduplication queries
CREATE INDEX IF NOT EXISTS "idx_job_views_session" ON "public"."job_views" ("session_id");

-- Job Views: Composite index on job_id + session_id for unique view checks
CREATE INDEX IF NOT EXISTS "idx_job_views_job_session" ON "public"."job_views" ("job_id", "session_id");

-- Certifications: Index on verification_status for filtering verified certs
CREATE INDEX IF NOT EXISTS "idx_certs_verification_status" ON "public"."certifications" ("verification_status");

-- Certifications: Composite index on worker_id + verification_status
CREATE INDEX IF NOT EXISTS "idx_certs_worker_status" ON "public"."certifications" ("worker_id", "verification_status");

-- Subscriptions: Index on status for active subscription queries
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "public"."subscriptions" ("status");

-- Profile Views: Index on viewed_at for sorting recent views
CREATE INDEX IF NOT EXISTS "idx_profile_views_viewed_at" ON "public"."profile_views" ("viewed_at" DESC);

-- Profile Views: Composite index on viewed_profile_id + viewed_at for efficient recent views query
CREATE INDEX IF NOT EXISTS "idx_profile_views_profile_date" ON "public"."profile_views" ("viewed_profile_id", "viewed_at" DESC);
