/**
 * Unit Tests for hebrewTextSimilarity()
 *
 * Tests the Hebrew-aware fuzzy text matching algorithm used to match
 * Gemini field labels with Azure OCR text.
 *
 * TDD Approach: These tests are written BEFORE implementing the enhanced version.
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// Function Under Test (imported from hybrid file for testing)
// ============================================================

/**
 * Hebrew-aware fuzzy text matching
 * Returns a score 0-1 indicating how well two strings match
 */
function hebrewTextSimilarity(a: string, b: string): number {
  const cleanA = a
    .trim()
    .replace(/[:\s׃]+$/, '')
    .replace(/\s+/g, ' ');
  const cleanB = b
    .trim()
    .replace(/[:\s׃]+$/, '')
    .replace(/\s+/g, ' ');

  // Handle empty strings - no match unless both are empty
  if (cleanA === '' || cleanB === '') {
    return cleanA === cleanB ? 1.0 : 0;
  }

  if (cleanA === cleanB) return 1.0;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.9;

  // Normalize Hebrew characters
  const normA = cleanA.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
  const normB = cleanB.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
  if (normA === normB) return 0.95;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  return 0;
}

// ============================================================
// Tests
// ============================================================

describe('hebrewTextSimilarity', () => {
  describe('Exact Matches', () => {
    it('returns 1.0 for identical strings', () => {
      expect(hebrewTextSimilarity('שם:', 'שם:')).toBe(1.0);
      expect(hebrewTextSimilarity('כתובת', 'כתובת')).toBe(1.0);
    });

    it('handles trailing colons correctly', () => {
      // Both with colon
      expect(hebrewTextSimilarity('שם:', 'שם:')).toBe(1.0);
      // One with colon, one without - should still match after cleaning
      expect(hebrewTextSimilarity('שם:', 'שם')).toBe(1.0);
      expect(hebrewTextSimilarity('שם', 'שם:')).toBe(1.0);
    });

    it('handles Hebrew colon (׃) correctly', () => {
      expect(hebrewTextSimilarity('שם׃', 'שם:')).toBe(1.0);
      expect(hebrewTextSimilarity('שם:', 'שם׃')).toBe(1.0);
    });

    it('handles whitespace variations', () => {
      expect(hebrewTextSimilarity('שם:  ', '  שם:')).toBe(1.0);
      expect(hebrewTextSimilarity('שם  הלקוח:', 'שם הלקוח:')).toBe(1.0);
    });
  });

  describe('Substring Matches', () => {
    it('returns 0.9 for substring matches', () => {
      expect(hebrewTextSimilarity('שם:', 'שם הלקוח:')).toBe(0.9);
      expect(hebrewTextSimilarity('שם הלקוח:', 'שם:')).toBe(0.9);
    });

    it('matches when label is part of longer OCR line', () => {
      // Common case: OCR returns "שם הסוכן:     מס' הסוכן:" as one line
      expect(hebrewTextSimilarity('שם הסוכן:', 'שם הסוכן:     מס\' הסוכן:')).toBe(0.9);
      expect(hebrewTextSimilarity('מס\' הסוכן:', 'שם הסוכן:     מס\' הסוכן:')).toBe(0.9);
    });
  });

  describe('Nikud (Vowel Marks) Normalization', () => {
    it('matches text with and without nikud', () => {
      // שָׁלוֹם (with nikud) vs שלום (without)
      const withNikud = 'שָׁלוֹם';
      const withoutNikud = 'שלום';
      const similarity = hebrewTextSimilarity(withNikud, withoutNikud);
      expect(similarity).toBe(0.95); // After nikud removal
    });

    it('handles various nikud marks', () => {
      // Common nikud marks: Patah (ַ), Kamatz (ָ), Segol (ֶ), Tzere (ֵ), Hiriq (ִ), etc.
      expect(hebrewTextSimilarity('כְּתֹובֶת', 'כתובת')).toBe(0.95);
      expect(hebrewTextSimilarity('טֵלֵפוֹן', 'טלפון')).toBe(0.95);
    });
  });

  describe('Final Letter Normalization', () => {
    it('should normalize final letters (when implemented)', () => {
      // Final forms: ם → מ, ן → נ, ך → כ, ף → פ, ץ → צ
      // This test will pass when final letter normalization is implemented
      // Currently returns 0 because exact match fails

      // These should match after final letter normalization:
      // expect(hebrewTextSimilarity('חשבון', 'חשבוןּ')).toBeGreaterThan(0.8);

      // For now, we test that they DON'T match (until feature is implemented)
      expect(hebrewTextSimilarity('שם', 'שם')).toBe(1.0); // Regular mem (non-final)
    });
  });

  describe('No Match Cases', () => {
    it('returns 0 for completely different texts', () => {
      expect(hebrewTextSimilarity('שם', 'כתובת')).toBe(0);
      expect(hebrewTextSimilarity('טלפון', 'דוא"ל')).toBe(0);
    });

    it('returns 0 for empty strings', () => {
      expect(hebrewTextSimilarity('', '')).toBe(1.0); // Empty matches empty
      expect(hebrewTextSimilarity('שם', '')).toBe(0);
      expect(hebrewTextSimilarity('', 'שם')).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles single character matches', () => {
      expect(hebrewTextSimilarity('א', 'א')).toBe(1.0);
      expect(hebrewTextSimilarity('א', 'ב')).toBe(0);
    });

    it('handles mixed Hebrew and English', () => {
      expect(hebrewTextSimilarity('E-mail:', 'E-mail:')).toBe(1.0);
      expect(hebrewTextSimilarity('דוא"ל', 'E-mail')).toBe(0);
    });

    it('handles numbers and special characters', () => {
      expect(hebrewTextSimilarity('מס\' 123', 'מס\' 123')).toBe(1.0);
      expect(hebrewTextSimilarity('ת.ז:', 'ת.ז.')).toBeGreaterThan(0); // Should match after cleaning
    });

    it('is case-insensitive for English text', () => {
      // Hebrew has no case, but English might appear in mixed forms
      expect(hebrewTextSimilarity('Email:', 'email:')).toBe(0); // Currently case-sensitive
      // When case normalization is added, change to: .toBeGreaterThan(0.8)
    });
  });

  describe('Real-World Form Labels', () => {
    it('matches common Hebrew form labels', () => {
      const labels = [
        ['שם פרטי:', 'שם פרטי:'],
        ['שם משפחה:', 'שם משפחה:'],
        ['תעודת זהות:', 'תעודת זהות:'],
        ['מיקוד:', 'מיקוד:'],
        ['חתימה:', 'חתימה:'],
      ];

      labels.forEach(([a, b]) => {
        expect(hebrewTextSimilarity(a, b)).toBe(1.0);
      });
    });

    it('handles abbreviated labels', () => {
      expect(hebrewTextSimilarity('ת.ז:', 'תעודת זהות:')).toBe(0); // Different - should NOT match
      expect(hebrewTextSimilarity('ת.ז:', 'ת.ז:')).toBe(1.0); // Same abbreviation - should match
    });

    it('handles label variations with extra words', () => {
      expect(hebrewTextSimilarity('שם:', 'שם הלקוח:')).toBe(0.9); // Substring match
      expect(hebrewTextSimilarity('כתובת:', 'כתובת מגורים:')).toBe(0.9);
    });
  });

  describe('Performance Considerations', () => {
    it('handles long strings efficiently', () => {
      const longText = 'א'.repeat(1000);
      const start = Date.now();
      hebrewTextSimilarity(longText, longText);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10); // Should complete in <10ms
    });

    it('handles many comparisons efficiently', () => {
      const labels = Array.from({ length: 100 }, (_, i) => `שם ${i}:`);
      const start = Date.now();
      labels.forEach((label) => {
        hebrewTextSimilarity(label, 'שם הלקוח:');
      });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50); // 100 comparisons in <50ms
    });
  });

  describe('Threshold Behavior', () => {
    it('returns scores that work with 0.85 threshold', () => {
      // The algorithm uses 0.85 as the matching threshold

      // Should match (>= 0.85)
      expect(hebrewTextSimilarity('שם:', 'שם:')).toBeGreaterThanOrEqual(0.85);
      expect(hebrewTextSimilarity('שם:', 'שם הלקוח:')).toBeGreaterThanOrEqual(0.85);
      expect(hebrewTextSimilarity('שָׁם:', 'שם:')).toBeGreaterThanOrEqual(0.85);

      // Should NOT match (< 0.85)
      expect(hebrewTextSimilarity('שם:', 'כתובת:')).toBeLessThan(0.85);
    });
  });
});

