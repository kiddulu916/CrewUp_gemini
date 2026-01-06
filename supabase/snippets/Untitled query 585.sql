-- 1. Jobs Table
-- Note: Employer ID links to users table (as any employer type can post jobs)
CREATE TABLE "public"."jobs" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "employer_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "location" "text" NOT NULL,
    "coords" "public"."geography"(Point, 4326),
    "job_type" "text" NOT NULL,
    "pay_rate" "text",
    "pay_min" numeric,
    "pay_max" numeric,
    "trades" "text"[] NOT NULL, -- Array of required trades
    "sub_trades" "text"[],
    "required_certs" "text"[],
    "status" "text" DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'filled', 'closed', 'draft')),
    "view_count" integer DEFAULT 0,
    "application_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Job Applications
CREATE TABLE "public"."job_applications" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "job_id" "uuid" NOT NULL REFERENCES "public"."jobs"("id") ON DELETE CASCADE,
    "applicant_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "status" "text" DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'viewed', 'contacted', 'rejected', 'hired', 'withdrawn')),
    "cover_letter" "text",
    "resume_url" "text",
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("job_id", "applicant_id")
);

-- 3. Experiences (For Workers)
CREATE TABLE "public"."experiences" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "company" "text" NOT NULL,
    "job_title" "text" NOT NULL,
    "description" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_current" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "endorsement_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now()
);

-- 4. Education (For Workers)
CREATE TABLE "public"."education" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "institution" "text" NOT NULL,
    "degree" "text",
    "field_of_study" "text",
    "start_date" "date",
    "end_date" "date"
);

-- 5. Portfolio Images (For Workers & Contractors)
CREATE TABLE "public"."portfolio_images" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "image_url" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX "idx_jobs_coords" ON "public"."jobs" USING GIST ("coords");
CREATE INDEX "idx_applications_job" ON "public"."job_applications" ("job_id");
CREATE INDEX "idx_applications_applicant" ON "public"."job_applications" ("applicant_id");