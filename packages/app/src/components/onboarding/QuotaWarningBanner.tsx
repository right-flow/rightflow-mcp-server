/**
 * QuotaWarningBanner Component
 * Displays quota usage warning when user reaches 80%+ of response limit
 * Date: 2026-02-06
 */

import { useNavigate } from 'react-router-dom';

// Analytics stub - replace with actual analytics service (Mixpanel, Amplitude, etc.)
const analytics = {
  track: (event: string, metadata?: any) => {
    console.log('[Analytics]', event, metadata);
    // TODO: Replace with actual analytics service
  },
};

interface QuotaWarningBannerProps {
  usage: {
    responsesUsed: number;
    formsCreated: number;
  };
  subscription: {
    plan: {
      name: string;
      maxResponses: number;
      maxForms: number;
    };
  };
}

export function QuotaWarningBanner({ usage, subscription }: QuotaWarningBannerProps) {
  const navigate = useNavigate();
  const remaining = subscription.plan.maxResponses - usage.responsesUsed;
  const percentage = Math.floor((usage.responsesUsed / subscription.plan.maxResponses) * 100);

  const handleUpgradeClick = () => {
    analytics.track('upgrade_clicked', { source: 'quota-warning' });
    navigate('/billing/subscription');
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
            Running low on responses!
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            You've used {usage.responsesUsed} of {subscription.plan.maxResponses} free responses
            ({percentage}%). {remaining} responses remaining.
          </p>
          <button
            onClick={handleUpgradeClick}
            className="text-sm font-medium text-yellow-900 dark:text-yellow-100 underline hover:no-underline"
          >
            Upgrade to Basic → Unlimited responses
          </button>
        </div>
      </div>
    </div>
  );
}
