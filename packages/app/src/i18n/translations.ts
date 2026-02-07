import { Language } from '@/store/appStore';
import type { Translations } from './types';
import { he } from './translations/he';
import { en } from './translations/en';
import { ar } from './translations/ar';

const translations: Record<Language, Translations> = {
  he,
  en,
  ar,
};

export function getTranslations(language: Language): Translations {
  return translations[language];
}

export function t(language: Language, key: keyof Translations): string {
  return translations[language][key];
}

// Re-export types for backward compatibility
export type { Translations } from './types';
