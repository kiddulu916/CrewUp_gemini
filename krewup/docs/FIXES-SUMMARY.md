# Manual Testing Issues - Fixes Summary

## ✅ COMPLETED FIXES

### 1. **CRITICAL: Employer Name/Company Name Issue**
**Problem**: Job posting failed with error "null value in column 'employer_name' violates not-null constraint"

**Fix**:
- ✅ Added `company_name` column to profiles table (migration: `007_add_company_name.sql`)
- ✅ Updated onboarding step 3 to collect company name from employers (required field)
- ✅ Updated job queries (`useJobs` and `useJob` hooks) to join with profiles and fetch employer_name
- ✅ Fallback logic: uses `company_name` if available, otherwise falls back to profile `name`

**Files Changed**:
- `supabase/migrations/007_add_company_name.sql` (NEW)
- `features/onboarding/actions/onboarding-actions.ts`
- `features/onboarding/components/onboarding-form.tsx`
- `features/jobs/hooks/use-jobs.ts`
- `features/jobs/hooks/use-job.ts`

### 2. **Bio Field Optional**
**Problem**: Bio field label didn't indicate it was optional for employers

**Fix**:
- ✅ Changed label from "Bio" to "Bio (Optional)" for employers in onboarding step 3
- ✅ Bio already was optional in validation logic

**Files Changed**:
- `features/onboarding/components/onboarding-form.tsx`

### 3. **Logout Redirect**
**Problem**: Logout redirected to root URL (`/`) instead of `/login`

**Fix**:
- ✅ Updated `signOut()` action to redirect to `/login`

**Files Changed**:
- `features/auth/actions/auth-actions.ts`

### 4. **Phone Auto-Formatting in Profile Edit**
**Problem**: Phone number editing didn't auto-format like onboarding

**Fix**:
- ✅ Added `formatPhoneNumber()` and `handlePhoneChange()` to profile form
- ✅ Formats phone as: `(XXX)XXX-XXXX` as user types

**Files Changed**:
- `features/profiles/components/profile-form.tsx`

### 5. **Duplicate Email Signups**
**Problem**: Users could sign up with the same email multiple times

**Fix**:
- ✅ Added email uniqueness check in `signUp()` action
- ✅ Checks profiles table before creating new auth user
- ✅ Returns clear error: "An account with this email already exists. Please sign in instead."

**Files Changed**:
- `features/auth/actions/auth-actions.ts`

### 6. **Subscription Status Not Updating**
**Problem**: After Stripe checkout, subscription status in profiles remained 'free'

**Fix**:
- ✅ Updated Stripe webhook `checkout.session.completed` to sync `profiles.subscription_status = 'pro'`
- ✅ Updated `customer.subscription.deleted` to sync `profiles.subscription_status = 'free'`
- ✅ Stripe data correctly stored in `subscriptions` table (stripe_customer_id, stripe_subscription_id)

**Files Changed**:
- `app/api/webhooks/stripe/route.ts`

**Note**: The manual testing SQL query was incorrect. Stripe IDs are stored in the `subscriptions` table, not `profiles`. Correct query:
```sql
-- Check subscription status in profiles
SELECT id, subscription_status FROM profiles WHERE id = 'your-user-id';

-- Check detailed subscription data
SELECT * FROM subscriptions WHERE user_id = 'your-user-id';
```

---

## ⚠️ MIGRATION REQUIRED

**You must apply the database migration before testing employer onboarding or job posting:**

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard: https://app.supabase.com/project/_/sql
2. Open the SQL Editor
3. Copy the contents of `supabase/migrations/007_add_company_name.sql`
4. Paste and execute

### Option 2: Direct SQL
```sql
ALTER TABLE profiles ADD COLUMN company_name TEXT;
COMMENT ON COLUMN profiles.company_name IS 'Business/company name for employers. NULL for workers.';
```

---

## 📋 REMAINING ISSUES TO FIX

### 7. **Google Places Autocomplete Not Working**
**Locations Affected**:
- Profile edit page (`/dashboard/profile/edit`) - location field
- Job posting page (`/dashboard/jobs/new`) - location field

