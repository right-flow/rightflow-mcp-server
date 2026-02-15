import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Language, TranslationNamespace, NamespaceTranslations } from '../types/index';
import { loadNamespaceTranslations } from '../loader/namespaceLoader';
import { interpolate } from '../utils/interpolate';

/**
 * Hook for loading a single namespace with lazy loading
 * Best for feature-specific components that only need one namespace
 *
 * @param namespace - The namespace to load
 * @returns Object with translations, loading state, and translate function
 *
 * @example
 * // In a billing component
 * const { t, isLoading } = useNamespaceTranslation('billing');
 * if (isLoading) return <Skeleton />;
 * return <h1>{t.title}</h1>;
 */
export function useNamespaceTranslation<N extends TranslationNamespace>(
  namespace: N
): {
  /** Translations object - returns key path as fallback if loading */
  t: NamespaceTranslations<N>;
  /** Whether translations are currently loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Current language */
  language: Language;
  /** Translation function with interpolation support */
  translate: (key: string, params?: Record<string, string | number>) => string;
} {
  const language = useAppStore((state) => state.language);
  const [translations, setTranslations] = useState<NamespaceTranslations<N> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    loadNamespaceTranslations(language, namespace)
      .then((loaded) => {
        if (!cancelled) {
          setTranslations(loaded as NamespaceTranslations<N>);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, namespace]);

  /**
   * Translation function with interpolation
   */
  const translate = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!translations) return key;

      const value = getNestedValue(translations as unknown as Record<string, unknown>, key);
      if (typeof value !== 'string') return key;

      return params ? interpolate(value, params) : value;
    },
    [translations]
  );

  // Create a recursive proxy that returns key path as fallback when loading
  // Handles nested access like t.widgets.userManagement.admins
  const safeTranslations = (translations ?? createNestedFallbackProxy()) as NamespaceTranslations<N>;

  return {
    t: safeTranslations,
    isLoading,
    error,
    language,
    translate,
  };
}

/**
 * Helper to get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Create a recursive proxy that handles nested property access while translations are loading.
 * IMPORTANT: Components MUST check `isLoading` before rendering to avoid React errors.
 * This proxy is only a safeguard for property access - it cannot be rendered directly in JSX.
 *
 * @example
 * // Correct usage:
 * const { t, isLoading } = useNamespaceTranslation('dashboard');
 * if (isLoading) return <Loading />;
 * return <h1>{t.widgets.title}</h1>;
 */
function createNestedFallbackProxy(path: string[] = []): unknown {
  const handler: ProxyHandler<object> = {
    get: (_, prop) => {
      // Handle Symbol.toPrimitive, toString, valueOf for string conversion
      if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') {
        return () => (path.length > 0 ? path.join('.') : '');
      }
      // Ignore other symbols
      if (typeof prop === 'symbol') return undefined;
      // Return a new nested proxy for the next level
      return createNestedFallbackProxy([...path, String(prop)]);
    },
  };
  return new Proxy({}, handler);
}
