/**
 * Camera Component
 * Full-screen camera interface for capturing photos
 */

import { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, X, RotateCcw } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';
import { db } from '@/db/indexedDB';
import { v4 as uuid } from 'uuid';

interface CameraProps {
  /** Callback when photo is captured */
  onCapture: (photoId: string) => void;
  /** Callback when camera is closed */
  onClose: () => void;
}

/**
 * Full-screen camera component
 * Captures photos using MediaDevices API
 *
 * @example
 * ```tsx
 * const [showCamera, setShowCamera] = useState(false);
 *
 * <Camera
 *   onCapture={(photoId) => {
 *     setPhotos([...photos, photoId]);
 *     setShowCamera(false);
 *   }}
 *   onClose={() => setShowCamera(false)}
 * />
 * ```
 */
export function Camera({ onCapture, onClose }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  /**
   * Start camera stream
   */
  const startCamera = async () => {
    try {
      setError(null);

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode, // 'environment' = back camera, 'user' = front
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error('Failed to access camera:', err);
      setError('לא ניתן לגשת למצלמה. אנא אפשר הרשאות מצלמה בהגדרות הדפדפן.');
    }
  };

  /**
   * Stop camera stream and release resources
   */
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  /**
   * Switch between front and back camera
   */
  const switchCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  /**
   * Capture photo from video stream
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.9);
      });

      // Compress image
      const compressedBlob = await compressImage(blob, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
      });

      // Save to IndexedDB
      const photoId = uuid();
      await db.saveAsset({
        id: photoId,
        type: 'photo',
        blob: compressedBlob,
        mimeType: 'image/jpeg',
        size: compressedBlob.size,
        createdAt: new Date(),
        syncStatus: 'local',
      });

      console.log(`[Camera] Photo saved: ${photoId} (${compressedBlob.size} bytes)`);

      // Callback with photo ID
      onCapture(photoId);

      // Close camera
      stopCamera();
      onClose();
    } catch (err) {
      console.error('Failed to capture photo:', err);
      setError('שגיאה בצילום. נסה שוב.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video stream */}
      <div className="relative flex-1 flex items-center justify-center">
        {!error ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Grid overlay (rule of thirds) */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="border border-white/20"
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📸</div>
            <p className="text-white text-lg">{error}</p>
            <button
              onClick={startCamera}
              className="mt-4 px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-100 active:scale-95 transition-transform"
            >
              נסה שוב
            </button>
          </div>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-6 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {/* Close button */}
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="סגור מצלמה"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Capture button */}
          <button
            onClick={capturePhoto}
            disabled={capturing || !!error}
            className="
              w-20 h-20 rounded-full
              bg-white border-4 border-white
              flex items-center justify-center
              active:scale-95 transition-transform
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg
            "
            aria-label="צלם תמונה"
          >
            {capturing ? (
              <div className="w-16 h-16 rounded-full bg-red-500 animate-pulse" />
            ) : (
              <CameraIcon className="w-10 h-10 text-gray-800" />
            )}
          </button>

          {/* Switch camera button */}
          <button
            onClick={switchCamera}
            disabled={!!error}
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            aria-label="החלף מצלמה"
          >
            <RotateCcw className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Status text */}
        {capturing && (
          <p className="text-center text-white mt-4 text-sm">
            מצלם...
          </p>
        )}
      </div>
    </div>
  );
}
