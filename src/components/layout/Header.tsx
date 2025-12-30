import { useTranslation, useDirection } from '@/i18n';
import { LanguageSelector } from './LanguageSelector';
import { DarkModeToggle } from './DarkModeToggle';

export const Header = () => {
  const t = useTranslation();
  const direction = useDirection();

  return (
    <header
      className="w-full bg-primary text-primary-foreground py-3 px-6 flex items-center
                 justify-between shadow-md"
      dir={direction}
    >
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight">
          {t.appTitle}
        </h1>
        <span className="text-xs text-primary-foreground/70">
          {t.poweredBy}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSelector />
        <DarkModeToggle />
      </div>
    </header>
  );
};
