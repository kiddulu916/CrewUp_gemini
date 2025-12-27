# Admin Setup Guide

## Granting Admin Access

To grant admin access to a user account:

### Step 1: Get User ID

1. Open Supabase Dashboard → Authentication → Users
2. Find the user account
3. Copy their UUID

### Step 2: Set Admin Flag

In Supabase SQL Editor, run:

```sql
UPDATE profiles
SET is_admin = true
WHERE user_id = 'USER_UUID_HERE';

-- Verify:
SELECT name, email, is_admin FROM profiles WHERE user_id = 'USER_UUID_HERE';
```

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

```sql
UPDATE profiles
SET is_admin = false
WHERE user_id = 'USER_UUID_HERE';
```

## Security Notes

- Admin access is checked via middleware on every `/admin/*` request
- Non-admin users attempting to access admin routes receive a 404 error
- All admin actions are logged to `admin_activity_log` table
- RLS policies prevent non-admins from querying admin tables
