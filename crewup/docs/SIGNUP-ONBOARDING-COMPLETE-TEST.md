# Complete Signup & Onboarding Testing Guide

## ⚠️ CRITICAL: This is the ONLY flow to focus on right now

Ignore all Stripe/subscription testing. Focus ONLY on:
1. ✅ Google OAuth signup
2. ✅ Profile auto-creation (trigger)
3. ✅ Onboarding detection
4. ✅ Location handling
5. ✅ Dashboard access

---

## 🔄 Step 1: Complete Database Reset

### Run the Reset Script

1. Go to **Supabase Dashboard → SQL Editor**
2. Create new query
3. Copy the entire contents of `/supabase/database-reset.sql`
4. **PASTE** into SQL Editor
5. Click **RUN**

**Expected output:**
```
COMMIT
Success: No rows returned
```

### Verify Everything Was Created

Run these verification queries:

```sql
-- Check all tables exist (should return 10 rows)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check all triggers exist (should return 8 triggers)
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check all functions exist (should return 9 functions)
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- CRITICAL: Verify the profile creation trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected for trigger query:**
- `trigger_name`: `on_auth_user_created`
- `event_manipulation`: `INSERT`
- `event_object_table`: `users`
- `action_statement`: Contains `handle_new_user()`

---

## 🧪 Step 2: Test Google OAuth Signup (Fresh User)

### Prerequisites

Make sure:
- ✅ Dev server running: `npm run dev`
- ✅ Supabase Site URL = `http://localhost:3000`
- ✅ Google OAuth enabled in Supabase
- ✅ No existing profile for your test email

### Test Flow

1. **Navigate to signup:**
   - Go to: `http://localhost:3000/signup`

2. **Click "Continue with Google":**
   - Should redirect to Google OAuth
   - Sign in with Google account
   - Grant permissions

3. **OAuth Callback:**
   - Redirects to: `http://localhost:3000/api/auth/callback?code=...`
   - Exchanges code for session
   - **CRITICAL:** Trigger should fire here

4. **Expected Redirect:**
   - Should redirect to: `http://localhost:3000/onboarding`
   - Should NOT stay on callback
   - Should NOT redirect to dashboard yet

---

## ✅ Step 3: Verify Profile Was Auto-Created

### Check in Supabase

Run this query **immediately after OAuth**:

```sql
-- Check if profile was created (replace with your email)
SELECT
  id,
  email,
  name,
  role,
  trade,
  location,
  subscription_status,
  created_at
FROM profiles
WHERE email = 'your-test-email@gmail.com';
```

**Expected result:**
- ✅ One row exists
- ✅ `email`: Your Google email
- ✅ `name`: Starts with "User-" (e.g., "User-a1b2c3d4")
- ✅ `role`: `worker`
- ✅ `trade`: `General Laborer`
- ✅ `location`: `Update your location`
- ✅ `subscription_status`: `free`
- ✅ `created_at`: Recent timestamp

### Check Auth User

```sql
-- Verify auth user exists
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
WHERE email = 'your-test-email@gmail.com';
```

**Expected:**
- ✅ User ID matches profile ID
- ✅ Email matches
- ✅ `full_name` from Google (or NULL)

---

## 📝 Step 4: Complete Onboarding Form

### Fill Out the Form

On `/onboarding` page:

1. **Name:**
   - Default shows "User-{id}" or Google name
   - Change to your real name

2. **Email:**
   - Pre-filled from Google
   - Should be disabled/readonly

3. **Phone:**
   - Enter phone number

4. **Role:**
   - Select "Worker" or "Employer"
   - If Employer → Also select employer type

5. **Trade:**
   - Select a specific trade
   - If trade has sub-trades → Select sub-trade

6. **Location:** **CRITICAL TEST**
   - Start typing an address
   - Google Places Autocomplete dropdown appears
   - Select address from dropdown
   - Address fills in the field
   - Coordinates captured in background

7. **Bio:** (Optional)
   - Enter or leave default

### Submit the Form

Click "Complete Setup" or "Get Started"

**Expected:**
- ✅ Form submits successfully
- ✅ No errors
- ✅ No "parse error - invalid geometry"
- ✅ Redirects to: `http://localhost:3000/dashboard/feed`

---

## ✅ Step 5: Verify Onboarding Data Saved

### Check Profile Updated

Run this query:

```sql
SELECT
  name,
  role,
  trade,
  sub_trade,
  location,
  ST_AsText(coords) as coords_wkt,
  ST_X(coords::geometry) as longitude,
  ST_Y(coords::geometry) as latitude,
  bio,
  updated_at
FROM profiles
WHERE email = 'your-test-email@gmail.com';
```

**Expected:**
- ✅ `name`: Your real name (NOT "User-{id}")
- ✅ `role`: Your selected role
- ✅ `trade`: Your selected trade (NOT "General Laborer")
- ✅ `location`: Full address you selected
- ✅ `coords_wkt`: `POINT(longitude latitude)` format
- ✅ `longitude` and `latitude`: Numeric values
- ✅ `bio`: Your bio or default
- ✅ `updated_at`: Recent timestamp

---

## 🏠 Step 6: Dashboard Access

### Navigate to Dashboard

