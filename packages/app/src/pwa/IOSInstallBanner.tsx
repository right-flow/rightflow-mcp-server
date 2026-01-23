/**
 * iOS Install Banner Component
 * Shows installation instructions for iOS/Safari users
 */

import { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shouldShowIOSInstallPrompt } from './detectPWA';

export function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const dismissed = localStorage.getItem('ios-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Show banner if on iOS and not in standalone mode
    if (shouldShowIOSInstallPrompt()) {
      // Delay showing banner by 10 seconds for better UX
      setTimeout(() => {
        setShow(true);
      }, 10000);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    // Remember dismissal
    localStorage.setItem('ios-install-dismissed', Date.now().toString());
  };

  if (!show) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="fixed top-0 left-0 right-0 z-50 animate-slide-down"
      role="banner"
      aria-labelledby="ios-install-title"
    >
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 left-2 p-1 rounded-full hover:bg-blue-700 transition-colors"
          aria-label="סגור"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="max-w-4xl mx-auto pr-8">
          <h3
            id="ios-install-title"
            className="font-semibold mb-2 text-lg"
          >
            התקן את RightFlow למסך הבית
          </h3>

          <div className="text-sm space-y-2">
            <p className="opacity-90">
              לגישה מהירה ועבודה במצב לא מקוון:
            </p>

            {/* Instructions */}
            <ol className="list-decimal list-inside space-y-1 opacity-90">
              <li className="flex items-center gap-2">
                לחץ על כפתור השיתוף
                <Share className="w-4 h-4 inline-block" />
                בתחתית המסך
              </li>
              <li>גלול למטה ובחר "הוסף למסך הבית"</li>
              <li>לחץ על "הוסף" כדי להתקין את האפליקציה</li>
            </ol>

            {/* Dismiss button */}
            <div className="pt-2">
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="bg-white text-blue-600 hover:bg-blue-50 border-white"
              >
                הבנתי
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
