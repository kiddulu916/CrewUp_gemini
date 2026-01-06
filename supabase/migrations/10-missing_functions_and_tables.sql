-- Migration: Add missing functions and tables referenced in codebase
-- This migration adds:
-- 1. get_nearby_jobs() RPC function for proximity-based job search
-- 2. notification_preferences table for user notification settings

-- ========================================
-- 1. get_nearby_jobs RPC Function
-- ========================================
-- This function returns active jobs within a radius (in km) from user coordinates
-- Using PostGIS ST_DWithin for efficient spatial queries

CREATE OR REPLACE FUNCTION "public"."get_nearby_jobs"(
    "user_lng" double precision,
    "user_lat" double precision,
    "radius_km" numeric DEFAULT 25
) RETURNS TABLE (
    id uuid,
    employer_id uuid,
    title text,
    description text,
    location text,
    coords geography,
    job_type text,
    pay_rate text,
    pay_min numeric,
    pay_max numeric,
    trades text[],
    sub_trades text[],
    required_certs text[],
    status text,
    view_count integer,
    application_count integer,
    created_at timestamptz,
    updated_at timestamptz,
    distance_km double precision
) LANGUAGE "plpgsql" STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.employer_id,
        j.title,
        j.description,
        j.location,
        j.coords,
        j.job_type,
        j.pay_rate,
        j.pay_min,
        j.pay_max,
        j.trades,
        j.sub_trades,
        j.required_certs,
        j.status,
        j.view_count,
        j.application_count,
        j.created_at,
        j.updated_at,
        -- Calculate distance in kilometers
        (ST_Distance(
            j.coords::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000) as distance_km
    FROM jobs j
    WHERE j.status = 'active'
    AND j.coords IS NOT NULL
    AND ST_DWithin(
        j.coords::geography,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000  -- Convert km to meters
    )
    ORDER BY distance_km ASC;
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION "public"."get_nearby_jobs"(double precision, double precision, numeric) TO anon;
GRANT EXECUTE ON FUNCTION "public"."get_nearby_jobs"(double precision, double precision, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."get_nearby_jobs"(double precision, double precision, numeric) TO service_role;

-- ========================================
-- 2. notification_preferences Table
-- ========================================
-- Table for storing user notification preferences

CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE UNIQUE,
    -- Notification type preferences
    "application_status_changes" boolean DEFAULT true NOT NULL,
    "new_applications" boolean DEFAULT true NOT NULL,
    "new_messages" boolean DEFAULT true NOT NULL,
    "job_matches" boolean DEFAULT true NOT NULL,
    "endorsement_requests" boolean DEFAULT true NOT NULL,
    "profile_views" boolean DEFAULT true NOT NULL,
    -- Delivery channel preferences
    "email_notifications" boolean DEFAULT true NOT NULL,
    "email_digest" text DEFAULT 'daily' CHECK (email_digest IN ('immediate', 'daily', 'weekly', 'never')),
    "push_notifications" boolean DEFAULT true NOT NULL,
    "desktop_notifications" boolean DEFAULT true NOT NULL,
    "notification_sound" boolean DEFAULT true NOT NULL,
    -- Timestamps
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own preferences
CREATE POLICY "Users can view own notification preferences" ON "public"."notification_preferences"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON "public"."notification_preferences"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON "public"."notification_preferences"
    FOR UPDATE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX "idx_notification_prefs_user" ON "public"."notification_preferences" ("user_id");

-- Grant table access
GRANT ALL ON TABLE "public"."notification_preferences" TO anon;
GRANT ALL ON TABLE "public"."notification_preferences" TO authenticated;
GRANT ALL ON TABLE "public"."notification_preferences" TO service_role;

-- ========================================
-- 3. Add 'unbanned' to user_moderation_actions check constraint
-- ========================================
-- Note: The codebase uses 'unbanned' action type but the constraint doesn't allow it.
-- Instead of modifying the constraint (which could break existing data), the codebase 
-- has been updated to delete ban records instead of creating 'unbanned' records.
-- This is the cleaner approach since bans can be removed rather than tracked with opposite actions.

-- No SQL change needed here - codebase was fixed instead.

