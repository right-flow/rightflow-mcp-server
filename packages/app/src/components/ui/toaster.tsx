/**
 * Toaster Component
 * Toast notifications using Sonner
 */

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        style: {
          direction: 'rtl',
        },
        classNames: {
          toast: 'font-sans',
          title: 'text-sm font-medium',
          description: 'text-sm',
          success: 'bg-green-50 text-green-900 border-green-200',
          error: 'bg-red-50 text-red-900 border-red-200',
          info: 'bg-blue-50 text-blue-900 border-blue-200',
        },
      }}
      richColors
    />
  );
}
