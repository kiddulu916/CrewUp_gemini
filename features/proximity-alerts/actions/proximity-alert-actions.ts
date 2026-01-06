// features/proximity-alerts/actions/proximity-alert-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type ProximityAlert = {
  id: string;
  user_id: string;
  radius_km: number;
  trades: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Get proximity alert settings for current user
 */
export async function getMyProximityAlert(): Promise<{
  success: boolean;
  alert?: ProximityAlert;
  error?: string;
}> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: alert } = await supabase
      .from('proximity_alerts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return { success: true, alert: alert || undefined };
  } catch (error) {
    console.error('Error in getMyProximityAlert:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Update proximity alert settings (Pro worker feature)
 */
export async function updateProximityAlert(
  radiusKm: number,
  trades: string[],
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is Pro worker
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_status, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    if (profile.role !== 'worker') {
      return { success: false, error: 'Only workers can set proximity alerts' };
    }

    // Validate inputs
    if (radiusKm < 5 || radiusKm > 50) {
      return { success: false, error: 'Radius must be between 5 and 50 km' };
    }

    if (trades.length === 0) {
      return { success: false, error: 'At least one trade must be selected' };
    }

    // Upsert alert settings
    const { error } = await supabase
      .from('proximity_alerts')
      .upsert({
        user_id: user.id,
        radius_km: radiusKm,
        trades,
        is_active: isActive,
      });

    if (error) {
      console.error('Error updating proximity alert:', error);
      return { success: false, error: 'Failed to update alert settings' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateProximityAlert:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
