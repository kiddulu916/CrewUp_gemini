# Profile Picture Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add profile picture upload functionality with client-side image optimization and initials-based avatar fallback for both workers and employers.

**Architecture:** Client-side image compression to 400x400px before upload to dedicated Supabase Storage bucket. Upload happens during profile form submission. Falls back to deterministic initials-based avatars when no image exists.

**Tech Stack:** browser-image-compression, Supabase Storage, Next.js Server Actions, React hooks, Tailwind CSS

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/029_add_profile_image_url.sql`

**Step 1: Create migration file**

```sql
-- Add profile_image_url column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.profile_image_url IS 'Public URL of user profile picture from Supabase Storage';
```

**Step 2: Apply migration**

Run: `npx supabase db push`

Expected: Migration applied successfully, column added to profiles table

**Step 3: Verify column exists**

Run: `npx supabase db diff`

Expected: No pending changes (migration applied)

**Step 4: Commit migration**

```bash
git add supabase/migrations/029_add_profile_image_url.sql
git commit -m "feat: add profile_image_url column to profiles table"
```

---

## Task 2: Supabase Storage Bucket Setup

**Files:**
- Manual configuration in Supabase Dashboard

**Step 1: Create storage bucket**

1. Open Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `profile-pictures`
4. Public bucket: ✅ Yes
5. Click "Create bucket"

**Step 2: Configure RLS policies**

Navigate to Storage → profile-pictures → Policies → New Policy

**Policy 1: Upload own profile picture**
```sql
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2: Update own profile picture**
```sql
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3: Public read access**
```sql
CREATE POLICY "Public read access to profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
```

**Step 3: Verify bucket and policies**

Test upload permissions through Supabase Dashboard Storage interface

Expected: Can upload files to own user folder, cannot upload to other user folders, public read works

**Step 4: Document configuration**

Create note in project docs that bucket is configured (no commit needed for manual config)

---

## Task 3: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install browser-image-compression**

Run: `npm install browser-image-compression`

Expected: Package installed, package.json and package-lock.json updated

**Step 2: Verify installation**

Run: `npm list browser-image-compression`

Expected: Shows installed version (e.g., browser-image-compression@2.0.2)

**Step 3: Commit dependency**

```bash
git add package.json package-lock.json
git commit -m "chore: add browser-image-compression for client-side image optimization"
```

---

## Task 4: Create Image Compression Utility

**Files:**
- Create: `lib/utils/image-compression.ts`

**Step 1: Create utility file with compression function**

```typescript
import imageCompression from 'browser-image-compression';

/**
 * Resize and compress profile image to 400x400px JPEG
 * @param file - Original image file
 * @returns Compressed File object
 */
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

**Step 2: Test import (optional manual test)**

Create test file or verify no TypeScript errors

Expected: No TypeScript errors, clean build

**Step 3: Commit utility**

```bash
git add lib/utils/image-compression.ts
git commit -m "feat: add image compression utility for profile pictures"
```

---

## Task 5: Create Initials Avatar Utility

**Files:**
- Create: `lib/utils/initials-avatar.tsx`

**Step 1: Create utility with initials extraction and color generation**

```typescript
/**
 * Extract initials from a name (first letter of first and last name)
 * @param name - Full name (e.g., "John Doe")
 * @returns Initials (e.g., "JD")
 */
export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return '?';

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate deterministic background color based on user ID
 * @param userId - User UUID
 * @returns Tailwind CSS color class
 */
export function getAvatarColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-teal-500',
  ];

  // Simple hash function to get deterministic color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Props for InitialsAvatar component
 */
type InitialsAvatarProps = {
  name: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

/**
 * Initials-based avatar component (fallback when no profile picture)
 */
export function InitialsAvatar({ name, userId, size = 'md', className = '' }: InitialsAvatarProps) {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(userId);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-4xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
    >
      {initials}
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit utility**

```bash
git add lib/utils/initials-avatar.tsx
git commit -m "feat: add initials avatar utility with deterministic colors"
```

---

## Task 6: Create Profile Picture Upload Server Action

**Files:**
- Create: `features/profiles/actions/profile-picture-actions.ts`

**Step 1: Create server action file**

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

**Step 2: Verify no TypeScript errors**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit server action**

```bash
git add features/profiles/actions/profile-picture-actions.ts
git commit -m "feat: add profile picture upload server action"
```

---

## Task 7: Update Profile Actions to Support profile_image_url

**Files:**
- Modify: `features/profiles/actions/profile-actions.ts:7-17`

**Step 1: Add profile_image_url to ProfileUpdateData type**

```typescript
export type ProfileUpdateData = {
  name?: string;
  phone?: string | null;
  location?: string;
  coords?: { lat: number; lng: number } | null;
  trade?: string;
  sub_trade?: string | null;
  bio?: string | null;
  employer_type?: string | null;
  company_name?: string | null;
  profile_image_url?: string | null;  // ADD THIS LINE
};
```

**Step 2: Add profile_image_url to update logic**

Find line 82 in `profile-actions.ts` and add after `company_name`:

```typescript
  if (data.company_name !== undefined) updateData.company_name = data.company_name;
  if (data.profile_image_url !== undefined) updateData.profile_image_url = data.profile_image_url;  // ADD THIS LINE
