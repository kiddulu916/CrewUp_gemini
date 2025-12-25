// features/subscriptions/hooks/use-track-profile-view.ts
'use client';

import { useEffect, useRef } from 'react';
import { trackProfileView } from '../actions/profile-views-actions';

/**
 * Hook to automatically track profile views
 * Call this in profile detail pages to record when someone views a profile
 *
 * @param profileId - The ID of the profile being viewed
 * @param enabled - Whether to track the view (default: true)
 */
export function useTrackProfileView(profileId: string | null | undefined, enabled = true) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!profileId || !enabled || hasTracked.current) {
      return;
    }

    // Track the view
    trackProfileView(profileId).catch((error) => {
      console.error('Failed to track profile view:', error);
    });

    // Mark as tracked to prevent duplicate tracking in dev mode (strict mode)
    hasTracked.current = true;
  }, [profileId, enabled]);
}
