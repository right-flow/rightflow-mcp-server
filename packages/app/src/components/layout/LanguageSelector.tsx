import { ChevronDown } from 'lucide-react';
import { useAppStore, Language } from '@/store/appStore';
import { useTranslation } from '@/i18n';
import { useState, useRef, useEffect } from 'react';

export const LanguageSelector = () => {
  const { language, setLanguage } = useAppStore();
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: t.english },
    { code: 'he', label: t.hebrew },
    { code: 'ar', label: t.arabic },
  ];

  const currentLanguage = languages.find((l) => l.code === language);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-background text-foreground
                   border border-border rounded-md hover:bg-accent transition-colors
                   min-w-[100px] justify-between text-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{currentLanguage?.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-1 w-full bg-popover text-popover-foreground
                     border border-border rounded-md shadow-lg z-50 overflow-hidden"
          role="listbox"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-3 py-2 text-sm text-start hover:bg-accent
                         hover:text-accent-foreground transition-colors
                         ${language === lang.code ? 'bg-accent text-accent-foreground font-medium' : ''}`}
              role="option"
              aria-selected={language === lang.code}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
