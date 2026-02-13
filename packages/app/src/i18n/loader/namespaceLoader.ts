import type { TranslationNamespace, Language, NamespaceTranslations } from '../types/index';

/**
 * Cache for loaded translations
 * Structure: { 'en:billing': { ... }, 'he:dashboard': { ... } }
 */
const translationCache = new Map<string, unknown>();

/**
 * In-flight promises to prevent duplicate loads
 */
const loadingPromises = new Map<string, Promise<unknown>>();

/**
 * Generate cache key
 */
function getCacheKey(language: Language, namespace: TranslationNamespace): string {
  return `${language}:${namespace}`;
}

/**
 * Dynamic import functions for each namespace and language
 * Vite will code-split these into separate chunks
 */
type ImportFunction = () => Promise<{ default: unknown }>;

const namespaceImports: Record<TranslationNamespace, Record<Language, ImportFunction>> = {
  common: {
    en: () => import('../translations/en/common'),
    he: () => import('../translations/he/common'),
    ar: () => import('../translations/ar/common'),
  },
  dashboard: {
    en: () => import('../translations/en/dashboard'),
    he: () => import('../translations/he/dashboard'),
    ar: () => import('../translations/ar/dashboard'),
  },
  billing: {
    en: () => import('../translations/en/billing'),
    he: () => import('../translations/he/billing'),
    ar: () => import('../translations/ar/billing'),
  },
  workflow: {
    en: () => import('../translations/en/workflow'),
    he: () => import('../translations/he/workflow'),
    ar: () => import('../translations/ar/workflow'),
  },
  editor: {
    en: () => import('../translations/en/editor'),
    he: () => import('../translations/he/editor'),
    ar: () => import('../translations/ar/editor'),
  },
  help: {
    en: () => import('../translations/en/help'),
    he: () => import('../translations/he/help'),
    ar: () => import('../translations/ar/help'),
  },
};

/**
 * Load translations for a specific namespace
 * Uses caching and deduplication to prevent redundant loads
 *
 * @param language - The language to load
 * @param namespace - The namespace to load
 * @returns Promise resolving to the translations object
 */
export async function loadNamespaceTranslations<N extends TranslationNamespace>(
  language: Language,
  namespace: N
): Promise<NamespaceTranslations<N>> {
  const cacheKey = getCacheKey(language, namespace);

  // Return from cache if available
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey) as NamespaceTranslations<N>;
  }

  // Return existing promise if already loading
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey) as Promise<NamespaceTranslations<N>>;
  }

  // Create new loading promise
  const loadPromise = (async () => {
    try {
      const importFn = namespaceImports[namespace]?.[language];

      if (!importFn) {
        throw new Error(`No translations found for ${namespace}:${language}`);
      }

      const module = await importFn();
      const translations = module.default;

      // Cache the result
      translationCache.set(cacheKey, translations);

      return translations;
    } finally {
      // Clean up loading promise
      loadingPromises.delete(cacheKey);
    }
  })();

  loadingPromises.set(cacheKey, loadPromise);
  return loadPromise as Promise<NamespaceTranslations<N>>;
}

/**
 * Preload multiple namespaces in parallel
 *
 * @param language - The language to load
 * @param namespaces - Array of namespaces to preload
 */
export async function preloadNamespaces(
  language: Language,
  namespaces: TranslationNamespace[]
): Promise<void> {
  await Promise.all(namespaces.map((ns) => loadNamespaceTranslations(language, ns)));
}

/**
 * Clear the translation cache
 * Useful for hot reload in development
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Get cached translations synchronously
 * Returns null if not cached
 *
 * @param language - The language to get
 * @param namespace - The namespace to get
 * @returns Cached translations or null
 */
export function getCachedTranslations<N extends TranslationNamespace>(
  language: Language,
  namespace: N
): NamespaceTranslations<N> | null {
  return (translationCache.get(getCacheKey(language, namespace)) as NamespaceTranslations<N>) ?? null;
}

/**
 * Check if a namespace is cached
 *
 * @param language - The language to check
 * @param namespace - The namespace to check
 * @returns True if cached
 */
export function isNamespaceCached(language: Language, namespace: TranslationNamespace): boolean {
  return translationCache.has(getCacheKey(language, namespace));
}
