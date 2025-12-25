# Manual Testing Checklist

Complete end-to-end testing guide for KrewUp features.

**Testing Environment**: http://localhost:3000

---

## ✅ Authentication & Onboarding

### Google OAuth Signup
- [x] Navigate to `/signup`
- [x] Click "Continue with Google"
- [x] Complete Google OAuth flow
- [x] Verify redirect to `/onboarding`
- [x] Verify profile auto-created in database

**Database Verification:**
```sql
SELECT id, email, name, role, trade, location
FROM profiles
WHERE email = 'your-email@gmail.com';
```
**Expected**: name starts with "User-", trade is "General Laborer", location is "Update your location"

### Onboarding Flow
- [x] Step 1: Name, phone, email
  - [x] Email is pre-filled from Google
  - [x] Phone auto-formats as you type: (XXX)XXX-XXXX
  - [x] Location indicator shows (may show error if GPS denied)
  - [x] All fields validate properly
- [x] Step 2: Role selection
  - [x] Can select Worker or Employer
  - [x] Clicking a role advances to next step
- [x] Step 3: Trade/Employer details
  - [x] Trade dropdown shows all trades
  - [x] Sub-trade appears when applicable
  - [x] Bio field (needs to only be optional)
  - [x] Form submits successfully
- [x] Redirect to `/dashboard/feed` after completion

**Database Verification:**
```sql
SELECT name, phone, email, role, trade, location,
       ST_AsText(coords) as coords_wkt
FROM profiles
WHERE email = 'your-email@gmail.com';
```
**Expected**: All fields populated, coords in POINT format (or NULL if GPS failed)

### Email/Password Signup
- [x] Navigate to `/signup`
- [x] Fill in name, email, password, confirm password
- [x] Check Terms checkbox
- [x] Click "Create account"
- [x] See success message to check email
- [x] Check email for verification link
- [x] Click verification link
- [x] Verify redirect to app
- [x] Complete onboarding flow

### Login/Logout
- [x] Sign out from dashboard
- [x] Navigate to `/login`
- [x] Enter credentials and sign in
- [x] Verify redirect to dashboard (NOT onboarding for complete profiles)
- [x] Verify profile data displays correctly
- [x] Sign out
- [ ] Verify redirect to `/login` (redirects to root url)

---

## ✅ Profile Management

### View Profile
- [x] Navigate to `/dashboard/profile`
- [x] Verify all profile data displays:
  - [x] Name
  - [x] Email
  - [x] Phone (formatted)
  - [x] Role badge (Worker/Employer)
  - [x] Trade
  - [x] Sub-trade (if applicable)
  - [x] Location
  - [x] Bio
- [x] Certifications section shows
- [x] Experience section shows

### Edit Profile
- [x] Navigate to `/dashboard/profile/edit`
- [x] Change name
- [ ] Change phone (No auto-formatting)
- [x] Change trade
- [x] Change sub-trade
- [ ] Change location (Google Places Autocomplete)
  - [x] Start typing address
  - [ ] See autocomplete dropdown (No autocomplete dropdown)
  - [ ] Select address
  - [ ] Address fills in
- [x] Change bio
- [x] Click "Save Changes"
- [x] See success toast
- [x] Verify changes on profile page

**Database Verification:**
```sql
SELECT name, phone, trade, sub_trade, location,
       ST_AsText(coords) as coords_wkt, bio
FROM profiles
WHERE id = 'your-user-id';
```
(coords_wkt didnt change with the address in location changed)

### Certifications
- [x] Navigate to `/dashboard/profile/certifications`
- [x] Click "Add Certification"
- [x] Fill in certification details:
  - [ ] Name (No name field)
  - [x] Issuing organization (Needs to be required for verification purposes)
  - [x] Issue date
  - [x] Expiration date
  - [x] Certification number (Should be required for verification purposes)
  - [x] Upload photo/PDF (Needs to be required for verification purposes)
- [ ] Save certification (Save fails need more detailed error message to see what failed and how)
- [ ] See success toast
- [ ] Certification appears in list
- [ ] Click delete on certification
- [ ] Confirm deletion dialog appears
- [ ] Confirm deletion
- [ ] See success toast
- [ ] Certification removed from list

### Work Experience
- [x] Navigate to `/dashboard/profile/experience`
- [x] Click "Add Experience"
- [x] Fill in experience details:
  - [x] Company name 
  - [x] Job title
  - [x] Start date
  - [x] End date (or "Currently working here")
  - [x] Description
- [ ] Save experience (Failed to add experience needs more details for error message to determine what and how it failed)
- [ ] See success toast
- [ ] Experience appears in list
- [ ] Click delete on experience
- [ ] Confirm deletion
- [ ] Experience removed from list

---
**NOTE**: Login allows people to use the same email as another user. this need to be restricted.

## ✅ Job Posting & Feed (Employer Flow)

