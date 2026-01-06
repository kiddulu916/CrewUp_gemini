'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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
  profile_image_url?: string | null;
};

export type ProfileResult = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Update user profile
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate required fields
  if (data.name && data.name.trim().length === 0) {
    return { success: false, error: 'Name is required' };
  }

  if (data.name && data.name.length > 100) {
    return { success: false, error: 'Name is too long (max 100 characters)' };
  }

  if (data.bio && data.bio.length > 500) {
    return { success: false, error: 'Bio is too long (max 500 characters)' };
  }

  if (data.location && data.location.length > 200) {
    return { success: false, error: 'Location is too long (max 200 characters)' };
  }

  // Handle coords update separately if provided with valid lat/lng
  if (data.coords && typeof data.coords.lat === 'number' && typeof data.coords.lng === 'number') {
    // Use the update_user_coords RPC function for PostGIS conversion
    const { error: coordsError } = await supabase.rpc('update_user_coords', {
      p_user_id: user.id,
      p_lng: data.coords.lng,
      p_lat: data.coords.lat,
      p_location: data.location || null,
    });

    if (coordsError) {
      console.error('Coords update error:', coordsError);
    }
  }

  // Update other profile fields (excluding coords)
  const updateData: any = {};
  if (data.name) {
    const [firstName, ...lastNameParts] = data.name.trim().split(' ');
    updateData.first_name = firstName;
    updateData.last_name = lastNameParts.join(' ') || '';
  }
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.employer_type !== undefined) updateData.employer_type = data.employer_type;
  if (data.profile_image_url !== undefined) updateData.profile_image_url = data.profile_image_url;

  // Only update if there are fields to update in users table
  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Update profile error:', updateError);
      return { success: false, error: 'Failed to update base profile' };
    }
  }

  // Update workers table if trade/sub_trade provided
  if (data.trade !== undefined || data.sub_trade !== undefined) {
    const workerUpdate: any = {};
    if (data.trade !== undefined) workerUpdate.trade = data.trade;
    if (data.sub_trade !== undefined) workerUpdate.sub_trade = data.sub_trade;

    const { error: workerError } = await supabase
      .from('workers')
      .update(workerUpdate)
      .eq('user_id', user.id);

    if (workerError) {
      console.error('Update worker profile error:', workerError);
    }
  }

  // Update contractors table if company_name provided
  if (data.company_name !== undefined) {
    const { error: contractorError } = await supabase
      .from('contractors')
      .update({ company_name: data.company_name })
      .eq('user_id', user.id);

    if (contractorError) {
      console.error('Update contractor profile error:', contractorError);
    }
  }

  // Fetch updated profile (join with workers and contractors for full data)
  const { data: profile, error: fetchError } = await supabase
    .from('users')
    .select(`
      *,
      workers(trade, sub_trade),
      contractors(company_name)
    `)
    .eq('id', user.id)
    .single();

  if (fetchError) {
    console.error('Fetch profile error:', fetchError);
    return { success: false, error: 'Failed to fetch updated profile' };
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard/profile/edit');

  return { success: true, data: profile };
}

/**
 * Update user's location coordinates (used for initial location capture)
 */
export async function updateProfileLocation(data: {
  location: string;
  coords: { lat: number; lng: number };
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Use the update_user_coords RPC function for PostGIS conversion
  const { error: updateError } = await supabase.rpc('update_user_coords', {
    p_user_id: user.id,
    p_lng: data.coords.lng,
    p_lat: data.coords.lat,
    p_location: data.location,
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/dashboard/feed');
  revalidatePath('/dashboard/profile');
  return { success: true };
}

/**
 * Update worker's tools owned
 */
export async function updateToolsOwned(
  hasTools: boolean,
  toolsOwned: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient(await cookies());

  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Validate input
  if (typeof hasTools !== 'boolean') {
    return { success: false, error: 'Invalid hasTools value' };
  }

  // Validate and sanitize toolsOwned array
  const MAX_TOOLS = 100;
  const MAX_TOOL_NAME_LENGTH = 100;

  if (toolsOwned.length > MAX_TOOLS) {
    return { success: false, error: `Cannot save more than ${MAX_TOOLS} tools` };
  }

  // Sanitize: trim whitespace, filter empty/too long, remove duplicates
  const sanitizedTools = toolsOwned
    .map(tool => tool.trim())
    .filter(tool => tool.length > 0 && tool.length <= MAX_TOOL_NAME_LENGTH);

  const uniqueTools = [...new Set(sanitizedTools)];

  // 3. Verify user is a worker
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'worker') {
    return { success: false, error: 'Only workers can update tools owned' };
  }

  // 4. Update tools in workers table
  const { error } = await supabase
    .from('workers')
    .update({
      has_tools: hasTools,
      tools_owned: uniqueTools
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('Update tools error:', error);
    return { success: false, error: 'Failed to update tools' };
  }

  revalidatePath('/dashboard/profile/edit');
  revalidatePath('/dashboard/profile');
  return { success: true };
}

/**
 * Get current user's profile
 */
export async function getMyProfile(): Promise<ProfileResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select(`
      *,
      workers(trade, sub_trade),
      contractors(company_name)
    `)
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Get profile error:', error);
    return { success: false, error: 'Failed to get profile' };
  }

  return { success: true, data: profile };
}
