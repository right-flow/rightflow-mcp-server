import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { X } from 'lucide-react';
import type { Language } from '@/store/appStore';

interface LanguageSuggestionToastProps {
  suggestedLanguage: Language;
  onAccept: () => void;
  onDismiss: () => void;
  autoCloseMs?: number;
}

/**
 * Toast notification suggesting language switch based on detected content.
 * Appears when user types in a different language than current app language.
 *
 * @example
 * <LanguageSuggestionToast
 *   suggestedLanguage="ar"
 *   onAccept={() => { setLanguage('ar'); onDismiss(); }}
 *   onDismiss={() => setSuggestedLanguage(null)}
 *   autoCloseMs={5000}
 * />
 */
export function LanguageSuggestionToast({
  suggestedLanguage,
  onAccept,
  onDismiss,
  autoCloseMs = 5000,
}: LanguageSuggestionToastProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [autoCloseMs, handleDismiss]);

  const handleAccept = () => {
    if (dontAskAgain) {
      localStorage.setItem('languageDetection_dontAsk', 'true');
    }
    onAccept();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    if (dontAskAgain) {
      localStorage.setItem('languageDetection_dontAsk', 'true');
    }
    onDismiss();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const languageNames = {
    he: 'עברית',
    en: 'English',
    ar: 'العربية',
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800 rtl:left-4 rtl:right-auto"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('language.autoDetect.title')}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('language.autoDetect.message', {
              language: languageNames[suggestedLanguage],
            })}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                className="rounded"
              />
              {t('language.autoDetect.dontAskAgain')}
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAccept}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('common.yes')}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('common.no')}
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