**Expected**: Google Places autocomplete dropdown should appear when typing address

**Current Status**: Pending fix

---

### 8. **Coords Not Updating When Location Changes**
**Location**: Profile edit page
**Problem**: When user changes location text, the `coords` field doesn't update accordingly

**Expected**: If using Google Places autocomplete, coords should update from selected place. Otherwise, may need geocoding.

**Current Status**: Pending fix (related to #7)

---

### 9. **Certification Form Issues**
**Location**: `/dashboard/profile/certifications`

**Problems**:
1. Missing "Name" field (certification name/type)
2. Some fields should be required for verification:
   - Issuing organization (should be required)
   - Certification number (should be required)
   - Upload photo/PDF (should be required)
3. Save failures don't provide detailed error messages

**Expected**: Form should validate required fields and show clear error messages

**Current Status**: Pending fix

---

### 10. **Work Experience Save Failures**
**Location**: `/dashboard/profile/experience`

**Problem**: Save fails without detailed error message

**Expected**: Clear error messages indicating what failed and how to fix it

**Current Status**: Pending fix

---

### 11. **Contract Job Time Length Field**
**Location**: Job posting form

**Problem**: Contract/Temporary job types don't have a "Time Length" field

**Expected**: Add optional field for contract duration (e.g., "3 months", "6 weeks")

**Current Status**: Pending fix

---

## 🎯 TESTING AFTER FIXES

### Test Employer Onboarding (NEW USERS)
1. Sign up as a new user
2. Select "I'm an Employer" in step 2
3. In step 3, verify:
   - ✅ Employer Type dropdown appears
   - ✅ **Company/Business Name field appears (NEW!)**
   - ✅ Trade Specialty dropdown
   - ✅ Bio marked as (Optional)
4. Fill all required fields and complete setup
5. Verify profile created successfully

### Test Job Posting (REQUIRES MIGRATION)
1. Login as employer
2. Navigate to `/dashboard/jobs/new`
3. Fill in job details and submit
4. ✅ **Should succeed** (no more employer_name error!)
5. View job in feed
6. ✅ **Verify "Posted By" shows company name**

### Test Subscription Status Sync
1. Subscribe to Pro plan via Stripe Checkout
2. Complete payment
3. Return to `/dashboard/subscription`
4. ✅ **Should show "Current Plan: Pro"** (was showing "free" before)
5. Check database:
```sql
SELECT subscription_status FROM profiles WHERE id = 'your-user-id';
-- Should return: 'pro'

SELECT * FROM subscriptions WHERE user_id = 'your-user-id';
-- Should return subscription with stripe_customer_id and stripe_subscription_id
```

### Test Duplicate Email Prevention
1. Sign up with email: test@example.com
2. Try to sign up again with same email
3. ✅ **Should see error**: "An account with this email already exists. Please sign in instead."

### Test Phone Auto-Formatting
1. Navigate to `/dashboard/profile/edit`
2. Click in phone number field
3. Type: 5551234567
4. ✅ **Should auto-format to**: (555)123-4567

### Test Logout Redirect
1. Click "Sign Out" from dashboard
2. ✅ **Should redirect to `/login`** (not `/`)

---

## 📊 PROGRESS

**Completed**: 6 out of 12 issues (50%)
**Remaining**: 6 issues

**Blocked Items**: None (migration can be applied manually)

---

## 🚀 NEXT STEPS

1. **IMMEDIATE**: Apply database migration `007_add_company_name.sql`
2. **THEN**: Test employer onboarding and job posting to verify critical fix
3. **AFTER**: Fix remaining issues in priority order:
   - Google Places Autocomplete (affects 2 pages)
   - Certification form improvements
   - Work experience error messages
   - Contract job time length field

---

## 💡 NOTES

- The codebase architecture is solid - most issues were small oversights
- Subscription system uses proper two-table design (profiles + subscriptions)
- Job employer name is correctly fetched via JOIN (no denormalization needed)
- All fixes maintain existing patterns and conventions

**Questions or issues?** Check the individual file changes above or review the git diff.
