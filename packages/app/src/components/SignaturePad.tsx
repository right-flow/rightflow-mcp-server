/**
 * Signature Pad Component
 * Full-screen signature capture interface with smooth Bézier curves
 */

import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, RotateCcw, Check } from 'lucide-react';
import { db } from '@/db/indexedDB';
import { v4 as uuid } from 'uuid';

interface SignaturePadProps {
  /** Callback when signature is captured */
  onCapture: (signatureId: string) => void;
  /** Callback when signature pad is closed */
  onClose: () => void;
  /** Initial signature data (base64 or signature ID) */
  initialSignature?: string;
}

/**
 * Full-screen signature pad component
 * Captures signatures using canvas with smooth Bézier curves
 *
 * @example
 * ```tsx
 * const [showSignaturePad, setShowSignaturePad] = useState(false);
 *
 * <SignaturePad
 *   onCapture={(signatureId) => {
 *     setSignature(signatureId);
 *     setShowSignaturePad(false);
 *   }}
 *   onClose={() => setShowSignaturePad(false)}
 * />
 * ```
 */
export function SignaturePad({
  onCapture,
  onClose,
  initialSignature,
}: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  // Detect orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const landscape = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscape(landscape);

      // Resize canvas on orientation change
      setTimeout(() => {
        resizeCanvas();
      }, 100);
    };

    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Resize canvas to fit container
  useEffect(() => {
    resizeCanvas();
  }, []);

  // Load initial signature if provided
  useEffect(() => {
    if (initialSignature && sigPadRef.current) {
      loadInitialSignature();
    }
  }, [initialSignature]);

  /**
   * Load initial signature from base64 or IndexedDB
   */
  const loadInitialSignature = async () => {
    if (!initialSignature || !sigPadRef.current) return;

    try {
      // Check if it's a UUID (signature ID)
      if (initialSignature.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Load from IndexedDB
        const asset = await db.getAsset(initialSignature);
        if (asset && asset.type === 'signature') {
          const dataURL = URL.createObjectURL(asset.blob);
          sigPadRef.current.fromDataURL(dataURL);
          URL.revokeObjectURL(dataURL);
          setIsEmpty(false);
        }
      } else if (initialSignature.startsWith('data:image')) {
        // Load from base64 data URL
        sigPadRef.current.fromDataURL(initialSignature);
        setIsEmpty(false);
      }
    } catch (err) {
      console.error('[SignaturePad] Failed to load initial signature:', err);
    }
  };

  /**
   * Resize canvas to match container dimensions
   */
  const resizeCanvas = () => {
    if (!sigPadRef.current || !containerRef.current) return;

    const canvas = sigPadRef.current.getCanvas();
    const container = containerRef.current;

    // Get container dimensions
    const rect = container.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    // Set canvas size
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Scale context for high DPI
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    // Clear and redraw
    sigPadRef.current.clear();
    if (initialSignature) {
      loadInitialSignature();
    }
  };

  /**
   * Handle signature start (begin drawing)
   */
  const handleBegin = () => {
    setError(null);
  };

  /**
   * Handle signature end (stop drawing)
   */
  const handleEnd = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setIsEmpty(false);
    }
  };

  /**
   * Clear the signature pad
   */
  const handleClear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setIsEmpty(true);
      setError(null);
    }
  };

  /**
   * Save signature to IndexedDB
   */
  const handleSave = async () => {
    if (!sigPadRef.current || isEmpty) {
      setError('אנא חתום לפני השמירה');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Get signature as data URL
      const dataURL = sigPadRef.current.toDataURL('image/png');

      // Convert to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      // Save to IndexedDB
      const signatureId = uuid();
      await db.saveAsset({
        id: signatureId,
        type: 'signature',
        blob: blob,
        mimeType: 'image/png',
        size: blob.size,
        createdAt: new Date(),
        syncStatus: 'local',
      });

      console.log(`[SignaturePad] Signature saved: ${signatureId} (${blob.size} bytes)`);

      // Callback with signature ID
      onCapture(signatureId);
    } catch (err) {
      console.error('[SignaturePad] Failed to save signature:', err);
      setError('שגיאה בשמירת החתימה. נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Close signature pad
   */
  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-transform"
          aria-label="סגור"
        >
          <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          חתימה
        </h2>

        <button
          onClick={handleClear}
          disabled={isEmpty}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="נקה"
        >
          <RotateCcw className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Signature Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 relative bg-gray-50 dark:bg-gray-950 ${
          isLandscape ? 'landscape-mode' : ''
        }`}
      >
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            className: 'w-full h-full cursor-crosshair',
          }}
          onBegin={handleBegin}
          onEnd={handleEnd}
          penColor="rgb(0, 0, 0)"
          backgroundColor="rgb(255, 255, 255)"
          minWidth={1}
          maxWidth={3}
          velocityFilterWeight={0.7}
          dotSize={1}
        />

        {/* Guide Text (only when empty) */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-gray-400 dark:text-gray-600 text-lg">
                חתום כאן
              </p>
              <p className="text-gray-300 dark:text-gray-700 text-sm mt-2">
                {isLandscape ? 'סובב למצב לאורך לחתימה טובה יותר' : 'השתמש באצבע או בעט'}
              </p>
            </div>
          </div>
        )}

        {/* Orientation hint */}
        {!isLandscape && (
          <div className="absolute top-4 left-4 right-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
            💡 לחתימה נוחה יותר, סובב את המכשיר למצב לאורך (landscape)
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 text-center">
            {error}
          </p>
        </div>
      )}

      {/* Footer - Save Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button
          onClick={handleSave}
          disabled={isEmpty || saving}
          className={`
            w-full flex items-center justify-center gap-2
            px-6 py-4 rounded-lg font-medium
            transition-all
            ${
              isEmpty || saving
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'
            }
          `}
          aria-label="שמור חתימה"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>שומר...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>שמור חתימה</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
