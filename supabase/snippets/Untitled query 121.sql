-- 1. Certifications (Linked to Workers)
CREATE TABLE "public"."certifications" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "worker_id" "uuid" NOT NULL REFERENCES "public"."workers"("user_id") ON DELETE CASCADE,
    "name" "text" NOT NULL,
    "issuing_organization" "text" NOT NULL,
    "credential_id" "text",
    "issue_date" "date",
    "expiration_date" "date",
    "image_url" "text",
    "verification_status" "text" DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Licenses (Linked to Contractors)
CREATE TABLE "public"."licenses" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "contractor_id" "uuid" NOT NULL REFERENCES "public"."contractors"("user_id") ON DELETE CASCADE,
    "license_number" "text" NOT NULL,
    "classification" "text",
    "issuing_state" "text",
    "issue_date" "date",
    "expiration_date" "date",
    "image_url" "text",
    "verification_status" "text" DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX "idx_certs_worker" ON "public"."certifications" ("worker_id");
CREATE INDEX "idx_licenses_contractor" ON "public"."licenses" ("contractor_id");