# Portfolio Photos, Tools Owned & Lifetime Pro Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add portfolio photos, tools owned selection, and lifetime Pro membership to worker profiles

**Architecture:** Three-layer approach: (1) Database migrations + type updates, (2) Server Actions with subscription helpers, (3) UI components with drag-drop portfolio manager and trade-specific tools selector

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + Storage), TanStack Query, @dnd-kit, browser-image-compression, TypeScript

---

## Phase 1: Database Migrations & Type Definitions

### Task 1.1: Create profiles table migration

**Files:**
- Create: `supabase/migrations/045_add_profile_tools_and_lifetime_pro.sql`

**Step 1: Create migration file**

```sql
-- Add new fields to profiles table
ALTER TABLE profiles
  ADD COLUMN has_tools boolean DEFAULT false,
  ADD COLUMN tools_owned text[] DEFAULT '{}',
  ADD COLUMN is_lifetime_pro boolean DEFAULT false,
  ADD COLUMN lifetime_pro_granted_at timestamptz,
  ADD COLUMN lifetime_pro_granted_by uuid REFERENCES profiles(id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/045_add_profile_tools_and_lifetime_pro.sql
git commit -m "feat(db): add tools and lifetime pro fields to profiles"
```

---

### Task 1.2: Update employer type constraint

**Files:**
- Create: `supabase/migrations/046_update_employer_type_constraint.sql`

**Step 1: Create migration file**

```sql
-- Update employer_type enum to include all 4 types
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_employer_type_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_employer_type_check
  CHECK (employer_type IN ('contractor', 'developer', 'homeowner', 'recruiter'));
```

**Step 2: Commit**

```bash
git add supabase/migrations/046_update_employer_type_constraint.sql
git commit -m "feat(db): expand employer types to include developer and homeowner"
```

---

### Task 1.3: Create portfolio_images table

**Files:**
- Create: `supabase/migrations/047_create_portfolio_images_table.sql`

**Step 1: Create migration file**

```sql
CREATE TABLE portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_order UNIQUE(user_id, display_order)
);

-- Index for fast lookups
CREATE INDEX idx_portfolio_images_user_id ON portfolio_images(user_id);

-- RLS Policies
ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio images are publicly viewable"
  ON portfolio_images FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own portfolio images"
  ON portfolio_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio images"
  ON portfolio_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio images"
  ON portfolio_images FOR DELETE
  USING (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/047_create_portfolio_images_table.sql
git commit -m "feat(db): create portfolio_images table with RLS policies"
```

---

### Task 1.4: Create storage bucket migration

**Files:**
- Create: `supabase/migrations/048_create_portfolio_storage_bucket.sql`

**Step 1: Create migration file**

```sql
-- Create portfolio-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage bucket
CREATE POLICY "Anyone can view portfolio images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

CREATE POLICY "Users can upload own portfolio images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own portfolio images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own portfolio images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Step 2: Commit**

```bash
git add supabase/migrations/048_create_portfolio_storage_bucket.sql
git commit -m "feat(db): create portfolio-images storage bucket with RLS"
```

---

### Task 1.5: Update Profile types

**Files:**
- Modify: `lib/types/profile.types.ts:3-44`

**Step 1: Update Profile interface**

```typescript
export interface Profile {
  id: string;
  name: string;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'developer' | 'homeowner' | 'recruiter';
  subscription_status: 'free' | 'pro';
  subscription_id?: string;
  trade: string;
  sub_trade?: string;
  location: string;
  coords?: { x: number; y: number };
  bio?: string;
  phone?: string;
  email: string;
  profile_image_url?: string;
  is_profile_boosted: boolean;
  boost_expires_at?: string;

  // Address fields
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;

  // Work authorization
  authorized_to_work: boolean;
  has_drivers_license: boolean;
  license_class?: 'A' | 'B' | 'C';
  has_reliable_transportation: boolean;

  // Skills
  years_of_experience: number;
  trade_skills: string[];

  // Tools
  has_tools: boolean;
  tools_owned: string[];

  // Lifetime Pro
  is_lifetime_pro: boolean;
  lifetime_pro_granted_at?: string;
  lifetime_pro_granted_by?: string;

  // Emergency contact
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;

