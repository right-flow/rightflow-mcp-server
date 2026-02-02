import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'he' | 'en' | 'ar';
export type Theme = 'light' | 'dark';
export type Direction = 'rtl' | 'ltr';

interface AppState {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Language configuration
export const languageConfig = {
  he: { name: 'עברית', direction: 'rtl' as const, locale: 'he-IL' },
  en: { name: 'English', direction: 'ltr' as const, locale: 'en-US' },
  ar: { name: 'العربية', direction: 'rtl' as const, locale: 'ar-SA' },
};

// Get direction based on language
export function getDirection(language: Language): Direction {
  return languageConfig[language].direction;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'he', // Default to Hebrew
      theme: 'light', // Default to light mode

      setLanguage: (language: Language) => {
        set({ language });
        // Update document direction
        document.documentElement.dir = getDirection(language);
        document.documentElement.lang = language;
      },

      setTheme: (theme: Theme) => {
        set({ theme });
        // Update document class for dark mode
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },
    }),
    {
      name: 'rightflow-app', // LocalStorage key
      onRehydrateStorage: () => (state) => {
        // Apply saved settings on app load
        if (state) {
          document.documentElement.dir = getDirection(state.language);
          document.documentElement.lang = state.language;
          if (state.theme === 'dark') {
            document.documentElement.classList.add('dark');
          }
        }
      },
    },
  ),
);
