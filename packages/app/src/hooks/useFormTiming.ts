/**
 * Form Timing Hook
 * Track time spent filling out forms for analytics and metadata
 */

import { useState, useEffect, useRef } from 'react';

export interface FormTiming {
  /** When the form was opened */
  startTime: number;
  /** When the form was completed */
  endTime: number | null;
  /** Total time spent (in seconds) */
  totalSeconds: number;
  /** Time spent actively filling (excludes idle time) */
  activeSeconds: number;
  /** Time spent idle (user not interacting) */
  idleSeconds: number;
  /** Number of pauses (idle periods > 30 seconds) */
  pauseCount: number;
  /** Field-level timing (time spent on each field) */
  fieldTimings: Record<string, number>;
}

export interface UseFormTimingOptions {
  /** Threshold for considering user idle (in ms) - default 30 seconds */
  idleThreshold?: number;
  /** Auto-start tracking - default true */
  autoStart?: boolean;
}

/**
 * Track form filling timing and user activity
 *
 * @example
 * ```tsx
 * const { timing, startTracking, stopTracking, recordFieldFocus } = useFormTiming();
 *
 * // Start tracking when form loads
 * useEffect(() => {
 *   startTracking();
 * }, []);
 *
 * // Track field focus
 * <input
 *   onFocus={() => recordFieldFocus('firstName')}
 *   onBlur={() => recordFieldFocus(null)}
 * />
 *
 * // Stop tracking on submit
 * const handleSubmit = () => {
 *   const formTiming = stopTracking();
 *   console.log('Total time:', formTiming.totalSeconds);
 * };
 * ```
 */