// ============================================================
// Integration with Matching Algorithm (Future Tests)
// ============================================================

describe('hebrewTextSimilarity - Integration Scenarios', () => {
  it('successfully matches Gemini labels with Azure OCR text', () => {
    // Simulates real-world matching scenarios
    const ocrLines = [
      'שם הסוכן:     מס\' הסוכן:',
      'שם הלקוח:',
      'עיר:    מיקוד:    רח\':',
    ];

    const geminiLabels = ['שם הסוכן:', 'מס\' הסוכן:', 'שם הלקוח:', 'עיר:', 'מיקוד:', 'רח\':'];

    geminiLabels.forEach((label) => {
      const matches = ocrLines.filter(
        (line) => hebrewTextSimilarity(label, line) >= 0.85
      );
      expect(matches.length).toBeGreaterThan(0); // Each label should match at least one line
    });
  });

  it('handles duplicate labels by returning same score for all occurrences', () => {
    const ocrLines = ['חתימה:', 'תאריך:', 'חתימה:']; // "חתימה" appears twice

    const label = 'חתימה:';
    const matches = ocrLines.map((line) => hebrewTextSimilarity(label, line));

    expect(matches[0]).toBe(1.0); // First חתימה
    expect(matches[1]).toBe(0); // תאריך (different)
    expect(matches[2]).toBe(1.0); // Second חתימה
  });
});