Go to: `http://localhost:3000/dashboard/feed`

**Expected:**
- ✅ Loads dashboard successfully
- ✅ Shows: "Welcome back, {your name}!"
- ✅ No redirect to onboarding
- ✅ No errors in console
- ✅ Profile data displays correctly

### Check Other Dashboard Pages

- `/dashboard/profile` - View profile
- `/dashboard/profile/edit` - Edit profile
- `/dashboard/jobs` - Jobs list
- `/dashboard/messages` - Messages

**All should:**
- ✅ Load without errors
- ✅ Show authenticated user data
- ✅ Not redirect to onboarding

---

## 🔄 Step 7: Test Sign Out & Sign In

### Sign Out

1. Click sign out button
2. Should redirect to `/login`
3. Session should be cleared

### Sign In Again

1. Go to `/login`
2. Click "Continue with Google"
3. Should sign in immediately (already authorized)
4. Should redirect to `/dashboard/feed` (NOT onboarding)

**Why?** Profile is complete, no onboarding needed

---

## 🧪 Step 8: Test Second User (Clean Signup)

### Use Different Google Account

1. Sign out completely
2. Clear browser cookies for localhost
3. Use different Google account
4. Follow Steps 2-6 again

**Purpose:** Verify trigger works for all new users

---

## ✅ Success Criteria Checklist

Mark each as complete:

- [ ] Database reset script runs successfully
- [ ] All tables created (10 tables)
- [ ] All triggers created (8 triggers)
- [ ] All functions created (9 functions)
- [ ] `on_auth_user_created` trigger exists
- [ ] Google OAuth signup works
- [ ] Profile auto-created by trigger
- [ ] Profile has default values (User-, General Laborer, Update your location)
- [ ] Redirects to onboarding after signup
- [ ] Onboarding form loads correctly
- [ ] Location autocomplete shows dropdown
- [ ] Can select address from autocomplete
- [ ] Form submits without errors
- [ ] Profile updated with real data
- [ ] Location saved as PostGIS POINT
- [ ] Redirects to dashboard after onboarding
- [ ] Dashboard loads successfully
- [ ] No redirect back to onboarding
- [ ] Sign out works
- [ ] Sign in redirects to dashboard (not onboarding)
- [ ] Second user signup works the same way

---

## 🚨 Common Issues & Solutions

### Issue: Trigger doesn't fire, no profile created

**Check:**
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Solution:** Re-run database reset script

---

### Issue: "parse error - invalid geometry"

**Check:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'update_profile_coords';
```

**Solution:** Verify `update_profile_coords` function exists

---

### Issue: Redirects to dashboard instead of onboarding

**Problem:** Profile doesn't have default trigger values

**Check:**
```sql
SELECT name, trade, location
FROM profiles
WHERE email = 'your-email@gmail.com';
```

**Expected:**
- `name` should start with "User-"
- `trade` should be "General Laborer"
- `location` should be "Update your location"

**Solution:** Delete profile and sign up again to test trigger

---

### Issue: Location autocomplete doesn't work

**Check `.env.local`:**
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here
```

**Verify in Google Cloud Console:**
- Places API enabled
- Maps JavaScript API enabled
- API key restrictions allow localhost

---

### Issue: "Site URL" keeps redirecting to production

**Fix in Supabase:**
1. Dashboard → Authentication → URL Configuration
2. Set Site URL: `http://localhost:3000`
3. Save changes

---

## 📋 Test Results Template

Copy and fill this out:

```
SIGNUP & ONBOARDING TEST RESULTS
=================================

Date: _______________
Tester: _______________

DATABASE RESET:
[ ] Script ran successfully
[ ] All tables created
[ ] All triggers created
[ ] All functions created

GOOGLE OAUTH SIGNUP:
[ ] OAuth flow works
[ ] Redirects to onboarding
[ ] Profile auto-created
[ ] Default values set correctly

ONBOARDING:
[ ] Form loads
[ ] All fields present
[ ] Location autocomplete works
[ ] Address selection works
[ ] Form submits successfully
[ ] No geometry errors

PROFILE VERIFICATION:
[ ] Name updated correctly
[ ] Role saved
[ ] Trade saved
[ ] Location saved
[ ] Coordinates saved as PostGIS
[ ] All fields match form input

DASHBOARD ACCESS:
[ ] Dashboard loads
[ ] No redirect to onboarding
[ ] Profile data displays
[ ] All dashboard pages work

SIGN OUT/IN:
[ ] Sign out works
[ ] Sign in redirects to dashboard
[ ] No onboarding prompt

NOTES/ISSUES:
_______________________________________________
_______________________________________________
_______________________________________________
```

---

## 🎯 What's Next After All Tests Pass

**ONLY after 100% of tests pass:**

1. ✅ Commit all changes
2. ✅ Deploy to production
3. ✅ Test on production with Site URL updated
4. ✅ **THEN** move to Stripe testing

**DO NOT proceed to Stripe until signup/onboarding is perfect.**

---

## 📞 Need Help?

If any test fails:

1. Note which step failed
2. Check error messages in:
   - Browser console (F12)
   - Dev server terminal
   - Supabase logs
3. Run verification queries
4. Check relevant files in the codebase
