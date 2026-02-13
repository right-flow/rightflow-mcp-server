import { useAppStore } from '../../store/appStore';
import { getTranslations, translate } from '../translations';
import type { Translations } from '../types';

export type UseTranslationResult = Translations & {
  t: (key: keyof Translations, params?: Record<string, string | number>) => string;
};

/**
 * Returns a translation object with all keys + a 't' function for interpolation
 *
 * This hook maintains backward compatibility with the existing flat key structure.
 * For new features with lazy loading, consider using useNamespaceTranslation instead.
 *
 * @example
 * const t = useTranslation();
 * return <h1>{t.appTitle}</h1>;
 *
 * @example
 * // With interpolation
 * const t = useTranslation();
 * return <p>{t.t('fieldsCount', { count: 5 })}</p>;
 */
export function useTranslation(): UseTranslationResult {
  const language = useAppStore((state) => state.language);
  const translations = getTranslations(language);

  const t = (key: keyof Translations, params?: Record<string, string | number>) => {
    return translate(language, key, params);
  };

  return {
    ...translations,
    t,
  } as UseTranslationResult;
}