  created_at: string;
  updated_at: string;
}
```

**Step 2: Add PortfolioImage type**

Add after Profile interface:

```typescript
export interface PortfolioImage {
  id: string;
  user_id: string;
  image_url: string;
  display_order: number;
  uploaded_at: string;
}
```

**Step 3: Commit**

```bash
git add lib/types/profile.types.ts
git commit -m "feat(types): add tools, lifetime pro, and portfolio types"
```

---

## Phase 2: Subscription Helper Utilities

### Task 2.1: Create subscription helper utilities

**Files:**
- Create: `lib/utils/subscription.ts`

**Step 1: Create helper file with functions**

```typescript
import { Profile } from '@/lib/types/profile.types';

/**
 * Check if user has Pro subscription access
 * Includes both paid subscriptions and lifetime Pro users
 */
export function hasProAccess(profile: Profile | null): boolean {
  if (!profile) return false;

  // Lifetime Pro users always have access
  if (profile.is_lifetime_pro) return true;

  // Regular Pro subscribers
  return profile.subscription_status === 'pro';
}

/**
 * Check if user is a lifetime Pro member (founding member)
 */
export function isLifetimePro(profile: Profile | null): boolean {
  return profile?.is_lifetime_pro || false;
}

/**
 * Get subscription badge info for display
 */
export function getSubscriptionBadge(profile: Profile | null): {
  label: string;
  variant: 'free' | 'pro' | 'lifetime';
} | null {
  if (!profile) return null;

  if (profile.is_lifetime_pro) {
    return { label: 'Founding Member', variant: 'lifetime' };
  }

  if (profile.subscription_status === 'pro') {
    return { label: 'Pro', variant: 'pro' };
  }

  return { label: 'Free', variant: 'free' };
}
```

**Step 2: Commit**

```bash
git add lib/utils/subscription.ts
git commit -m "feat(utils): add subscription helper utilities"
```

---

## Phase 3: Portfolio Backend (Server Actions)

### Task 3.1: Create portfolio actions directory

**Files:**
- Create: `features/portfolio/actions/portfolio-actions.ts`

**Step 1: Create portfolio actions file**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { hasProAccess } from '@/lib/utils/subscription';

const MAX_FREE_PHOTOS = 5;

export async function uploadPortfolioPhoto(formData: FormData) {
  const supabase = await createClient(await cookies());

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's subscription status and current photo count
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, role, is_lifetime_pro')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'worker') {
    return { success: false, error: 'Only workers can upload portfolio photos' };
  }

  // Check current photo count
  const { count } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Enforce limits for free users
  if (!hasProAccess(profile) && count && count >= MAX_FREE_PHOTOS) {
    return {
      success: false,
      error: `Free users are limited to ${MAX_FREE_PHOTOS} portfolio photos. Upgrade to Pro for unlimited photos.`
    };
  }

  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Upload to storage
  const ext = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('portfolio-images')
    .upload(fileName, file);

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('portfolio-images')
    .getPublicUrl(fileName);

  // Get next display order
  const { data: lastImage } = await supabase
    .from('portfolio_images')
    .select('display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (lastImage?.display_order ?? -1) + 1;

  // Create database record
  const { error: dbError } = await supabase
    .from('portfolio_images')
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      display_order: nextOrder,
    });

  if (dbError) {
    // Cleanup uploaded file if DB insert fails
    await supabase.storage.from('portfolio-images').remove([fileName]);
    return { success: false, error: dbError.message };
  }

  revalidatePath('/dashboard/profile/portfolio');
  return { success: true, url: publicUrl };
}

export async function deletePortfolioPhoto(imageId: string) {
  const supabase = await createClient(await cookies());

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get image details (verify ownership via RLS)
  const { data: image, error: fetchError } = await supabase
    .from('portfolio_images')
    .select('image_url')
    .eq('id', imageId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !image) {
    return { success: false, error: 'Image not found' };
  }

  // Extract file path from URL
  const urlParts = image.image_url.split('/portfolio-images/');
  const filePath = urlParts[1];

  // Delete from storage
  await supabase.storage.from('portfolio-images').remove([filePath]);

  // Delete database record
  const { error: deleteError } = await supabase
    .from('portfolio_images')
    .delete()
    .eq('id', imageId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath('/dashboard/profile/portfolio');
  return { success: true };
}

export async function reorderPortfolioPhotos(imageIds: string[]) {
  const supabase = await createClient(await cookies());

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Update display_order for each image
  const updates = imageIds.map((id, index) => ({
    id,
    display_order: index,
    user_id: user.id,
  }));

  const { error } = await supabase
    .from('portfolio_images')
    .upsert(updates, { onConflict: 'id' });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/profile/portfolio');
  return { success: true };
}
```

