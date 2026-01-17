/**
 * Barcode Scanner Field Component
 * Allows users to scan barcodes using device camera
 */

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Scan, X, CheckCircle2 } from 'lucide-react';
import type { FieldDefinition } from '@/types/fields';
import { useDirection } from '@/i18n';

interface BarcodeScannerFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Sanitizes a field ID for use in HTML element IDs
 * HTML IDs must start with a letter and only contain letters, digits, hyphens, underscores, and periods
 */
function sanitizeHtmlId(id: string): string {
  // Replace any invalid characters with hyphens
  let sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '-');

  // Ensure it starts with a letter
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = 'field-' + sanitized;
  }

  return sanitized;
}

export function BarcodeScannerField({ field, value, onChange }: BarcodeScannerFieldProps) {
  const direction = useDirection();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = useRef(`barcode-scanner-${sanitizeHtmlId(field.id)}`);

  useEffect(() => {
    return () => {
      // Cleanup: stop scanner when component unmounts
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        const state = scanner.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          scanner.stop().catch((err) => {
            console.error('Error stopping barcode scanner:', err);
          });
        }
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerDivId.current);
      }

      const scanner = scannerRef.current;

      // Configure for barcode formats only (exclude QR codes)
      const barcodeFormats = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR,
      ];

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera on mobile
        {
          fps: 10, // Frames per second for scanning
          qrbox: { width: 300, height: 150 }, // Wider box for barcodes
          formatsToSupport: barcodeFormats,
        },
        (decodedText) => {
          // Success callback - barcode scanned
          onChange(decodedText);
          stopScanning();
        },
        () => {
          // Error callback - ignore (fires continuously while scanning)
          // Only actual errors (permissions, etc.) are thrown by start()
        },
      );
    } catch (err: unknown) {
      console.error('Error starting barcode scanner:', err);
      setIsScanning(false);

      const error = err as Error;
      if (error.message?.includes('NotAllowed') || error.name === 'NotAllowedError') {
        setError(direction === 'rtl' ? 'גישה למצלמה נדחתה. אנא אפשר גישה למצלמה בהגדרות הדפדפן.' : 'Camera access denied. Please enable camera access in browser settings.');
      } else {
        setError(direction === 'rtl' ? 'שגיאה בהפעלת הסורק. נסה שוב.' : 'Error starting scanner. Please try again.');
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleClear = () => {
    onChange('');
    setError(null);
  };

  return (
    <div dir={direction} className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-foreground">
        {field.label || field.name}
        {field.required && <span className="text-destructive mr-1">*</span>}
      </label>

      {/* Scanner container */}
      {isScanning && (
        <div className="relative rounded-lg overflow-hidden border-2 border-primary bg-black">
          <div id={scannerDivId.current} className="w-full" />
          <button
            type="button"
            onClick={stopScanning}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-2 hover:bg-destructive/90 transition-colors z-10"
            aria-label={direction === 'rtl' ? 'עצור סריקה' : 'Stop scanning'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scan button or scanned value display */}
      {!isScanning && (
        <>
          {value ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-all font-mono">{value}</p>
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
          ) : (
            <button
              type="button"
              onClick={startScanning}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Scan className="w-5 h-5" />
              {direction === 'rtl' ? 'התחל סריקה' : 'Start Scanning'}
            </button>
          )}
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2">
          {error}
        </div>
      )}

      {/* Help text */}
      {!value && !isScanning && !error && (
        <p className="text-xs text-muted-foreground">
          {direction === 'rtl'
            ? 'לחץ על הכפתור כדי לסרוק ברקוד באמצעות המצלמה'
            : 'Click the button to scan a barcode using your camera'}
        </p>
      )}
    </div>
  );
}
