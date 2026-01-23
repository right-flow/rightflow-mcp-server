/**
 * Signature Field Component (for form filling)
 * Allows users to sign using a fullscreen signature pad
 * Uses IndexedDB for offline storage
 */

import { useState, useEffect } from 'react';
import { PenTool, CheckCircle2 } from 'lucide-react';
import type { FieldDefinition } from '@/types/fields';
import { useDirection } from '@/i18n';
import { SignaturePad } from '@/components/SignaturePad';
import { db } from '@/db/indexedDB';

interface SignatureFieldComponentProps {
  field: FieldDefinition;
  value: string; // Signature ID or empty string
  onChange: (value: string) => void;
}

/**
 * Signature Field - Capture and display signature
 * Full-screen signature pad with smooth drawing
 *
 * @example
 * ```tsx
 * <SignatureFieldComponent
 *   field={{ type: 'signature', name: 'signature', label: 'חתימה' }}
 *   value={signatureId}
 *   onChange={setSignatureId}
 * />
 * ```
 */
export function SignatureFieldComponent({
  field,
  value,
  onChange,
}: SignatureFieldComponentProps) {
  const direction = useDirection();
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load signature preview from IndexedDB when value changes
  useEffect(() => {
    if (value) {
      loadSignaturePreview();
    } else {
      setSignaturePreview(null);
    }
  }, [value]);

  /**
   * Load signature preview from IndexedDB
   */
  const loadSignaturePreview = async () => {
    if (!value) return;

    setLoading(true);
    try {
      // Check if it's a UUID (signature ID)
      if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Load from IndexedDB
        const asset = await db.getAsset(value);
        if (asset && asset.type === 'signature') {
          const dataURL = URL.createObjectURL(asset.blob);
          setSignaturePreview(dataURL);

          // Clean up object URL when component unmounts
          return () => URL.revokeObjectURL(dataURL);
        }
      } else if (value.startsWith('data:image')) {
        // Use base64 data URL directly
        setSignaturePreview(value);
      }
    } catch (err) {
      console.error('[SignatureFieldComponent] Failed to load signature:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = (signatureId: string) => {
    onChange(signatureId);
    setShowSignaturePad(false);
  };

  const handleRetake = () => {
    setShowSignaturePad(true);
  };

  const handleOpenSignaturePad = () => {
    setShowSignaturePad(true);
  };

  return (
    <div dir={direction} className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-foreground">
        {field.label || field.name}
        {field.required && <span className="text-destructive mr-1">*</span>}
      </label>

      {/* Signature Display (if signed) */}
      {signaturePreview && (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border-2 border-green-600 bg-white p-4">
            <img
              src={signaturePreview}
              alt={direction === 'rtl' ? 'חתימה' : 'Signature'}
              className="w-full h-32 object-contain"
            />
            <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetake}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <PenTool className="w-5 h-5" />
            {direction === 'rtl' ? 'חתום שוב' : 'Sign Again'}
          </button>
        </div>
      )}

      {/* Sign Button (when not signed) */}
      {!signaturePreview && !loading && (
        <button
          type="button"
          onClick={handleOpenSignaturePad}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PenTool className="w-5 h-5" />
          {direction === 'rtl' ? 'פתח לוח חתימה' : 'Open Signature Pad'}
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Help text */}
      {!signaturePreview && !loading && (
        <p className="text-xs text-muted-foreground">
          {direction === 'rtl'
            ? 'לחץ על הכפתור כדי לפתוח לוח חתימה במסך מלא'
            : 'Click the button to open a fullscreen signature pad'}
        </p>
      )}

      {/* Fullscreen Signature Pad */}
      {showSignaturePad && (
        <SignaturePad
          onCapture={handleCapture}
          onClose={() => setShowSignaturePad(false)}
          initialSignature={value}
        />
      )}
    </div>
  );
}
