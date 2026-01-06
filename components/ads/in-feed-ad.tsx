'use client';

import { AdUnit } from './ad-unit';
import { shouldShowAds, adConfig } from '@/lib/ads/config';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

interface InFeedAdProps {
  /** User's subscription status */
  subscriptionStatus?: string;
  /** Is user a lifetime Pro? */
  isLifetimePro?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * InFeedAd Component
 * 
 * An ad unit designed to be placed between content items (e.g., job listings).
 * Includes a label and upgrade CTA.
 */
export function InFeedAd({
  subscriptionStatus,
  isLifetimePro,
  className,
}: InFeedAdProps) {
  const showAds = shouldShowAds(subscriptionStatus, isLifetimePro);

  if (!showAds || !adConfig.enabled) return null;

  return (
    <div
      className={cn(
        'in-feed-ad rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        className
      )}
    >
      {/* Ad label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Sponsored
        </span>
        <Link
          href="/pricing"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          <span>Remove ads</span>
        </Link>
      </div>

      {/* Ad unit */}
      <AdUnit
        placement="job-feed-in-feed"
        subscriptionStatus={subscriptionStatus}
        isLifetimePro={isLifetimePro}
        className="mx-auto"
      />
    </div>
  );
}

/**
 * Helper function to determine if an ad should be shown at a specific index
 * Returns true if an ad should appear after this item
 */
export function shouldShowInFeedAd(index: number, totalItems: number): boolean {
  if (!adConfig.enabled) return false;
  
  const frequency = adConfig.inFeedFrequency;
  
  // Show ad after every N items, but not after the last item
  return (index + 1) % frequency === 0 && index < totalItems - 1;
}

