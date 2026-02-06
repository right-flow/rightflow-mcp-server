/**
 * HelpWidget Component
 * Always-available help widget for re-engagement and support
 * Date: 2026-02-06
 */

import { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

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

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-primary/90 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="text-white" size={24} />
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
            className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-zinc-900 shadow-xl z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-panel-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 id="help-panel-title" className="text-lg font-semibold text-foreground">
                Need help?
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-secondary rounded transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Restart Tutorial */}
              <button
                onClick={handleRestartTutorial}
                className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Restart Tutorial</span>
              </button>

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold mb-2 text-foreground">Quick Links</h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="/docs/getting-started"
                      className="text-primary hover:underline text-sm"
                    >
                      Getting Started Guide
                    </a>
                  </li>
                  <li>
                    <a
                      href="/docs/templates"
                      className="text-primary hover:underline text-sm"
                    >
                      Template Gallery
                    </a>
                  </li>
                  <li>
                    <a
                      href="/docs/sharing"
                      className="text-primary hover:underline text-sm"
                    >
                      How to Share Forms
                    </a>
                  </li>
                  <li>
                    <a
                      href="/docs/analytics"
                      className="text-primary hover:underline text-sm"
                    >
                      Understanding Analytics
                    </a>
                  </li>
                </ul>
              </div>

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Video Tutorials */}
              <div>
                <h3 className="font-semibold mb-2 text-foreground">Video Tutorials</h3>
                <p className="text-sm text-muted-foreground">
                  Coming soon! Check back for video guides on getting the most out of
                  RightFlow.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
