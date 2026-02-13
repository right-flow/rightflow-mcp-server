/**
 * Auth Page Wrapper Component
 * Provides localized wrapper for Clerk sign-in/sign-up components
 */

import { ReactNode } from 'react';
import { useTranslation } from '../../i18n/hooks/useTranslation';

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://rightflow.co.il';

interface AuthPageWrapperProps {
  children: ReactNode;
}

export function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const t = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30">
      <div className="max-w-md w-full space-y-8">
        {children}
        <div className="mt-6 text-center">
          <a
            href={LANDING_URL}
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <span>←</span>
            <span>{t.backToLanding}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
