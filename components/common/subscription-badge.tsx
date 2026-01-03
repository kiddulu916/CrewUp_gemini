'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { Profile } from '@/lib/types/profile.types';
import { getSubscriptionBadge } from '@/lib/utils/subscription';

type Props = {
  profile: Profile | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function SubscriptionBadge({ profile, className = '', size = 'md' }: Props) {
  const badge = getSubscriptionBadge(profile);

  if (!badge) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const variantConfig = {
    lifetime: {
      className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      showIcon: true,
    },
    pro: {
      className: 'bg-blue-600 text-white',
      showIcon: false,
    },
    free: {
      className: 'bg-gray-200 text-gray-700',
      showIcon: false,
    },
  };

  const config = variantConfig[badge.variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${config.className} ${sizeClasses[size]} ${className}`}
    >
      {config.showIcon && (
        <Star className={`fill-current ${iconSizeClasses[size]}`} />
      )}
      <span>{badge.label}</span>
    </span>
  );
}
