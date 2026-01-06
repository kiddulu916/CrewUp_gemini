'use client';

import { useEffect, useRef, useState } from 'react';
import { adConfig, shouldShowAds, getAdSlotId } from '@/lib/ads/config';
import { AD_SIZE_DIMENSIONS, PLACEMENT_SIZES, type AdPlacement, type AdSize } from '@/lib/ads/types';
import { getConsentStatus } from '@/lib/ads/consent';
import { cn } from '@/lib/utils';

interface AdUnitProps {
  /** Placement location for the ad */
  placement: AdPlacement;
  /** User's subscription status */
  subscriptionStatus?: string;
  /** Is user a lifetime Pro? */
  isLifetimePro?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Force a specific size (overrides responsive) */
  forceSize?: AdSize;
}

/**
 * AdUnit Component
 * 
 * Displays an ad unit that:
 * - Respects Pro subscription (no ads for Pro users)
 * - Handles consent management
 * - Supports multiple ad providers
 * - Is responsive based on screen size
 */
export function AdUnit({
  placement,
  subscriptionStatus,
  isLifetimePro,
  className,
  forceSize,
}: AdUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Determine if we should show ads
  const showAds = shouldShowAds(subscriptionStatus, isLifetimePro);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load ad when component mounts
  useEffect(() => {
    if (!showAds) return;
    if (!adConfig.enabled) return;

    const consent = getConsentStatus();
    const slotId = getAdSlotId(placement);

    if (!slotId) {
      console.warn(`[AdUnit] No slot ID configured for placement: ${placement}`);
      return;
    }

    // Load Google AdSense
    if (adConfig.provider === 'adsense') {
      try {
        // Push ad to AdSense
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setIsLoaded(true);
      } catch (error) {
        console.error('[AdUnit] Failed to load ad:', error);
      }
    }
  }, [showAds, placement]);

  // Don't render anything for Pro users
  if (!showAds) return null;

  // Don't render if ads are disabled
  if (!adConfig.enabled) return null;

  const slotId = getAdSlotId(placement);
  if (!slotId) return null;

  // Determine ad size
  const sizeKey = forceSize || (isMobile 
    ? PLACEMENT_SIZES[placement].mobile 
    : PLACEMENT_SIZES[placement].desktop);
  const dimensions = AD_SIZE_DIMENSIONS[sizeKey];

  return (
    <div
      ref={adRef}
      className={cn(
        'ad-unit overflow-hidden bg-gray-100 rounded-lg flex items-center justify-center',
        !isLoaded && 'animate-pulse',
        className
      )}
      style={dimensions ? { 
        width: dimensions.width, 
        height: dimensions.height,
        maxWidth: '100%',
      } : undefined}
      data-ad-placement={placement}
    >
      {adConfig.provider === 'adsense' && (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={adConfig.adsenseClientId}
          data-ad-slot={slotId}
          data-ad-format={sizeKey === 'responsive' ? 'auto' : undefined}
          data-full-width-responsive={sizeKey === 'responsive' ? 'true' : undefined}
        />
      )}
      
      {/* Fallback/Loading state */}
      {!isLoaded && (
        <div className="text-xs text-gray-400">
          Advertisement
        </div>
      )}
    </div>
  );
}

/**
 * AdPlaceholder Component
 * 
 * Shows a placeholder with upgrade CTA instead of actual ad.
 * Used when Pro user would see an ad, to remind them of the benefit.
 */
export function AdPlaceholder({
  placement,
  className,
}: {
  placement: AdPlacement;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'ad-placeholder rounded-lg bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-100',
        'flex items-center justify-center p-4 text-center',
        className
      )}
      data-ad-placement={`${placement}-placeholder`}
    >
      <div className="text-sm">
        <span className="text-gray-600">🎉 Ad-free experience</span>
        <p className="text-xs text-gray-500 mt-1">
          Thanks for being a Pro member!
        </p>
      </div>
    </div>
  );
}

