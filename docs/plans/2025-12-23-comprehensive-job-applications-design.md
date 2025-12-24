# Comprehensive Job Application System Design

**Date:** December 23, 2025
**Status:** Approved for Implementation
**Feature:** Enhanced job applications with multi-step wizard, file uploads, and auto-population

## Overview

Transform the current simple job application (cover letter only) into a comprehensive application system that:
- Collects detailed worker information through an 8-step wizard
- Supports resume and cover letter uploads (PDF/DOCX/TXT)
- Auto-populates fields from uploaded resume and worker profile
- Provides employers with powerful review tools (Pro-gated filtering/sorting)
- Implements auto-save drafts and notification preferences
- Matches real-world job application experiences (Indeed, LinkedIn quality)

## User Experience Goals

**For Workers:**
- Quick application via auto-population from profile and resume
- Less overwhelming via 8-step progressive disclosure
- Save drafts and resume anytime
- Track application status in real-time
- Mobile-optimized for on-the-go applications

**For Employers:**
- Comprehensive candidate information for informed decisions
- Pro features: Advanced filtering, sorting, match scoring, bulk actions
- Organized dashboard with status-based tabs
- Download resumes and view structured application data

## Database Schema

### New Table: `application_drafts`

```sql
CREATE TABLE application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}',
  resume_url TEXT,
  cover_letter_url TEXT,
  resume_extracted_text TEXT,
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, worker_id)
);

CREATE INDEX idx_application_drafts_worker ON application_drafts(worker_id);
CREATE INDEX idx_application_drafts_expires ON application_drafts(expires_at);
```

### Updated Table: `job_applications`

```sql
-- Add new columns to existing table
ALTER TABLE job_applications
  ADD COLUMN form_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN resume_url TEXT,
  ADD COLUMN cover_letter_url TEXT,
  ADD COLUMN resume_extracted_text TEXT;

-- Deprecate old column (migrate data first)
-- ALTER TABLE job_applications DROP COLUMN cover_message;

-- Add indexes for performance
CREATE INDEX idx_job_applications_job_status ON job_applications(job_id, status);
CREATE INDEX idx_job_applications_worker_created ON job_applications(worker_id, created_at DESC);
```

### New Table: `notification_preferences`

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  application_status_changes BOOLEAN DEFAULT TRUE,
  new_applications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  email_digest TEXT DEFAULT 'immediate' CHECK (email_digest IN ('immediate', 'daily', 'weekly', 'never')),
  desktop_notifications BOOLEAN DEFAULT TRUE,
  notification_sound BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT FALSE, -- Pro feature
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Supabase Storage Buckets

**Bucket: `application-drafts`**
- Path structure: `{userId}/{jobId}/resume.{ext}`
- Path structure: `{userId}/{jobId}/cover-letter.{ext}`
- Policies: User can only access their own folders
- Auto-cleanup: Delete files when draft expires or is submitted

**Bucket: `applications`**
- Path structure: `{applicationId}/resume.{ext}`
- Path structure: `{applicationId}/cover-letter.{ext}`
- Policies: Accessible by worker OR job employer only
- Permanent storage (unless application withdrawn)

## Form Data Schema

The `form_data` JSONB column stores:

```typescript
interface ApplicationFormData {
  // Step 1: Documents (URLs stored separately)
  coverLetterText?: string; // If typed instead of uploaded

  // Step 2: Personal Information
  fullName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Step 3: Contact & Availability
  phoneNumber: string;
  availableStartDate: string; // ISO date

  // Step 4: Work Authorization
  authorizedToWork: boolean;
  hasDriversLicense: boolean;
  licenseClass?: 'A' | 'B' | 'C';
  hasReliableTransportation: boolean;

  // Step 5: Work History
  workHistory: Array<{
    companyName: string;
    jobTitle: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    responsibilities: string;
    reasonForLeaving?: string;
  }>;

  // Step 6: Education
  education: Array<{
    institutionName: string;
    degreeType: string;
    fieldOfStudy: string;
    graduationYear: number;
    isCurrentlyEnrolled: boolean;
  }>;

  // Step 7: Skills & Certifications
  yearsOfExperience: number;
  tradeSkills: string[]; // Array of skill names
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    expirationDate?: string;
  }>;

  // Step 8: References & Final
  references: Array<{
    name: string;
    company: string;
    phone: string;
    email: string;
    relationship: string;
  }>;
  whyInterested: string;
  salaryExpectations: string;
  howHeardAboutJob: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  consents: {
    physicalRequirements: boolean;
    backgroundCheck: boolean;
    drugTest: boolean;
  };
}
```

