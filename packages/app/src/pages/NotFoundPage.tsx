/**
 * 404 Not Found Page
 * Localized error page with navigation options
 */

import { useTranslation } from '../i18n/hooks/useTranslation';

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://rightflow.co.il';

export function NotFoundPage() {
  const t = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-black text-foreground opacity-20">404</h1>
        <p className="text-xl text-muted-foreground mb-4">{t.pageNotFound}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/dashboard"
            className="bg-primary text-primary-foreground hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold px-8 py-3 rounded-lg transition-all active:scale-[0.98]"
          >
            {t.backToDashboard}
          </a>
          <a
            href={LANDING_URL}
            className="bg-secondary hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground font-bold px-8 py-3 rounded-lg transition-all border border-border"
          >
            {t.backToHome}
          </a>
        </div>
      </div>
    </div>
  );
}
