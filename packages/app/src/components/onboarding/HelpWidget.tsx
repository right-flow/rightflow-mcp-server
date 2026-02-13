/**
 * HelpWidget Component
 * Always-available help widget for re-engagement and support
 * Supports RTL/LTR positioning based on language
 * Date: 2026-02-06
 */

import { useState, useEffect } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useTranslation, useDirection } from '@/i18n/useTranslation';

export interface HelpWidgetProps {
  onRestartTutorial?: () => void;
}

// Analytics stub - replace with actual analytics service
const analytics = {
  track: (event: string, metadata?: any) => {
    console.log('[Analytics]', event, metadata);
    // TODO: Replace with actual analytics service
  },
};

export function HelpWidget({ onRestartTutorial }: HelpWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslation();
  const direction = useDirection();
  const isRtl = direction === 'rtl';

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Track when help is opened
  useEffect(() => {
    if (isOpen) {
      analytics.track('help_opened', { timestamp: new Date().toISOString() });
    }
  }, [isOpen]);

  const handleRestartTutorial = () => {
    analytics.track('tutorial_restarted', { timestamp: new Date().toISOString() });
    if (onRestartTutorial) {
      onRestartTutorial();
    }
    setIsOpen(false);
  };

  const handleBackdropClick = () => {
    setIsOpen(false);
  };

  // Dynamic positioning based on language direction
  const buttonPositionClass = isRtl ? 'right-4' : 'left-4';
  const panelPositionClass = isRtl ? 'right-0' : 'left-0';

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 ${buttonPositionClass} w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-primary/90 transition-colors`}
        aria-label={t['help.title']}
      >
        <MaterialIcon name="help" size="lg" className="text-white" />
      </button>

      {/* Help Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleBackdropClick}
            data-testid="help-backdrop"
          />

          {/* Side Panel */}
          <div
            className={`fixed inset-y-0 ${panelPositionClass} w-80 bg-white dark:bg-zinc-900 shadow-xl z-50 overflow-y-auto`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-panel-title"
            dir={direction}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 id="help-panel-title" className="text-lg font-semibold text-foreground">
                {t['help.title']}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-secondary rounded transition-colors"
                aria-label={t.close}
              >
                <MaterialIcon name="close" size="md" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Restart Tutorial */}
              <button
                onClick={handleRestartTutorial}
                className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <MaterialIcon name="refresh" size="sm" />
                <span>{t['help.restartTutorial']}</span>
              </button>

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold mb-2 text-foreground">{t['help.quickLinks']}</h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="/docs/getting-started"
                      className="text-primary hover:underline text-sm"
                    >
                      {t['help.gettingStartedGuide']}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/docs/templates"
                      className="text-primary hover:underline text-sm"
                    >
                      {t['help.templateGallery']}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/docs/sharing"
                      className="text-primary hover:underline text-sm"
                    >
                      {t['help.howToShareForms']}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/docs/analytics"
                      className="text-primary hover:underline text-sm"
                    >
                      {t['help.understandingAnalytics']}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Video Tutorials */}
              <div>
                <h3 className="font-semibold mb-2 text-foreground">{t['help.videoTutorials']}</h3>
                <p className="text-sm text-muted-foreground">
                  {t['help.videoTutorialsComingSoon']}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