```

**Step 3: Verify no TypeScript errors**

Run: `npm run type-check`

Expected: No errors

**Step 4: Commit changes**

```bash
git add features/profiles/actions/profile-actions.ts
git commit -m "feat: add profile_image_url support to profile update action"
```

---

## Task 8: Create ProfileAvatarUpload Component

**Files:**
- Create: `features/profiles/components/profile-avatar-upload.tsx`

**Step 1: Create component file**

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { InitialsAvatar } from '@/lib/utils/initials-avatar';
import { resizeProfileImage } from '@/lib/utils/image-compression';

type Props = {
  currentImageUrl?: string | null;
  userName: string;
  userId: string;
  onImageSelected: (file: File) => void;
  disabled?: boolean;
};

export function ProfileAvatarUpload({
  currentImageUrl,
  userName,
  userId,
  onImageSelected,
  disabled = false,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentImageUrl changes
  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 2MB before compression)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be under 2MB. Please choose a smaller file');
      return;
    }

    setIsProcessing(true);

    try {
      // Resize and compress image
      const compressedFile = await resizeProfileImage(file);

      // Create preview URL (revoke old one first)
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(compressedFile);
      setPreviewUrl(newPreviewUrl);

      // Notify parent component
      onImageSelected(compressedFile);
    } catch (err) {
      console.error('Image processing error:', err);
      setError('Failed to process image. Please try a different file');
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar Preview */}
      <div
        className="relative cursor-pointer group"
        onClick={handleClick}
        role="button"
        tabIndex={disabled || isProcessing ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Image or Initials Avatar */}
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={userName}
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
          />
        ) : (
          <InitialsAvatar name={userName} userId={userId} size="xl" />
        )}

        {/* Hover Overlay */}
        {!disabled && !isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm font-medium">Change Picture</span>
          </div>
        )}

        {/* Processing Spinner */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 text-center max-w-xs">{error}</p>
      )}

      {/* Helper Text */}
      {!error && (
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Click to upload a profile picture (JPEG, PNG, or WebP, max 2MB)
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit component**

```bash
git add features/profiles/components/profile-avatar-upload.tsx
git commit -m "feat: add ProfileAvatarUpload component with image compression"
```

---

## Task 9: Integrate ProfileAvatarUpload into ProfileEditForm

**Files:**
- Modify: `features/profile/components/profile-edit-form.tsx`

**Step 1: Add imports at top of file**

After line 8, add:

```typescript
import { ProfileAvatarUpload } from '@/features/profiles/components/profile-avatar-upload';
import { uploadProfilePicture } from '@/features/profiles/actions/profile-picture-actions';
```

**Step 2: Add state for selected profile picture**

After line 17 (after `const [error, setError] = useState('')`), add:

```typescript
const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);
```

**Step 3: Update handleSubmit to upload profile picture first**

Replace the `handleSubmit` function (lines 33-45) with:

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    // Upload profile picture first if selected
    let profileImageUrl = formData.profile_image_url;
    if (selectedProfilePicture) {
      const uploadResult = await uploadProfilePicture(selectedProfilePicture);
      if (!uploadResult.success) {
        setError(uploadResult.error || 'Failed to upload profile picture');
        setIsLoading(false);
        return;
      }
      profileImageUrl = uploadResult.url;
    }

    // Update profile with new image URL
    const result = await updateProfile({
      ...formData,
      profile_image_url: profileImageUrl,
    });

    if (!result.success) {
      setError(result.error || 'Failed to update profile');
      setIsLoading(false);
    }
    // If successful, user will be redirected by the action
  } catch (err) {
    console.error('Submit error:', err);
    setError('An unexpected error occurred');
    setIsLoading(false);
  }
}
```

**Step 4: Add ProfileAvatarUpload before form fields**

After the error message div (after line 53), add:

```typescript
      <ProfileAvatarUpload
        currentImageUrl={profile.profile_image_url}
        userName={profile.name}
        userId={profile.id}
        onImageSelected={(file) => setSelectedProfilePicture(file)}
        disabled={isLoading}
      />
```

**Step 5: Verify no TypeScript errors**

Run: `npm run type-check`

Expected: No errors

**Step 6: Test locally**

Run: `npm run dev`

Navigate to: http://localhost:3000/dashboard/profile/edit

Expected: Avatar upload component appears at top of form

**Step 7: Commit integration**

```bash
git add features/profile/components/profile-edit-form.tsx
git commit -m "feat: integrate ProfileAvatarUpload into profile edit form"
```

---

## Task 10: Display Profile Picture on Profile Page

**Files:**
- Modify: `app/dashboard/profile/page.tsx`

