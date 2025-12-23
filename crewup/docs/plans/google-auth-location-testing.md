# Google Authentication & Location Testing Guide

## Overview

This guide covers systematic testing of the complete signup and onboarding flow, with specific focus on:
- Google OAuth authentication
- Location selection and coordinate storage
- Profile creation and updates
- PostGIS geometry handling

---

## Prerequisites

Before testing, ensure:
- ✅ Database migration applied (`update_profile_coords` function exists)
- ✅ Google OAuth configured in Supabase
- ✅ Environment variables set correctly
- ✅ Dev server running: `npm run dev`

---

## Test Flow Overview

1. **Initial Signup** → Google OAuth
2. **OAuth Callback** → Session creation
3. **Profile Creation** → Trigger creates default profile
4. **Onboarding Check** → Redirect to onboarding
5. **Location Selection** → Google Places Autocomplete
6. **Form Submission** → RPC function with PostGIS
7. **Dashboard Redirect** → Complete flow

---

## Test 1: Google OAuth Signup

### Steps:

1. Navigate to: **http://localhost:3000/signup**
2. Click "Continue with Google" button

### Expected Behavior:

**Step 1: OAuth Redirect**
- Redirects to Google sign-in page
- Shows Google account selector
- Asks for permission to access basic profile

**Step 2: OAuth Callback**
- Redirects to: `http://localhost:3000/api/auth/callback?code=...`
- Exchanges code for session
- Creates Supabase auth user

**Step 3: Profile Trigger**
- Database trigger `on_auth_user_created` fires
- Creates profile with:
  - `id` = user.id
  - `email` = user email from Google
  - `name` = "User-{random}" (triggers onboarding)
  - `role` = 'worker' (default)
  - `trade` = 'General Laborer' (default)
  - `location` = 'Update your location' (triggers onboarding)

**Step 4: Onboarding Redirect**
- Callback route checks if profile needs onboarding:
  - If name starts with "User-" → redirect to `/onboarding`
  - If location is "Update your location" → redirect to `/onboarding`
  - Otherwise → redirect to `/dashboard/feed`

### Verification:

Check in Supabase Dashboard → Table Editor → `profiles`:
- New row should exist with your user ID
- `email` should match your Google account
- `name` should be "User-{random}"
- `location` should be "Update your location"
- `coords` should be NULL

### Files to Check if Issues:

- `app/signup/page.tsx` - Signup page with Google button
- `features/auth/actions/auth-actions.ts:69-92` - Google sign-in action
- `app/api/auth/callback/route.ts` - OAuth callback handler
- `supabase/migrations/005_create_triggers.sql` - Profile creation trigger

---

## Test 2: Onboarding - Location Selection

### Steps:

1. Should be automatically redirected to: **http://localhost:3000/onboarding**
2. Fill in the form:
   - **Name**: Your actual name (e.g., "John Doe")
   - **Email**: (pre-filled from Google)
   - **Phone**: Your phone number
   - **Role**: Select "Worker" or "Employer"
   - **Trade**: Select a trade (e.g., "Electrician")
   - **Location**: Start typing an address

### Location Autocomplete Testing:

**What to test:**
1. Type a partial address (e.g., "123 Main")
2. Google Places Autocomplete dropdown appears
3. Select an address from suggestions
4. Address fills in the input field
5. Coordinates are captured in the background

**Expected behavior:**
- Autocomplete shows real addresses
- Selecting an address populates the field
- Form captures both:
  - `location`: Human-readable address string
  - `coords`: `{ lat: number, lng: number }` object

### Verification:

**Check browser console:**
```javascript
// Should log when address is selected
{
  location: "123 Main St, City, State 12345, USA",
  coords: { lat: 40.7128, lng: -74.0060 }
}
```

### Files to Check if Issues:

