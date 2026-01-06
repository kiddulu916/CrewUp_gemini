/**
 * Ad Configuration
 * 
 * Central configuration for ad monetization.
 * Set NEXT_PUBLIC_ADS_ENABLED=true to enable ads.
 */

import type { AdConfig, AdPlacement } from './types';

// Default ad configuration
export const adConfig: AdConfig = {
  provider: (process.env.NEXT_PUBLIC_AD_PROVIDER as AdConfig['provider']) || 'adsense',
  enabled: process.env.NEXT_PUBLIC_ADS_ENABLED === 'true',
  
  // Google AdSense configuration
  // Set these in your .env.local file
  adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '',
  adsenseSlots: {
    'job-feed-banner': process.env.NEXT_PUBLIC_ADSENSE_SLOT_JOB_BANNER || '',
    'job-feed-in-feed': process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_FEED || '',
    'profile-sidebar': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
    'search-results': process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH || '',
    'messages-sidebar': process.env.NEXT_PUBLIC_ADSENSE_SLOT_MESSAGES || '',
    'dashboard-footer': process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER || '',
  },
  
  // Show in-feed ad every 5 items
  inFeedFrequency: 5,
  
  // Block certain ad categories (gambling, adult, etc.)
  blockedCategories: [
    'adult',
    'gambling',
    'alcohol',
    'tobacco',
    'weapons',
    'politics',
  ],
};

/**
 * Check if ads should be shown for a user
 * Pro users don't see ads, free users do
 */
export function shouldShowAds(subscriptionStatus?: string, isLifetimePro?: boolean): boolean {
  // Ads disabled globally
  if (!adConfig.enabled) return false;
  
  // Pro users don't see ads
  if (subscriptionStatus === 'pro' || isLifetimePro) return false;
  
  return true;
}

/**
 * Get ad slot ID for a placement
 */
export function getAdSlotId(placement: AdPlacement): string | undefined {
  if (adConfig.provider === 'adsense') {
    return adConfig.adsenseSlots?.[placement];
  }
  return undefined;
}

