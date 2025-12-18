# 02 - Database Schema

## Overview

Complete PostgreSQL database schema designed upfront to support all features (free and Pro). This prevents painful migrations later and establishes clear data relationships.

## Tables

### 1. profiles
Extends Supabase `auth.users` table with application-specific data.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker', 'employer')),
  employer_type TEXT CHECK (employer_type IN ('contractor', 'recruiter')),
  subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
  subscription_id TEXT,
  trade TEXT NOT NULL,
  sub_trade TEXT,
  location TEXT NOT NULL,
  coords GEOGRAPHY(POINT),
  bio TEXT,
  phone TEXT,
  email TEXT NOT NULL,
  profile_image_url TEXT,
  is_profile_boosted BOOLEAN DEFAULT FALSE,
  boost_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_coords ON profiles USING GIST(coords);
CREATE INDEX idx_profiles_trade ON profiles(trade);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_subscription_status ON profiles(subscription_status);
```

### 2. certifications
Worker certifications with image verification.

```sql
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_certifications_user_id ON certifications(user_id);
CREATE INDEX idx_certifications_type ON certifications(certification_type);
CREATE INDEX idx_certifications_verified ON certifications(is_verified);
```

### 3. work_experience
Worker employment history.

```sql
CREATE TABLE work_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);
```

### 4. jobs
Job postings from employers.

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  trade TEXT NOT NULL,
  sub_trade TEXT,
  job_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  coords GEOGRAPHY(POINT),
  pay_rate TEXT NOT NULL,
  pay_min NUMERIC,
  pay_max NUMERIC,
  required_certs TEXT[],
  custom_questions JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'filled', 'expired', 'draft')),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_coords ON jobs USING GIST(coords);
CREATE INDEX idx_jobs_trade ON jobs(trade);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
```

### 5. job_applications
Worker applications to jobs.

```sql
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'rejected', 'hired')),
  cover_message TEXT,
  custom_answers JSONB,
  contact_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, worker_id)
);

-- Indexes
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_worker_id ON job_applications(worker_id);
CREATE INDEX idx_job_applications_status ON job_applications(job_id, status);
```

### 6. conversations
Direct messaging between users.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure participants are ordered to prevent duplicates
  CHECK (participant_1_id < participant_2_id),
  UNIQUE(participant_1_id, participant_2_id)
);

-- Indexes
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

### 7. messages
Individual messages within conversations.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
```

### 8. subscriptions
Stripe subscription tracking.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'annual')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
```

### 9. profile_views
Track who viewed whose profile (Pro feature).

```sql
CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewed_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profile_views_viewed_profile ON profile_views(viewed_profile_id, viewed_at DESC);
CREATE INDEX idx_profile_views_viewer ON profile_views(viewer_id);
```

### 10. job_views
Track job view analytics.

```sql
CREATE TABLE job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_views_job_id ON job_views(job_id, viewed_at DESC);
CREATE INDEX idx_job_views_session ON job_views(session_id, job_id);
```

### 11. proximity_alerts
Pro feature: alert workers about nearby jobs.

```sql
CREATE TABLE proximity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  radius_km NUMERIC NOT NULL DEFAULT 25,
  trades TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_proximity_alerts_user_id ON proximity_alerts(user_id);
CREATE INDEX idx_proximity_alerts_active ON proximity_alerts(is_active);
```

### 12. notifications
In-app and push notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_job', 'message', 'application_update', 'profile_view')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(user_id, read_at);
```

## Row Level Security (RLS)

Enable RLS on all tables and create policies:

```sql
-- Example for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Similar policies for other tables
```

## Database Triggers

### Auto-create profile on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, subscription_status, trade, location, bio)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User-' || substring(NEW.id::text, 1, 8)),
    'worker',
    'free',
    'General Laborer',
    'Update your location',
    'Ready to work hard and learn new skills on site!'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add similar triggers for other tables with updated_at
```

## Geospatial Queries

PostGIS is enabled by default in Supabase. Example proximity query:

```sql
-- Find jobs within 25km of user's location
SELECT *
FROM jobs
WHERE ST_DWithin(
  coords::geography,
  ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography,
  25000  -- meters
)
AND status = 'active'
ORDER BY coords <-> ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography;
```

## Type Generation

Generate TypeScript types from schema:

```bash
npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
```

This keeps TypeScript types in sync with database schema.
