// Legacy exports - backward compatible
export { getTranslations, translate as t } from './translations';
export type { Translations } from './translations';
export { useTranslation, useDirection } from './useTranslation';

// New namespace-based exports
export { useNamespaceTranslation } from './hooks/useNamespaceTranslation';
export { preloadRouteTranslations, preloadCriticalNamespaces } from './loader/preloadStrategies';
export type {
  TranslationNamespace,
  NamespaceTranslations,
  Language,
  LanguageConfig,
} from './types/index';
export { languageConfig } from './types/index';
