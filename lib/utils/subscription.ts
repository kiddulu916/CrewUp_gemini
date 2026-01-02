import { Profile } from '@/lib/types/profile.types';

/**
 * Check if a profile has Pro access (either paid subscription or lifetime Pro)
 */
export function hasProAccess(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.is_lifetime_pro) return true;
  return profile.subscription_status === 'pro';
}

/**
 * Check if a profile has lifetime Pro status
 */
export function isLifetimePro(profile: Profile | null): boolean {
  return profile?.is_lifetime_pro || false;
}

/**
 * Get subscription badge information for display
 */
export function getSubscriptionBadge(profile: Profile | null): {
  label: string;
  variant: 'free' | 'pro' | 'lifetime';
} | null {
  if (!profile) return null;

  if (profile.is_lifetime_pro) {
    return {
      label: 'Founding Member',
      variant: 'lifetime'
    };
  }

  if (profile.subscription_status === 'pro') {
    return {
      label: 'Pro',
      variant: 'pro'
    };
  }

  return {
    label: 'Free',
    variant: 'free'
  };
}
