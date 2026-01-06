'use client';

import { AdUnit } from './ad-unit';
import { shouldShowAds, adConfig } from '@/lib/ads/config';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Sparkles, Star } from 'lucide-react';

interface FeedAdBannerProps {
  /** User's subscription status */
  subscriptionStatus?: string;
  /** Is user a lifetime Pro? */
  isLifetimePro?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FeedAdBanner Component
 * 
 * A full-width banner ad for the feed page.
 * Shows upgrade promo for free users when ads are disabled.
 */
export function FeedAdBanner({
  subscriptionStatus,
  isLifetimePro,
  className,
}: FeedAdBannerProps) {
  const showAds = shouldShowAds(subscriptionStatus, isLifetimePro);
  const isPro = subscriptionStatus === 'pro' || isLifetimePro;

  // Pro users don't see ads or promos
  if (isPro) return null;

  // If ads are disabled, show upgrade promo
  if (!adConfig.enabled) {
    return (
      <div
        className={cn(
          'feed-promo rounded-xl bg-gradient-to-r from-blue-50 via-white to-orange-50 p-6 border border-blue-100 shadow-sm',
          className
        )}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
              <Star className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Upgrade to Pro</h3>
              <p className="text-sm text-gray-600">
                Get premium features and boost your profile visibility
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-krewup-blue to-krewup-light-blue text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <Sparkles className="h-4 w-4" />
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'feed-ad-banner rounded-xl border border-gray-200 bg-white p-4 shadow-sm',
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
          <span>Go Pro to remove ads</span>
        </Link>
      </div>

      {/* Ad unit - responsive banner */}
      <div className="flex justify-center">
        <AdUnit
          placement="job-feed-banner"
          subscriptionStatus={subscriptionStatus}
          isLifetimePro={isLifetimePro}
        />
      </div>
    </div>
  );
}

