import { describe, test, expect } from 'vitest';
import { detectLanguage } from '@/utils/language-detection';

describe('detectLanguage()', () => {
  describe('Mixed Language Text', () => {
    test('TC-ML-001: Hebrew + Arabic should return null', () => {
      const text = "שלום مرحبا Hello";
      expect(detectLanguage(text)).toBeNull();
    });

    test('TC-ML-002: Arabic dominant (85%) should detect Arabic', () => {
      const text = "مرحبا بكم في النظام שלום";
      expect(detectLanguage(text, 0.5)).toBe('ar');
    });

    test('TC-ML-003: Alternating words should return null', () => {
      const text = "Hello שלום مرحبا Goodbye להתראות مع السلامة";
      expect(detectLanguage(text)).toBeNull();
    });
  });

  describe('Unicode Edge Cases', () => {
    test('TC-ML-004: Hebrew with nikud should detect Hebrew', () => {
      const text = "שָׁלוֹם עָלֵיכֶם";
      expect(detectLanguage(text)).toBe('he');
    });

    test('TC-ML-005: Arabic with diacritics should detect Arabic', () => {
      const text = "مَرْحَبًا";
      expect(detectLanguage(text)).toBe('ar');
    });

    test('TC-ML-006: RTL/LTR marks should not affect detection', () => {
      const text = "English text with \u200F RTL marks";
      expect(detectLanguage(text)).toBe('en');
    });

    test('TC-ML-007: Emoji should be ignored', () => {
      const text = "שלום 😊😊😊😊😊😊😊😊😊😊";
      expect(detectLanguage(text)).toBe('he');
    });
  });

  describe('Boundary Cases', () => {
    test('TC-ML-008: Single Hebrew character should detect Hebrew', () => {
      expect(detectLanguage("ש")).toBe('he');
    });

    test('TC-ML-009: Empty string should return null', () => {
      expect(detectLanguage("")).toBeNull();
    });

    test('TC-ML-010: Numbers and punctuation should return null', () => {
      expect(detectLanguage("123!@# $%^")).toBeNull();
    });

    test('TC-ML-011: Whitespace-only should return null', () => {
      expect(detectLanguage("   \n\t  ")).toBeNull();
    });

    test('TC-ML-012: Very long text (10KB) should detect in <5ms', () => {
      const longText = "שלום".repeat(2000); // ~10KB
      const start = performance.now();
      detectLanguage(longText);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Threshold Cases', () => {
    test('TC-ML-013: Exactly 50/50 meets threshold (returns first matching)', () => {
      const text = "abcde אבגדה"; // 5 Latin, 5 Hebrew
      // With 0.5 threshold, 50% meets >= condition, returns first checked (Hebrew)
      expect(detectLanguage(text, 0.5)).toBe('he');
    });

    test('TC-ML-014: 50.1% Hebrew should detect Hebrew', () => {
      const text = "a".repeat(499) + "ש".repeat(501);
      expect(detectLanguage(text, 0.5)).toBe('he');
    });
  });
});
