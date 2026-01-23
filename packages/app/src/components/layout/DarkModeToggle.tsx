import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useTranslation } from '@/i18n';

export const DarkModeToggle = () => {
  const { theme, toggleTheme } = useAppStore();
  const t = useTranslation();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md bg-background text-foreground border border-border
                 hover:bg-accent transition-colors"
      aria-label={isDark ? t.lightMode : t.darkMode}
      title={isDark ? t.lightMode : t.darkMode}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};
