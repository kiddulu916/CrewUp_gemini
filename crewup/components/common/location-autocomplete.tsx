'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui';

// Load Google Maps API dynamically
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google?.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
}

type LocationData = {
  address: string;
  coords: {
    lat: number;
    lng: number;
  } | null;
};

type Props = {
  label?: string;
  value: string;
  onChange: (data: LocationData) => void;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
};

export function LocationAutocomplete({
  label = 'Location',
  value,
  onChange,
  helperText,
  required = false,
  placeholder = 'Chicago, IL',
}: Props) {
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.warn('Google Maps API key not configured');
      return;
    }

    if (!inputRef.current) return;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!inputRef.current) return;

        // Initialize autocomplete
        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['(cities)'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'geometry', 'address_components'],
          }
        );

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();

          if (place?.formatted_address && place?.geometry?.location) {
            const locationData: LocationData = {
              address: place.formatted_address,
              coords: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
            };

            setInputValue(place.formatted_address);
            onChange(locationData);
          }
        });
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
      });

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange]);

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    // Check if Google Maps is loaded
    if (typeof window === 'undefined' || !window.google?.maps) {
      alert('Maps service is still loading. Please try again in a moment.');
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Double check Google Maps is still available
          if (!window.google?.maps?.Geocoder) {
            throw new Error('Maps service not available');
          }

          // Reverse geocode to get address
          const geocoder = new google.maps.Geocoder();
          const response = await geocoder.geocode({
            location: { lat: latitude, lng: longitude },
          });

          if (response.results[0]) {
            const address = response.results[0].formatted_address;
            const locationData: LocationData = {
              address,
              coords: { lat: latitude, lng: longitude },
            };

            setInputValue(address);
            onChange(locationData);
          } else {
            alert('Could not determine address from your location');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          alert('Failed to get address from location. Please try typing it manually.');
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get your location. ';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage += 'Please grant location permission and try again.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage += 'Location request timed out. Please try again.';
        } else {
          errorMessage += 'Please enter your location manually.';
        }
        alert(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Increased from 5s to 10s
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        label={label}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          // Only update parent if manually cleared
          if (e.target.value === '') {
            onChange({ address: '', coords: null });
          }
        }}
        helperText={helperText}
        required={required}
      />

      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={isLoading}
        className="text-sm text-crewup-blue hover:text-crewup-orange font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '📍 Getting location...' : '📍 Use my current location'}
      </button>
    </div>
  );
}
