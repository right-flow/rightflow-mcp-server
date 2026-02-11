/**
 * PowerUserPrompt Component
 * Recognition modal for power users (5+ forms OR 40+ responses)
 * Date: 2026-02-06
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

// Analytics stub - replace with actual analytics service (Mixpanel, Amplitude, etc.)
const analytics = {
  track: (event: string, metadata?: any) => {
    console.log('[Analytics]', event, metadata);
    // TODO: Replace with actual analytics service
  },
};

interface PowerUserPromptProps {
  usage: {
    responsesUsed: number;
    formsCreated: number;
  };
}

export function PowerUserPrompt({ usage }: PowerUserPromptProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Focus management - focus first button when modal opens
  useEffect(() => {
    if (isVisible && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [isVisible]);

  // Track when modal is shown
  useEffect(() => {
    if (isVisible) {
      analytics.track('upgrade_prompt_shown', { source: 'power-user' });
    }
  }, [isVisible]);

  const handleUpgradeClick = () => {
    analytics.track('upgrade_clicked', { source: 'power-user' });
    navigate('/billing/subscription');
  };

  if (!isVisible) {
    return null;
  }

  const formCount = usage.formsCreated || 0;
  const responseCount = usage.responsesUsed || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="power-user-title"
      >
        <div className="text-center mb-4">
          <div className="mb-3">
            <MaterialIcon name="celebration" size="2xl" className="text-primary" />
          </div>
          <h2 id="power-user-title" className="text-2xl font-bold text-foreground mb-2">
            You're a power user!
          </h2>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-muted-foreground text-center">
            You've created <strong>{formCount} forms</strong> and received{' '}
            <strong>{responseCount} responses</strong>.
          </p>

          <div className="bg-secondary p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Unlock more with upgrade:</h3>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <MaterialIcon name="check_circle" size="sm" className="text-green-600" />
                Unlimited forms (currently limited to 3)
              </li>
              <li className="flex items-center gap-2">
                <MaterialIcon name="check_circle" size="sm" className="text-green-600" />
                Unlimited responses (currently 50/month)
              </li>
              <li className="flex items-center gap-2">
                <MaterialIcon name="check_circle" size="sm" className="text-green-600" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <MaterialIcon name="check_circle" size="sm" className="text-green-600" />
                Team collaboration
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            ref={firstButtonRef}
            onClick={() => setIsVisible(false)}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleUpgradeClick}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Compare Plans →
          </button>
        </div>
      </div>
    </div>
  );
}
