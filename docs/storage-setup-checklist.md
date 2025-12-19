# Supabase Storage Setup Checklist

Quick reference checklist for setting up certification photo storage.

---

## Pre-Setup

- [ ] I have access to the Supabase Dashboard
- [ ] I know which project I'm configuring (CrewUp)
- [ ] I have the production app URL: https://get-crewup.vercel.app

---

## Step 1: Create Storage Bucket (5 minutes)

- [ ] Navigate to Storage in Supabase Dashboard
- [ ] Click "New bucket"
- [ ] Name: `certification-photos`
- [ ] Public bucket: **UNCHECKED** ❌
- [ ] File size limit: `5242880` (5 MB)
- [ ] Click "Create bucket"

---

## Step 2: Add Storage Policies (10 minutes)

Click on the bucket → Policies tab → New policy

### Policy 1: Upload (INSERT)
- [ ] Name: `Users can upload their own certification photos`
- [ ] Operation: `INSERT`
- [ ] Target roles: `authenticated`
- [ ] WITH CHECK: `(auth.uid())::text = (storage.foldername(name))[1]`
- [ ] Save policy

### Policy 2: View Own (SELECT)
- [ ] Name: `Users can view their own certification photos`
- [ ] Operation: `SELECT`
- [ ] Target roles: `authenticated`
- [ ] USING: `(auth.uid())::text = (storage.foldername(name))[1]`
- [ ] Save policy

### Policy 3: Delete (DELETE)
- [ ] Name: `Users can delete their own certification photos`
- [ ] Operation: `DELETE`
- [ ] Target roles: `authenticated`
- [ ] USING: `(auth.uid())::text = (storage.foldername(name))[1]`
- [ ] Save policy

### Policy 4: Employers View All (SELECT)
- [ ] Name: `Employers can view all certification photos`
- [ ] Operation: `SELECT`
- [ ] Target roles: `authenticated`
- [ ] USING: See full SQL in main guide
- [ ] Save policy

---

## Step 3: Verify Database Columns (5 minutes)

- [ ] Open SQL Editor in Supabase Dashboard
- [ ] Run the column verification SQL (see main guide)
- [ ] Confirm `certification_number` column exists
- [ ] Confirm `photo_url` column exists

---

## Step 4: Test Everything (10 minutes)

### In Supabase Dashboard:
- [ ] Try uploading a test file to the bucket
- [ ] Verify it uploads successfully
- [ ] Delete the test file

### In Your Application:
- [ ] Go to https://get-crewup.vercel.app
- [ ] Sign up/login as a worker
- [ ] Navigate to Profile → Certifications
- [ ] Click "Add Certification"
- [ ] Fill out form and upload a photo
- [ ] Verify preview shows correctly
- [ ] Save the certification
- [ ] Verify it appears in your certifications list with the photo

### Back in Supabase:
- [ ] Check Storage → certification-photos
- [ ] Verify folder with your user ID exists
- [ ] Verify uploaded file is inside that folder

---

## Troubleshooting

If something doesn't work:

- [ ] Check all 4 policies are created correctly
- [ ] Verify bucket name is exactly `certification-photos`
- [ ] Check browser console for specific error messages
- [ ] Refer to the troubleshooting section in the main guide

---

## Completion

Once all items are checked:

- [ ] Storage is fully configured and tested
- [ ] Ready to invite beta users
- [ ] Update progress-checklist.md:
  - [x] Create "certification-photos" bucket in Supabase Storage
  - [x] Set up storage RLS policies for certification-photos bucket
  - [x] Add certification_number column to certifications table
  - [x] Add photo_url column to certifications table

---

**Estimated total time:** 30 minutes

**Questions?** See the full guide: `docs/supabase-storage-setup.md`
