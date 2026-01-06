-- 1. Professional References
CREATE TABLE "public"."professional_references" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL,
    "company" "text",
    "phone" "text",
    "email" "text",
    "relationship" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Application Drafts
CREATE TABLE "public"."application_drafts" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "job_id" "uuid" NOT NULL REFERENCES "public"."jobs"("id") ON DELETE CASCADE,
    "applicant_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "form_data" "jsonb" NOT NULL DEFAULT '{}'::jsonb,
    "resume_url" "text",
    "cover_letter_url" "text",
    "resume_extracted_text" "text",
    "last_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    UNIQUE("job_id", "applicant_id")
);

-- 3. Profile Views
CREATE TABLE "public"."profile_views" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "viewed_profile_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "viewer_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Job Views
CREATE TABLE "public"."job_views" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "job_id" "uuid" NOT NULL REFERENCES "public"."jobs"("id") ON DELETE CASCADE,
    "viewer_id" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "session_id" "text" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Proximity Alerts
CREATE TABLE "public"."proximity_alerts" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE UNIQUE,
    "radius_km" numeric NOT NULL DEFAULT 25,
    "trades" "text"[] NOT NULL DEFAULT '{}',
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Endorsement Requests
CREATE TABLE "public"."endorsement_requests" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "experience_id" "uuid" NOT NULL REFERENCES "public"."experiences"("id") ON DELETE CASCADE,
    "worker_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "employer_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "status" "text" DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'declined')),
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Admin Activity Log
CREATE TABLE "public"."admin_activity_log" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "admin_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "details" "jsonb" DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Content Reports
CREATE TABLE "public"."content_reports" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "reporter_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "reported_user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'actioned', 'dismissed')),
    "action_taken" "text",
    "admin_notes" "text",
    "reviewed_by" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 9. Platform Settings
CREATE TABLE "public"."platform_settings" (
    "key" "text" NOT NULL PRIMARY KEY,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. User Moderation Actions
CREATE TABLE "public"."user_moderation_actions" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "action_type" "text" NOT NULL CHECK (action_type IN ('warning', 'suspension', 'ban')),
    "reason" "text" NOT NULL,
    "duration_days" integer,
    "expires_at" timestamp with time zone,
    "actioned_by" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 11. Fix Endorsements Table (Redefine to match code)
DROP TABLE IF EXISTS "public"."endorsements";
CREATE TABLE "public"."endorsements" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "experience_id" "uuid" NOT NULL REFERENCES "public"."experiences"("id") ON DELETE CASCADE,
    "endorsed_by_user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "endorsed_by_name" "text" NOT NULL,
    "endorsed_by_company" "text",
    "recommendation_text" "text",
    "verified_dates_worked" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("experience_id", "endorsed_by_user_id")
);

-- RLS Policies
ALTER TABLE "public"."professional_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."application_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profile_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."job_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."proximity_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."endorsement_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."admin_activity_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_moderation_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."endorsements" ENABLE ROW LEVEL SECURITY;

-- Professional References: Users can view/edit their own
CREATE POLICY "Users can manage own professional references" ON "public"."professional_references"
    FOR ALL USING (auth.uid() = user_id);

-- Application Drafts: Applicants can manage their own
CREATE POLICY "Applicants can manage own drafts" ON "public"."application_drafts"
    FOR ALL USING (auth.uid() = applicant_id);

-- Profile Views: Users can view views of their own profile
CREATE POLICY "Users can view own profile views" ON "public"."profile_views"
    FOR SELECT USING (auth.uid() = viewed_profile_id);

-- Job Views: Employers can view analytics for their own jobs
CREATE POLICY "Employers can view own job views" ON "public"."job_views"
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_views.job_id AND jobs.employer_id = auth.uid())
    );

-- Proximity Alerts: Users can manage their own
CREATE POLICY "Users can manage own proximity alerts" ON "public"."proximity_alerts"
    FOR ALL USING (auth.uid() = user_id);

-- Endorsement Requests: Workers view sent, Employers view received/update
CREATE POLICY "Workers can view sent endorsement requests" ON "public"."endorsement_requests"
    FOR SELECT USING (auth.uid() = worker_id);
CREATE POLICY "Employers can view/update received endorsement requests" ON "public"."endorsement_requests"
    FOR ALL USING (auth.uid() = employer_id);

-- Admin Activity Log: Only admins can view
CREATE POLICY "Admins can view activity log" ON "public"."admin_activity_log"
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Content Reports: Only admins can manage, reporters can view their own
CREATE POLICY "Admins can manage content reports" ON "public"."content_reports"
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );
CREATE POLICY "Reporters can view own reports" ON "public"."content_reports"
    FOR SELECT USING (auth.uid() = reporter_id);

-- Platform Settings: Everyone can view, only admins can update
CREATE POLICY "Anyone can view platform settings" ON "public"."platform_settings"
    FOR SELECT USING (true);
CREATE POLICY "Admins can update platform settings" ON "public"."platform_settings"
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- User Moderation Actions: Admins manage, users view their own
CREATE POLICY "Admins can manage moderation actions" ON "public"."user_moderation_actions"
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );
CREATE POLICY "Users can view own moderation actions" ON "public"."user_moderation_actions"
    FOR SELECT USING (auth.uid() = user_id);

-- Endorsements: Public view, Employers manage their own
CREATE POLICY "Endorsements are viewable by everyone" ON "public"."endorsements"
    FOR SELECT USING (true);
CREATE POLICY "Employers can manage own endorsements" ON "public"."endorsements"
    FOR ALL USING (auth.uid() = endorsed_by_user_id);

-- Indexes
CREATE INDEX "idx_prof_refs_user" ON "public"."professional_references" ("user_id");
CREATE INDEX "idx_app_drafts_applicant" ON "public"."application_drafts" ("applicant_id");
CREATE INDEX "idx_app_drafts_job" ON "public"."application_drafts" ("job_id");
CREATE INDEX "idx_profile_views_viewed" ON "public"."profile_views" ("viewed_profile_id");
CREATE INDEX "idx_job_views_job" ON "public"."job_views" ("job_id");
CREATE INDEX "idx_proximity_alerts_user" ON "public"."proximity_alerts" ("user_id");
CREATE INDEX "idx_endorsement_req_worker" ON "public"."endorsement_requests" ("worker_id");
CREATE INDEX "idx_endorsement_req_employer" ON "public"."endorsement_requests" ("employer_id");
CREATE INDEX "idx_admin_activity_admin" ON "public"."admin_activity_log" ("admin_id");
CREATE INDEX "idx_content_reports_status" ON "public"."content_reports" ("status");
CREATE INDEX "idx_moderation_user" ON "public"."user_moderation_actions" ("user_id");
CREATE INDEX "idx_endorsements_exp" ON "public"."endorsements" ("experience_id");
