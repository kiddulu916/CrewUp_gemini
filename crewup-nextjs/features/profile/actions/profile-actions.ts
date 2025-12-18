'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ProfileUpdateData = {
  name: string;
  trade: string;
  sub_trade?: string;
  location: string;
  phone?: string;
  bio?: string;
  employer_type?: 'contractor' | 'recruiter';
};

export type ProfileResult = {
  success: boolean;
  error?: string;
};

/**
 * Update user profile
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current profile to check role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Prepare update data
  const updateData: any = {
    name: data.name,
    trade: data.trade,
    location: data.location,
    bio: data.bio,
  };

  // Only include phone if provided
  if (data.phone) {
    updateData.phone = data.phone;
  }

  // Only set sub_trade if provided
  if (data.sub_trade) {
    updateData.sub_trade = data.sub_trade;
  }

  // Only set employer_type for employers
  if (currentProfile?.role === 'employer' && data.employer_type) {
    updateData.employer_type = data.employer_type;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/dashboard/profile');
  redirect('/dashboard/profile');
}
