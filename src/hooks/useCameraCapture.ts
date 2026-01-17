/**
 * Custom hook for capturing images from device camera
 */

import { useState, useEffect, useRef } from 'react';

interface UseCameraCaptureReturn {
  isCapturing: boolean;
  image: string | null;
  error: string | null;
  stream: MediaStream | null;
  startCapture: (facingMode?: 'user' | 'environment') => Promise<void>;
  stopCapture: () => void;
  captureImage: (videoElement: HTMLVideoElement) => void;
  clearImage: () => void;
}

export function useCameraCapture(): UseCameraCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCapture = async (facingMode: 'user' | 'environment' = 'environment') => {
    try {
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCapturing(true);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setIsCapturing(false);

      if (err.message?.includes('NotAllowed') || err.name === 'NotAllowedError') {
        setError('Camera access denied. Please enable camera permissions.');
      } else if (err.message?.includes('NotFound') || err.name === 'NotFoundError') {
        setError('No camera device found.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsCapturing(false);
  };

  const captureImage = (videoElement: HTMLVideoElement) => {
    if (!videoElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/png');
      setImage(imageData);
    }
  };

  const clearImage = () => {
    setImage(null);
  };

  return {
    isCapturing,
    image,
    error,
    stream,
    startCapture,
    stopCapture,
    captureImage,
    clearImage,
  };
}
