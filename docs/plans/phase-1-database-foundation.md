# Phase 1: Database Foundation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up all database schema changes, constants, and admin access for the certification verification system.

**Duration:** Day 1 (~6-8 hours)

**Architecture:** Add verification tracking to certifications table, create 5 new admin tables (activity log, settings, reports, moderation, analytics), set up RLS policies, add admin/job posting flags to profiles.

**Tech Stack:** PostgreSQL, Supabase, SQL

**Prerequisites:** Supabase project set up, access to Supabase dashboard

---

## Task 1.1: Create Database Migration File

**Files:**
- Create: `supabase/migrations/033_admin_dashboard_verification.sql`

**Step 1: Create migration file with schema changes**

Create `supabase/migrations/033_admin_dashboard_verification.sql`:

```sql
-- Admin Dashboard & Certification Verification System
-- Migration 033
-- Created: 2025-12-27

-- ============================================================================
-- 1. Add admin and job posting flags to profiles
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_post_jobs BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN profiles.is_admin IS 'Grants access to /admin/* routes';
COMMENT ON COLUMN profiles.can_post_jobs IS 'Controls job posting ability (false for unverified contractors)';

-- ============================================================================
-- 2. Add verification fields to certifications table
-- ============================================================================

ALTER TABLE certifications
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

COMMENT ON COLUMN certifications.verification_status IS 'Current verification state';
COMMENT ON COLUMN certifications.verified_at IS 'Timestamp when verification completed';
COMMENT ON COLUMN certifications.verified_by IS 'Admin user who verified (for audit trail)';
COMMENT ON COLUMN certifications.rejection_reason IS 'Displayed to user if rejected';
COMMENT ON COLUMN certifications.verification_notes IS 'Internal admin notes (not shown to user)';

CREATE INDEX IF NOT EXISTS idx_certifications_verification_status
  ON certifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_certifications_verified_by
  ON certifications(verified_by);

-- ============================================================================
-- 3. Create admin activity log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admin_activity_log IS 'Audit trail of all admin actions';
COMMENT ON COLUMN admin_activity_log.action IS 'Action type: verified_cert, rejected_cert, banned_user, etc.';
COMMENT ON COLUMN admin_activity_log.target_type IS 'Target type: certification, user, job, application, etc.';
COMMENT ON COLUMN admin_activity_log.details IS 'Flexible JSONB field for action-specific data';

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin
  ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_date
  ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target
  ON admin_activity_log(target_type, target_id);

-- ============================================================================
-- 4. Create platform settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE platform_settings IS 'Platform-wide configuration settings';

-- Seed with default settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Site-wide maintenance mode'),
  ('verification_turnaround_hours', '48', 'Expected cert verification time'),
  ('allow_signups', 'true', 'Allow new user registrations'),
  ('require_email_verification', 'true', 'Require email verification on signup')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 5. Create content reports table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reported_content_type TEXT NOT NULL,
  reported_content_id UUID NOT NULL,
  reported_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE content_reports IS 'User-submitted content reports for moderation';
COMMENT ON COLUMN content_reports.reported_content_type IS 'Type: job, profile, message';
COMMENT ON COLUMN content_reports.reason IS 'Reason: spam, inappropriate, fraud, harassment, other';
COMMENT ON COLUMN content_reports.action_taken IS 'Action: content_removed, user_warned, user_banned, no_action';

CREATE INDEX IF NOT EXISTS idx_content_reports_status
  ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter
  ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user
  ON content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_date
  ON content_reports(created_at DESC);

-- ============================================================================
-- 6. Create user moderation actions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  duration_days INTEGER,
  expires_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_moderation_actions IS 'User moderation history (warnings, suspensions, bans)';
COMMENT ON COLUMN user_moderation_actions.action_type IS 'Type: warning, suspension, ban, unbanned';
COMMENT ON COLUMN user_moderation_actions.duration_days IS 'For temporary suspensions (NULL = permanent ban)';

CREATE INDEX IF NOT EXISTS idx_user_moderation_user
  ON user_moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_active
  ON user_moderation_actions(expires_at)
  WHERE expires_at IS NOT NULL AND expires_at > NOW();

-- ============================================================================
-- 7. Create analytics events table (optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE analytics_events IS 'Custom analytics event tracking';
COMMENT ON COLUMN analytics_events.event_type IS 'Event: page_view, job_view, application_submitted, etc.';
COMMENT ON COLUMN analytics_events.metadata IS 'Flexible event data: {job_id, route, etc.}';

CREATE INDEX IF NOT EXISTS idx_analytics_events_type
  ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date
  ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events(user_id);

-- ============================================================================
-- 8. Row Level Security (RLS) Policies
-- ============================================================================

-- Admin Activity Log
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON admin_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can log activity"
  ON admin_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Platform Settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON platform_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Content Reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON content_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON content_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- User Moderation Actions
ALTER TABLE user_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view moderation actions"
  ON user_moderation_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create moderation actions"
  ON user_moderation_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Analytics Events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view events"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

**Step 2: Verify migration file created**

Run: `ls -lh supabase/migrations/033_admin_dashboard_verification.sql`

Expected: File exists with ~350+ lines

**Step 3: Apply migration to database**

Run: `npx supabase db push`

Expected output: "Applying migration 033_admin_dashboard_verification.sql... Success"

**Step 4: Verify tables created in Supabase Dashboard**

1. Open Supabase Dashboard → Database → Tables
2. Check for new tables:
   - admin_activity_log
   - platform_settings (with 4 seeded rows)
   - content_reports
   - user_moderation_actions
   - analytics_events
3. Check profiles table has new columns: is_admin, can_post_jobs
4. Check certifications table has new columns: verification_status, verified_at, verified_by, rejection_reason, verification_notes

**Step 5: Commit migration**

```bash
git add supabase/migrations/033_admin_dashboard_verification.sql
git commit -m "feat(db): add admin dashboard and verification tables

