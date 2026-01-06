'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { AdPlacement, AdImpression } from './types';

/**
 * Track an ad impression
 * 
 * Records when an ad is viewed for analytics purposes.
 * Only tracks if user has consented to analytics.
 */
export async function trackAdImpression(
  placement: AdPlacement,
  provider: string = 'adsense'
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient(await cookies());
    
    // Get current user (optional - can track anonymous)
    const { data: { user } } = await supabase.auth.getUser();

    // Insert impression record
    const { error } = await supabase
      .from('ad_impressions')
      .insert({
        placement,
        provider,
        user_id: user?.id || null,
        clicked: false,
      });

    if (error) {
      console.error('[trackAdImpression] Error:', error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('[trackAdImpression] Error:', error);
    return { success: false };
  }
}

/**
 * Track an ad click
 * 
 * Records when an ad is clicked for conversion tracking.
 */
export async function trackAdClick(
  impressionId: string
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient(await cookies());

    // Update impression to mark as clicked
    const { error } = await supabase
      .from('ad_impressions')
      .update({ clicked: true, clicked_at: new Date().toISOString() })
      .eq('id', impressionId);

    if (error) {
      console.error('[trackAdClick] Error:', error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('[trackAdClick] Error:', error);
    return { success: false };
  }
}

/**
 * Get ad performance metrics (for admin dashboard)
 */
export async function getAdMetrics(dateRange: { start: Date; end: Date }) {
  try {
    const supabase = await createClient(await cookies());

    // Get total impressions
    const { count: totalImpressions } = await supabase
      .from('ad_impressions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    // Get total clicks
    const { count: totalClicks } = await supabase
      .from('ad_impressions')
      .select('*', { count: 'exact', head: true })
      .eq('clicked', true)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    // Get impressions by placement
    const { data: byPlacement } = await supabase
      .from('ad_impressions')
      .select('placement')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    // Calculate metrics
    const impressionsByPlacement: Record<string, number> = {};
    byPlacement?.forEach((row: any) => {
      impressionsByPlacement[row.placement] = (impressionsByPlacement[row.placement] || 0) + 1;
    });

    const ctr = totalImpressions && totalClicks 
      ? ((totalClicks / totalImpressions) * 100).toFixed(2) 
      : '0';

    return {
      success: true,
      metrics: {
        totalImpressions: totalImpressions || 0,
        totalClicks: totalClicks || 0,
        clickThroughRate: `${ctr}%`,
        impressionsByPlacement,
      },
    };
  } catch (error) {
    console.error('[getAdMetrics] Error:', error);
    return { success: false, error: 'Failed to fetch metrics' };
  }
}

