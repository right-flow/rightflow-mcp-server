/**
 * usePinchZoom Hook
 * Adds pinch-to-zoom gesture support for touch devices
 */

import { RefObject } from 'react';
import { useGesture } from '@use-gesture/react';

export interface PinchZoomOptions {
  /** Minimum zoom level (default: 50) */
  minZoom?: number;
  /** Maximum zoom level (default: 200) */
  maxZoom?: number;
  /** Initial zoom level (default: 100) */
  initialZoom?: number;
  /** Callback when zoom changes */
  onZoomChange?: (zoom: number) => void;
  /** Enable zoom (default: true) */
  enabled?: boolean;
}

/**
 * Hook to enable pinch-to-zoom gesture on a ref element
 *
 * @param ref - React ref to the target element
 * @param options - Pinch zoom configuration
 *
 * @example
 * ```tsx
 * const canvasRef = useRef<HTMLDivElement>(null);
 * usePinchZoom(canvasRef, {
 *   minZoom: 50,
 *   maxZoom: 200,
 *   onZoomChange: (zoom) => setZoomLevel(zoom),
 * });
 * ```
 */
export function usePinchZoom(
  ref: RefObject<HTMLElement>,
  options: PinchZoomOptions = {},
) {
  const {
    minZoom = 50,
    maxZoom = 200,
    onZoomChange,
    enabled = true,
  } = options;

  useGesture(
    {
      onPinch: ({ offset: [scale] }) => {
        if (!enabled) return;

        // Convert scale to zoom percentage (scale 1 = 100%)
        const newZoom = Math.round(scale * 100);

        // Clamp zoom to min/max
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

        // Notify parent of zoom change
        onZoomChange?.(clampedZoom);
      },
    },
    {
      target: ref,
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: { min: minZoom / 100, max: maxZoom / 100 },
        rubberband: true,
      },
    },
  );
}

/**
 * Hook for double-tap to zoom gesture
 *
 * @example
 * ```tsx
 * const canvasRef = useRef<HTMLDivElement>(null);
 * useDoubleTapZoom(canvasRef, {
 *   onDoubleTap: () => {
 *     setZoomLevel(zoomLevel === 100 ? 150 : 100);
 *   },
 * });
 * ```
 */
export function useDoubleTapZoom(
  ref: RefObject<HTMLElement>,
  options: {
    onDoubleTap?: () => void;
    enabled?: boolean;
  } = {},
) {
  const { onDoubleTap, enabled = true } = options;

  useGesture(
    {
      onDoubleClick: () => {
        if (!enabled) return;
        onDoubleTap?.();
      },
    },
    {
      target: ref,
      eventOptions: { passive: false },
    },
  );
}
