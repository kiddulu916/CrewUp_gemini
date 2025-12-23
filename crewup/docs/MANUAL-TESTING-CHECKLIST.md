# Manual Testing Checklist

Complete end-to-end testing guide for CrewUp features.

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
  - [x] Bio field (optional for workers, required for employers)
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
- [ ] Navigate to `/dashboard/profile/edit` (Error)
- [ ] Change name
- [ ] Change phone (verify auto-formatting)
- [ ] Change trade
- [ ] Change sub-trade
- [ ] Change location (Google Places Autocomplete)
  - [ ] Start typing address
  - [ ] See autocomplete dropdown
  - [ ] Select address
  - [ ] Address fills in
- [ ] Change bio
- [ ] Click "Save Changes"
- [ ] See success toast
- [ ] Verify changes on profile page

**Database Verification:**
```sql
SELECT name, phone, trade, sub_trade, location,
       ST_AsText(coords) as coords_wkt, bio
FROM profiles
WHERE id = 'your-user-id';
```

### Certifications
- [ ] Navigate to `/dashboard/profile/certifications`
- [ ] Click "Add Certification"
- [ ] Fill in certification details:
  - [ ] Name
  - [ ] Issuing organization
  - [ ] Issue date
  - [ ] Expiration date
  - [ ] Certification number (optional)
  - [ ] Upload photo/PDF (if storage configured)
- [ ] Save certification
- [ ] See success toast
- [ ] Certification appears in list
- [ ] Click delete on certification
- [ ] Confirm deletion dialog appears
- [ ] Confirm deletion
- [ ] See success toast
- [ ] Certification removed from list

### Work Experience
- [ ] Navigate to `/dashboard/profile/experience`
- [ ] Click "Add Experience"
- [ ] Fill in experience details:
  - [ ] Company name
  - [ ] Job title
  - [ ] Start date
  - [ ] End date (or "Currently working here")
  - [ ] Description
- [ ] Save experience
- [ ] See success toast
- [ ] Experience appears in list
- [ ] Click delete on experience
- [ ] Confirm deletion
- [ ] Experience removed from list

---

## ✅ Job Posting & Feed (Employer Flow)

### Post a Job (Employer Only)
- [ ] Login as employer
- [ ] Navigate to `/dashboard/jobs/new`
- [ ] Fill in job details:
  - [ ] Job title
  - [ ] Trade
  - [ ] Sub-trade (optional)
  - [ ] Job type (select from dropdown)
  - [ ] **If Hourly job type**: Hourly rate and pay period
  - [ ] **If Contract job type**: Contract amount and payment type
  - [ ] Location (Google Places Autocomplete)
  - [ ] Description
  - [ ] Required certifications (multi-select)
- [ ] Submit job posting
- [ ] See success message
- [ ] Redirect to job feed
- [ ] Verify new job appears

**Database Verification:**
```sql
SELECT title, trade, job_type, pay_rate, location,
       ST_AsText(coords) as coords_wkt, required_certs
FROM jobs
WHERE employer_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

### View Job Feed (Worker)
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

### View Job Details
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

### Apply to Job (Worker)
- [ ] Navigate to job detail page
- [ ] Click "Apply" button
- [ ] Application modal opens
- [ ] Write optional cover letter
- [ ] Submit application
- [ ] See success toast
- [ ] "Apply" button changes to "Applied"
- [ ] Cannot apply again to same job

### View Applications (Worker)
- [ ] Navigate to `/dashboard/applications`
- [ ] See list of jobs you've applied to
- [ ] Each application shows:
  - [ ] Job title
  - [ ] Employer name
  - [ ] Application date
  - [ ] Status (pending/viewed/hired/rejected)
  - [ ] Cover letter (if provided)

### View Applications (Employer)
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

### Start Conversation
- [ ] From job detail page, click "Message Employer" (worker) or "Message" on application (employer)
- [ ] Navigate to `/dashboard/messages`
- [ ] Conversation appears in list
- [ ] Click conversation
- [ ] Navigate to `/dashboard/messages/[id]`
- [ ] Chat window opens

### Send Messages
- [ ] Type message in input field
- [ ] Press Enter or click Send
- [ ] Message appears in chat
- [ ] Message shows:
  - [ ] Sender name (You vs other person)
  - [ ] Message content
  - [ ] Timestamp
  - [ ] Read status

### Receive Messages (Polling)
- [ ] Open conversation in two different browsers/accounts
- [ ] Send message from one account
- [ ] Wait up to 3 seconds
- [ ] Message appears in other account automatically

### Message List
- [ ] Navigate to `/dashboard/messages`
- [ ] See list of all conversations
- [ ] Each conversation shows:
  - [ ] Other person's name
  - [ ] Last message preview
  - [ ] Timestamp
  - [ ] Unread indicator (if applicable)

---

## ✅ Subscription System (if Stripe configured)

### View Pricing
- [ ] Navigate to `/pricing`
- [ ] See Free and Pro plans
- [ ] Pro plan shows $15/month and $150/year options
- [ ] Features listed correctly

### Subscribe to Pro
- [ ] Click "Upgrade to Pro" button
- [ ] Redirect to Stripe Checkout
- [ ] Enter payment details (use Stripe test card: 4242 4242 4242 4242)
- [ ] Complete checkout
- [ ] Redirect back to app
- [ ] See success message

**Database Verification:**
```sql
SELECT subscription_status, stripe_customer_id, stripe_subscription_id
FROM profiles
WHERE id = 'your-user-id';
```
**Expected**: subscription_status = 'pro', stripe IDs populated

### Manage Subscription
- [ ] Navigate to `/dashboard/subscription`
- [ ] See current plan (Pro)
- [ ] See billing information
- [ ] See cancel subscription button
- [ ] Click "Manage Billing" (opens Stripe Customer Portal)

---

## 🐛 Error Scenarios to Test

### Authentication Errors
- [ ] Try signing up with existing email
- [ ] Try signing in with wrong password
- [ ] Try accessing protected routes without auth
- [ ] Try accessing onboarding with complete profile

### Form Validation
- [ ] Submit forms with empty required fields
- [ ] Submit profile with invalid phone format
- [ ] Submit password that's too short
- [ ] Submit passwords that don't match

### Job Application Errors
- [ ] Try applying to same job twice
- [ ] Try applying to your own job (employer)

### Location Errors
- [ ] Deny location permissions
- [ ] Enter invalid address in autocomplete
- [ ] Test without Google Maps API key

---

## 📱 Mobile Testing (Next Section)

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
```
[Record any bugs, issues, or unexpected behavior here]






```

---

## 🚀 After Testing

Once all tests pass:
1. Update `progress-checklist.md` with test results
2. Fix any bugs found
3. Re-test affected areas
4. Document any known issues
5. Prepare for beta user invitations
