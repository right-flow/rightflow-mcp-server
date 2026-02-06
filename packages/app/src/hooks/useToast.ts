// useToast Hook
// Created: 2026-02-05
// Purpose: Custom hook for displaying toast notifications

import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

/**
 * Global toast state (simple implementation without context)
 */
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function emitToastChange() {
  toastListeners.forEach((listener) => listener(toasts));
}

/**
 * Custom hook for toast notifications
 */
export const useToast = () => {
  const [localToasts, setLocalToasts] = useState<Toast[]>(toasts);

  useEffect(() => {
    toastListeners.push(setLocalToasts);
    return () => {
      toastListeners = toastListeners.filter((listener) => listener !== setLocalToasts);
    };
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = { id, message, type, duration };

      toasts = [...toasts, newToast];
      emitToastChange();

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    toasts = toasts.filter((toast) => toast.id !== id);
    emitToastChange();
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  return {
    toasts: localToasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
};
