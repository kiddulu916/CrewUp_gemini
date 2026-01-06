/**
 * Ad Monetization Types
 * 
 * Defines the types and interfaces for the ad system.
 */

// Ad placement locations in the app
export type AdPlacement = 
  | 'job-feed-banner'       // Top of job feed
  | 'job-feed-in-feed'      // Between job listings (every N jobs)
  | 'profile-sidebar'       // Sidebar on profile pages
  | 'search-results'        // Between search results
  | 'messages-sidebar'      // Sidebar in messages view
  | 'dashboard-footer';     // Footer area of dashboard

// Ad sizes following IAB standards
export type AdSize = 
  | 'leaderboard'           // 728x90
  | 'mobile-leaderboard'    // 320x50
  | 'medium-rectangle'      // 300x250
  | 'wide-skyscraper'       // 160x600
  | 'large-rectangle'       // 336x280
  | 'responsive';           // Auto-sizes

// Ad size configurations
export const AD_SIZE_DIMENSIONS: Record<AdSize, { width: number; height: number } | null> = {
  'leaderboard': { width: 728, height: 90 },
  'mobile-leaderboard': { width: 320, height: 50 },
  'medium-rectangle': { width: 300, height: 250 },
  'wide-skyscraper': { width: 160, height: 600 },
  'large-rectangle': { width: 336, height: 280 },
  'responsive': null, // Auto-sizes
};

// Recommended placements for each ad size
export const PLACEMENT_SIZES: Record<AdPlacement, { desktop: AdSize; mobile: AdSize }> = {
  'job-feed-banner': { desktop: 'leaderboard', mobile: 'mobile-leaderboard' },
  'job-feed-in-feed': { desktop: 'medium-rectangle', mobile: 'medium-rectangle' },
  'profile-sidebar': { desktop: 'wide-skyscraper', mobile: 'medium-rectangle' },
  'search-results': { desktop: 'medium-rectangle', mobile: 'medium-rectangle' },
  'messages-sidebar': { desktop: 'medium-rectangle', mobile: 'medium-rectangle' },
  'dashboard-footer': { desktop: 'leaderboard', mobile: 'mobile-leaderboard' },
};

// Ad provider configuration
export type AdProvider = 'adsense' | 'custom' | 'none';

export interface AdConfig {
  provider: AdProvider;
  enabled: boolean;
  // Google AdSense specific
  adsenseClientId?: string;  // ca-pub-XXXXXXX
  adsenseSlots?: Record<AdPlacement, string>;
  // Frequency settings
  inFeedFrequency: number;   // Show ad every N items
  // Categories to block
  blockedCategories?: string[];
}

// Ad impression tracking
export interface AdImpression {
  id: string;
  placement: AdPlacement;
  userId?: string;
  timestamp: Date;
  provider: AdProvider;
  clicked: boolean;
}

// Consent status for GDPR/CCPA
export interface AdConsentStatus {
  personalized: boolean;
  analytics: boolean;
  timestamp: Date;
  region?: 'eu' | 'california' | 'other';
}