## 8-Step Wizard Flow

### Step 1: Document Upload

**Purpose:** Upload resume and/or cover letter early for text extraction and auto-population

**Fields:**
- Resume upload (optional): PDF/DOCX/TXT, max 5MB
  - On upload: Extract text immediately
  - Show "Analyzing resume..." loading state
  - Display preview panel: "We extracted the following information..."
- Cover letter options:
  - Upload document (PDF/DOCX/TXT)
  - OR write in text area
  - OR skip (optional)

**Auto-save:** Files uploaded to `application-drafts/{userId}/{jobId}/` immediately

**Validation:**
- File type: Only PDF, DOCX, TXT
- File size: Max 5MB per file
- Optional: Both fields can be skipped

### Step 2: Personal Information

**Auto-populated from:**
- Resume extracted text (name, address)
- Worker profile (profile.name)

**Fields:**
- Full name (text input)
- Street address (text input)
- City (text input)
- State (dropdown)
- ZIP code (text input with format validation)

**Validation:**
- Full name: Required, min 2 characters
- Address fields: All required

### Step 3: Contact & Availability

**Auto-populated from:**
- Resume extracted text (phone)
- Auth email (read-only)

**Fields:**
- Email (read-only, from auth.user.email)
- Phone number (formatted input: (XXX) XXX-XXXX)
- Available start date (date picker)

**Validation:**
- Phone: Required, exactly 10 digits
- Start date: Required, cannot be in past

### Step 4: Work Authorization & Transportation

**Fields:**
- Authorized to work in US? (Yes/No radio)
- Valid driver's license? (Yes/No radio)
- If yes: License class (dropdown: A/B/C)
- Reliable transportation? (Yes/No radio)

**Validation:**
- All fields required

### Step 5: Work History

**Auto-populated from:**
- Resume extracted text (company names, dates, titles)
- Worker profile (profile.experience array)

**Fields:**
- Dynamic list of work history entries (add/remove buttons)
- Each entry:
  - Company name (text input)
  - Job title (text input)
  - Start date (month/year picker)
  - End date (month/year picker OR "Currently employed" checkbox)
  - Key responsibilities (textarea)
  - Reason for leaving (text input, optional)

**Validation:**
- At least 1 entry required (unless fresh graduate)
- Start date must be before end date
- Company name and job title required per entry

### Step 6: Education

**Auto-populated from:**
- Resume extracted text (schools, degrees, years)

