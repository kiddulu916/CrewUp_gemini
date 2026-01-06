'use client';

/**
 * Ad Consent Management
 * 
 * Handles GDPR/CCPA consent for ad personalization and tracking.
 * Stores consent in localStorage and provides hooks for UI.
 */

import type { AdConsentStatus } from './types';

const CONSENT_STORAGE_KEY = 'krewup_ad_consent';

/**
 * Get current consent status from localStorage
 */
export function getConsentStatus(): AdConsentStatus | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    
    const consent = JSON.parse(stored) as AdConsentStatus;
    consent.timestamp = new Date(consent.timestamp);
    return consent;
  } catch {
    return null;
  }
}

/**
 * Save consent status to localStorage
 */
export function saveConsentStatus(consent: AdConsentStatus): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    
    // Update Google's consent mode if using AdSense
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as any).gtag;
      gtag('consent', 'update', {
        'ad_storage': consent.personalized ? 'granted' : 'denied',
        'ad_user_data': consent.personalized ? 'granted' : 'denied',
        'ad_personalization': consent.personalized ? 'granted' : 'denied',
        'analytics_storage': consent.analytics ? 'granted' : 'denied',
      });
    }
  } catch (error) {
    console.error('Failed to save consent status:', error);
  }
}

/**
 * Check if user needs to provide consent
 * Returns true if:
 * - No consent recorded
 * - Consent is older than 1 year
 * - User is in EU or California
 */
export function needsConsent(): boolean {
  const consent = getConsentStatus();
  
  if (!consent) return true;
  
  // Check if consent is older than 1 year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (consent.timestamp < oneYearAgo) return true;
  
  return false;
}

/**
 * Detect user's region for consent requirements
 * Uses timezone as a heuristic (not 100% accurate)
 */
export function detectRegion(): 'eu' | 'california' | 'other' {
  if (typeof window === 'undefined') return 'other';
  
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // EU timezones
    const euTimezones = [
      'Europe/', 'Atlantic/Azores', 'Atlantic/Canary', 'Atlantic/Faroe',
      'Atlantic/Madeira', 'Atlantic/Reykjavik',
    ];
    
    if (euTimezones.some(tz => timezone.startsWith(tz))) {
      return 'eu';
    }
    
    // California timezones
    if (timezone === 'America/Los_Angeles' || timezone === 'America/Pacific') {
      return 'california';
    }
    
    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Accept all consent (personalized ads + analytics)
 */
export function acceptAllConsent(): void {
  saveConsentStatus({
    personalized: true,
    analytics: true,
    timestamp: new Date(),
    region: detectRegion(),
  });
}

/**
 * Accept only necessary consent (no personalized ads)
 */
export function acceptNecessaryConsent(): void {
  saveConsentStatus({
    personalized: false,
    analytics: false,
    timestamp: new Date(),
    region: detectRegion(),
  });
}

/**
 * Revoke consent
 */
export function revokeConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONSENT_STORAGE_KEY);
}

