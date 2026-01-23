import { useAppStore } from '@/store/appStore';
import { getTranslations, Translations } from './translations';

export function useTranslation(): Translations {
  const language = useAppStore((state) => state.language);
  return getTranslations(language);
}

export function useDirection(): 'rtl' | 'ltr' {
  const language = useAppStore((state) => state.language);
  return language === 'he' ? 'rtl' : 'ltr';
}