- Add is_admin and can_post_jobs flags to profiles
- Add verification fields to certifications table
- Create admin_activity_log for audit trail
- Create platform_settings for configuration
- Create content_reports for moderation
- Create user_moderation_actions for user management
- Create analytics_events for custom tracking
- Add RLS policies for all new tables
- Add indexes for performance"
```

---

## Task 1.2: Update Constants for Developer/Home Owner Employer Type

**Files:**
- Modify: `lib/constants.ts`

**Step 1: Read current constants file**

Read: `lib/constants.ts` (first 100 lines to find EMPLOYER_TYPES)

**Step 2: Add Developer/Home Owner to employer types**

Find the `EMPLOYER_TYPES` constant and update it:

```typescript
// Before:
export const EMPLOYER_TYPES = ['contractor', 'recruiter'] as const;

// After:
export const EMPLOYER_TYPES = ['contractor', 'recruiter', 'developer'] as const;

export type EmployerType = (typeof EMPLOYER_TYPES)[number];

// Add human-readable labels
export const EMPLOYER_TYPE_LABELS: Record<EmployerType, string> = {
  contractor: 'Contractor',
  recruiter: 'Recruiter',
  developer: 'Developer/Home Owner',
};
```

**Step 3: Verify TypeScript compiles**

Run: `npm run build`

Expected: Build successful with no type errors

**Step 4: Commit constants update**

```bash
git add lib/constants.ts
git commit -m "feat(constants): add Developer/Home Owner employer type

