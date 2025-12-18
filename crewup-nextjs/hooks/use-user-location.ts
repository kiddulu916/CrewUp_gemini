'use client';

import { useState, useEffect } from 'react';

export type UserLocation = {
  lat: number;
  lng: number;
};

export type LocationState = {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook to get user's current geolocation
 * Falls back to Chicago coordinates if permission denied or unavailable
 */
export function useUserLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState({
        location: { lat: 41.8781, lng: -87.6298 }, // Chicago fallback
        loading: false,
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setState({
          location: { lat: 41.8781, lng: -87.6298 }, // Chicago fallback
          loading: false,
          error: 'Unable to get your location. Using default location.',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return {
    ...state,
    requestLocation,
  };
}

/**
 * Auto-request location on mount
 */
export function useAutoUserLocation() {
  const locationState = useUserLocation();

  useEffect(() => {
    locationState.requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return locationState;
}
