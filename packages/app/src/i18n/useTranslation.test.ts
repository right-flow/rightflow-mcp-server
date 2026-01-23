import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranslation, useDirection } from './useTranslation';
import { useAppStore } from '@/store/appStore';

describe('useTranslation hook', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAppStore.setState({
      language: 'he',
      theme: 'light',
    });
  });

  describe('useTranslation', () => {
    it('should return Hebrew translations when language is Hebrew', () => {
      const { result } = renderHook(() => useTranslation());

      expect(result.current.uploadPdf).toBe('העלה PDF');
      expect(result.current.settings).toBe('הגדרות');
    });

    it('should return English translations when language is English', () => {
      // Set language to English
      act(() => {
        useAppStore.getState().setLanguage('en');
      });

      const { result } = renderHook(() => useTranslation());

      expect(result.current.uploadPdf).toBe('Upload PDF');
      expect(result.current.settings).toBe('Settings');
    });

    it('should update translations when language changes', () => {
      const { result, rerender } = renderHook(() => useTranslation());

      // Initially Hebrew
      expect(result.current.uploadPdf).toBe('העלה PDF');

      // Change to English
      act(() => {
        useAppStore.getState().setLanguage('en');
      });

      rerender();

      // Now should be English
      expect(result.current.uploadPdf).toBe('Upload PDF');
    });

    it('should have all required translation keys', () => {
      const { result } = renderHook(() => useTranslation());

      // Check that key translation keys exist
      expect(result.current.appTitle).toBeDefined();
      expect(result.current.poweredBy).toBeDefined();
      expect(result.current.uploadPdf).toBeDefined();
      expect(result.current.savePdf).toBeDefined();
      expect(result.current.settings).toBeDefined();
      expect(result.current.textFieldTool).toBeDefined();
      expect(result.current.checkboxFieldTool).toBeDefined();
      expect(result.current.radioFieldTool).toBeDefined();
      expect(result.current.dropdownFieldTool).toBeDefined();
      expect(result.current.signatureFieldTool).toBeDefined();
      expect(result.current.selectTool).toBeDefined();
      expect(result.current.darkMode).toBeDefined();
      expect(result.current.lightMode).toBeDefined();
    });
  });

  describe('useDirection', () => {
    it('should return rtl when language is Hebrew', () => {
      const { result } = renderHook(() => useDirection());

      expect(result.current).toBe('rtl');
    });

    it('should return ltr when language is English', () => {
      // Set language to English
      act(() => {
        useAppStore.getState().setLanguage('en');
      });

      const { result } = renderHook(() => useDirection());

      expect(result.current).toBe('ltr');
    });

    it('should update direction when language changes', () => {
      const { result, rerender } = renderHook(() => useDirection());

      // Initially RTL (Hebrew)
      expect(result.current).toBe('rtl');

      // Change to English
      act(() => {
        useAppStore.getState().setLanguage('en');
      });

      rerender();

      // Now should be LTR
      expect(result.current).toBe('ltr');
    });

    it('should switch back to rtl when changing to Hebrew', () => {
      // Start with English
      act(() => {
        useAppStore.getState().setLanguage('en');
      });

      const { result, rerender } = renderHook(() => useDirection());
      expect(result.current).toBe('ltr');

      // Change back to Hebrew
      act(() => {
        useAppStore.getState().setLanguage('he');
      });

      rerender();

      expect(result.current).toBe('rtl');
    });
  });

  describe('combined usage', () => {
    it('should provide correct translations and direction together', () => {
      const { result: translationResult } = renderHook(() => useTranslation());
      const { result: directionResult } = renderHook(() => useDirection());

      // Hebrew state
      expect(translationResult.current.uploadPdf).toBe('העלה PDF');
      expect(directionResult.current).toBe('rtl');
    });

    it('should update both when language changes', () => {
      const { result: translationResult, rerender: rerenderTranslation } = renderHook(
        () => useTranslation(),
      );
      const { result: directionResult, rerender: rerenderDirection } = renderHook(
        () => useDirection(),
      );

      // Change to English
      act(() => {
        useAppStore.getState().setLanguage('en');
      });

      rerenderTranslation();
      rerenderDirection();

      expect(translationResult.current.uploadPdf).toBe('Upload PDF');
      expect(directionResult.current).toBe('ltr');
    });
  });
});