- Add 'developer' to EMPLOYER_TYPES
- Add EMPLOYER_TYPE_LABELS for human-readable display
- Supports homeowners and property developers hiring workers
- No license required for this employer type"
```

---

## Task 1.3: Set Your Account to Admin

**Files:**
- Manual: Supabase SQL Editor
- Create: `docs/admin-setup.md`

**Step 1: Get your user ID from Supabase Dashboard**

1. Open Supabase Dashboard → Authentication → Users
2. Find your account
3. Copy your user UUID (e.g., `a1b2c3d4-e5f6-...`)

**Step 2: Run SQL to set admin flag**

In Supabase Dashboard → SQL Editor → New Query:

```sql
-- Replace YOUR_USER_ID with your actual UUID from step 1
UPDATE profiles
SET is_admin = true
WHERE user_id = 'YOUR_USER_ID';

-- Verify it worked
SELECT user_id, name, email, is_admin, can_post_jobs
FROM profiles
WHERE user_id = 'YOUR_USER_ID';
```

Expected result: Your profile with `is_admin = true`

**Step 3: Create admin setup documentation**

Create `docs/admin-setup.md`:

```markdown
# Admin Setup Guide

## Granting Admin Access

To grant admin access to a user account:

### Step 1: Get User ID

1. Open Supabase Dashboard → Authentication → Users
2. Find the user account
3. Copy their UUID

### Step 2: Set Admin Flag

In Supabase SQL Editor, run:

\`\`\`sql
UPDATE profiles
SET is_admin = true
WHERE user_id = 'USER_UUID_HERE';

-- Verify:
SELECT name, email, is_admin FROM profiles WHERE user_id = 'USER_UUID_HERE';
\`\`\`

### Step 3: Test Access

1. Log in as the user
2. Navigate to `/admin/dashboard`
3. Should see admin dashboard (after Phase 3 implementation)

## Current Admins

- [Your Name] (your@email.com) - Platform Owner

## Admin Capabilities

Admins can access all routes under `/admin/*`:
- Dashboard overview with metrics
- Certification verification queue
- User management (search, view, suspend, ban)
- Analytics and insights
- Error monitoring (Sentry integration)
- Content moderation
- Platform settings

## Revoking Admin Access

To remove admin access:

\`\`\`sql
UPDATE profiles
SET is_admin = false
WHERE user_id = 'USER_UUID_HERE';
\`\`\`

## Security Notes

- Admin access is checked via middleware on every `/admin/*` request
- Non-admin users attempting to access admin routes receive a 404 error
- All admin actions are logged to `admin_activity_log` table
- RLS policies prevent non-admins from querying admin tables
```

**Step 4: Commit admin documentation**

```bash
git add docs/admin-setup.md
git commit -m "docs: add admin setup and management guide

- Document how to grant admin access via SQL
- List current admin users
- Explain admin capabilities and routes
- Add security notes about middleware and RLS
- Include instructions for revoking admin access"
```

---

## Task 1.4: Update Existing Data for Verification System

**Files:**
- Manual: Supabase SQL Editor

**Step 1: Set all existing certifications to pending status**

In Supabase SQL Editor:

```sql
-- Update all existing certifications to pending status
UPDATE certifications
SET verification_status = 'pending'
WHERE verification_status IS NULL;

-- Verify the update
SELECT verification_status, COUNT(*)
FROM certifications
GROUP BY verification_status;
```

Expected: All certifications now have `verification_status = 'pending'`

**Step 2: Set can_post_jobs flags for employers**

```sql
-- Set contractors to cannot post jobs (need license verification)
UPDATE profiles
SET can_post_jobs = false
WHERE role = 'employer'
  AND employer_type = 'contractor';

-- Set recruiters to can post jobs (no license required)
UPDATE profiles
SET can_post_jobs = true
WHERE role = 'employer'
  AND employer_type = 'recruiter';

-- For new 'developer' type (if any exist already, set to true)
UPDATE profiles
SET can_post_jobs = true
WHERE role = 'employer'
  AND employer_type = 'developer';

-- Verify the distribution
SELECT employer_type, can_post_jobs, COUNT(*)
FROM profiles
WHERE role = 'employer'
GROUP BY employer_type, can_post_jobs
ORDER BY employer_type, can_post_jobs;
```

Expected: Contractors have `can_post_jobs = false`, recruiters/developers have `true`

**Step 3: Verify worker accounts unaffected**

```sql
-- Workers should all have can_post_jobs = true (default)
SELECT can_post_jobs, COUNT(*)
FROM profiles
WHERE role = 'worker'
GROUP BY can_post_jobs;
```

Expected: All workers have `can_post_jobs = true`

---

## Task 1.5: Create Admin Middleware Protection

**Files:**
- Modify: `lib/supabase/middleware.ts`

**Step 1: Read current middleware file**

Read: `lib/supabase/middleware.ts` (full file to understand structure)

**Step 2: Add admin access check function**

Add this function before the main middleware export:

```typescript
/**
 * Check if user has admin access for /admin/* routes
 */
