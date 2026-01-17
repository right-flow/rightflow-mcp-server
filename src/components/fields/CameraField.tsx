/**
 * Camera Field Component
 * Allows users to capture photos using device camera
 */

import { useRef, useEffect } from 'react';
import { Camera, CheckCircle2 } from 'lucide-react';
import type { FieldDefinition } from '@/types/fields';
import { useDirection } from '@/i18n';
import { useCameraCapture } from '@/hooks/useCameraCapture';

interface CameraFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
}

export function CameraField({ field, value, onChange }: CameraFieldProps) {
  const direction = useDirection();
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    isCapturing,
    image,
    error,
    stream,
    startCapture,
    stopCapture,
    captureImage,
    clearImage,
  } = useCameraCapture();

  // Set video source when stream is available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleStartCamera = async () => {
    await startCapture();
  };

  const handleCapture = () => {
    if (videoRef.current) {
      captureImage(videoRef.current);
      stopCapture();
    }
  };

  // When image is captured, call onChange
  useEffect(() => {
    if (image) {
      onChange(image);
    }
  }, [image, onChange]);

  const handleRetake = () => {
    clearImage();
    onChange('');
  };

  const handleCancel = () => {
    stopCapture();
  };

  return (
    <div dir={direction} className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-foreground">
        {field.label || field.name}
        {field.required && <span className="text-destructive mr-1">*</span>}
      </label>

      {/* Camera preview (while capturing) */}
      {isCapturing && !image && (
        <div className="relative rounded-lg overflow-hidden border-2 border-primary bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
            style={{ maxHeight: '400px' }}
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleCapture}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              {direction === 'rtl' ? 'צלם' : 'Capture'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium"
            >
              {direction === 'rtl' ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Captured image display */}
      {(image || value) && !isCapturing && (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border-2 border-green-600 bg-black">
            <img
              src={image || value}
              alt={direction === 'rtl' ? 'תמונה שצולמה' : 'Captured photo'}
              className="w-full h-auto"
              style={{ maxHeight: '400px', objectFit: 'contain' }}
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
            <Camera className="w-5 h-5" />
            {direction === 'rtl' ? 'צלם שוב' : 'Retake Photo'}
          </button>
        </div>
      )}

      {/* Camera button (when not capturing and no image) */}
      {!isCapturing && !image && !value && (
        <button
          type="button"
          onClick={handleStartCamera}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Camera className="w-5 h-5" />
          {direction === 'rtl' ? 'פתח מצלמה' : 'Open Camera'}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2">
          {error}
        </div>
      )}

      {/* Help text */}
      {!value && !image && !isCapturing && !error && (
        <p className="text-xs text-muted-foreground">
          {direction === 'rtl'
            ? 'לחץ על הכפתור כדי לצלם תמונה באמצעות המצלמה'
            : 'Click the button to capture a photo using your camera'}
        </p>
      )}
    </div>
  );
}
