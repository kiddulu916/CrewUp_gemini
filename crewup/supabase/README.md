# Supabase Setup Instructions

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project in Supabase dashboard

## Running Migrations

You can run these migrations in two ways:

### Option 1: Using Supabase SQL Editor (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the sidebar
3. Run each migration file in order:
   - `001_enable_extensions.sql`
   - `002_create_tables.sql`
   - `003_create_indexes.sql`
   - `004_enable_rls.sql`
   - `005_create_triggers.sql`

Copy and paste the contents of each file into the SQL Editor and click "Run".

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your local project to your Supabase project
supabase link --project-ref <your-project-ref>

# Run all migrations
supabase db push
```

## After Running Migrations

1. **Get your API keys**:
   - Go to **Settings** → **API** in your Supabase dashboard
   - Copy your `Project URL` and `anon public` key
   - Copy your `service_role` key (keep this secret!)

2. **Update your `.env.local` file**:
   ```bash
   cp .env.example .env.local
   ```
   Then fill in your Supabase credentials in `.env.local`

3. **Generate TypeScript types** (optional but recommended):
   ```bash
   npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/types.ts
   ```

## Database Schema Overview

The migrations create 12 tables:

1. **profiles** - User profiles (extends auth.users)
2. **certifications** - Worker certifications
3. **work_experience** - Worker employment history
4. **jobs** - Job postings
5. **job_applications** - Applications to jobs
6. **conversations** - Direct messaging conversations
7. **messages** - Individual messages
8. **subscriptions** - Stripe subscription tracking
9. **profile_views** - Profile view analytics (Pro feature)
10. **job_views** - Job view analytics
11. **proximity_alerts** - Location-based job alerts (Pro feature)
12. **notifications** - In-app notifications

All tables have Row Level Security (RLS) enabled with appropriate policies to protect user data.

## Testing the Setup

After running migrations, you can test by:

1. Sign up a test user through your app
2. Check the Supabase dashboard → **Authentication** to see the user
3. Check **Table Editor** → **profiles** to verify the profile was auto-created
4. Try creating test data through the Table Editor

## Troubleshooting

**PostGIS extension error**: PostGIS is enabled by default in Supabase. If you get an error, contact Supabase support.

**Permission errors**: Make sure you're using the correct API keys and that RLS policies are properly set up.

**Trigger not working**: Check the **Database** → **Functions** section to verify triggers were created successfully.
