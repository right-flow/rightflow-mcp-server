/**
 * GPS Location Field Component
 * Allows users to capture GPS coordinates
 */

import { useEffect } from 'react';
import { MapPin, X, CheckCircle2, Loader2 } from 'lucide-react';
import type { FieldDefinition } from '@/types/fields';
import { useDirection } from '@/i18n';
import { useGeolocation } from '@/hooks/useGeolocation';

interface GPSLocationFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
}

export function GPSLocationField({ field, value, onChange }: GPSLocationFieldProps) {
  const direction = useDirection();
  const { isLoading, location, error, getCurrentLocation, clearLocation } = useGeolocation();

  // When location is captured, format and call onChange
  useEffect(() => {
    if (location) {
      const locationString = `${location.latitude},${location.longitude}`;
      onChange(locationString);
    }
  }, [location, onChange]);

  const handleGetLocation = async () => {
    await getCurrentLocation();
  };

  const handleClear = () => {
    clearLocation();
    onChange('');
  };

  // Parse value if it exists
  const parsedLocation = value ? (() => {
    const parts = value.split(',');
    if (parts.length !== 2) return null;

    const lat = Number(parts[0]);
    const lng = Number(parts[1]);

    // Check if both are valid finite numbers
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { latitude: lat, longitude: lng };
  })() : null;

  const displayLocation = location || parsedLocation;

  return (
    <div dir={direction} className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-foreground">
        {field.label || field.name}
        {field.required && <span className="text-destructive mr-1">*</span>}
      </label>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-sm text-foreground">
            {direction === 'rtl' ? 'מאתר מיקום...' : 'Getting location...'}
          </span>
        </div>
      )}

      {/* Location display */}
      {!isLoading && displayLocation && (
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-muted border border-border">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {direction === 'rtl' ? 'מיקום נקלט' : 'Location captured'}
                </p>
                <div className="text-xs text-muted-foreground space-y-1 mt-1 font-mono">
                  <div>
                    {direction === 'rtl' ? 'קו רוחב' : 'Latitude'}: <span className="font-semibold">{displayLocation.latitude.toFixed(6)}</span>
                  </div>
                  <div>
                    {direction === 'rtl' ? 'קו אורך' : 'Longitude'}: <span className="font-semibold">{displayLocation.longitude.toFixed(6)}</span>
                  </div>
                  {location?.accuracy && (
                    <div>
                      {direction === 'rtl' ? 'דיוק' : 'Accuracy'}: <span className="font-semibold">±{Math.round(location.accuracy)}m</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label={direction === 'rtl' ? 'נקה' : 'Clear'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps?q=${displayLocation.latitude},${displayLocation.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <MapPin className="w-3 h-3" />
            {direction === 'rtl' ? 'פתח במפות Google' : 'Open in Google Maps'}
          </a>
        </div>
      )}

      {/* Get location button */}
      {!isLoading && !displayLocation && (
        <button
          type="button"
          onClick={handleGetLocation}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <MapPin className="w-5 h-5" />
          {direction === 'rtl' ? 'קבל מיקום' : 'Get Location'}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2">
          {error}
        </div>
      )}

      {/* Help text */}
      {!displayLocation && !isLoading && !error && (
        <p className="text-xs text-muted-foreground">
          {direction === 'rtl'
            ? 'לחץ על הכפתור כדי לקבל את המיקום הנוכחי שלך'
            : 'Click the button to get your current location'}
        </p>
      )}
    </div>
  );
}
