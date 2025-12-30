import { describe, it, expect } from 'vitest';
import { getTranslations, t, Translations } from './translations';

describe('translations', () => {
  describe('getTranslations', () => {
    it('should return Hebrew translations for "he" language', () => {
      const translations = getTranslations('he');
      expect(translations).toBeDefined();
      expect(translations.appTitle).toBe('RightFlow PDF to HTML Convertor');
      expect(translations.uploadPdf).toBe('העלה PDF');
    });

    it('should return English translations for "en" language', () => {
      const translations = getTranslations('en');
      expect(translations).toBeDefined();
      expect(translations.appTitle).toBe('RightFlow PDF to HTML Convertor');
      expect(translations.uploadPdf).toBe('Upload PDF');
    });

    it('should have consistent app title across languages', () => {
      const heTranslations = getTranslations('he');
      const enTranslations = getTranslations('en');
      expect(heTranslations.appTitle).toBe(enTranslations.appTitle);
    });
  });

  describe('t function', () => {
    it('should return Hebrew translation for a key', () => {
      const result = t('he', 'uploadPdf');
      expect(result).toBe('העלה PDF');
    });

    it('should return English translation for a key', () => {
      const result = t('en', 'uploadPdf');
      expect(result).toBe('Upload PDF');
    });

    it('should return different translations for same key in different languages', () => {
      const heResult = t('he', 'settings');
      const enResult = t('en', 'settings');
      expect(heResult).toBe('הגדרות');
      expect(enResult).toBe('Settings');
      expect(heResult).not.toBe(enResult);
    });
  });

  describe('translation completeness', () => {
    it('should have all keys defined for Hebrew', () => {
      const translations = getTranslations('he');
      const keys = Object.keys(translations) as (keyof Translations)[];

      keys.forEach(key => {
        expect(translations[key]).toBeDefined();
        expect(translations[key].length).toBeGreaterThan(0);
      });
    });

    it('should have all keys defined for English', () => {
      const translations = getTranslations('en');
      const keys = Object.keys(translations) as (keyof Translations)[];

      keys.forEach(key => {
        expect(translations[key]).toBeDefined();
        expect(translations[key].length).toBeGreaterThan(0);
      });
    });

    it('should have same keys in both languages', () => {
      const heTranslations = getTranslations('he');
      const enTranslations = getTranslations('en');

      const heKeys = Object.keys(heTranslations).sort();
      const enKeys = Object.keys(enTranslations).sort();

      expect(heKeys).toEqual(enKeys);
    });
  });

  describe('specific translations', () => {
    describe('Header translations', () => {
      it('should have app title', () => {
        expect(t('he', 'appTitle')).toBe('RightFlow PDF to HTML Convertor');
        expect(t('en', 'appTitle')).toBe('RightFlow PDF to HTML Convertor');
      });

      it('should have powered by text', () => {
        expect(t('he', 'poweredBy')).toBe('Powered by DocsFlow');
        expect(t('en', 'poweredBy')).toBe('Powered by DocsFlow');
      });
    });

    describe('Toolbar translations', () => {
      it('should have file operation translations', () => {
        expect(t('he', 'uploadPdf')).toBe('העלה PDF');
        expect(t('en', 'uploadPdf')).toBe('Upload PDF');

        expect(t('he', 'savePdf')).toBe('שמור PDF');
        expect(t('en', 'savePdf')).toBe('Save PDF');

        expect(t('he', 'settings')).toBe('הגדרות');
        expect(t('en', 'settings')).toBe('Settings');
      });

      it('should have field operation translations', () => {
        expect(t('he', 'saveFields')).toBe('שמור שדות');
        expect(t('en', 'saveFields')).toBe('Save Fields');

        expect(t('he', 'loadFields')).toBe('טען שדות');
        expect(t('en', 'loadFields')).toBe('Load Fields');

        expect(t('he', 'exportHtml')).toBe('ייצא HTML');
        expect(t('en', 'exportHtml')).toBe('Export HTML');
      });

      it('should have navigation translations', () => {
        expect(t('he', 'page')).toBe('עמוד');
        expect(t('en', 'page')).toBe('Page');

        expect(t('he', 'of')).toBe('מתוך');
        expect(t('en', 'of')).toBe('of');
      });

      it('should have zoom translations', () => {
        expect(t('he', 'zoomIn')).toBe('הגדל');
        expect(t('en', 'zoomIn')).toBe('Zoom In');

        expect(t('he', 'zoomOut')).toBe('הקטן');
        expect(t('en', 'zoomOut')).toBe('Zoom Out');
      });
    });

    describe('Tools bar translations', () => {
      it('should have field tool translations', () => {
        expect(t('he', 'textFieldTool')).toBe('שדה טקסט');
        expect(t('en', 'textFieldTool')).toBe('Text Field');

        expect(t('he', 'checkboxFieldTool')).toBe('תיבת סימון');
        expect(t('en', 'checkboxFieldTool')).toBe('Checkbox');

        expect(t('he', 'radioFieldTool')).toBe('כפתורי בחירה');
        expect(t('en', 'radioFieldTool')).toBe('Radio Buttons');

        expect(t('he', 'dropdownFieldTool')).toBe('רשימה נפתחת');
        expect(t('en', 'dropdownFieldTool')).toBe('Dropdown');

        expect(t('he', 'signatureFieldTool')).toBe('חתימה');
        expect(t('en', 'signatureFieldTool')).toBe('Signature');
      });

      it('should have select tool translation', () => {
        expect(t('he', 'selectTool')).toBe('בחירה');
        expect(t('en', 'selectTool')).toBe('Select');
      });
    });

    describe('Language selector translations', () => {
      it('should have language names', () => {
        expect(t('he', 'hebrew')).toBe('עברית');
        expect(t('en', 'hebrew')).toBe('עברית');

        expect(t('he', 'english')).toBe('English');
        expect(t('en', 'english')).toBe('English');
      });
    });

    describe('Theme translations', () => {
      it('should have dark mode translation', () => {
        expect(t('he', 'darkMode')).toBe('מצב כהה');
        expect(t('en', 'darkMode')).toBe('Dark Mode');
      });

      it('should have light mode translation', () => {
        expect(t('he', 'lightMode')).toBe('מצב בהיר');
        expect(t('en', 'lightMode')).toBe('Light Mode');
      });
    });

    describe('Common action translations', () => {
      it('should have common action translations', () => {
        expect(t('he', 'save')).toBe('שמור');
        expect(t('en', 'save')).toBe('Save');

        expect(t('he', 'cancel')).toBe('ביטול');
        expect(t('en', 'cancel')).toBe('Cancel');

        expect(t('he', 'delete')).toBe('מחק');
        expect(t('en', 'delete')).toBe('Delete');

        expect(t('he', 'confirm')).toBe('אישור');
        expect(t('en', 'confirm')).toBe('Confirm');

        expect(t('he', 'close')).toBe('סגור');
        expect(t('en', 'close')).toBe('Close');
      });
    });
  });
});