**Step 2: Commit**

```bash
git add features/portfolio/actions/portfolio-actions.ts
git commit -m "feat(portfolio): add upload, delete, and reorder actions"
```

---

## Phase 4: Tools Backend (Server Actions)

### Task 4.1: Update profile actions with tools

**Files:**
- Modify: `features/profile/actions/profile-actions.ts`

**Step 1: Add updateToolsOwned action**

Add this function to the existing file:

```typescript
export async function updateToolsOwned(data: {
  has_tools: boolean;
  tools_owned: string[];
}) {
  const supabase = await createClient(await cookies());

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'worker') {
    return { success: false, error: 'Only workers can set tools owned' };
  }

  // If has_tools is false, clear the tools_owned array
  const toolsToSave = data.has_tools ? data.tools_owned : [];

  const { error } = await supabase
    .from('profiles')
    .update({
      has_tools: data.has_tools,
      tools_owned: toolsToSave,
    })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard/profile/edit');
  return { success: true };
}
```

**Step 2: Commit**

```bash
git add features/profile/actions/profile-actions.ts
git commit -m "feat(profile): add tools owned update action"
```

---

## Phase 5: Lifetime Pro Backend

### Task 5.1: Create admin lifetime Pro actions

**Files:**
- Create: `features/admin/actions/lifetime-pro-actions.ts`

**Step 1: Create admin actions file**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function grantLifetimePro(userId: string) {
  const supabase = await createClient(await cookies());

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!adminProfile?.is_admin) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_lifetime_pro: true,
      lifetime_pro_granted_at: new Date().toISOString(),
      lifetime_pro_granted_by: user.id,
    })
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log admin action
  await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action_type: 'grant_lifetime_pro',
    target_user_id: userId,
    details: { granted_at: new Date().toISOString() },
  });

  return { success: true };
}

export async function revokeLifetimePro(userId: string) {
  const supabase = await createClient(await cookies());

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!adminProfile?.is_admin) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_lifetime_pro: false,
      lifetime_pro_granted_at: null,
      lifetime_pro_granted_by: null,
    })
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action_type: 'revoke_lifetime_pro',
    target_user_id: userId,
  });

  return { success: true };
}
```

**Step 2: Commit**

```bash
git add features/admin/actions/lifetime-pro-actions.ts
git commit -m "feat(admin): add lifetime pro grant/revoke actions"
```

---

### Task 5.2: Create early adopter grant script

**Files:**
- Create: `scripts/grant-early-adopter-pro.ts`

**Step 1: Create script file**

```typescript
import { createServiceClient } from '@/lib/supabase/server';

const QUOTAS = {
  worker: 50,
  contractor: 25,
  developer: 25,
  homeowner: 25,
  recruiter: 25,
};

async function grantEarlyAdopterPro() {
  const supabase = await createServiceClient();

  console.log('Starting early adopter lifetime Pro grants...');

  // Get first 50 workers by created_at
  const { data: workers } = await supabase
    .from('profiles')
    .select('id, created_at')
    .eq('role', 'worker')
    .order('created_at', { ascending: true })
    .limit(QUOTAS.worker);

  if (workers && workers.length > 0) {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_lifetime_pro: true,
        lifetime_pro_granted_at: new Date().toISOString(),
      })
      .in('id', workers.map(w => w.id));

    if (error) {
      console.error('Error granting lifetime Pro to workers:', error);
    } else {
      console.log(`✓ Granted lifetime Pro to ${workers.length} workers`);
    }
  }

  // Repeat for each employer type
  for (const employerType of ['contractor', 'developer', 'homeowner', 'recruiter'] as const) {
    const { data: employers } = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('role', 'employer')
      .eq('employer_type', employerType)
      .order('created_at', { ascending: true })
      .limit(QUOTAS[employerType]);

    if (employers && employers.length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_lifetime_pro: true,
          lifetime_pro_granted_at: new Date().toISOString(),
        })
        .in('id', employers.map(e => e.id));

      if (error) {
        console.error(`Error granting lifetime Pro to ${employerType}s:`, error);
      } else {
        console.log(`✓ Granted lifetime Pro to ${employers.length} ${employerType}s`);
      }
    }
  }

  console.log('Early adopter lifetime Pro grants completed!');
  process.exit(0);
}

