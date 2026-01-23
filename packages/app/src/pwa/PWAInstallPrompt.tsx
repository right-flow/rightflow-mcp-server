/**
 * PWA Install Prompt Component (Android)
 * Shows a native-like prompt to install the PWA on Android devices
 */

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shouldShowAndroidInstallPrompt } from './detectPWA';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissedTimestamp = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTimestamp) {
      const dismissedTime = parseInt(dismissedTimestamp, 10);
      const daysSinceDismissal = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

      // If less than 7 days have passed, keep it dismissed
      if (daysSinceDismissal < 7) {
        setIsDismissed(true);
        return;
      }

      // If 7+ days have passed, remove the localStorage item and allow prompt to show
      localStorage.removeItem('pwa-install-dismissed');
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser prompt
      e.preventDefault();

      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only show on Android devices
      if (!shouldShowAndroidInstallPrompt()) {
        return;
      }

      // Show prompt after 30 seconds of user engagement
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      setDeferredPrompt(null);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.warn('No deferred prompt available');
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
      } else {
        console.log('❌ User dismissed the install prompt');
      }

      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    // Remember dismissal timestamp (will be checked on next page load)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if dismissed or no prompt available
  if (!showPrompt || !deferredPrompt || isDismissed) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up"
      role="dialog"
      aria-labelledby="pwa-install-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-md mx-auto">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 left-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="סגור"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-2">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Download className="w-6 h-6 text-blue-600 dark:text-blue-300" />
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3
              id="pwa-install-title"
              className="font-semibold text-gray-900 dark:text-white mb-1"
            >
              התקן את RightFlow
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              התקן את האפליקציה למסך הבית לגישה מהירה ועבודה במצב לא מקוון
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                className="flex-1"
                size="sm"
              >
                התקן
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                לא עכשיו
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
