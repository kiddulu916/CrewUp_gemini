'use client';

import { AdUnit } from './ad-unit';
import { shouldShowAds, adConfig } from '@/lib/ads/config';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Sparkles, Star } from 'lucide-react';

interface SidebarAdProps {
  /** User's subscription status */
  subscriptionStatus?: string;
  /** Is user a lifetime Pro? */
  isLifetimePro?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SidebarAd Component
 * 
 * A sidebar ad unit with upgrade promotion.
 * Shows ads for free users, upgrade CTA for potential upgrades.
 */
export function SidebarAd({
  subscriptionStatus,
  isLifetimePro,
  className,
}: SidebarAdProps) {
  const showAds = shouldShowAds(subscriptionStatus, isLifetimePro);
  const isPro = subscriptionStatus === 'pro' || isLifetimePro;

  // If Pro user, don't show anything (or show thank you message)
  if (isPro) {
    return null;
  }

  // If ads are disabled, show upgrade promo instead
  if (!adConfig.enabled) {
    return (
      <div
        className={cn(
          'sidebar-promo rounded-lg bg-gradient-to-br from-blue-50 to-orange-50 p-4 border border-blue-100',
          className
        )}
      >
        <div className="text-center">
          <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900">Upgrade to Pro</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get premium features and an ad-free experience.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-krewup-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
        'sidebar-ad rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        className
      )}
    >
      {/* Ad label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Advertisement
        </span>
      </div>

      {/* Ad unit */}
      <AdUnit
        placement="profile-sidebar"
        subscriptionStatus={subscriptionStatus}
        isLifetimePro={isLifetimePro}
      />

      {/* Upgrade CTA */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <Link
          href="/pricing"
          className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          <span>Go Pro to remove ads</span>
        </Link>
      </div>
    </div>
  );
}

