import { useState, useEffect } from 'react';
import { getTranslations, Translations } from './translations';

/**
 * Simple translation hook for landing page (no state management)
 * Uses localStorage to persist language preference
 */
export function useTranslation(): Translations {
  const [language, setLanguage] = useState<'he' | 'en'>(() => {
    if (typeof window === 'undefined') return 'he';
    const saved = localStorage.getItem('language');
    return (saved === 'en' ? 'en' : 'he') as 'he' | 'en';
  });

  // Listen for language changes from LanguageSelector
  useEffect(() => {
    const handleLanguageChange = () => {
      const saved = localStorage.getItem('language');
      setLanguage((saved === 'en' ? 'en' : 'he') as 'he' | 'en');
    };

    window.addEventListener('storage', handleLanguageChange);
    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      window.removeEventListener('storage', handleLanguageChange);
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  return getTranslations(language);
}

export function useDirection(): 'rtl' | 'ltr' {
  const [language, setLanguage] = useState<'he' | 'en'>(() => {
    if (typeof window === 'undefined') return 'he';
    const saved = localStorage.getItem('language');
    return (saved === 'en' ? 'en' : 'he') as 'he' | 'en';
  });

  useEffect(() => {
    const handleLanguageChange = () => {
      const saved = localStorage.getItem('language');
      setLanguage((saved === 'en' ? 'en' : 'he') as 'he' | 'en');
    };

    window.addEventListener('storage', handleLanguageChange);
    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      window.removeEventListener('storage', handleLanguageChange);
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  return language === 'he' ? 'rtl' : 'ltr';
}