async function checkAdminAccess(
  supabase: SupabaseClient,
  pathname: string
): Promise<boolean> {
  // Only check admin routes
  if (!pathname.startsWith('/admin')) {
    return true; // Not an admin route, allow
  }

  // Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false; // Not logged in
  }

  // Check if user has admin flag
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  return profile?.is_admin === true;
}
```

**Step 3: Use admin check in main middleware**

In the main middleware function (usually `updateSession` or similar), add the admin check:

```typescript
export async function updateSession(request: NextRequest) {
  // ... existing code to create supabase client ...

  // Check admin access for /admin/* routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const hasAdminAccess = await checkAdminAccess(
      supabase,
      request.nextUrl.pathname
    );

    if (!hasAdminAccess) {
      // Return 404 to hide admin routes from non-admins
      // (Don't redirect to login to avoid revealing admin routes exist)
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  }

  // ... rest of existing middleware logic ...
}
```

**Step 4: Test middleware locally**

Run: `npm run dev`

Test 1: Navigate to `http://localhost:3000/admin/dashboard` while logged in as admin
Expected: Route loads (may show error until we build pages in Phase 3)

Test 2: Log out, try to access `/admin/dashboard`
Expected: 404 error

Test 3: Log in as non-admin user, try to access `/admin/dashboard`
Expected: 404 error

**Step 5: Commit middleware changes**

```bash
git add lib/supabase/middleware.ts
git commit -m "feat(middleware): add admin route protection

- Add checkAdminAccess function to verify is_admin flag
- Protect all /admin/* routes with admin check
- Return 404 for non-admin users (hide admin routes)
- Query profiles table for admin status
- Maintain existing auth protection for other routes"
```

---

## Phase 1 Verification Checklist

Before proceeding to Phase 2, verify all tasks complete:

- [ ] Migration file created with 350+ lines
- [ ] Migration applied successfully (`npx supabase db push`)
- [ ] All 5 new tables exist in Supabase Dashboard
- [ ] profiles table has is_admin and can_post_jobs columns
- [ ] certifications table has 5 new verification columns
- [ ] platform_settings table has 4 seeded rows
- [ ] All RLS policies created successfully
- [ ] EMPLOYER_TYPES updated with 'developer'
- [ ] EMPLOYER_TYPE_LABELS added to constants
- [ ] TypeScript build succeeds (`npm run build`)
- [ ] Your user account has is_admin = true
- [ ] Admin setup documentation created
- [ ] All existing certifications set to pending status
- [ ] Contractors have can_post_jobs = false
- [ ] Recruiters/developers have can_post_jobs = true
- [ ] Middleware protects /admin/* routes
- [ ] Admin users can access /admin/* (loads, may 404 until Phase 3)
- [ ] Non-admin users get 404 on /admin/*
- [ ] All commits pushed to git

---

## Success Criteria

**Database:** 5 new tables, 7 new columns, all RLS policies active
**Constants:** Developer employer type added with labels
**Admin Access:** Your account is admin, middleware protecting routes
**Data Migration:** Existing certs pending, contractors can't post jobs
**Git:** 5 commits pushed for Phase 1

**Ready for Phase 2:** User-facing verification experience can now be built on this foundation.
