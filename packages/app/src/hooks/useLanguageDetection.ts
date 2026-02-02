import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { detectLanguage, createDebouncedDetector } from '@/utils/language-detection';
import type { Language } from '@/store/appStore';

/**
 * Hook for language auto-detection with user confirmation.
 * Detects language from text input and suggests switching if different from current language.
 *
 * @returns Object with suggested language, dismiss function, and text change handler
 *
 * @example
 * const { suggestedLanguage, dismissSuggestion, onTextChange } = useLanguageDetection();
 *
 * <input onChange={(e) => onTextChange(e.target.value)} />
 * {suggestedLanguage && (
 *   <LanguageSuggestionToast
 *     suggestedLanguage={suggestedLanguage}
 *     onAccept={() => { setLanguage(suggestedLanguage); dismissSuggestion(); }}
 *     onDismiss={dismissSuggestion}
 *   />
 * )}
 */
export function useLanguageDetection() {
  const { language: currentLanguage } = useAppStore();
  const [suggestedLanguage, setSuggestedLanguage] = useState<Language | null>(null);

  const handleTextChange = useCallback(
    createDebouncedDetector((detectedLang: Language) => {
      // Check if user disabled auto-detection (read from localStorage inside callback to avoid stale closure)
      const dontAskAgain = typeof window !== 'undefined'
        ? localStorage.getItem('languageDetection_dontAsk') === 'true'
        : false;

      if (dontAskAgain) return;
      if (detectedLang !== currentLanguage) {
        setSuggestedLanguage(detectedLang);
      }
    }, 500),
    [currentLanguage]
  );

  const dismissSuggestion = useCallback(() => {
    setSuggestedLanguage(null);
  }, []);

  // Cancel suggestion if language manually changed
  useEffect(() => {
    if (suggestedLanguage && suggestedLanguage === currentLanguage) {
      dismissSuggestion();
    }
  }, [currentLanguage, suggestedLanguage, dismissSuggestion]);

  return {
    suggestedLanguage,
    dismissSuggestion,
    onTextChange: handleTextChange,
  };
}
