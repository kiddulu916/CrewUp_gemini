# Profile Picture Upload Feature - Design Document

**Date:** 2025-12-26
**Status:** Approved
**Feature:** Profile picture upload for both workers and employers

---

## Overview

Add profile picture upload functionality to the profile editing experience for both workers and employers. Users will be able to upload, preview, and update their profile pictures, with automatic client-side image optimization and a fallback to initials-based avatars.

---

## Section 1: Architecture

### High-Level Approach

The profile picture upload feature follows existing patterns in the codebase (similar to certification photo uploads and application file uploads). The flow is:

1. User clicks circular avatar at top of profile edit form
2. File picker opens, user selects image (JPEG/PNG/WebP, max 2MB)
3. Client-side JavaScript resizes image to 400x400px using `browser-image-compression` library
4. Preview updates immediately to show selected image
5. On form submit, resized image uploads to Supabase Storage bucket `profile-pictures`
6. Server action updates `profiles.profile_image_url` field with public URL
7. Profile page and all app locations display the new avatar

### Key Design Decisions

- **Dedicated storage bucket**: `profile-pictures` (separate from certifications and applications)
- **File path pattern**: `{userId}/avatar.{ext}` with upsert enabled (always overwrites previous)
- **Client-side optimization**: Resize to 400x400px before upload to reduce bandwidth and storage costs
- **Upload timing**: Image uploads during form submission (not immediately on selection)
- **Fallback display**: Initials-based avatar with deterministic background color when no image exists

---

## Section 2: Database & Storage Setup

### Database Migration Required

Add the `profile_image_url` column to the profiles table.

**File**: `supabase/migrations/029_add_profile_image_url.sql`

```sql
-- Add profile_image_url column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.profile_image_url IS 'Public URL of user profile picture from Supabase Storage';
```

### Storage Bucket Configuration

Create a new Supabase Storage bucket via the Supabase Dashboard:

- **Bucket name**: `profile-pictures`
- **Public bucket**: Yes (allows public read access to profile images)
- **File size limit**: 2MB (enforced by client validation)
- **Allowed MIME types**: image/jpeg, image/png, image/webp

### Row Level Security (RLS) Policies

```sql
-- Allow authenticated users to upload their own profile picture
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own profile picture
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all profile pictures
CREATE POLICY "Public read access to profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
```

---

## Section 3: Server Actions

### New Server Action: Upload Profile Picture

Create a new server action to handle profile picture uploads.

**File**: `features/profiles/actions/profile-picture-actions.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

type UploadResult = {
  success: boolean;
  error?: string;
  url?: string;
};

/**
 * Upload profile picture to Supabase Storage
 * Validates file type and size (already resized on client)
 * Files stored in: profile-pictures/{userId}/avatar.{ext}
 */
export async function uploadProfilePicture(file: File): Promise<UploadResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate file size (max 2MB - should be smaller after client resize)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be under 2MB' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Please upload JPEG, PNG, or WebP images only' };
    }

    // Extract extension
    const ext = file.name.split('.').pop() || 'jpg';

    // Upload with upsert (overwrites previous)
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload image' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error in uploadProfilePicture:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

### Update Profile Action

Modify `features/profiles/actions/profile-actions.ts` to include `profile_image_url` in the `ProfileUpdateData` type and update query.

---

## Section 4: UI Components

### New Component: ProfileAvatarUpload

Create a reusable avatar upload component that handles file selection, client-side resizing, and preview.

**File**: `features/profiles/components/profile-avatar-upload.tsx`

**Key Features:**
- Circular avatar preview (120px diameter on desktop, 96px on mobile)
- Shows current profile picture or initials-based placeholder
- "Change Picture" button appears on hover
- Click anywhere on avatar to trigger file picker
- Client-side resize to 400x400px using `browser-image-compression`
- Instant preview after file selection
- Error messages for invalid files
- Loading state during resize operation

**Props:**
```typescript
type Props = {
  currentImageUrl?: string | null;
  userName: string;
  userId: string;
  onImageSelected: (file: File) => void;
  disabled?: boolean;
};
```

### Integration into ProfileEditForm

Add the avatar upload at the top of the form (before the name field):

1. Add state for selected image file and preview URL
2. Render `<ProfileAvatarUpload>` above the existing form fields
3. On form submit, upload the profile picture first (if selected)
4. Then update profile data including the new `profile_image_url`
5. Handle upload errors gracefully with toast notifications

### Initials Avatar Fallback

Create a utility function `getInitialsAvatar(name: string, userId: string)` that:
- Extracts first letter of first and last name (e.g., "John Doe" → "JD")
- Generates deterministic background color based on userId hash
- Returns JSX for a circular div with centered initials

---

## Section 5: Client-side Image Processing

### Install Dependency

Add the `browser-image-compression` library (lightweight, ~12KB):

```bash
npm install browser-image-compression
```

### Image Resize Utility

Create a utility function to handle client-side image compression and resizing.

**File**: `lib/utils/image-compression.ts`

```typescript
import imageCompression from 'browser-image-compression';

