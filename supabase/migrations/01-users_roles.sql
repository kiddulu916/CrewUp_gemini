-- Enable necessary extensions for UUIDs and Geospatial data
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Base Users Table (Common shared fields)
CREATE TABLE "public"."users" (
    "id" "uuid" NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL UNIQUE,
    "phone" "text",
    "role" "text" NOT NULL CHECK (role IN ('worker', 'employer')),
    "employer_type" "text" CHECK (employer_type IN ('contractor', 'developer', 'homeowner', 'recruiter')),
    "location" "text" NOT NULL DEFAULT 'Update your location',
    "geo_coords" "public"."geography"(Point, 4326),
    "bio" "text",
    "profile_image_url" "text",
    "subscription_status" "text" DEFAULT 'free' NOT NULL CHECK (subscription_status IN ('free', 'pro')),
    "is_admin" boolean DEFAULT false,
    "is_lifetime_pro" boolean DEFAULT false,
    "lifetime_pro_granted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- 2. Workers Table (Specific to Workers)
CREATE TABLE "public"."workers" (
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "trade" "text" NOT NULL,
    "sub_trade" "text",
    "years_of_experience" integer DEFAULT 0,
    "hourly_rate" numeric,
    "union_status" "text",
    "trade_skills" "text"[] DEFAULT '{}',
    "has_tools" boolean DEFAULT false,
    "tools_owned" "text"[] DEFAULT '{}',
    "has_certifications" boolean DEFAULT false, -- Auto-updated by trigger
    "has_portfolio" boolean DEFAULT false,      -- Auto-updated by trigger
    "is_profile_boosted" boolean DEFAULT false,
    "boost_expires_at" timestamp with time zone,
    
    -- License/Transport info
    "has_dl" boolean DEFAULT false,
    "dl_class" "text" CHECK (dl_class IN ('A', 'B', 'C', 'CDL')),
    "reliable_transportation" boolean DEFAULT false,
    "authorized_to_work" boolean DEFAULT false,
    
    -- Emergency Contact
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relationship" "text",
    
    PRIMARY KEY ("user_id")
);

-- 3. Contractors Table (Specific to Contractors)
CREATE TABLE "public"."contractors" (
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "company_name" "text",
    "website" "text",
    "has_cl" boolean DEFAULT false, -- Has Contractor License (Auto-updated)
    PRIMARY KEY ("user_id")
);

-- 4. Home Owners Table
CREATE TABLE "public"."home_owners" (
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "project_description" "text",
    PRIMARY KEY ("user_id")
);

-- 5. Recruiters Table
CREATE TABLE "public"."recruiters" (
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "company_name" "text",
    "agency_website" "text",
    PRIMARY KEY ("user_id")
);

-- 6. Developers Table
CREATE TABLE "public"."developers" (
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "company_name" "text",
    "website" "text",
    PRIMARY KEY ("user_id")
);

-- Create Indexes for performance on commonly queried columns
CREATE INDEX "idx_users_role" ON "public"."users" ("role");
CREATE INDEX "idx_users_coords" ON "public"."users" USING GIST ("geo_coords");
CREATE INDEX "idx_workers_trade" ON "public"."workers" ("trade");
CREATE INDEX "idx_workers_experience" ON "public"."workers" ("years_of_experience");