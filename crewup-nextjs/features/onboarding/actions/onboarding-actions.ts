'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export type OnboardingData = {
  name: string;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'recruiter';
  trade: string;
  sub_trade?: string;
  location: string;
  bio?: string;
};

export type OnboardingResult = {
  success: boolean;
  error?: string;
};

/**
 * Complete user onboarding and update profile
 */
export async function completeOnboarding(data: OnboardingData): Promise<OnboardingResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Prepare update data - only include employer_type if user is an employer
  const updateData: any = {
    name: data.name,
    role: data.role,
    trade: data.trade,
    location: data.location,
    bio: data.bio || `${data.role === 'worker' ? 'Skilled' : 'Hiring'} ${data.trade} professional`,
  };

  // Only set employer_type for employers
  if (data.role === 'employer' && data.employer_type) {
    updateData.employer_type = data.employer_type;
  } else {
    updateData.employer_type = null; // Explicitly set to null for workers
  }

  // Only set sub_trade if provided
  if (data.sub_trade) {
    updateData.sub_trade = data.sub_trade;
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard/feed');
}
