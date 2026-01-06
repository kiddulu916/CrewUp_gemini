


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_total_experience"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  total_months INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    EXTRACT(YEAR FROM AGE(COALESCE(end_date, NOW()::DATE), start_date))::INTEGER * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(end_date, NOW()::DATE), start_date))::INTEGER
  ), 0)
  INTO total_months
  FROM experiences
  WHERE user_id = p_user_id;

  RETURN total_months / 12; -- Return years
END;
$$;


ALTER FUNCTION "public"."calculate_total_experience"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job_with_coords"("p_employer_id" "uuid", "p_title" "text", "p_description" "text", "p_location" "text", "p_lng" double precision, "p_lat" double precision, "p_trades" "text"[], "p_sub_trades" "text"[], "p_job_type" "text", "p_pay_rate" "text", "p_pay_min" numeric, "p_pay_max" numeric, "p_required_certs" "text"[], "p_status" "text" DEFAULT 'active'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO jobs (
    employer_id, title, description, location, coords, trades, sub_trades, job_type, pay_rate, pay_min, pay_max, required_certs, status
  ) VALUES (
    p_employer_id,
    p_title,
    p_description,
    p_location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_trades,
    p_sub_trades,
    p_job_type,
    p_pay_rate,
    p_pay_min,
    p_pay_max,
    p_required_certs,
    p_status
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;


ALTER FUNCTION "public"."create_job_with_coords"("p_employer_id" "uuid", "p_title" "text", "p_description" "text", "p_location" "text", "p_lng" double precision, "p_lat" double precision, "p_trades" "text"[], "p_sub_trades" "text"[], "p_job_type" "text", "p_pay_rate" "text", "p_pay_min" numeric, "p_pay_max" numeric, "p_required_certs" "text"[], "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workers_by_experience"("p_min_years" integer, "p_trade_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "trade" "text", "location" "text", "geo_coords" "public"."geography", "years_exp" integer)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, 
    u.first_name, 
    u.last_name, 
    w.trade, 
    u.location, 
    u.geo_coords,
    w.years_of_experience
  FROM users u
  JOIN workers w ON u.id = w.user_id
  WHERE u.role = 'worker'
  AND w.years_of_experience >= p_min_years
  AND (p_trade_filter IS NULL OR w.trade = p_trade_filter);
END;
$$;


ALTER FUNCTION "public"."get_workers_by_experience"("p_min_years" integer, "p_trade_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_role text := 'worker'; -- Default role
  v_first_name text;
  v_last_name text;
BEGIN
  -- Extract metadata
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'New');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');
  
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    v_role := NEW.raw_user_meta_data->>'role';
  END IF;

  -- 1. Insert into base Users table
  INSERT INTO public.users (
    id, email, first_name, last_name, role, location, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.email, v_first_name, v_last_name, v_role, 'Update Location', NOW(), NOW()
  );

  -- 2. Insert into specific role table
  IF v_role = 'worker' THEN
    INSERT INTO public.workers (user_id, trade) 
    VALUES (NEW.id, 'General Laborer'); -- Default trade
  ELSIF v_role = 'employer' THEN
    -- Check employer type if provided, default to contractor
    IF (NEW.raw_user_meta_data->>'employer_type') = 'contractor' THEN
        INSERT INTO public.contractors (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'employer_type') = 'homeowner' THEN
        INSERT INTO public.home_owners (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'employer_type') = 'developer' THEN
        INSERT INTO public.developers (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'employer_type') = 'recruiter' THEN
        INSERT INTO public.recruiters (user_id) VALUES (NEW.id);
    ELSE
        -- Default fallback
        INSERT INTO public.contractors (user_id) VALUES (NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_has_certifications"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE workers SET has_certifications = true WHERE user_id = NEW.worker_id;
    ELSIF (TG_OP = 'DELETE') THEN
        IF NOT EXISTS (SELECT 1 FROM certifications WHERE worker_id = OLD.worker_id) THEN
            UPDATE workers SET has_certifications = false WHERE user_id = OLD.worker_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_has_certifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_has_cl"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE contractors SET has_cl = true WHERE user_id = NEW.contractor_id;
    ELSIF (TG_OP = 'DELETE') THEN
        IF NOT EXISTS (SELECT 1 FROM licenses WHERE contractor_id = OLD.contractor_id) THEN
            UPDATE contractors SET has_cl = false WHERE user_id = OLD.contractor_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_has_cl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_has_portfolio"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE workers SET has_portfolio = true WHERE user_id = NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Check if any images remain
        IF NOT EXISTS (SELECT 1 FROM portfolio_images WHERE user_id = OLD.user_id) THEN
            UPDATE workers SET has_portfolio = false WHERE user_id = OLD.user_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_has_portfolio"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_activity_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."application_drafts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "applicant_id" "uuid" NOT NULL,
    "form_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "resume_url" "text",
    "cover_letter_url" "text",
    "resume_extracted_text" "text",
    "last_saved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."application_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "issuing_organization" "text" NOT NULL,
    "credential_id" "text",
    "issue_date" "date",
    "expiration_date" "date",
    "image_url" "text",
    "verification_status" "text" DEFAULT 'pending'::"text",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "certifications_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."certifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_user_id" "uuid" NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "action_taken" "text",
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'actioned'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."content_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractors" (
    "user_id" "uuid" NOT NULL,
    "company_name" "text",
    "website" "text",
    "has_cl" boolean DEFAULT false
);


ALTER TABLE "public"."contractors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "participant_1_id" "uuid" NOT NULL,
    "participant_2_id" "uuid" NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "participants_distinct" CHECK (("participant_1_id" <> "participant_2_id"))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."developers" (
    "user_id" "uuid" NOT NULL,
    "company_name" "text",
    "website" "text"
);


ALTER TABLE "public"."developers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."education" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "institution" "text" NOT NULL,
    "degree" "text",
    "field_of_study" "text",
    "start_date" "date",
    "end_date" "date"
);


ALTER TABLE "public"."education" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."endorsement_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "experience_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "employer_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "endorsement_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."endorsement_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."endorsements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "experience_id" "uuid" NOT NULL,
    "endorsed_by_user_id" "uuid" NOT NULL,
    "endorsed_by_name" "text" NOT NULL,
    "endorsed_by_company" "text",
    "recommendation_text" "text",
    "verified_dates_worked" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."endorsements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."experiences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company" "text" NOT NULL,
    "job_title" "text" NOT NULL,
    "description" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_current" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "endorsement_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."experiences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."home_owners" (
    "user_id" "uuid" NOT NULL,
    "project_description" "text"
);


ALTER TABLE "public"."home_owners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_applications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "applicant_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "cover_letter" "text",
    "resume_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "job_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'viewed'::"text", 'contacted'::"text", 'rejected'::"text", 'hired'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."job_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_views" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "viewer_id" "uuid",
    "session_id" "text" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "employer_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "location" "text" NOT NULL,
    "coords" "public"."geography"(Point,4326),
    "job_type" "text" NOT NULL,
    "pay_rate" "text",
    "pay_min" numeric,
    "pay_max" numeric,
    "trades" "text"[] NOT NULL,
    "sub_trades" "text"[],
    "required_certs" "text"[],
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "view_count" integer DEFAULT 0,
    "application_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'filled'::"text", 'closed'::"text", 'draft'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."licenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "license_number" "text" NOT NULL,
    "classification" "text",
    "issuing_state" "text",
    "issue_date" "date",
    "expiration_date" "date",
    "image_url" "text",
    "verification_status" "text" DEFAULT 'pending'::"text",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "licenses_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."licenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."my_spatial_ref_sys" (
    "srid" integer,
    "auth_name" character varying(256),
    "auth_srid" integer,
    "srtext" character varying(2048),
    "proj4text" character varying(2048)
);


ALTER TABLE "public"."my_spatial_ref_sys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text",
    "message" "text",
    "data" "jsonb",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portfolio_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."portfolio_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_references" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "company" "text",
    "phone" "text",
    "email" "text",
    "relationship" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."professional_references" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_views" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "viewed_profile_id" "uuid" NOT NULL,
    "viewer_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profile_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proximity_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "radius_km" numeric DEFAULT 25 NOT NULL,
    "trades" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."proximity_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recruiters" (
    "user_id" "uuid" NOT NULL,
    "company_name" "text",
    "agency_website" "text"
);


ALTER TABLE "public"."recruiters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_processed_events" (
    "id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_processed_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text",
    "event_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "plan_type" "text",
    "amount" numeric,
    "currency" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "plan_type" "text" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_moderation_actions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "duration_days" integer,
    "expires_at" timestamp with time zone,
    "actioned_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_moderation_actions_action_type_check" CHECK (("action_type" = ANY (ARRAY['warning'::"text", 'suspension'::"text", 'ban'::"text"])))
);


ALTER TABLE "public"."user_moderation_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "role" "text" NOT NULL,
    "employer_type" "text",
    "location" "text" DEFAULT 'Update your location'::"text" NOT NULL,
    "geo_coords" "public"."geography"(Point,4326),
    "bio" "text",
    "profile_image_url" "text",
    "subscription_status" "text" DEFAULT 'free'::"text" NOT NULL,
    "is_admin" boolean DEFAULT false,
    "is_lifetime_pro" boolean DEFAULT false,
    "lifetime_pro_granted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_employer_type_check" CHECK (("employer_type" = ANY (ARRAY['contractor'::"text", 'developer'::"text", 'homeowner'::"text", 'recruiter'::"text"]))),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['worker'::"text", 'employer'::"text"]))),
    CONSTRAINT "users_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['free'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workers" (
    "user_id" "uuid" NOT NULL,
    "trade" "text" NOT NULL,
    "sub_trade" "text",
    "years_of_experience" integer DEFAULT 0,
    "hourly_rate" numeric,
    "union_status" "text",
    "trade_skills" "text"[] DEFAULT '{}'::"text"[],
    "has_tools" boolean DEFAULT false,
    "tools_owned" "text"[] DEFAULT '{}'::"text"[],
    "has_certifications" boolean DEFAULT false,
    "has_portfolio" boolean DEFAULT false,
    "is_profile_boosted" boolean DEFAULT false,
    "boost_expires_at" timestamp with time zone,
    "has_dl" boolean DEFAULT false,
    "dl_class" "text",
    "reliable_transportation" boolean DEFAULT false,
    "authorized_to_work" boolean DEFAULT false,
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relationship" "text",
    CONSTRAINT "workers_dl_class_check" CHECK (("dl_class" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text", 'CDL'::"text"])))
);


ALTER TABLE "public"."workers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."application_drafts"
    ADD CONSTRAINT "application_drafts_job_id_applicant_id_key" UNIQUE ("job_id", "applicant_id");



ALTER TABLE ONLY "public"."application_drafts"
    ADD CONSTRAINT "application_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certifications"
    ADD CONSTRAINT "certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractors"
    ADD CONSTRAINT "contractors_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."developers"
    ADD CONSTRAINT "developers_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."education"
    ADD CONSTRAINT "education_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."endorsement_requests"
    ADD CONSTRAINT "endorsement_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_experience_id_endorsed_by_user_id_key" UNIQUE ("experience_id", "endorsed_by_user_id");



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."experiences"
    ADD CONSTRAINT "experiences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."home_owners"
    ADD CONSTRAINT "home_owners_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_job_id_applicant_id_key" UNIQUE ("job_id", "applicant_id");



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_views"
    ADD CONSTRAINT "job_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."licenses"
    ADD CONSTRAINT "licenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."portfolio_images"
    ADD CONSTRAINT "portfolio_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_references"
    ADD CONSTRAINT "professional_references_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proximity_alerts"
    ADD CONSTRAINT "proximity_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proximity_alerts"
    ADD CONSTRAINT "proximity_alerts_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."recruiters"
    ADD CONSTRAINT "recruiters_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."stripe_processed_events"
    ADD CONSTRAINT "stripe_processed_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."user_moderation_actions"
    ADD CONSTRAINT "user_moderation_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_admin_activity_admin" ON "public"."admin_activity_log" USING "btree" ("admin_id");



CREATE INDEX "idx_app_drafts_applicant" ON "public"."application_drafts" USING "btree" ("applicant_id");



CREATE INDEX "idx_app_drafts_job" ON "public"."application_drafts" USING "btree" ("job_id");



CREATE INDEX "idx_applications_applicant" ON "public"."job_applications" USING "btree" ("applicant_id");



CREATE INDEX "idx_applications_job" ON "public"."job_applications" USING "btree" ("job_id");



CREATE INDEX "idx_certs_worker" ON "public"."certifications" USING "btree" ("worker_id");



CREATE INDEX "idx_content_reports_status" ON "public"."content_reports" USING "btree" ("status");



CREATE INDEX "idx_endorsement_req_employer" ON "public"."endorsement_requests" USING "btree" ("employer_id");



CREATE INDEX "idx_endorsement_req_worker" ON "public"."endorsement_requests" USING "btree" ("worker_id");



CREATE INDEX "idx_endorsements_exp" ON "public"."endorsements" USING "btree" ("experience_id");



CREATE INDEX "idx_job_views_job" ON "public"."job_views" USING "btree" ("job_id");



CREATE INDEX "idx_jobs_coords" ON "public"."jobs" USING "gist" ("coords");



CREATE INDEX "idx_licenses_contractor" ON "public"."licenses" USING "btree" ("contractor_id");



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_moderation_user" ON "public"."user_moderation_actions" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_prof_refs_user" ON "public"."professional_references" USING "btree" ("user_id");



CREATE INDEX "idx_profile_views_viewed" ON "public"."profile_views" USING "btree" ("viewed_profile_id");



CREATE INDEX "idx_proximity_alerts_user" ON "public"."proximity_alerts" USING "btree" ("user_id");



CREATE INDEX "idx_subscription_history_created_at" ON "public"."subscription_history" USING "btree" ("created_at");



CREATE INDEX "idx_subscription_history_event_type" ON "public"."subscription_history" USING "btree" ("event_type");



CREATE INDEX "idx_subscription_history_user_id" ON "public"."subscription_history" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_users_coords" ON "public"."users" USING "gist" ("geo_coords");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_workers_experience" ON "public"."workers" USING "btree" ("years_of_experience");



CREATE INDEX "idx_workers_trade" ON "public"."workers" USING "btree" ("trade");



CREATE OR REPLACE TRIGGER "trg_update_has_certifications" AFTER INSERT OR DELETE ON "public"."certifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_has_certifications"();



CREATE OR REPLACE TRIGGER "trg_update_has_cl" AFTER INSERT OR DELETE ON "public"."licenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_has_cl"();



CREATE OR REPLACE TRIGGER "trg_update_has_portfolio" AFTER INSERT OR DELETE ON "public"."portfolio_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_has_portfolio"();



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."application_drafts"
    ADD CONSTRAINT "application_drafts_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."application_drafts"
    ADD CONSTRAINT "application_drafts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certifications"
    ADD CONSTRAINT "certifications_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contractors"
    ADD CONSTRAINT "contractors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_1_id_fkey" FOREIGN KEY ("participant_1_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_2_id_fkey" FOREIGN KEY ("participant_2_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."developers"
    ADD CONSTRAINT "developers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education"
    ADD CONSTRAINT "education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."endorsement_requests"
    ADD CONSTRAINT "endorsement_requests_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."endorsement_requests"
    ADD CONSTRAINT "endorsement_requests_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."endorsement_requests"
    ADD CONSTRAINT "endorsement_requests_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_endorsed_by_user_id_fkey" FOREIGN KEY ("endorsed_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."experiences"
    ADD CONSTRAINT "experiences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."home_owners"
    ADD CONSTRAINT "home_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_applications"
    ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_views"
    ADD CONSTRAINT "job_views_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_views"
    ADD CONSTRAINT "job_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."licenses"
    ADD CONSTRAINT "licenses_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portfolio_images"
    ADD CONSTRAINT "portfolio_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_references"
    ADD CONSTRAINT "professional_references_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_viewed_profile_id_fkey" FOREIGN KEY ("viewed_profile_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_views"
    ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proximity_alerts"
    ADD CONSTRAINT "proximity_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recruiters"
    ADD CONSTRAINT "recruiters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_moderation_actions"
    ADD CONSTRAINT "user_moderation_actions_actioned_by_fkey" FOREIGN KEY ("actioned_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_moderation_actions"
    ADD CONSTRAINT "user_moderation_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Active jobs viewable" ON "public"."jobs" FOR SELECT USING ((("status" = 'active'::"text") OR ("auth"."uid"() = "employer_id")));



CREATE POLICY "Admins can manage content reports" ON "public"."content_reports" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "Admins can manage moderation actions" ON "public"."user_moderation_actions" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "Admins can update platform settings" ON "public"."platform_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "Admins can view activity log" ON "public"."admin_activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "Anyone can view platform settings" ON "public"."platform_settings" FOR SELECT USING (true);



CREATE POLICY "Applicants can manage own drafts" ON "public"."application_drafts" USING (("auth"."uid"() = "applicant_id"));



CREATE POLICY "Employers can manage own endorsements" ON "public"."endorsements" USING (("auth"."uid"() = "endorsed_by_user_id"));



CREATE POLICY "Employers can view own job views" ON "public"."job_views" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_views"."job_id") AND ("jobs"."employer_id" = "auth"."uid"())))));



CREATE POLICY "Employers can view/update received endorsement requests" ON "public"."endorsement_requests" USING (("auth"."uid"() = "employer_id"));



CREATE POLICY "Employers insert jobs" ON "public"."jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "employer_id"));



CREATE POLICY "Employers update own jobs" ON "public"."jobs" FOR UPDATE USING (("auth"."uid"() = "employer_id"));



CREATE POLICY "Employers view received" ON "public"."job_applications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_applications"."job_id") AND ("jobs"."employer_id" = "auth"."uid"())))));



CREATE POLICY "Endorsements are viewable by everyone" ON "public"."endorsements" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Reporters can view own reports" ON "public"."content_reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can manage own professional references" ON "public"."professional_references" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own proximity alerts" ON "public"."proximity_alerts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own moderation actions" ON "public"."user_moderation_actions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile views" ON "public"."profile_views" FOR SELECT USING (("auth"."uid"() = "viewed_profile_id"));



CREATE POLICY "Users can view own subscription" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own subscription history" ON "public"."subscription_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Workers apply" ON "public"."job_applications" FOR INSERT WITH CHECK (("auth"."uid"() = "applicant_id"));



CREATE POLICY "Workers can view sent endorsement requests" ON "public"."endorsement_requests" FOR SELECT USING (("auth"."uid"() = "worker_id"));



CREATE POLICY "Workers update own data" ON "public"."workers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Workers view own" ON "public"."job_applications" FOR SELECT USING (("auth"."uid"() = "applicant_id"));



CREATE POLICY "Workers viewable by everyone" ON "public"."workers" FOR SELECT USING (true);



ALTER TABLE "public"."admin_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."application_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."endorsement_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."endorsements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."my_spatial_ref_sys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_references" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proximity_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_processed_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_moderation_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
























































































































































































































































































































GRANT ALL ON FUNCTION "public"."calculate_total_experience"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_total_experience"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_total_experience"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_job_with_coords"("p_employer_id" "uuid", "p_title" "text", "p_description" "text", "p_location" "text", "p_lng" double precision, "p_lat" double precision, "p_trades" "text"[], "p_sub_trades" "text"[], "p_job_type" "text", "p_pay_rate" "text", "p_pay_min" numeric, "p_pay_max" numeric, "p_required_certs" "text"[], "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_job_with_coords"("p_employer_id" "uuid", "p_title" "text", "p_description" "text", "p_location" "text", "p_lng" double precision, "p_lat" double precision, "p_trades" "text"[], "p_sub_trades" "text"[], "p_job_type" "text", "p_pay_rate" "text", "p_pay_min" numeric, "p_pay_max" numeric, "p_required_certs" "text"[], "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_job_with_coords"("p_employer_id" "uuid", "p_title" "text", "p_description" "text", "p_location" "text", "p_lng" double precision, "p_lat" double precision, "p_trades" "text"[], "p_sub_trades" "text"[], "p_job_type" "text", "p_pay_rate" "text", "p_pay_min" numeric, "p_pay_max" numeric, "p_required_certs" "text"[], "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workers_by_experience"("p_min_years" integer, "p_trade_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workers_by_experience"("p_min_years" integer, "p_trade_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workers_by_experience"("p_min_years" integer, "p_trade_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_has_certifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_has_certifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_has_certifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_has_cl"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_has_cl"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_has_cl"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_has_portfolio"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_has_portfolio"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_has_portfolio"() TO "service_role";





















GRANT ALL ON TABLE "public"."admin_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."application_drafts" TO "anon";
GRANT ALL ON TABLE "public"."application_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."application_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."certifications" TO "anon";
GRANT ALL ON TABLE "public"."certifications" TO "authenticated";
GRANT ALL ON TABLE "public"."certifications" TO "service_role";



GRANT ALL ON TABLE "public"."content_reports" TO "anon";
GRANT ALL ON TABLE "public"."content_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."content_reports" TO "service_role";



GRANT ALL ON TABLE "public"."contractors" TO "anon";
GRANT ALL ON TABLE "public"."contractors" TO "authenticated";
GRANT ALL ON TABLE "public"."contractors" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."developers" TO "anon";
GRANT ALL ON TABLE "public"."developers" TO "authenticated";
GRANT ALL ON TABLE "public"."developers" TO "service_role";



GRANT ALL ON TABLE "public"."education" TO "anon";
GRANT ALL ON TABLE "public"."education" TO "authenticated";
GRANT ALL ON TABLE "public"."education" TO "service_role";



GRANT ALL ON TABLE "public"."endorsement_requests" TO "anon";
GRANT ALL ON TABLE "public"."endorsement_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."endorsement_requests" TO "service_role";



GRANT ALL ON TABLE "public"."endorsements" TO "anon";
GRANT ALL ON TABLE "public"."endorsements" TO "authenticated";
GRANT ALL ON TABLE "public"."endorsements" TO "service_role";



GRANT ALL ON TABLE "public"."experiences" TO "anon";
GRANT ALL ON TABLE "public"."experiences" TO "authenticated";
GRANT ALL ON TABLE "public"."experiences" TO "service_role";



GRANT ALL ON TABLE "public"."home_owners" TO "anon";
GRANT ALL ON TABLE "public"."home_owners" TO "authenticated";
GRANT ALL ON TABLE "public"."home_owners" TO "service_role";



GRANT ALL ON TABLE "public"."job_applications" TO "anon";
GRANT ALL ON TABLE "public"."job_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."job_applications" TO "service_role";



GRANT ALL ON TABLE "public"."job_views" TO "anon";
GRANT ALL ON TABLE "public"."job_views" TO "authenticated";
GRANT ALL ON TABLE "public"."job_views" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."licenses" TO "anon";
GRANT ALL ON TABLE "public"."licenses" TO "authenticated";
GRANT ALL ON TABLE "public"."licenses" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."my_spatial_ref_sys" TO "anon";
GRANT ALL ON TABLE "public"."my_spatial_ref_sys" TO "authenticated";
GRANT ALL ON TABLE "public"."my_spatial_ref_sys" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."portfolio_images" TO "anon";
GRANT ALL ON TABLE "public"."portfolio_images" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolio_images" TO "service_role";



GRANT ALL ON TABLE "public"."professional_references" TO "anon";
GRANT ALL ON TABLE "public"."professional_references" TO "authenticated";
GRANT ALL ON TABLE "public"."professional_references" TO "service_role";



GRANT ALL ON TABLE "public"."profile_views" TO "anon";
GRANT ALL ON TABLE "public"."profile_views" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_views" TO "service_role";



GRANT ALL ON TABLE "public"."proximity_alerts" TO "anon";
GRANT ALL ON TABLE "public"."proximity_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."proximity_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."recruiters" TO "anon";
GRANT ALL ON TABLE "public"."recruiters" TO "authenticated";
GRANT ALL ON TABLE "public"."recruiters" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_processed_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_processed_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_processed_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_history" TO "anon";
GRANT ALL ON TABLE "public"."subscription_history" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_history" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_moderation_actions" TO "anon";
GRANT ALL ON TABLE "public"."user_moderation_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_moderation_actions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."workers" TO "anon";
GRANT ALL ON TABLE "public"."workers" TO "authenticated";
GRANT ALL ON TABLE "public"."workers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




























drop extension if exists "pg_net";

revoke delete on table "public"."spatial_ref_sys" from "anon";

revoke insert on table "public"."spatial_ref_sys" from "anon";

revoke references on table "public"."spatial_ref_sys" from "anon";

revoke select on table "public"."spatial_ref_sys" from "anon";

revoke trigger on table "public"."spatial_ref_sys" from "anon";

revoke truncate on table "public"."spatial_ref_sys" from "anon";

revoke update on table "public"."spatial_ref_sys" from "anon";

revoke delete on table "public"."spatial_ref_sys" from "authenticated";

revoke insert on table "public"."spatial_ref_sys" from "authenticated";

revoke references on table "public"."spatial_ref_sys" from "authenticated";

revoke select on table "public"."spatial_ref_sys" from "authenticated";

revoke trigger on table "public"."spatial_ref_sys" from "authenticated";

revoke truncate on table "public"."spatial_ref_sys" from "authenticated";

revoke update on table "public"."spatial_ref_sys" from "authenticated";

revoke delete on table "public"."spatial_ref_sys" from "postgres";

revoke insert on table "public"."spatial_ref_sys" from "postgres";

revoke references on table "public"."spatial_ref_sys" from "postgres";

revoke select on table "public"."spatial_ref_sys" from "postgres";

revoke trigger on table "public"."spatial_ref_sys" from "postgres";

revoke truncate on table "public"."spatial_ref_sys" from "postgres";

revoke update on table "public"."spatial_ref_sys" from "postgres";

revoke delete on table "public"."spatial_ref_sys" from "service_role";

revoke insert on table "public"."spatial_ref_sys" from "service_role";

revoke references on table "public"."spatial_ref_sys" from "service_role";

revoke select on table "public"."spatial_ref_sys" from "service_role";

revoke trigger on table "public"."spatial_ref_sys" from "service_role";

revoke truncate on table "public"."spatial_ref_sys" from "service_role";

revoke update on table "public"."spatial_ref_sys" from "service_role";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Anyone can view portfolio images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'portfolio-images'::text));



  create policy "Public read access to certification photos 14oqoz8_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'certification-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Public read access to profile pictures 1skn4k9_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'profile-pictures'::text));



  create policy "System deletes application files fhzllv_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'applications'::text));



  create policy "System deletes application files fhzllv_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'applications'::text));



  create policy "System updates application files fhzllv_0"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'applications'::text));



  create policy "System updates application files fhzllv_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'applications'::text));



  create policy "System uploads application files fhzllv_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'applications'::text));



  create policy "Users can delete own portfolio images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'portfolio-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their own certification photos 14oqoz8_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'certification-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their own certification photos 14oqoz8_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'certification-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update own portfolio images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'portfolio-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update own profile picture 1skn4k9_0"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update own profile picture 1skn4k9_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload own portfolio images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'portfolio-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload own profile picture 1skn4k9_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload their own certification photos 14oqoz8_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'certification-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users delete own draft files 1gckljj_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users delete own draft files 1gckljj_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users update own draft files 1gckljj_0"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users update own draft files 1gckljj_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users upload to own draft folder 1gckljj_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users view own draft files 1gckljj_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "application_drafts_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "application_drafts_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "application_drafts_select"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "application_drafts_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'application-drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "applications_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'applications'::text));



  create policy "applications_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'applications'::text));



  create policy "applications_select"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'applications'::text));



  create policy "applications_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'applications'::text))
with check ((bucket_id = 'applications'::text));



  create policy "certification_photos_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'certification-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "certification_photos_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'certification-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "certification_photos_select"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'certification-photos'::text));



  create policy "certification_photos_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'certification-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'certification-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "profile_pictures_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "profile_pictures_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "profile_pictures_select"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'profile-pictures'::text));



  create policy "profile_pictures_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



