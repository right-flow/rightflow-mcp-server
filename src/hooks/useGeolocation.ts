/**
 * Custom hook for getting device geolocation
 */

import { useState } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface UseGeolocationReturn {
  isLoading: boolean;
  location: LocationData | null;
  error: string | null;
  getCurrentLocation: () => Promise<void>;
  clearLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
            setIsLoading(false);
            resolve();
          },
          (err) => {
            setIsLoading(false);

            // GeolocationPositionError codes
            switch (err.code) {
              case 1: // PERMISSION_DENIED
                setError('Location access denied. Please enable location permissions.');
                break;
              case 2: // POSITION_UNAVAILABLE
                setError('Unable to determine location. Please try again.');
                break;
              case 3: // TIMEOUT
                setError('Location request timed out. Please try again.');
                break;
              default:
                setError('An error occurred while retrieving location.');
                break;
            }
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
        );
      });
    } catch (err) {
      // Error already handled in geolocation callback
    }
  };

  const clearLocation = () => {
    setLocation(null);
    setError(null);
  };

  return {
    isLoading,
    location,
    error,
    getCurrentLocation,
    clearLocation,
  };
}
