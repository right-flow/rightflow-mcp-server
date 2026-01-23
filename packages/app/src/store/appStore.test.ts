import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore, getDirection } from './appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAppStore.setState({
      language: 'he',
      theme: 'light',
    });

    // Mock document methods
    vi.spyOn(document.documentElement, 'dir', 'set').mockImplementation(() => {});
    vi.spyOn(document.documentElement, 'lang', 'set').mockImplementation(() => {});
    vi.spyOn(document.documentElement.classList, 'add').mockImplementation(() => {});
    vi.spyOn(document.documentElement.classList, 'remove').mockImplementation(() => {});
  });

  describe('getDirection', () => {
    it('should return rtl for Hebrew', () => {
      expect(getDirection('he')).toBe('rtl');
    });

    it('should return ltr for English', () => {
      expect(getDirection('en')).toBe('ltr');
    });
  });

  describe('initial state', () => {
    it('should have Hebrew as default language', () => {
      const { language } = useAppStore.getState();
      expect(language).toBe('he');
    });

    it('should have light as default theme', () => {
      const { theme } = useAppStore.getState();
      expect(theme).toBe('light');
    });
  });

  describe('setLanguage', () => {
    it('should change language to English', () => {
      const { setLanguage } = useAppStore.getState();
      setLanguage('en');

      const { language } = useAppStore.getState();
      expect(language).toBe('en');
    });

    it('should change language to Hebrew', () => {
      // First set to English
      useAppStore.getState().setLanguage('en');

      // Then set back to Hebrew
      useAppStore.getState().setLanguage('he');

      const { language } = useAppStore.getState();
      expect(language).toBe('he');
    });

    it('should update store language state correctly', () => {
      const { setLanguage } = useAppStore.getState();

      // Verify initial state
      expect(useAppStore.getState().language).toBe('he');

      // Change language
      setLanguage('en');
      expect(useAppStore.getState().language).toBe('en');

      // Change back
      setLanguage('he');
      expect(useAppStore.getState().language).toBe('he');
    });
  });

  describe('setTheme', () => {
    it('should change theme to dark', () => {
      const { setTheme } = useAppStore.getState();
      setTheme('dark');

      const { theme } = useAppStore.getState();
      expect(theme).toBe('dark');
    });

    it('should change theme to light', () => {
      // First set to dark
      useAppStore.getState().setTheme('dark');

      // Then set back to light
      useAppStore.getState().setTheme('light');

      const { theme } = useAppStore.getState();
      expect(theme).toBe('light');
    });

    it('should add dark class when setting dark theme', () => {
      const { setTheme } = useAppStore.getState();
      setTheme('dark');

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should remove dark class when setting light theme', () => {
      const { setTheme } = useAppStore.getState();
      setTheme('light');

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      const { toggleTheme } = useAppStore.getState();
      toggleTheme();

      const { theme } = useAppStore.getState();
      expect(theme).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      // First set to dark
      useAppStore.getState().setTheme('dark');

      // Then toggle
      useAppStore.getState().toggleTheme();

      const { theme } = useAppStore.getState();
      expect(theme).toBe('light');
    });

    it('should toggle back and forth', () => {
      const { toggleTheme } = useAppStore.getState();

      toggleTheme(); // light -> dark
      expect(useAppStore.getState().theme).toBe('dark');

      toggleTheme(); // dark -> light
      expect(useAppStore.getState().theme).toBe('light');

      toggleTheme(); // light -> dark
      expect(useAppStore.getState().theme).toBe('dark');
    });
  });

  describe('language and direction relationship', () => {
    it('should have rtl direction when language is Hebrew', () => {
      const { language } = useAppStore.getState();
      expect(language).toBe('he');
      expect(getDirection(language)).toBe('rtl');
    });

    it('should have ltr direction when language is English', () => {
      useAppStore.getState().setLanguage('en');
      const { language } = useAppStore.getState();
      expect(language).toBe('en');
      expect(getDirection(language)).toBe('ltr');
    });
  });
});
