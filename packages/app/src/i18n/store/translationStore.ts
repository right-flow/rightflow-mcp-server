import { create } from 'zustand';
import type { TranslationNamespace, Language } from '../types/index';

/**
 * Translation store state interface
 */
interface TranslationState {
  /** Loaded translations per language per namespace */
  translations: Record<Language, Partial<Record<TranslationNamespace, unknown>>>;

  /** Track which namespaces are loaded per language */
  loadedNamespaces: Record<Language, Set<TranslationNamespace>>;

  /** Loading state per namespace */
  loadingNamespaces: Record<string, boolean>;

  /** Error state */
  error: Error | null;

  /** Load a namespace for a language */
  loadNamespace: (language: Language, namespace: TranslationNamespace) => Promise<void>;

  /** Get translations for loaded namespaces */
  getTranslations: <N extends TranslationNamespace>(
    language: Language,
    namespace: N
  ) => unknown | null;

  /** Get multiple namespaces */
  getMultipleTranslations: (
    language: Language,
    namespaces: TranslationNamespace[]
  ) => Record<string, unknown>;

  /** Check if namespace is loaded */
  isNamespaceLoaded: (language: Language, namespace: TranslationNamespace) => boolean;

  /** Check if namespace is loading */
  isNamespaceLoading: (language: Language, namespace: TranslationNamespace) => boolean;

  /** Clear all cached translations */
  clearCache: () => void;

  /** Set translations directly (for SSR or testing) */
  setTranslations: (
    language: Language,
    namespace: TranslationNamespace,
    translations: unknown
  ) => void;
}

/**
 * Generate key for loading state
 */
function getLoadingKey(language: Language, namespace: TranslationNamespace): string {
  return `${language}:${namespace}`;
}

/**
 * Initial empty state for translations
 */
const initialTranslations: Record<Language, Partial<Record<TranslationNamespace, unknown>>> = {
  en: {},
  he: {},
  ar: {},
};

/**
 * Initial empty state for loaded namespaces
 */
const initialLoadedNamespaces: Record<Language, Set<TranslationNamespace>> = {
  en: new Set(),
  he: new Set(),
  ar: new Set(),
};

/**
 * Translation store using Zustand
 * Manages loaded translations and loading states
 */
export const useTranslationStore = create<TranslationState>((set, get) => ({
  translations: initialTranslations,
  loadedNamespaces: initialLoadedNamespaces,
  loadingNamespaces: {},
  error: null,

  loadNamespace: async (language, namespace) => {
    const state = get();
    const loadingKey = getLoadingKey(language, namespace);

    // Skip if already loaded or loading
    if (state.loadedNamespaces[language].has(namespace)) {
      return;
    }

    if (state.loadingNamespaces[loadingKey]) {
      return;
    }

    // Set loading state
    set((state) => ({
      loadingNamespaces: { ...state.loadingNamespaces, [loadingKey]: true },
      error: null,
    }));

    try {
      // Dynamic import based on namespace and language
      const { loadNamespaceTranslations } = await import('../loader/namespaceLoader');
      const translations = await loadNamespaceTranslations(language, namespace);

      set((state) => ({
        translations: {
          ...state.translations,
          [language]: {
            ...state.translations[language],
            [namespace]: translations,
          },
        },
        loadedNamespaces: {
          ...state.loadedNamespaces,
          [language]: new Set([...state.loadedNamespaces[language], namespace]),
        },
        loadingNamespaces: { ...state.loadingNamespaces, [loadingKey]: false },
      }));
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error : new Error('Failed to load translations'),
        loadingNamespaces: { ...state.loadingNamespaces, [loadingKey]: false },
      }));
      throw error;
    }
  },

  getTranslations: (language, namespace) => {
    const state = get();
    return state.translations[language]?.[namespace] ?? null;
  },

  getMultipleTranslations: (language, namespaces) => {
    const state = get();
    const result: Record<string, unknown> = {};

    namespaces.forEach((ns) => {
      const nsTranslations = state.translations[language]?.[ns];
      if (nsTranslations) {
        result[ns] = nsTranslations;
      }
    });

    return result;
  },

  isNamespaceLoaded: (language, namespace) => {
    return get().loadedNamespaces[language].has(namespace);
  },

  isNamespaceLoading: (language, namespace) => {
    const loadingKey = getLoadingKey(language, namespace);
    return get().loadingNamespaces[loadingKey] ?? false;
  },

  clearCache: () => {
    set({
      translations: initialTranslations,
      loadedNamespaces: {
        en: new Set(),
        he: new Set(),
        ar: new Set(),
      },
      loadingNamespaces: {},
      error: null,
    });
  },

  setTranslations: (language, namespace, translations) => {
    set((state) => ({
      translations: {
        ...state.translations,
        [language]: {
          ...state.translations[language],
          [namespace]: translations,
        },
      },
      loadedNamespaces: {
        ...state.loadedNamespaces,
        [language]: new Set([...state.loadedNamespaces[language], namespace]),
      },
    }));
  },
}));