### Post a Job (Employer Only)
- [x] Login as employer
- [x] Navigate to `/dashboard/jobs/new`
- [x] Fill in job details:
  - [x] Job title
  - [x] Trade
  - [x] Sub-trade (optional)
  - [x] Job type (select from dropdown)
  - [x] **If Hourly job type**: Hourly rate and pay period
  - [x] **If Contract job type**: Contract amount and payment type (temporary needs to also include a "Time Length" field for how long the job is needed for)
  - [ ] Location (Google Places Autocomplete) (no autocomplete)
  - [x] Description
  - [x] Required certifications (multi-select)
- [ ] Submit job posting (**CRITICAL** Error Message: "null value in column "employer_name" of relation "jobs" violates not-null constraint" no employer name field because there was no Company name field during onboarding, company name needs to be in onboarding and saved in database as employer_name so that employer_name is automatically included in every job posting made by that employer and no employer name field is required in the "dashboard/job/new" page )
- [ ] See success message
- [ ] Redirect to job feed
- [ ] Verify new job appears

**Database Verification:** (Fix job posting)
```sql
SELECT title, trade, job_type, pay_rate, location,
       ST_AsText(coords) as coords_wkt, required_certs
FROM jobs
WHERE employer_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

### View Job Feed (Worker) (Fix job posting)
- [ ] Login as worker
- [ ] Navigate to `/dashboard/jobs`
- [ ] See list of available jobs
- [ ] Verify jobs show:
  - [ ] Job title
  - [ ] Employer name
  - [ ] Trade
  - [ ] Location
  - [ ] Distance from user (if coords available)
  - [ ] Pay rate
  - [ ] Posted date
- [ ] Filter by trade
- [ ] Filter by job type
- [ ] Verify filters work correctly

### View Job Details (Fix job posting)
- [ ] Click on a job card
- [ ] Navigate to `/dashboard/jobs/[id]`
- [ ] Verify job details show:
  - [ ] Full description
  - [ ] All job information
  - [ ] Required certifications
  - [ ] Employer information
  - [ ] "Apply" button (for workers)
  - [ ] "Message Employer" button (for workers)

---

## ✅ Job Applications

### Apply to Job (Worker) (Fix job posting)
- [ ] Navigate to job detail page
- [ ] Click "Apply" button
- [ ] Application modal opens
- [ ] Write optional cover letter
- [ ] Submit application
- [ ] See success toast
- [ ] "Apply" button changes to "Applied"
- [ ] Cannot apply again to same job

### View Applications (Worker) (Fix job posting)
- [ ] Navigate to `/dashboard/applications`
- [ ] See list of jobs you've applied to
- [ ] Each application shows:
  - [ ] Job title
  - [ ] Employer name
  - [ ] Application date
  - [ ] Status (pending/viewed/hired/rejected)
  - [ ] Cover letter (if provided)

### View Applications (Employer) (Fix job posting)
- [ ] Navigate to `/dashboard/applications`
- [ ] See jobs you've posted with application counts
- [ ] Click on a job
- [ ] See list of applicants
- [ ] Each applicant shows:
  - [ ] Worker name
  - [ ] Trade/skills
  - [ ] Application date
  - [ ] Cover letter
  - [ ] "View Profile" button
  - [ ] "Message" button

---

## ✅ Messaging System

### Start Conversation (Fix job posting)
- [ ] From job detail page, click "Message Employer" (worker) or "Message" on application (employer)
- [ ] Navigate to `/dashboard/messages`
- [ ] Conversation appears in list
- [ ] Click conversation
- [ ] Navigate to `/dashboard/messages/[id]`
- [ ] Chat window opens

### Send Messages (Fix job posting)
- [ ] Type message in input field
- [ ] Press Enter or click Send
- [ ] Message appears in chat
- [ ] Message shows:
  - [ ] Sender name (You vs other person)
  - [ ] Message content
  - [ ] Timestamp
  - [ ] Read status

### Receive Messages (Polling) (Fix job posting)
- [ ] Open conversation in two different browsers/accounts
- [ ] Send message from one account
- [ ] Wait up to 3 seconds
- [ ] Message appears in other account automatically

### Message List (Fix job posting)
- [ ] Navigate to `/dashboard/messages`
- [ ] See list of all conversations
- [ ] Each conversation shows:
  - [ ] Other person's name
  - [ ] Last message preview
  - [ ] Timestamp
  - [ ] Unread indicator (if applicable)

---

## ✅ Subscription System (if Stripe configured)

(**NOTE**: Needs to have different features based on if the user is an employer or worker)

### View Pricing
- [x] Navigate to `/pricing`
- [ ] See Free and Pro plans (No free/pro comparision)
- [x] Pro plan shows $15/month and $150/year options
- [x] Features listed correctly (See the note above)

### Subscribe to Pro
- [ ] Click "Upgrade to Pro" button (No upgrade to pro button, has "subscribe monthly" and "subscribe annually" )
- [x] Redirect to Stripe Checkout
- [x] Enter payment details ("Save my information for faster checkout" phone number verification error saying its the wrong country areacode )
- [x] Complete checkout
- [x] Redirect back to app
- [ ] See success message (No success message says current plan is still free)

**Database Verification:**
```sql
SELECT subscription_status, stripe_customer_id, stripe_subscription_id
FROM profiles
WHERE id = 'your-user-id';
```
**Expected**: subscription_status = 'pro', stripe IDs populated
(ERROR MESSAGE: Failed to run sql query: ERROR: 42703: column "stripe_customer_id" does not exist LINE 1: SELECT subscription_status, stripe_customer_id, stripe_subscription_id ^ )

### Manage Subscription
- [x] Navigate to `/dashboard/subscription`
- [ ] See current plan (Pro) (still says current plan free)
- [ ] See billing information (never asked for billing information at checkout)
- [ ] See cancel subscription button (see above)
- [ ] Click "Manage Billing" (see above)

---

## 🐛 Error Scenarios to Test

### Authentication Errors
- [x] Try signing up with existing email (Allows signing up with same email which it shouldnt)
- [x] Try signing in with wrong password
- [x] Try accessing protected routes without auth
- [x] Try accessing onboarding with complete profile

### Form Validation
- [x] Submit forms with empty required fields
- [x] Submit profile with invalid phone format (doesnt auto format phone number in profile editing)
- [x] Submit password that's too short
- [x] Submit passwords that don't match

### Job Application Errors (see critical job posting error above )
- [ ] Try applying to same job twice
- [ ] Try applying to your own job (employer)

### Location Errors
- [x] Deny location permissions
- [ ] Enter invalid address in autocomplete (no autocomplete)
- [x] Test without Google Maps API key

---

## 📱 Mobile Testing (Need to test in production)

After completing functional testing, test on mobile devices:
- [ ] Test on mobile Chrome
- [ ] Test on mobile Safari (iOS)
- [ ] Test all flows work on mobile
- [ ] Test touch interactions
- [ ] Test responsive design

---

## ✅ Success Criteria

Mark each section as complete only when:
- All checkboxes are marked
- No errors found, or all errors documented
- Database verification queries pass
- Expected behavior matches actual behavior

**Notes/Issues Found:**

Onboarding Flow:
Bio field (needs to only be optional)

Login/Logout:
Verify redirect to `/login` (it redirects to root url should route to /login)

Edit Profile:
Change phone (No auto-formatting)
See autocomplete dropdown (No autocomplete dropdown)
Note: coords_wkt didnt change with the address in location changed

Certification:
[x] Fill in certification details:
   Name (No name field)
   Issuing organization (Needs to be required for verification purposes)
   Certification number (Should be required for verification purposes) 
   Upload photo/PDF (Needs to be required for verification purposes)
Save certification (Save fails need more detailed error message to see what failed and how)

Work Experience:
Save experience (Failed to add experience needs more details for error message to determine what and how it failed)

Post a Job (Employer Only):
Note: temporary needs to also include a "Time Length" field for how long the job is needed for
Location (Google Places Autocomplete) (no autocomplete)
Submit job posting (**CRITICAL** Error Message: "null value in column "employer_name" of relation "jobs" violates not-null constraint" no employer name field because there was no Company name field during onboarding, company name needs to be in onboarding and saved in database as employer_name so that employer_name is automatically included in every job posting made by that employer and no employer name field is required in the "dashboard/job/new" page )

View Job Feed (Worker) (Fix job posting)

View Job Details (Fix job posting)

Apply to Job (Worker) (Fix job posting)

View Applications (Worker) (Fix job posting)

View Applications (Employer) (Fix job posting)

Messaging System (Fix job posting)

Subscription System:
Note: Needs to have different features based on if the user is an employer or worker

View Pricing:
See Free and Pro plans (No free/pro comparision)
Features listed correctly (See the note above)

Subscribe to Pro:
Click "Upgrade to Pro" button (No upgrade to pro button, has "subscribe monthly" and "subscribe annually" )
Enter payment details ("Save my information for faster checkout" phone number verification error saying its the wrong country areacode )
See success message (No success message says current plan is still free)
Database verification - (ERROR MESSAGE: Failed to run sql query: ERROR: 42703: column "stripe_customer_id" does not exist LINE 1: SELECT subscription_status, stripe_customer_id, stripe_subscription_id ^ )

Manage Subscription:
See current plan (Pro) (still says current plan free)
See billing information (never asked for billing information at checkout)
See cancel subscription button (see above)
Click "Manage Billing" (see above)

Error Scenarios: 
Try signing up with existing email (Allows signing up with same email which it shouldnt)
Submit profile with invalid phone format (doesnt auto format phone number in profile editing)
Enter invalid address in autocomplete (no autocomplete)
Job Application Errors (see critical job posting error above )

Mobile Testing (Need to test in production)

---

## 🚀 After Testing

Once all tests pass:
1. Update `progress-checklist.md` with test results
2. Fix any bugs found
3. Re-test affected areas
4. Document any known issues
5. Prepare for beta user invitations
