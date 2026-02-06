// ToastContainer Component
// Created: 2026-02-05
// Purpose: Display toast notifications

import React from 'react';
import { useToast, Toast, ToastType } from '../../../hooks/useToast';

/**
 * Toast container component
 * Displays toast notifications in the bottom-right corner
 */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 space-y-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

/**
 * Individual toast item
 */
interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const config = getToastConfig(toast.type);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-sm animate-slide-in ${config.className}`}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="flex-shrink-0">{config.icon}</div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className={`flex-shrink-0 rounded-lg p-1 hover:bg-black/5 transition-colors ${config.closeButtonColor}`}
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

/**
 * Get toast configuration based on type
 */
function getToastConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        className: 'bg-green-50 border-green-200 text-green-900',
        closeButtonColor: 'text-green-500 hover:text-green-700',
        icon: (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    case 'error':
      return {
        className: 'bg-red-50 border-red-200 text-red-900',
        closeButtonColor: 'text-red-500 hover:text-red-700',
        icon: (
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    case 'warning':
      return {
        className: 'bg-amber-50 border-amber-200 text-amber-900',
        closeButtonColor: 'text-amber-500 hover:text-amber-700',
        icon: (
          <svg
            className="w-5 h-5 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      };
    case 'info':
      return {
        className: 'bg-blue-50 border-blue-200 text-blue-900',
        closeButtonColor: 'text-blue-500 hover:text-blue-700',
        icon: (
          <svg
            className="w-5 h-5 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
  }
}

export default ToastContainer;
