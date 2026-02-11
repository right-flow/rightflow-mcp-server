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

/**
 * Basic translation function with interpolation support
 */
export function translate(language: Language, key: keyof Translations, params?: Record<string, string | number>): string {
  const text = translations[language][key];
  if (typeof text !== 'string') return String(key);

  let result = text;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return result;
}

// Re-export types
export type { Translations } from './types';