export async function resizeProfileImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,              // Max file size 500KB
    maxWidthOrHeight: 400,        // Resize to 400x400
    useWebWorker: true,           // Use web worker for better performance
    fileType: 'image/jpeg',       // Convert all to JPEG for consistency
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Failed to process image');
  }
}
```

### Usage in ProfileAvatarUpload Component

When user selects a file:

1. Validate file type (JPEG/PNG/WebP) and size (<2MB before compression)
2. Call `resizeProfileImage(file)` to compress and resize
3. Show loading spinner during resize operation
4. Create preview URL using `URL.createObjectURL()`
5. Pass resized file to parent via `onImageSelected` callback
6. Clean up preview URL on component unmount

**Benefits:**
- Reduces upload time (400x400 JPEG typically <100KB)
- Consistent dimensions across all profile pictures
- Better performance when displaying avatars throughout the app
- Lower storage costs

---

## Section 6: Error Handling & Edge Cases

### Validation & Error Messages

**Client-side validation** (before resize):
- File type not JPEG/PNG/WebP → "Please select a valid image file (JPEG, PNG, or WebP)"
- File size > 2MB → "Image must be under 2MB. Please choose a smaller file"
- Image resize fails → "Failed to process image. Please try a different file"

**Server-side validation** (in upload action):
- Not authenticated → "Not authenticated" (redirect to login)
- File size > 2MB after resize → "File size must be under 2MB" (shouldn't happen but defensive)
- Invalid file type → "Please upload JPEG, PNG, or WebP images only"
- Storage upload fails → "Failed to upload image. Please try again"

### Edge Cases & Solutions

**1. Upload fails during form submit:**
- Show error toast, keep form open with data intact
- User can retry without re-entering form data
- Preview remains visible to show what they tried to upload

**2. User changes picture multiple times before submitting:**
- Only the last selected file is uploaded
- Clean up previous preview URLs to prevent memory leaks
- Each selection overwrites the previous in component state

**3. User cancels file picker:**
- No change to current state
- Existing preview (or placeholder) remains visible

**4. Deleting profile picture:**
- Add optional "Remove Picture" button in avatar component
- Sets `profile_image_url` to `null` in database
- Deletes file from storage bucket (cleanup)
- Falls back to initials avatar

**5. Network interruption during upload:**
- Supabase client handles retry automatically
- Show loading state until completion or error
- Timeout after 30 seconds with error message

**6. Invalid/corrupted images:**
- Browser validates image on file selection
- Compression library validates during resize
- Show generic error: "Unable to process this image"

### Memory Management

- Revoke blob URLs using `URL.revokeObjectURL()` on unmount
- Clear file input after successful upload
- Limit preview size to prevent memory issues with large images

---

## Implementation Checklist

### Phase 1: Database & Storage Setup
- [ ] Create migration file `029_add_profile_image_url.sql`
- [ ] Run migration to add `profile_image_url` column
- [ ] Create `profile-pictures` storage bucket in Supabase Dashboard
- [ ] Apply RLS policies to storage bucket

### Phase 2: Server Actions
- [ ] Create `profile-picture-actions.ts` with upload function
- [ ] Update `profile-actions.ts` to include `profile_image_url` field
- [ ] Test upload action with test images

### Phase 3: Client-side Processing
- [ ] Install `browser-image-compression` package
- [ ] Create `lib/utils/image-compression.ts` utility
- [ ] Create initials avatar utility function
- [ ] Test image resize with various file sizes

### Phase 4: UI Components
- [ ] Create `ProfileAvatarUpload` component
- [ ] Integrate into `ProfileEditForm`
- [ ] Add loading states and error handling
- [ ] Style with Tailwind CSS (circular, hover effects)
- [ ] Test file picker, preview, and upload flow

### Phase 5: Testing & Polish
- [ ] Test with various image formats (JPEG, PNG, WebP)
- [ ] Test with large images (>2MB)
- [ ] Test upload failure scenarios
- [ ] Test initials avatar fallback
- [ ] Test on mobile devices
- [ ] Add "Remove Picture" functionality (optional)
- [ ] Update all avatar displays across the app to use new field

---

## Files to Create/Modify

### New Files
- `supabase/migrations/029_add_profile_image_url.sql`
- `features/profiles/actions/profile-picture-actions.ts`
- `features/profiles/components/profile-avatar-upload.tsx`
- `lib/utils/image-compression.ts`
- `lib/utils/initials-avatar.tsx` (or add to existing utils)

### Modified Files
- `features/profiles/actions/profile-actions.ts` (add profile_image_url field)
- `features/profile/components/profile-edit-form.tsx` (integrate avatar upload)
- `app/dashboard/profile/page.tsx` (display avatar)
- `package.json` (add browser-image-compression dependency)

---

## Success Criteria

- ✅ Users can upload profile pictures from profile edit page
- ✅ Images are automatically resized to 400x400px on client
- ✅ Upload happens during form submission (not immediately)
- ✅ Initials-based avatar displays when no picture exists
- ✅ Profile pictures display across all parts of the app
- ✅ Error handling provides clear feedback
- ✅ Works for both workers and employers
- ✅ Mobile-responsive and accessible
