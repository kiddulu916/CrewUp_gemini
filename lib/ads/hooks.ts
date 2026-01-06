'use client';

import { useEffect, useState } from 'react';
import { adConfig, shouldShowAds } from './config';
import { getConsentStatus, needsConsent } from './consent';
import type { AdConsentStatus } from './types';

/**
 * Hook to check if ads should be shown for current user
 */
export function useShowAds(subscriptionStatus?: string, isLifetimePro?: boolean) {
  return shouldShowAds(subscriptionStatus, isLifetimePro);
}

/**
 * Hook to get current consent status with reactivity
 */
export function useAdConsent() {
  const [consent, setConsent] = useState<AdConsentStatus | null>(null);
  const [needsPrompt, setNeedsPrompt] = useState(false);

  useEffect(() => {
    // Check consent on mount
    setConsent(getConsentStatus());
    setNeedsPrompt(needsConsent());

    // Listen for storage changes (consent updates)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'krewup_ad_consent') {
        setConsent(getConsentStatus());
        setNeedsPrompt(needsConsent());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    consent,
    needsPrompt,
    hasPersonalizedAds: consent?.personalized ?? false,
    hasAnalytics: consent?.analytics ?? false,
  };
}

/**
 * Hook to get ad configuration status
 */
export function useAdConfig() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Mark as ready after checking config
    setIsReady(adConfig.enabled);
  }, []);

  return {
    isReady,
    enabled: adConfig.enabled,
    provider: adConfig.provider,
    inFeedFrequency: adConfig.inFeedFrequency,
  };
}