grantEarlyAdopterPro();
```

**Step 2: Add script to package.json**

Modify `package.json` scripts section:

```json
{
  "scripts": {
    "grant-early-adopters": "tsx scripts/grant-early-adopter-pro.ts"
  }
}
```

**Step 3: Commit**

```bash
git add scripts/grant-early-adopter-pro.ts package.json
git commit -m "feat(scripts): add early adopter pro grant script"
```

---

## Phase 6: Portfolio UI Components

### Task 6.1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install @dnd-kit packages**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Verify browser-image-compression**

```bash
npm list browser-image-compression
```

If not installed:

```bash
npm install browser-image-compression
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add @dnd-kit for portfolio drag-and-drop"
```

---

### Task 6.2: Create PortfolioManager component

**Files:**
- Create: `features/portfolio/components/portfolio-manager.tsx`

**Step 1: Create portfolio manager file**

Due to length, save the complete PortfolioManager component from the design document.

**Step 2: Commit**

```bash
git add features/portfolio/components/portfolio-manager.tsx
git commit -m "feat(portfolio): add portfolio manager component"
```

---

## Phase 7: Tools UI Components

### Task 7.1: Create ToolsSelector component

**Files:**
- Create: `features/profile/components/tools-selector.tsx`

**Step 1: Create tools selector file**

Save the complete ToolsSelector component from the design document with all tool categories.

**Step 2: Commit**

```bash
git add features/profile/components/tools-selector.tsx
git commit -m "feat(profile): add tools selector component"
```

---

## Phase 8: Public Profile Tabs

### Task 8.1: Create PublicProfileTabs component

**Files:**
- Create: `features/profiles/components/public-profile-tabs.tsx`

**Step 1: Create public profile tabs file**

Save the complete PublicProfileTabs component from the design document.

**Step 2: Commit**

```bash
git add features/profiles/components/public-profile-tabs.tsx
git commit -m "feat(profiles): add public profile tabs component"
```

---

### Task 8.2: Create SubscriptionBadge component

**Files:**
- Create: `components/common/subscription-badge.tsx`

**Step 1: Create badge component**

```typescript
import { getSubscriptionBadge } from '@/lib/utils/subscription';
import { Profile } from '@/lib/types/profile.types';

type Props = {
  profile: Profile;
  showLabel?: boolean;
};

