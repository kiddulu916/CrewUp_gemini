/**
 * Ad Monetization Module
 * 
 * Central export for all ad-related functionality.
 */

// Types
export * from './types';

// Configuration
export { adConfig, shouldShowAds, getAdSlotId } from './config';

// Consent management
export {
  getConsentStatus,
  saveConsentStatus,
  needsConsent,
  detectRegion,
  acceptAllConsent,
  acceptNecessaryConsent,
  revokeConsent,
} from './consent';

// Hooks (client-side)
export { useShowAds, useAdConsent, useAdConfig } from './hooks';

// Tracking (server-side)
export { trackAdImpression, trackAdClick, getAdMetrics } from './tracking';