- `app/onboarding/page.tsx` - Onboarding form
- `hooks/use-places-autocomplete.ts` - Google Places integration
- Check if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`

---

## Test 3: Onboarding - Form Submission

### Steps:

1. Complete all required fields
2. Click "Complete Setup" or "Get Started"

### Expected Behavior:

**Step 1: Client-side validation**
- All required fields must be filled
- Role-specific fields validated (e.g., employer_type for employers)

**Step 2: Server action call**
- Calls `completeOnboarding()` from `features/onboarding/actions/onboarding-actions.ts`
- If coords exist: Calls RPC function `update_profile_coords`
- If no coords: Direct UPDATE on profiles table

**Step 3: PostGIS conversion (if coords exist)**
- RPC function: `update_profile_coords`
- Creates PostGIS POINT: `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`
- Updates profile with all fields including geometry

**Step 4: Success response**
- Returns `{ success: true }`
- Revalidates path: `revalidatePath('/', 'layout')`
- Redirects to: `/dashboard/feed`

### What Should Happen:

✅ Profile updated in database
✅ Coordinates stored in PostGIS format
✅ Redirect to dashboard
✅ User is fully authenticated and onboarded

### What Should NOT Happen:

❌ "parse error - invalid geometry"
❌ Database constraint violations
❌ Redirect back to onboarding
❌ Auth errors or session loss

### Verification:

**Check Supabase Dashboard → Table Editor → `profiles`:**

Your profile should show:
- ✅ `name`: Your actual name (not "User-{random}")
- ✅ `email`: Your email
- ✅ `phone`: Your phone
- ✅ `role`: Selected role
- ✅ `trade`: Selected trade
- ✅ `location`: Full address string
- ✅ `coords`: PostGIS POINT (visible as binary or WKT format)
- ✅ `bio`: Auto-generated or custom bio
- ✅ `updated_at`: Recent timestamp

**To verify coords are valid PostGIS:**

Run this in Supabase SQL Editor:
```sql
SELECT
  id,
  name,
  location,
  ST_AsText(coords) as coords_wkt,
  ST_X(coords::geometry) as longitude,
  ST_Y(coords::geometry) as latitude
FROM profiles
WHERE email = 'your-email@gmail.com';
```

Should return:
```
coords_wkt: POINT(-74.006 40.7128)
longitude: -74.006
latitude: 40.7128
```

### Files to Check if Issues:

- `features/onboarding/actions/onboarding-actions.ts:29-101` - Form submission handler
- `supabase/migrations/006_create_functions.sql:118-148` - `update_profile_coords` function
- `supabase/migrations/002_create_tables.sql` - Profiles table schema

---

## Test 4: Dashboard Access

### Steps:

1. After successful onboarding, should redirect to: **http://localhost:3000/dashboard/feed**

### Expected Behavior:

**Step 1: Middleware auth check**
- Checks if user is authenticated
- If not authenticated → redirect to `/login`
- If authenticated → allow access

**Step 2: Dashboard loads**
- Shows user's profile information
- Displays feed content
- Navigation works (Feed, Profile, Messages, Jobs, etc.)

### Verification:

- ✅ Dashboard loads without errors
- ✅ User name appears (not "User-{random}")
- ✅ Navigation links work
- ✅ Can access all dashboard pages

### Files to Check if Issues:

- `lib/supabase/middleware.ts:85-99` - Protected route logic
- `app/dashboard/layout.tsx` - Dashboard layout
- `app/dashboard/feed/page.tsx` - Feed page

---

## Test 5: Profile with Location

### Steps:

1. Navigate to: **http://localhost:3000/dashboard/profile**
2. View your profile

### Expected Behavior:

**Profile should display:**
- ✅ Name (from onboarding)
- ✅ Email (from Google)
- ✅ Phone (from onboarding)
- ✅ Role badge
- ✅ Trade
- ✅ Location (human-readable address)
- ✅ Bio

**Map display (if implemented):**
- ✅ Shows map centered on user's location
- ✅ Marker at correct coordinates

### Verification:

**Check that location is displayed correctly:**
- Should show the full address you entered
- Should NOT show "Update your location"
- Should NOT show raw coordinates

---

## Test 6: Location Updates

### Steps:

1. Navigate to: **http://localhost:3000/dashboard/profile/edit**
2. Click on location field
3. Enter a new address using autocomplete
4. Save profile

### Expected Behavior:

**Step 1: Autocomplete works**
- Google Places suggestions appear
- Can select new address
- Coords update in background

**Step 2: Profile update**
- Calls `updateProfile()` action
- Uses RPC function if coords changed
- Updates database successfully

**Step 3: Success**
- Shows success message/toast
- Location updated in UI
- Database reflects changes

### Verification:

**Run in Supabase SQL Editor:**
```sql
SELECT
  name,
  location,
  ST_AsText(coords) as coords_wkt,
  updated_at
