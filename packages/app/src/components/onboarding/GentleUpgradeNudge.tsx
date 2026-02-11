/**
 * GentleUpgradeNudge Component
 * Gentle upgrade prompt for users with 14+ days and good engagement
 * Date: 2026-02-06
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

// Analytics stub - replace with actual analytics service (Mixpanel, Amplitude, etc.)
const analytics = {
  track: (event: string, metadata?: any) => {
    console.log('[Analytics]', event, metadata);
    // TODO: Replace with actual analytics service
  },
};

export function GentleUpgradeNudge() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  // Track when banner is shown
  useEffect(() => {
    if (isVisible) {
      analytics.track('upgrade_prompt_shown', { source: 'hybrid' });
    }
  }, [isVisible]);

  const handleUpgradeClick = () => {
    analytics.track('upgrade_clicked', { source: 'hybrid' });
    navigate('/billing/subscription');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <MaterialIcon name="lightbulb" size="lg" className="text-blue-600" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Ready to upgrade?
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            You've been using RightFlow for a while now. Unlock unlimited forms and responses
            with our Basic plan.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsVisible(false)}
              className="text-sm px-3 py-1 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgradeClick}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              View Plans →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
