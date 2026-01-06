'use client';

import { useEffect, useState } from 'react';
import { updateProfileLocation } from '@/features/profiles/actions/profile-actions';

/**
 * Component that captures user's location on first dashboard visit
 * Only runs once after onboarding completion
 */
export function InitialLocationCapture() {
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    // Only run once
    if (hasRequested) return;

    // Check if we've already captured initial location
    const locationCaptured = localStorage.getItem('initial_location_captured');
    if (locationCaptured) return;

    // Request location permission
    if ('geolocation' in navigator) {
      setHasRequested(true);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Update profile with location
            const result = await updateProfileLocation({
              coords: {
                lat: latitude,
                lng: longitude,
              },
              location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            });

            if (result.success) {
              // Mark as captured so we don't ask again
              localStorage.setItem('initial_location_captured', 'true');
              console.log('Initial location saved successfully');
            } else {
              console.error('Failed to save initial location:', result.error);
            }
          } catch (error) {
            console.error('Failed to save initial location:', error);
          }
        },
        (error) => {
          // User denied or error occurred
          console.log('Location permission denied or error:', error);
          // Still mark as captured so we don't keep asking
          localStorage.setItem('initial_location_captured', 'true');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, [hasRequested]);

  // This component doesn't render anything
  return null;
}
