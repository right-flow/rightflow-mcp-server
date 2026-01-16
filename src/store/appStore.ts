import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'he' | 'en';
export type Theme = 'light' | 'dark';
export type Direction = 'rtl' | 'ltr';

interface AppState {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Get direction based on language
export function getDirection(language: Language): Direction {
  return language === 'he' ? 'rtl' : 'ltr';
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