export function useFormTiming(options: UseFormTimingOptions = {}) {
  const { idleThreshold = 30000, autoStart = true } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [timing, setTiming] = useState<FormTiming>({
    startTime: 0,
    endTime: null,
    totalSeconds: 0,
    activeSeconds: 0,
    idleSeconds: 0,
    pauseCount: 0,
    fieldTimings: {},
  });

  // Refs for tracking (don't cause re-renders)
  const startTimeRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(0);
  const activeTimeRef = useRef<number>(0);
  const idleTimeRef = useRef<number>(0);
  const pauseCountRef = useRef<number>(0);
  const currentFieldRef = useRef<string | null>(null);
  const fieldStartTimeRef = useRef<number>(0);
  const fieldTimingsRef = useRef<Record<string, number>>({});
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start tracking
   */
  const startTracking = () => {
    const now = Date.now();
    startTimeRef.current = now;
    lastActivityRef.current = now;
    activeTimeRef.current = 0;
    idleTimeRef.current = 0;
    pauseCountRef.current = 0;
    fieldTimingsRef.current = {};

    setIsTracking(true);

    // Update timing every second
    updateIntervalRef.current = setInterval(() => {
      updateTiming();
    }, 1000);

    // Check for idle state every 5 seconds
    activityCheckIntervalRef.current = setInterval(() => {
      checkIdleState();
    }, 5000);

    console.log('[useFormTiming] Started tracking');
  };

  /**
   * Stop tracking and return final timing
   */
  const stopTracking = (): FormTiming => {
    const now = Date.now();

    // Stop field timing if active
    if (currentFieldRef.current && fieldStartTimeRef.current) {
      const fieldTime = now - fieldStartTimeRef.current;
      fieldTimingsRef.current[currentFieldRef.current] =
        (fieldTimingsRef.current[currentFieldRef.current] || 0) + fieldTime;
    }

    // Clear intervals
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
      activityCheckIntervalRef.current = null;
    }

    // Calculate final timing
    const totalSeconds = Math.round((now - startTimeRef.current) / 1000);
    const activeSeconds = Math.round(activeTimeRef.current / 1000);
    const idleSeconds = Math.round(idleTimeRef.current / 1000);

    const finalTiming: FormTiming = {
      startTime: startTimeRef.current,
      endTime: now,
      totalSeconds,
      activeSeconds,
      idleSeconds,
      pauseCount: pauseCountRef.current,
      fieldTimings: { ...fieldTimingsRef.current },
    };

    setTiming(finalTiming);
    setIsTracking(false);

    console.log('[useFormTiming] Stopped tracking:', {
      total: `${totalSeconds}s`,
      active: `${activeSeconds}s`,
      idle: `${idleSeconds}s`,
      pauses: pauseCountRef.current,
    });

    return finalTiming;
  };

  /**
   * Record user activity
   */
  const recordActivity = () => {
    if (!isTracking) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // If user was idle, record it as a pause
    if (timeSinceLastActivity > idleThreshold) {
      pauseCountRef.current += 1;
      idleTimeRef.current += timeSinceLastActivity;
    } else {
      // Add to active time
      activeTimeRef.current += timeSinceLastActivity;
    }

    lastActivityRef.current = now;
  };

  /**
   * Record field focus
   */
  const recordFieldFocus = (fieldId: string | null) => {
    if (!isTracking) return;

    const now = Date.now();

    // Save previous field timing
    if (currentFieldRef.current && fieldStartTimeRef.current) {
      const fieldTime = now - fieldStartTimeRef.current;
      fieldTimingsRef.current[currentFieldRef.current] =
        (fieldTimingsRef.current[currentFieldRef.current] || 0) + fieldTime;
    }

    // Start timing new field
    currentFieldRef.current = fieldId;
    fieldStartTimeRef.current = fieldId ? now : 0;

    recordActivity();
  };

  /**
   * Update timing state (for display purposes)
   */
  const updateTiming = () => {
    if (!isTracking) return;

    const now = Date.now();
    const totalSeconds = Math.round((now - startTimeRef.current) / 1000);
    const activeSeconds = Math.round(activeTimeRef.current / 1000);
    const idleSeconds = Math.round(idleTimeRef.current / 1000);

    setTiming({
      startTime: startTimeRef.current,
      endTime: null,
      totalSeconds,
      activeSeconds,
      idleSeconds,
      pauseCount: pauseCountRef.current,
      fieldTimings: { ...fieldTimingsRef.current },
    });
  };

  /**
   * Check if user is idle
   */
  const checkIdleState = () => {
    if (!isTracking) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // If idle for too long, accumulate idle time
    if (timeSinceLastActivity > idleThreshold) {
      const idleTime = now - lastActivityRef.current - idleThreshold;
      if (idleTime > 0) {
        idleTimeRef.current += idleTime;
        lastActivityRef.current = now;
      }
    }
  };

  /**
   * Reset timing
   */
  const reset = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
    }

    startTimeRef.current = 0;
    lastActivityRef.current = 0;
    activeTimeRef.current = 0;
    idleTimeRef.current = 0;
    pauseCountRef.current = 0;
    currentFieldRef.current = null;
    fieldStartTimeRef.current = 0;
    fieldTimingsRef.current = {};

    setIsTracking(false);
    setTiming({
      startTime: 0,
      endTime: null,
      totalSeconds: 0,
      activeSeconds: 0,
      idleSeconds: 0,
      pauseCount: 0,
      fieldTimings: {},
    });
  };

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }

    // Cleanup on unmount
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
    };
  }, [autoStart]);

  // Track user activity events
  useEffect(() => {
    if (!isTracking) return;

    const handleActivity = () => recordActivity();

    // Listen to user activity events
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [isTracking]);

  return {
    timing,
    isTracking,
    startTracking,
    stopTracking,
    recordActivity,
    recordFieldFocus,
    reset,
  };
}

/**
 * Format timing for display
 */
export function formatTiming(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} שניות`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes} דקות ${remainingSeconds > 0 ? `ו-${remainingSeconds} שניות` : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours} שעות ${remainingMinutes > 0 ? `ו-${remainingMinutes} דקות` : ''}`;
}
