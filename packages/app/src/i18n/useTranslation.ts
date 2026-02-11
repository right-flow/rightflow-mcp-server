import { useAppStore } from '@/store/appStore';
import { getTranslations, translate, Translations } from './translations';

export type UseTranslationResult = Translations & {
  t: (key: keyof Translations, params?: Record<string, string | number>) => string;
};

/**
 * Returns a translation object with all keys + a 't' function for interpolation
 */
export function useTranslation(): UseTranslationResult {
  const language = useAppStore((state) => state.language);
  const translations = getTranslations(language);

  const t = (key: keyof Translations, params?: Record<string, string | number>) => {
    return translate(language, key, params);
  };

  return {
    ...translations,
    t
  } as UseTranslationResult;
}

export function useDirection(): 'rtl' | 'ltr' {
  const language = useAppStore((state) => state.language);
  // Hebrew and Arabic are RTL languages
  return language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
}
