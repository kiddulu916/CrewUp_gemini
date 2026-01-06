'use client';

import Script from 'next/script';
import { adConfig } from '@/lib/ads/config';
import { getConsentStatus } from '@/lib/ads/consent';
import { useEffect, useState } from 'react';

/**
 * AdScripts Component
 * 
 * Loads the necessary ad scripts (Google AdSense) with proper consent handling.
 * Should be included once in the root layout.
 */
export function AdScripts() {
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check consent status on mount
    const consent = getConsentStatus();
    setHasConsent(consent?.personalized ?? false);
    setConsentChecked(true);
  }, []);

  // Don't load scripts if ads are disabled
  if (!adConfig.enabled) return null;

  // Wait for consent check
  if (!consentChecked) return null;

  // Only load AdSense
  if (adConfig.provider !== 'adsense') return null;

  // Check for client ID
  if (!adConfig.adsenseClientId) {
    console.warn('[AdScripts] AdSense client ID not configured');
    return null;
  }

  return (
    <>
      {/* Google Consent Mode v2 - Initialize before loading ads */}
      <Script id="google-consent-init" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          
          // Set default consent state (denied until user consents)
          gtag('consent', 'default', {
            'ad_storage': '${hasConsent ? 'granted' : 'denied'}',
            'ad_user_data': '${hasConsent ? 'granted' : 'denied'}',
            'ad_personalization': '${hasConsent ? 'granted' : 'denied'}',
            'analytics_storage': '${hasConsent ? 'granted' : 'denied'}',
            'wait_for_update': 500,
          });
        `}
      </Script>

      {/* Google AdSense Script */}
      <Script
        id="google-adsense"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adConfig.adsenseClientId}`}
        crossOrigin="anonymous"
        strategy="lazyOnload"
        onError={(e) => {
          console.error('[AdScripts] Failed to load AdSense:', e);
        }}
      />
    </>
  );
}