export function SubscriptionBadge({ profile, showLabel = true }: Props) {
  const badge = getSubscriptionBadge(profile);

  if (!badge) return null;

  const styles = {
    free: 'bg-gray-100 text-gray-700',
    pro: 'bg-krewup-blue/10 text-krewup-blue',
    lifetime: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${styles[badge.variant]}`}>
      {badge.variant === 'lifetime' && (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {showLabel && badge.label}
    </span>
  );
}
```

**Step 2: Commit**

```bash
git add components/common/subscription-badge.tsx
git commit -m "feat(components): add subscription badge component"
```

---

## Phase 9: Profile Edit Integration

### Task 9.1: Create ProfileEditTabs component

**Files:**
- Create: `features/profile/components/profile-edit-tabs.tsx`

**Step 1: Create profile edit tabs file**

Save the complete ProfileEditTabs component from the design document.

**Step 2: Commit**

```bash
git add features/profile/components/profile-edit-tabs.tsx
git commit -m "feat(profile): add profile edit tabs component"
```

---

### Task 9.2: Integrate ToolsSelector into ProfileEditForm

**Files:**
- Modify: `features/profile/components/profile-edit-form.tsx`

**Step 1: Import ToolsSelector**

Add to imports:

```typescript
import { ToolsSelector } from './tools-selector';
import { updateToolsOwned } from '../actions/profile-actions';
```

**Step 2: Add to formData state**

```typescript
const [formData, setFormData] = useState<ProfileUpdateData>({
  // ... existing fields
  has_tools: profile.has_tools || false,
  tools_owned: profile.tools_owned || [],
});
```

**Step 3: Update handleSubmit to save tools**

Add before the main updateProfile call:

```typescript
// Update tools if changed
if (formData.has_tools !== profile.has_tools ||
    JSON.stringify(formData.tools_owned) !== JSON.stringify(profile.tools_owned)) {
  const toolsResult = await updateToolsOwned({
    has_tools: formData.has_tools,
    tools_owned: formData.tools_owned,
  });

  if (!toolsResult.success) {
    setError(toolsResult.error || 'Failed to update tools');
    setIsLoading(false);
    return;
  }
}
```

**Step 4: Add ToolsSelector to form (after bio, before buttons)**

```typescript
{profile.role === 'worker' && (
  <div className="border-t border-gray-200 pt-6">
    <ToolsSelector
      hasTools={formData.has_tools}
      toolsOwned={formData.tools_owned}
      userTrade={formData.trade}
      userSubTrade={formData.sub_trade}
      onChange={(data) => updateFormData(data)}
    />
  </div>
)}
```

**Step 5: Commit**

```bash
git add features/profile/components/profile-edit-form.tsx
git commit -m "feat(profile): integrate tools selector into edit form"
```

---

### Task 9.3: Update profile edit page to use tabs

**Files:**
- Modify: `app/dashboard/profile/edit/page.tsx`

**Step 1: Import ProfileEditTabs**

```typescript
import { ProfileEditTabs } from '@/features/profile/components/profile-edit-tabs';
```

**Step 2: Replace ProfileEditForm with ProfileEditTabs**

```typescript
export default async function ProfileEditPage() {
  const supabase = await createClient(await cookies());

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <ProfileEditTabs profile={profile} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/dashboard/profile/edit/page.tsx
git commit -m "feat(profile): use tabbed interface for profile editing"
```

---

## Phase 10: Stripe Webhook Updates

### Task 10.1: Update Stripe webhook to protect lifetime Pro

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`

**Step 1: Add lifetime Pro check to checkout handler**

Find the `handleCheckoutComplete` function and add check before updating subscription:

```typescript
// Check if user is lifetime Pro
const { data: profile } = await supabase
  .from('profiles')
  .select('is_lifetime_pro')
  .eq('id', userId)
  .single();

// Don't downgrade lifetime Pro users
if (profile?.is_lifetime_pro) {
  console.log(`Skipping subscription update for lifetime Pro user: ${userId}`);
  return new Response('OK', { status: 200 });
}
```

**Step 2: Add lifetime Pro check to subscription update handler**

Find `handleSubscriptionUpdated` and add similar check.

**Step 3: Add lifetime Pro check to subscription delete handler**

Find `handleSubscriptionDeleted` and add check that preserves Pro access for lifetime users.

**Step 4: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat(stripe): protect lifetime pro users from downgrades"
```

---

## Phase 11: Testing

### Task 11.1: Run type check

**Step 1: Run TypeScript compiler**

```bash
npm run type-check
```

Expected: No errors

**Step 2: Fix any type errors**

If errors, fix them and commit:

```bash
git add .
git commit -m "fix(types): resolve type errors"
```

---

### Task 11.2: Run existing tests

**Step 1: Run component tests**

```bash
npm test -- --run
```

Expected: All tests pass

**Step 2: Fix any broken tests**

If tests fail, update them to account for new fields and commit.

---

### Task 11.3: Test database migrations locally

**Step 1: Apply migrations via Supabase CLI or dashboard**

Run all 4 migrations in order.

**Step 2: Verify tables and columns exist**

Connect to database and verify:
- profiles table has new columns
- portfolio_images table exists
- portfolio-images storage bucket exists

---

## Phase 12: Final Integration

### Task 12.1: Run dev server and manual test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test portfolio upload**

- Login as worker
- Navigate to profile edit → Portfolio tab
- Upload a photo
- Verify it appears
- Test delete
- Test reorder (drag and drop)

**Step 3: Test tools selection**

- Navigate to profile edit → Basic Info
- Check "Has Tools"
- Select some tools
- Save
- View public profile and verify tools display

**Step 4: Test lifetime Pro badge**

- Manually update a profile to have `is_lifetime_pro = true`
- View profile
- Verify "Founding Member" badge shows

---

## Completion Checklist

- [ ] All migrations created and applied
- [ ] Type definitions updated
- [ ] Subscription helpers created
- [ ] Portfolio actions working
- [ ] Tools actions working
- [ ] Lifetime Pro actions working
- [ ] Portfolio UI functional (upload, delete, reorder)
- [ ] Tools selector working (shows correct categories)
- [ ] Public profile tabs showing all sections
- [ ] Profile edit tabs working
- [ ] Stripe webhook protecting lifetime Pro
- [ ] Dependencies installed
- [ ] Type check passes
- [ ] Existing tests pass
- [ ] Manual testing complete

---

## Next Steps After Implementation

1. Run early adopter script: `npm run grant-early-adopters`
2. Monitor for errors in Sentry
3. Test in production with real images
4. Verify storage costs are reasonable
5. Add E2E tests for portfolio and tools features
