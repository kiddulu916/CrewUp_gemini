-- Migration to add subscription tracking for business metrics (Churn, LTV, Retention)

-- 1. Create stripe_processed_events for idempotency if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."stripe_processed_events" (
    "id" text PRIMARY KEY,
    "type" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create subscriptions table if it doesn't exist
-- Using 'users' table for foreign key as defined in 01-users_roles.sql
CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "stripe_customer_id" text NOT NULL,
    "stripe_subscription_id" text NOT NULL UNIQUE,
    "stripe_price_id" text NOT NULL,
    "status" text NOT NULL,
    "plan_type" text NOT NULL, -- 'monthly' or 'annual'
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Create subscription_history table for tracking metrics
CREATE TABLE "public"."subscription_history" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "stripe_subscription_id" text,
    "event_type" text NOT NULL, -- 'subscription_created', 'subscription_updated', 'subscription_canceled', 'payment_failed', 'payment_succeeded'
    "status" text NOT NULL,
    "plan_type" text,
    "amount" numeric,
    "currency" text,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Enable RLS
ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscription_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stripe_processed_events" ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Subscriptions: Users can view their own
CREATE POLICY "Users can view own subscription" ON "public"."subscriptions" 
    FOR SELECT USING (auth.uid() = user_id);

-- Subscription History: Users can view their own
CREATE POLICY "Users can view own subscription history" ON "public"."subscription_history" 
    FOR SELECT USING (auth.uid() = user_id);

-- stripe_processed_events: Only admins/system (no public access)

-- 6. Indexes for Performance & Analytics
CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" ("user_id");
CREATE INDEX "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" ("stripe_subscription_id");
CREATE INDEX "idx_subscription_history_user_id" ON "public"."subscription_history" ("user_id");
CREATE INDEX "idx_subscription_history_event_type" ON "public"."subscription_history" ("event_type");
CREATE INDEX "idx_subscription_history_created_at" ON "public"."subscription_history" ("created_at");
