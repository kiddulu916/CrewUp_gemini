'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Upload a portfolio photo
 * Free users: max 5 photos
 * Pro users: unlimited
 */
export async function uploadPortfolioPhoto(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, is_lifetime_pro')
    .eq('id', user.id)
    .single();

  // 3. Check existing photo count
  // NOTE: Database trigger will enforce limit atomically to prevent race conditions
  const { count } = await supabase
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // 4. Enforce limits (5 for free, unlimited for Pro)
  // Check if user has Pro access (either 'pro' subscription or is_lifetime_pro)
  const isPro = profile?.subscription_status === 'pro' || profile?.is_lifetime_pro === true;
  if (!isPro && count && count >= 5) {
    return { success: false, error: 'Free users can upload maximum 5 portfolio photos. Upgrade to Pro for unlimited.' };
  }

  // 5. Get file from form data
  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Please upload JPEG, PNG, or WebP images only' };
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: 'File size must be under 5MB' };
  }

  // 6. Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('portfolio-images')
    .upload(fileName, file);

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  // 7. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('portfolio-images')
    .getPublicUrl(fileName);

  // 8. Create database record
  const { error: dbError } = await supabase
    .from('portfolio_images')
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      display_order: count || 0
    });

  if (dbError) {
    // Cleanup storage if DB insert fails
    await supabase.storage
      .from('portfolio-images')
      .remove([fileName]);
    return { success: false, error: dbError.message };
  }

  revalidatePath('/dashboard/profile/edit');
  return { success: true };
}

/**
 * Delete a portfolio photo
 */
export async function deletePortfolioPhoto(imageId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // Validate UUID format
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!imageId || !UUID_REGEX.test(imageId)) {
    return { success: false, error: 'Invalid image ID' };
  }

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Get image record (verify ownership via RLS)
  const { data: image, error: fetchError } = await supabase
    .from('portfolio_images')
    .select('image_url, user_id')
    .eq('id', imageId)
    .single();

  if (fetchError || !image) {
    return { success: false, error: 'Image not found' };
  }

  // 3. Verify ownership
  if (image.user_id !== user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // 4. Extract file path from URL
  const urlParts = image.image_url.split('/portfolio-images/');
  const filePath = urlParts[urlParts.length - 1];

  // 5. Delete from storage
  const { error: storageError } = await supabase.storage
    .from('portfolio-images')
    .remove([filePath]);

  if (storageError) {
    console.error('Failed to delete storage file:', storageError);
    // Continue with DB deletion - orphaned files can be cleaned up later
  }

  // 6. Delete from database
  const { error: deleteError } = await supabase
    .from('portfolio_images')
    .delete()
    .eq('id', imageId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath('/dashboard/profile/edit');
  return { success: true };
}

/**
 * Reorder portfolio photos (drag and drop)
 */
export async function reorderPortfolioPhotos(imageIds: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // Validate UUID format for all image IDs
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input
  if (!imageIds || imageIds.length === 0) {
    return { success: false, error: 'No images to reorder' };
  }

  // Validate each image ID is a valid UUID
  for (const id of imageIds) {
    if (!id || !UUID_REGEX.test(id)) {
      return { success: false, error: 'Invalid image ID format' };
    }
  }

  // 2. Update all images in parallel with error handling
  const results = await Promise.all(
    imageIds.map((id, i) =>
      supabase
        .from('portfolio_images')
        .update({ display_order: i })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  );

  // Check for failures
  const failed = results.filter(r => r.error);
  if (failed.length > 0) {
    return { success: false, error: 'Failed to reorder some images' };
  }

  revalidatePath('/dashboard/profile/edit');
  return { success: true };
}
