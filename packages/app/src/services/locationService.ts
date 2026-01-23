/**
 * Location Service
 * Handles geolocation capture with error handling and timeout
 */

export interface GeolocationData {
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Accuracy in meters */
  accuracy: number;
  /** Altitude in meters (if available) */
  altitude?: number | null;
  /** Altitude accuracy in meters (if available) */
  altitudeAccuracy?: number | null;
  /** Heading in degrees (if available) */
  heading?: number | null;
  /** Speed in m/s (if available) */
  speed?: number | null;
  /** Timestamp of capture */
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * Location Service - Capture geolocation data
 */
class LocationService {
  private watchId: number | null = null;

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Check permission status (if Permissions API is available)
   */
  async checkPermissionStatus(): Promise<LocationPermissionStatus> {
    if (!this.isSupported()) {
      return 'unsupported';
    }

    // Check if Permissions API is available
    if (!('permissions' in navigator)) {
      // Fallback: can't check, assume prompt
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state as LocationPermissionStatus;
    } catch (err) {
      console.warn('[LocationService] Failed to check permission status:', err);
      return 'prompt';
    }
  }

  /**
   * Get current location (one-time)
   */
  async getCurrentLocation(options: {
    timeout?: number;
    maximumAge?: number;
    enableHighAccuracy?: boolean;
  } = {}): Promise<GeolocationData> {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const {
      timeout = 10000, // 10 seconds
      maximumAge = 0, // Don't use cached position
      enableHighAccuracy = true, // Use GPS for better accuracy
    } = options;

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };

          console.log('[LocationService] Location captured:', {
            lat: data.latitude,
            lon: data.longitude,
            accuracy: `${data.accuracy.toFixed(0)}m`,
          });

          resolve(data);
        },
        (error) => {
          const locationError = this.handleGeolocationError(error);
          reject(locationError);
        },
        {
          timeout,
          maximumAge,
          enableHighAccuracy,
        },
      );
    });
  }

  /**
   * Watch location (continuous updates)
   */
  watchLocation(
    onSuccess: (location: GeolocationData) => void,
    onError: (error: LocationError) => void,
    options: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    } = {},
  ): number {
    if (!this.isSupported()) {
      onError({
        code: 0,
        message: 'Geolocation is not supported',
      });
      return -1;
    }

    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 0,
    } = options;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const data: GeolocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };

        onSuccess(data);
      },
      (error) => {
        const locationError = this.handleGeolocationError(error);
        onError(locationError);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      },
    );

    return this.watchId;
  }

  /**
   * Stop watching location
   */
  clearWatch(watchId?: number): void {
    const id = watchId || this.watchId;
    if (id !== null && this.isSupported()) {
      navigator.geolocation.clearWatch(id);
      if (id === this.watchId) {
        this.watchId = null;
      }
    }
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(data: GeolocationData, precision: number = 6): string {
    return `${data.latitude.toFixed(precision)}, ${data.longitude.toFixed(precision)}`;
  }

  /**
   * Generate Google Maps URL
   */
  getGoogleMapsUrl(data: GeolocationData): string {
    return `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;
  }

  /**
   * Generate Waze URL
   */
  getWazeUrl(data: GeolocationData): string {
    return `https://waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes`;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Handle geolocation errors
   */
  private handleGeolocationError(error: GeolocationPositionError): LocationError {
    const messages: Record<number, string> = {
      1: 'Location permission denied. Please enable location access in your browser settings.',
      2: 'Location unavailable. Please check your device settings and try again.',
      3: 'Location request timed out. Please try again.',
    };

    const message = messages[error.code] || 'Failed to get location';

    console.error('[LocationService] Error:', {
      code: error.code,
      message: error.message,
    });

    return {
      code: error.code,
      message,
    };
  }
}

// Export singleton instance
export const locationService = new LocationService();
