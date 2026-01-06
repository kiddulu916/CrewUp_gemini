-- 1. Conversations
CREATE TABLE "public"."conversations" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "participant_1_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "participant_2_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "last_message_at" timestamp with time zone DEFAULT now(),
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT participants_distinct CHECK (participant_1_id != participant_2_id)
);

-- 2. Messages
CREATE TABLE "public"."messages" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "conversation_id" "uuid" NOT NULL REFERENCES "public"."conversations"("id") ON DELETE CASCADE,
    "sender_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "content" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Notifications
CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "type" "text" NOT NULL,
    "title" "text",
    "message" "text",
    "data" "jsonb",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now()
);

-- 4. Endorsements (Reviews)
CREATE TABLE "public"."endorsements" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "worker_id" "uuid" NOT NULL REFERENCES "public"."workers"("user_id") ON DELETE CASCADE,
    "endorser_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "rating" integer CHECK (rating BETWEEN 1 AND 5),
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT now(),
    UNIQUE("worker_id", "endorser_id")
);

CREATE INDEX "idx_messages_conversation" ON "public"."messages" ("conversation_id");
CREATE INDEX "idx_notifications_user" ON "public"."notifications" ("user_id");