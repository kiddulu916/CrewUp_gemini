# Storage Bucket Policies

After running migration `021_create_storage_buckets.sql`, you need to create the storage policies manually via the Supabase Dashboard.

## Why Manual Creation?

Storage policies require special permissions on the `storage.objects` table. Creating them via SQL migrations fails with permission errors. Instead, use the Supabase Dashboard which handles permissions correctly.

## How to Create Policies

1. Go to: **Supabase Dashboard > Storage**
2. Click on the bucket name
3. Click **Policies** tab
4. Click **New Policy**
5. Use the SQL definitions below

---

## application-drafts Bucket Policies

Navigate to: **Storage > application-drafts > Policies**

### Policy 1: Users upload to own draft folder

```sql
CREATE POLICY "Users upload to own draft folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-drafts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: Users view own draft files

```sql
CREATE POLICY "Users view own draft files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-drafts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: Users update own draft files

```sql
CREATE POLICY "Users update own draft files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-drafts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 4: Users delete own draft files

```sql
CREATE POLICY "Users delete own draft files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-drafts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## applications Bucket Policies

Navigate to: **Storage > applications > Policies**

### Policy 1: System uploads application files

```sql
CREATE POLICY "System uploads application files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'applications'
);
```

**Note:** In production, you might want to restrict this further to service role only.

### Policy 2: Worker or employer views application files

```sql
CREATE POLICY "Worker or employer views application files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'applications'
  AND (
    -- Worker who submitted the application
    auth.uid() IN (
      SELECT worker_id FROM job_applications
      WHERE id::text = (storage.foldername(name))[1]
    )
    OR
    -- Employer who owns the job
    auth.uid() IN (
      SELECT j.employer_id
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id::text = (storage.foldername(name))[1]
    )
  )
);
```

### Policy 3: System updates application files

```sql
CREATE POLICY "System updates application files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'applications'
);
```

### Policy 4: System deletes application files

```sql
CREATE POLICY "System deletes application files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'applications'
);
```

---

## Folder Structure

**application-drafts:**
- Path: `{user_id}/{filename}`
- Example: `550e8400-e29b-41d4-a716-446655440000/resume.pdf`

**applications:**
- Path: `{application_id}/{filename}`
- Example: `7c9e6679-7425-40de-944b-e07fc1f90ae7/resume.pdf`

---

## Verification

After creating all policies, verify they work:

1. **Test draft upload:**
   ```typescript
   const { data, error } = await supabase.storage
     .from('application-drafts')
     .upload(`${userId}/test.pdf`, file);
   ```

2. **Test application file access:**
   ```typescript
   const { data, error } = await supabase.storage
     .from('applications')
     .download(`${applicationId}/resume.pdf`);
   ```

Both should succeed for authorized users and fail for unauthorized users.