FROM profiles
WHERE email = 'your-email@gmail.com';
```

Should show:
- New location string
- New coordinates
- Recent `updated_at` timestamp

---

## Common Errors & Solutions

### Error: "parse error - invalid geometry"

**Cause:** PostGIS can't parse the coordinates

**Solutions:**
1. Verify `update_profile_coords` function exists:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name = 'update_profile_coords';
   ```

2. If missing, run migration:
   ```bash
   npx supabase db push
   ```

3. Or manually create function (see migration file)

**Root cause:** Trying to insert coordinates directly instead of using RPC function

---

### Error: "Invalid Refresh Token: Refresh Token Not Found"

**Cause:** Session expired or cookies cleared

**Solutions:**
1. Sign out completely
2. Clear browser cookies for localhost
3. Sign in again with Google

**Not critical:** Usually occurs during development when restarting server

---

### Error: "Your project's URL and Key are required to create a Supabase client!"

**Cause:** Missing environment variables

**Solutions:**
1. Check `.env.local` has:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

2. Restart dev server after .env changes

---

### Error: Google sign-in redirects to error page

**Cause:** OAuth not configured in Supabase

**Solutions:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add OAuth credentials:
   - Client ID
   - Client Secret
4. Add redirect URLs:
   - `http://localhost:3000/api/auth/callback`
   - `https://your-domain.com/api/auth/callback`

---

### Error: Location autocomplete doesn't work

**Cause:** Google Maps API key missing or restricted

**Solutions:**
1. Check `.env.local` has `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Verify key in Google Cloud Console:
   - Places API enabled
   - Maps JavaScript API enabled
   - API key not restricted (or localhost allowed)

---

## Success Criteria

All tests pass when:

✅ **Google OAuth works**
- Can sign in with Google
- Creates auth user
- Creates profile via trigger

✅ **Onboarding works**
- Detects incomplete profiles
- Shows onboarding form
- Location autocomplete functional
- Form submission succeeds

✅ **Location handling works**
- Autocomplete shows suggestions
- Captures coordinates correctly
- Stores in PostGIS format
- No geometry errors

✅ **Dashboard access works**
- Redirects to dashboard after onboarding
- Profile shows correct data
- Location displays properly

✅ **Profile updates work**
- Can edit profile
- Can update location
- Changes persist to database

---

## Next Steps After Testing

Once all tests pass:

1. **Test on production** (Vercel deployment)
2. **Verify OAuth redirect URLs** in production
3. **Test with multiple users**
4. **Test edge cases:**
   - No location provided
   - Invalid addresses
   - Switching roles
   - Multiple location updates

5. **Return to Stripe testing:**
   - Complete onboarding
   - Test subscription flow
   - Verify Pro features

---

## Quick Test Checklist

Use this for rapid testing:

- [ ] Sign in with Google works
- [ ] Profile created in database
- [ ] Redirected to onboarding
- [ ] Name pre-filled from Google
- [ ] Location autocomplete shows suggestions
- [ ] Can select address from dropdown
- [ ] Form submits without errors
- [ ] Redirected to dashboard
- [ ] Profile shows correct name and location
- [ ] Can access all dashboard pages
- [ ] Location stored as PostGIS POINT in database
- [ ] Can update location
- [ ] Changes persist after refresh

---

## Testing Notes

**Test accounts:**
- Use real Google account (no mock data needed)
- Test with both worker and employer roles
- Test with different trades
- Test with various locations (US and international)

**Database inspection:**
- Use Supabase Table Editor to verify data
- Use SQL Editor to check PostGIS format
- Monitor real-time updates during testing

**Browser DevTools:**
- Check Network tab for API calls
- Check Console for errors
- Check Application → Cookies for session