**Fields:**
- Dynamic list of education entries (add/remove buttons)
- Each entry:
  - School/Institution name (text input)
  - Degree/Certification type (dropdown: High School Diploma, Trade Certification, Associate's, Bachelor's, Master's, Other)
  - Field of study (text input)
  - Graduation year (year picker)
  - Currently enrolled? (checkbox)

**Validation:**
- At least 1 entry required
- School name and degree type required per entry

### Step 7: Skills & Certifications

**Auto-populated from:**
- Worker profile (profile.certifications)
- Resume extracted text (skills keywords)

**Fields:**
- Years of experience in this trade (number input)
- Trade-specific skills (multi-select checklist):
  - Pre-populated based on job.trade
  - Custom skill entry field
  - Min 3 skills required
- Certifications list:
  - Dynamic list (add/remove)
  - Name, issuing org, expiration date per cert

**Validation:**
- Years of experience: Required, 0-50 range
- At least 3 skills selected

### Step 8: References & Final Review

**Fields:**
- Professional references (2-3 entries):
  - Name, Company, Phone, Email, Relationship
- Why are you interested in this position? (textarea)
- Salary expectations (text input)
- How did you hear about this job? (dropdown)
- Emergency contact:
  - Name, Relationship, Phone
- Consents (all required checkboxes):
  - Physical requirements acknowledgment
  - Background check consent
  - Drug test consent
- Review section:
  - Collapsible panels showing all entered data
  - Edit button per section (jumps back to that step)

**Validation:**
- At least 2 references required
- All reference fields required
- All consent checkboxes must be checked
- Why interested: Required, min 50 characters

## Resume Text Extraction

### Technical Implementation

**Libraries:**
- `pdf-parse`: Extract text from PDF files
- `mammoth`: Extract text from DOCX files
- Native read for TXT files

**Server Action: `extractResumeText(file: File)`**

```typescript
async function extractResumeText(file: File): Promise<string> {
  // 1. Upload to temp storage
  const { data: upload } = await supabase.storage
    .from('application-drafts')
    .upload(`${userId}/${jobId}/resume_temp`, file);

  // 2. Download file buffer
  const { data: fileData } = await supabase.storage
    .from('application-drafts')
    .download(upload.path);

  const buffer = await fileData.arrayBuffer();

  // 3. Extract based on file type
  let text = '';
  if (file.type === 'application/pdf') {
    const pdfData = await pdfParse(Buffer.from(buffer));
    text = pdfData.text;
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    text = result.value;
  } else if (file.type === 'text/plain') {
    text = new TextDecoder().decode(buffer);
  }

  // 4. Save extracted text
  await supabase
    .from('application_drafts')
    .update({ resume_extracted_text: text })
    .eq('worker_id', userId)
    .eq('job_id', jobId);

  return text;
}
```

### Simple Field Mapping (Pattern Matching)

**Phase 1: Non-AI Parsing**

Use regex patterns to extract basic information:
- Name: First 2-3 lines with capitalization
- Phone: `\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})`
- Email: Standard email regex
- Address: City/state/ZIP patterns
- Dates: Year ranges like "2019-2023" or "2019 - Present"

Display extracted text in a preview panel for workers to manually review and copy/paste into fields.

**Phase 2: AI Enhancement (Future)**

Add optional AI parsing using OpenAI API:
```typescript
async function extractResumeWithAI(text: string): Promise<Partial<ApplicationFormData>> {
  // Call OpenAI with structured output
  // Return parsed JSON matching form schema
}
```

Hook is ready - can swap in without UI changes.

## Auto-Save Functionality

### Trigger Conditions

- Every 30 seconds after any field change (debounced)
- On step navigation (Next/Back button clicks)
- On file upload completion
- On blur from long text fields (textarea)

### Save Logic

```typescript
async function autoSaveDraft(formData: Partial<ApplicationFormData>) {
  const draft = {
    job_id: jobId,
    worker_id: userId,
    form_data: formData, // Merge with existing
    last_saved_at: new Date().toISOString(),
    expires_at: add(new Date(), { days: 30 }).toISOString()
  };

  await supabase
    .from('application_drafts')
    .upsert(draft, { onConflict: 'job_id,worker_id' });
}
```

### Visual Feedback

- Header shows: "Draft saved at 2:34 PM" (fade out after 3 seconds)
- Saving state: "Saving..." with spinner
- Error state: "Failed to save" with retry button

### Loading Drafts

On wizard mount:
```typescript
// Check for existing draft
const { data: draft } = await supabase
  .from('application_drafts')
  .select('*')
  .eq('job_id', jobId)
  .eq('worker_id', userId)
  .single();

if (draft) {
  // Show banner: "Resume your application? Last saved [timestamp]"
  // On confirm: Load form_data and resume from last step
  // On decline: Delete draft and start fresh
}
```

### Draft Expiration

- Auto-delete drafts older than 30 days (cron job)
- Email reminder 7 days before expiration
- On load expired draft: "This draft has expired. Start new application?"

## Post-Submission Workflow

### On Submit Success

1. **Move data from draft to application:**
   ```typescript
   // Copy all data
   const application = {
     job_id: draft.job_id,
     worker_id: draft.worker_id,
     form_data: draft.form_data,
     resume_url: draft.resume_url,
     cover_letter_url: draft.cover_letter_url,
     resume_extracted_text: draft.resume_extracted_text,
     status: 'pending'
   };

   // Insert application
   const { data: newApp } = await supabase
     .from('job_applications')
     .insert(application)
     .select()
     .single();

   // Move files to permanent storage
   await moveFile(
     `application-drafts/${userId}/${jobId}/resume.pdf`,
     `applications/${newApp.id}/resume.pdf`
   );

   // Delete draft
   await supabase
     .from('application_drafts')
     .delete()
     .eq('id', draft.id);
   ```

2. **Show success modal:**
   - "Application Submitted!" with checkmark animation
   - Application ID and timestamp
   - "View My Applications" button
   - Auto-redirect to /dashboard/applications after 3 seconds

3. **Trigger notifications:**
   - Employer notification: "New application for [Job Title]"
   - Worker confirmation email with application summary

### Worker Applications Page

**Route:** `/dashboard/applications`

**Layout:** List of application cards

```
┌─────────────────────────────────────────┐
│ Carpenter - Residential Framing         │
│ ABC Construction                         │
│ Applied: Dec 23, 2025                   │
│ Status: [Pending] 🟡                    │
│ [View Details] [Withdraw]               │
└─────────────────────────────────────────┘
```

**Status Badges:**
- 🟡 Pending (gray)
- 👁️ Viewed (blue)
- 📞 Contacted (green)
- ❌ Rejected (red)
- ✅ Hired (green with checkmark)

**View Details Modal:**
- All form data in organized sections
- Download resume/cover letter buttons
- Status history timeline
- Withdraw button (only if status = 'pending')

**Withdraw Logic:**
```typescript
// Only allowed if status = 'pending'
// Updates status to 'withdrawn'
// Sends notification to employer
// Cannot undo withdrawal
```

## Employer Review Dashboard

**Route:** `/dashboard/jobs/[jobId]/applicants`

### Tabbed Interface

```
[All (15)] [Pending (8)] [Viewed (4)] [Contacted (2)] [Rejected (1)] [Hired (0)]
```

Clicking a tab filters applications by status.

### Application Card (List View)

```
┌────────────────────────────────────────────────────┐
│ 👤 John Smith                        [Pending ▼]   │
│ Carpenter • 8 years experience                     │
│ OSHA 30, Journeyman License                        │
│ Applied: 2 hours ago • 5.2 miles away              │
│ Match Score: 92% 🔒PRO                             │
│ [View Application] [Download Resume]               │
└────────────────────────────────────────────────────┘
```

### Free Employer Features

- View all tabs
- See basic application cards
- Click to view full details
- Download resume and cover letter
- Update status via dropdown
- Sort by: "Newest First" only

### Pro-Gated Features

**Show 🔒PRO badge with upgrade prompt overlay**

**1. Filters Panel:**
- Date range: Last 24hrs, 7 days, 30 days, All time
- Certifications: Multi-select from job requirements
- Distance: Slider (0-50 miles)
- Experience: Slider (0-20+ years)
- Availability: Within 1 week, 2 weeks, 1 month

**2. Advanced Sorting:**
- Best Match (skill + cert + experience scoring)
- Closest Distance
- Most Experienced
- Most Recent
- Soonest Available

**3. Bulk Actions:**
- Select multiple applications (checkboxes)
- Bulk status update
- Bulk reject with templated message
- Export selected to CSV

**4. Match Score Calculation:**
```typescript
function calculateMatchScore(application, job) {
  const skillsMatch = calculateSkillsOverlap(
    application.form_data.tradeSkills,
    job.required_skills
  ); // 0-100

  const certsMatch = calculateCertsMatch(
    application.form_data.certifications,
    job.required_certs
  ); // 0-100

  const experienceMatch = normalizeExperience(
    application.form_data.yearsOfExperience,
    job.min_experience
  ); // 0-100

  const distanceScore = calculateDistanceScore(
    application.form_data.address,
    job.coords
  ); // 0-100 (closer = higher)

  return (
    skillsMatch * 0.4 +
    certsMatch * 0.3 +
    experienceMatch * 0.2 +
    distanceScore * 0.1
  );
}
```

### Application Details Modal

**Tabbed modal view:**

1. **Overview Tab:**
   - Name, contact info, availability
   - Status dropdown (update inline)
   - Quick stats: Experience, distance, applied date

2. **Experience Tab:**
   - Work history timeline (visual)
   - Each job expandable for details

3. **Education & Certifications Tab:**
   - Education list
   - Certifications list with expiration dates

4. **Skills & References Tab:**
   - Trade skills tags
   - References contact cards

5. **Documents Tab:**
   - Embedded PDF viewer (resume)
   - Download resume button
   - Download cover letter button
   - View extracted text

6. **Notes Tab (Pro Feature):**
   - Employer private notes
   - Activity log (when viewed, status changes)

## Notification System

### Worker Notifications

**Triggered Events:**
1. Status changes: pending → viewed
2. Status changes: → contacted
3. Status changes: → hired ✅
4. Status changes: → rejected ❌

**Notification Channels:**
- In-app: Bell icon with badge count
- Toast: Appears when status changes (if online)
- Email: Based on user preferences

**Email Template Example:**
```
Subject: Update on your application for [Job Title]

Hi [Worker Name],

Your application for [Job Title] at [Company Name] has been marked as Viewed.

Status: Viewed 👁️
Applied: [Date]
Job: [Job Title]

[View Application Details]

---
CrewUp Team
```

### Employer Notifications

**Triggered Events:**
1. New application received
2. Application withdrawn by worker

**Email Digest Options:**
- Immediate: Send email on each new application
- Daily: 9:00 AM digest of previous day's applications
- Weekly: Monday 9:00 AM digest
- Never: In-app only

**Digest Email Template:**
```
Subject: [5] New applications for your jobs

Hi [Employer Name],

You received 5 new applications:

1. John Smith → Carpenter - Residential Framing
   Applied 2 hours ago • Match Score: 92% 🔒PRO
   [View Application]

2. Jane Doe → Electrician - Commercial Wiring
   Applied 4 hours ago • Match Score: 87% 🔒PRO
   [View Application]

...

[View All Applications]

---
CrewUp Team
```

### Pro Feature: Push Notifications

Real-time browser push for high-priority matches:
- Triggered when match score > 85%
- "A highly qualified candidate just applied to [Job Title]!"
- Click to open application details

### Notification Preferences

**Settings Page Route:** `/dashboard/settings`

**New Section: "Notification Preferences"**

```typescript
interface NotificationPreferences {
  // Email
  emailNotifications: boolean;
  emailDigest: 'immediate' | 'daily' | 'weekly' | 'never';

  // In-app
  desktopNotifications: boolean;
  notificationSound: boolean;

  // Worker-specific
  applicationStatusChanges: boolean; // workers only

  // Employer-specific
  newApplications: boolean; // employers only

  // Pro feature
  pushNotifications: boolean; // requires Pro subscription
}
```

**UI:**
```
┌─────────────────────────────────────────┐
│ Email Notifications                      │
│ ☑ Application status updates (Workers)   │
│ ☑ New applications (Employers)           │
│                                          │
│ Email Frequency                          │
│ ◉ Immediate                              │
│ ○ Daily digest (9:00 AM)                │
│ ○ Weekly digest (Monday 9:00 AM)        │
│ ○ Never                                  │
│                                          │
│ In-App Notifications                     │
│ ☑ Show desktop notifications            │
│ ☐ Play sound                             │
│                                          │
│ 🔒 PRO: Push Notifications               │
│ ☐ High-priority match alerts            │
│ [Upgrade to Pro]                         │
└─────────────────────────────────────────┘
```

## Error Handling

### File Upload Errors

| Error | User Message | Action |
|-------|-------------|---------|
| File too large (>5MB) | "File size must be under 5MB. Please compress or choose a different file." | Allow retry |
| Invalid file type | "Please upload PDF, DOCX, or TXT files only." | Show file picker again |
| Upload fails (network) | "Upload failed. Please check your connection and try again." | Retry 3 times, then show error |
| Virus/malware detected | "File couldn't be processed. Please try a different file." | Reject file |
| Text extraction fails | "We couldn't read this file. You can still upload it and fill fields manually." | Allow continuation |

### Form Submission Errors

| Error | User Message | Action |
|-------|-------------|---------|
| Network error | "Couldn't submit application. Please try again." | Auto-retry once, then show retry button |
| Already applied | "You've already applied to this job. View your application in My Applications." | Link to applications page |
| Job closed | "This job is no longer accepting applications." | Disable submit, show message |
| Session expired | "Your session expired. Please log in again." | Redirect to login, preserve draft |
| Validation failed | Show field-level errors | Scroll to first error |

### Draft Expiration

- 30 days after last save: Auto-delete draft
- 7 days before expiration: Email reminder "Complete your application for [Job Title]"
- On load expired draft: "This draft has expired. Would you like to start a new application?"

## Security & Permissions

### Row Level Security (RLS) Policies

**`application_drafts` table:**

```sql
-- Workers can only see their own drafts
CREATE POLICY "Workers can view own drafts"
  ON application_drafts FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create own drafts"
  ON application_drafts FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can update own drafts"
  ON application_drafts FOR UPDATE
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can delete own drafts"
  ON application_drafts FOR DELETE
  USING (auth.uid() = worker_id);
```

**`job_applications` table:**

```sql
-- Workers see their own applications
-- Employers see applications to their jobs
CREATE POLICY "View own applications or applications to own jobs"
  ON job_applications FOR SELECT
  USING (
    auth.uid() = worker_id
    OR
    auth.uid() = (SELECT employer_id FROM jobs WHERE id = job_id)
  );

-- Only workers can create applications
CREATE POLICY "Workers can create applications"
  ON job_applications FOR INSERT
  WITH CHECK (
    auth.uid() = worker_id
    AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'worker'
  );

-- Only employers can update status
CREATE POLICY "Employers can update application status"
  ON job_applications FOR UPDATE
  USING (
    auth.uid() = (SELECT employer_id FROM jobs WHERE id = job_id)
  );

-- No deletes (use status = 'withdrawn' instead)
```

**`notification_preferences` table:**

```sql
-- Users can only manage their own preferences
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Supabase Storage Policies

**`application-drafts` bucket:**

```sql
-- Upload to own folder only
CREATE POLICY "Users upload to own draft folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'application-drafts'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Download own files only
CREATE POLICY "Users download own draft files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-drafts'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete own files only
CREATE POLICY "Users delete own draft files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'application-drafts'
    AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**`applications` bucket:**

```sql
-- Only system can upload (via server action)
CREATE POLICY "System uploads application files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'applications'
    AND
    auth.role() = 'service_role'
  );

-- Worker OR employer of job can download
CREATE POLICY "Worker or employer downloads application files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'applications'
    AND
    (
      -- Worker who submitted
      auth.uid() = (
        SELECT worker_id FROM job_applications
        WHERE id::text = (storage.foldername(name))[1]
      )
      OR
      -- Employer of the job
      auth.uid() = (
        SELECT j.employer_id FROM job_applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id::text = (storage.foldername(name))[1]
      )
    )
  );

-- No deletes
```

### File Security

**Virus Scanning:**
- Integrate ClamAV or cloud-based virus scanning API
- Scan on upload before saving to permanent storage
- Reject files that fail scan

**Metadata Stripping:**
- Strip EXIF data from images
- Remove document metadata (author, company, etc.)
- Prevent information leakage

**Filename Security:**
- Generate random UUID filenames
- Prevent path traversal attacks
- Store original filename in database only

**File Access:**
- Generate signed URLs with 1-hour expiration
- No direct public access to files
- Log all file downloads

## Performance Optimizations

### File Handling

- **CDN Delivery:** Supabase Storage uses CDN for fast worldwide access
- **Signed URLs:** Generate 1-hour expiration URLs for downloads
- **PDF Compression:** Use ghostscript to compress uploaded PDFs (reduce storage costs)
- **Lazy Text Extraction:** Only extract text when preview panel opened (not on every upload)

### Database Queries

**Indexes:**
```sql
-- Fast draft lookups
CREATE INDEX idx_application_drafts_worker ON application_drafts(worker_id);
CREATE INDEX idx_application_drafts_expires ON application_drafts(expires_at);

-- Employer dashboard queries
CREATE INDEX idx_job_applications_job_status ON job_applications(job_id, status);

-- Worker applications page
CREATE INDEX idx_job_applications_worker_created ON job_applications(worker_id, created_at DESC);
```

**Real-time Subscriptions:**
- Use Supabase real-time for status changes (instead of polling)
- Worker subscribes to their applications: `status` column changes
- Employer subscribes to job's applications: new `INSERT` events

### Caching Strategy

- **Job Details:** Cache in form for 5 minutes (reduce re-fetches during application)
- **User Profile:** Cache on wizard mount, refresh on focus
- **Notification Preferences:** Cache locally, update on settings change
- **Draft Data:** Cache in React state, sync to DB on auto-save

### Code Splitting

```typescript
// Lazy load wizard steps
const Step1Documents = lazy(() => import('./step-1-documents'));
const Step2Personal = lazy(() => import('./step-2-personal'));
// ... etc

// Lazy load PDF viewer (large library)
const PDFViewer = lazy(() => import('react-pdf'));

// Lazy load file upload components
const FileUpload = lazy(() => import('./file-upload'));
```

### Mobile Performance

- **Reduce Image Sizes:** Optimize all UI images
- **Skeleton Loaders:** Show loading placeholders during data fetch
- **Debounce Auto-Save:** Wait 30 seconds of inactivity (prevent excessive writes)
- **Progressive Form:** Show steps 1-3 immediately, lazy load 4-8
- **Service Worker:** Cache static assets for offline form editing

## Implementation File Structure

```
features/
  applications/
    components/
      application-wizard/
        step-1-documents.tsx
        step-2-personal.tsx
        step-3-contact.tsx
        step-4-work-auth.tsx
        step-5-work-history.tsx
        step-6-education.tsx
        step-7-skills-certs.tsx
        step-8-references-review.tsx
        wizard-container.tsx        # Main wizard orchestrator
        progress-indicator.tsx      # Step progress bar
        auto-save-indicator.tsx     # "Draft saved at..." message
      application-card.tsx          # Card in worker's applications list
      application-details-modal.tsx # Full application view
      withdraw-application-button.tsx
      resume-preview-panel.tsx      # Shows extracted text
    actions/
      application-actions.ts        # submit, withdraw, getApplications
      draft-actions.ts              # saveDraft, loadDraft, deleteDraft
      resume-parser.ts              # extractText, parseFields
      file-upload-actions.ts        # uploadFile, moveFile, deleteFile
    hooks/
      use-application-wizard.ts     # Form state management
      use-auto-save.ts              # Auto-save logic
      use-resume-upload.ts          # File upload handling
      use-draft-loader.ts           # Load existing drafts
    types/
      application.types.ts          # ApplicationFormData interface
      draft.types.ts                # Draft types
    utils/
      validation.ts                 # Form validation rules
      field-mappers.ts              # Resume text → form fields

  jobs/
    components/
      applicant-dashboard/
        applicant-list.tsx          # Main employer view
        applicant-filters.tsx       # Pro-gated filters panel
        applicant-card.tsx          # Application card in list
        applicant-details-modal.tsx # Full application modal
        bulk-actions.tsx            # Pro-gated bulk actions
        match-score-badge.tsx       # Pro-gated match score
        status-tabs.tsx             # All/Pending/Viewed/etc tabs
    actions/
      applicant-actions.ts          # getApplicants, updateStatus, bulkUpdate
    hooks/
      use-applicants.ts             # Fetch and filter applicants
      use-match-score.ts            # Calculate match scores (Pro)

  profiles/
    components/
      settings/
        notification-preferences.tsx # Settings UI

lib/
  resume-parser/
    pdf-parser.ts                   # Extract from PDF
    docx-parser.ts                  # Extract from DOCX
    text-extractor.ts               # Unified interface

supabase/
  migrations/
    018_create_application_drafts.sql
    019_update_job_applications.sql
    020_create_notification_preferences.sql
    021_add_application_indexes.sql
    022_create_storage_buckets.sql
    023_add_storage_policies.sql

  functions/
    send-notification-emails/       # Edge function for email sending
      index.ts
    cleanup-expired-drafts/         # Cron job to delete old drafts
      index.ts
```

## Migration Strategy

### Phase 1: Database Setup

1. Run migration 018: Create `application_drafts` table
2. Run migration 019: Update `job_applications` table with new columns
3. Migrate existing data:
   ```sql
   -- Migrate existing cover_message to form_data
   UPDATE job_applications
   SET form_data = jsonb_build_object('coverLetterText', cover_message)
   WHERE cover_message IS NOT NULL;
   ```
4. Run migration 020: Create `notification_preferences` table with defaults
5. Run migrations 021-023: Indexes and storage setup

### Phase 2: Feature Implementation

1. Build wizard components (Steps 1-8)
2. Build auto-save functionality
3. Build resume parser (text extraction only)
4. Build worker applications page
5. Test end-to-end worker flow

### Phase 3: Employer Dashboard

1. Build applicant list and tabs
2. Build application details modal
3. Build free features (basic viewing, status updates)
4. Build Pro-gated features (filters, sorting, bulk actions)
5. Test employer review flow

### Phase 4: Notifications

1. Build notification preferences UI
2. Build in-app notification system
3. Build email notification service
4. Set up email digest cron job
5. Test notification delivery

### Phase 5: Testing & Rollout

1. Beta test with selected users
2. Monitor performance and error rates
3. Collect feedback and iterate
4. Enable for all workers (feature flag)
5. Enable employer dashboard for all
6. Marketing push for Pro features

## Future Enhancements

### Phase 2: AI Resume Parsing

- Integrate OpenAI API for intelligent resume parsing
- Auto-populate all form fields from resume
- Extract skills, certifications, experience automatically
- Estimated cost: ~$0.01-0.05 per resume

### Phase 3: Application Templates

- Workers save "application templates"
- Pre-fill common fields for future applications
- Customize per job type

### Phase 4: Video Introductions

- Optional video upload (30-60 seconds)
- Worker introduces themselves
- Employers see personality beyond resume

### Phase 5: Application Analytics

- Worker: See view rate, response rate for applications
- Employer: Funnel analytics (applied → viewed → hired)
- A/B test different job descriptions

## Success Metrics

### Worker Engagement

- Application completion rate (started → submitted)
- Average time to complete application
- Draft save/resume rate
- Application withdrawal rate

### Employer Engagement

- Applications viewed per job
- Average time to first view
- Status update rate (pending → viewed → contacted)
- Pro subscription conversion rate

### System Performance

- File upload success rate
- Text extraction success rate
- Auto-save reliability (% of saves that succeed)
- Notification delivery rate

### Business Metrics

- Applications submitted per day/week/month
- Pro feature usage (filters, sorting, bulk actions)
- Upgrade to Pro conversion rate for employers
- Retention rate of Pro subscribers

## Appendix: Key Decisions

1. **8 steps vs 6:** Chose 8 steps for better mobile UX and less cognitive load per step
2. **Documents first:** Upload resume first to enable auto-population for all subsequent steps
3. **Text extraction only (Phase 1):** Start with simple parsing, add AI later to validate demand
4. **Auto-save drafts:** Critical for mobile users who may lose connection or switch apps
5. **Pro-gated employer features:** Free tier shows all data, Pro adds filtering/sorting/bulk actions
6. **No edit after submit:** Prevents confusion for employers; workers can withdraw and reapply
7. **30-day draft expiration:** Balances storage costs with user convenience
8. **Signed URLs for files:** Security best practice; prevents unauthorized access
9. **Real-time subscriptions:** Better UX than polling for status updates
10. **Email digest options:** Reduces notification fatigue for employers with many jobs

---

**Ready for implementation. Next step: Create detailed implementation plan and git worktree.**