**Step 1: Add import for InitialsAvatar**

Add to imports section:

```typescript
import { InitialsAvatar } from '@/lib/utils/initials-avatar';
```

**Step 2: Find profile display section and add avatar**

Locate the profile display section (likely near the profile name) and add:

```typescript
{profile.profile_image_url ? (
  <img
    src={profile.profile_image_url}
    alt={profile.name}
    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
  />
) : (
  <InitialsAvatar name={profile.name} userId={profile.id} size="lg" />
)}
```

**Step 3: Verify no TypeScript errors**

Run: `npm run type-check`

Expected: No errors

**Step 4: Test locally**

Run: `npm run dev`

Navigate to: http://localhost:3000/dashboard/profile

Expected: Avatar displays (initials or uploaded image)

**Step 5: Commit changes**

```bash
git add app/dashboard/profile/page.tsx
git commit -m "feat: display profile picture on profile page"
```

---

## Task 11: Manual Testing & Verification

**Files:**
- No files modified

**Step 1: Test image upload flow**

1. Navigate to profile edit page
2. Click on avatar
3. Select a JPEG image (< 2MB)
4. Verify preview updates immediately
5. Click "Save Changes"
6. Verify profile updates successfully
7. Verify image appears on profile page

Expected: Full flow works without errors

**Step 2: Test image validation**

1. Try uploading a non-image file
2. Verify error message appears
3. Try uploading a 3MB image
4. Verify error message appears

Expected: Validation catches invalid files

**Step 3: Test initials avatar fallback**

1. Create new test account
2. Complete onboarding without uploading picture
3. Navigate to profile page
4. Verify initials avatar displays with color

Expected: Initials avatar shows correctly

**Step 4: Test different image formats**

1. Upload PNG image
2. Upload WebP image
3. Upload JPEG image
4. Verify all formats work

Expected: All formats accepted and compressed to JPEG

**Step 5: Test on mobile viewport**

1. Open dev tools, switch to mobile view
2. Navigate to profile edit
3. Test upload flow on mobile
4. Verify responsive layout

Expected: Works well on mobile

**Step 6: Document any issues found**

Create notes of any bugs or improvements needed

Expected: Clean testing experience, minimal issues

---

## Task 12: Update Avatar Display Across App (Optional Enhancement)

**Files:**
- Identify all locations where user avatars appear
- Modify each to use profile_image_url with InitialsAvatar fallback

**Locations to update:**
- Message conversation list
- Job application cards
- Public profile view
- Navigation header (if applicable)
- Any other user avatar displays

**Pattern to follow:**

```typescript
{user.profile_image_url ? (
  <img
    src={user.profile_image_url}
    alt={user.name}
    className="w-10 h-10 rounded-full object-cover"
  />
) : (
  <InitialsAvatar name={user.name} userId={user.id} size="md" />
)}
```

**Commit after each location updated:**

```bash
git add [modified-file]
git commit -m "feat: add profile picture to [component-name]"
```

---

## Success Criteria Checklist

- ✅ Database migration applied (profile_image_url column exists)
- ✅ Supabase Storage bucket created and configured
- ✅ browser-image-compression installed
- ✅ Image compression utility created and tested
- ✅ Initials avatar utility created
- ✅ Profile picture upload server action created
- ✅ Profile actions updated to support profile_image_url
- ✅ ProfileAvatarUpload component created
- ✅ Profile edit form integrated with avatar upload
- ✅ Profile page displays uploaded avatar or initials
- ✅ Image validation works (type and size)
- ✅ Client-side compression works (images resized to 400x400)
- ✅ Error handling provides clear feedback
- ✅ Works on both desktop and mobile
- ✅ All TypeScript types are correct
- ✅ No console errors during upload flow

---

## Notes for Implementation

1. **DRY Principle**: Reuse InitialsAvatar component everywhere avatars are displayed
2. **YAGNI**: Don't add "Remove Picture" functionality unless user explicitly asks
3. **TDD**: While not strict TDD for UI components, test each component after creation
4. **Frequent Commits**: Commit after each task completion (every 2-5 minutes)
5. **Error Handling**: Always handle errors gracefully with user-friendly messages
6. **TypeScript**: Ensure no type errors before committing
7. **Accessibility**: Avatar component supports keyboard navigation and screen readers

---

## Rollback Plan

If issues occur during implementation:

1. **Database**: Column is nullable, safe to leave empty
2. **Storage**: Bucket can be deleted from Supabase Dashboard if needed
3. **Code**: Use git to revert to previous commit:
   ```bash
   git log --oneline  # find commit hash before changes
   git reset --hard <commit-hash>
   ```

---

## Post-Implementation Tasks

After successful implementation:

1. Update `docs/plans/progress-checklist.md` to mark profile picture upload as complete
2. Test in production environment
3. Monitor Supabase Storage usage and costs
4. Gather user feedback on avatar upload experience
5. Consider adding optional "Remove Picture" button if users request it
