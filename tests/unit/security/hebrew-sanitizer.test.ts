/**
 * Hebrew Sanitizer - Security Tests
 *
 * TDD Stage 1 (RED): Write failing tests
 * Status: Tests written, implementation pending
 *
 * TDD Workflow:
 * 1. RED: Run this test - it should FAIL (no implementation yet)
 * 2. GREEN: Implement HebrewSanitizer to make tests pass
 * 3. REFACTOR: Improve implementation quality
 * 4. QA: Run `npm run qa:stage2`
 */

import { describe, it, expect } from "vitest";
import {
  HebrewSanitizer,
  HebrewSecurityError,
} from "../../../src/security/hebrewSanitizer.js";

describe("HebrewSanitizer", () => {
  describe("BiDi Control Character Removal", () => {
    it("should remove BiDi override characters (U+202A-202E)", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "text\u202Emalicious\u202C";
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain("\u202E"); // RIGHT-TO-LEFT OVERRIDE
      expect(result).not.toContain("\u202C"); // POP DIRECTIONAL FORMATTING
      expect(result).toBe("textmalicious");
    });

    it("should remove BiDi isolate characters (U+2066-2069)", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "\u2066text\u2069";
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain("\u2066"); // LEFT-TO-RIGHT ISOLATE
      expect(result).not.toContain("\u2069"); // POP DIRECTIONAL ISOLATE
      expect(result).toBe("text");
    });

    it("should remove LTR/RTL marks (U+200E, U+200F)", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "text\u200Emore\u200F";
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain("\u200E"); // LEFT-TO-RIGHT MARK
      expect(result).not.toContain("\u200F"); // RIGHT-TO-LEFT MARK
      expect(result).toBe("textmore");
    });

    it("should remove Arabic letter mark (U+061C)", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "text\u061Cmore";
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain("\u061C"); // ARABIC LETTER MARK
      expect(result).toBe("textmore");
    });

    it("should remove all BiDi characters in one pass", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069\u200E\u200F\u061Ctext";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("text");
    });
  });

  describe("Zero-Width Character Removal", () => {
    it("should remove zero-width space (U+200B)", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "te\u200Bxt";
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain("\u200B"); // ZERO WIDTH SPACE
      expect(result).toBe("text");
    });

    it("should remove zero-width joiner (U+200D)", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "te\u200Dxt";
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain("\u200D"); // ZERO WIDTH JOINER
      expect(result).toBe("text");
    });

    it("should remove zero-width non-joiner (U+200C)", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "te\u200Cxt";
      const result = sanitizer.sanitize(input);

      expect(result).not.toContain("\u200C"); // ZERO WIDTH NON-JOINER
      expect(result).toBe("text");
    });

    it("should remove multiple zero-width characters", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "t\u200Be\u200Cx\u200Dt";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("text");
    });
  });

  describe("Hebrew Text Validation", () => {
    it("should allow valid Hebrew text", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "שלום";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("שלום");
    });

    it("should allow Hebrew with nikud (vowel marks)", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "שָׁלוֹם";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("שָׁלוֹם");
    });

    it("should allow mixed Hebrew and English", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "Hello שלום World";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("Hello שלום World");
    });

    it("should allow Hebrew with numbers", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "מספר 123";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("מספר 123");
    });

    it("should allow Hebrew with punctuation", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "שלום, מה נשמע?";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("שלום, מה נשמע?");
    });
  });

  describe("Unicode Normalization", () => {
    it("should normalize to NFC form by default", () => {
      const sanitizer = new HebrewSanitizer({ normalizeUnicode: true });

      // Decomposed form (NFD) vs Composed form (NFC)
      const decomposed = "e\u0301"; // é as e + combining acute accent
      const result = sanitizer.sanitize(decomposed);

      // Should be normalized to composed form
      expect(result).toBe("é");
      expect(result.length).toBe(1);
    });

    it("should normalize Hebrew with combining marks", () => {
      const sanitizer = new HebrewSanitizer({ normalizeUnicode: true });

      const input = "\u05E9\u05B8\u05C1"; // shin + qamats + shin dot
      const result = sanitizer.sanitize(input);

      // Should be normalized to NFC
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should allow disabling normalization", () => {
      const sanitizer = new HebrewSanitizer({ normalizeUnicode: false });

      const decomposed = "e\u0301";
      const result = sanitizer.sanitize(decomposed);

      // Should NOT be normalized
      expect(result.length).toBe(2);
    });
  });

  describe("Homograph Attack Detection", () => {
    it("should detect Cyrillic mixed with Latin", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      // "paypal" with Cyrillic 'a' (U+0430) instead of Latin 'a'
      const input = "p\u0430ypal"; // Cyrillic 'а' looks like Latin 'a'

      expect(() => sanitizer.sanitize(input)).toThrow(HebrewSecurityError);
    });

    it("should allow pure Latin text", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      const input = "paypal";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("paypal");
    });

    it("should allow pure Hebrew text", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      const input = "שלום";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("שלום");
    });

    it("should allow Hebrew mixed with Latin (valid)", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      const input = "Hello שלום";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("Hello שלום");
    });

    it("should reject Hebrew mixed with Cyrillic", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      const input = "שלום п"; // Hebrew + Cyrillic 'п'

      expect(() => sanitizer.sanitize(input)).toThrow(HebrewSecurityError);
    });

    it("should allow disabling homograph detection", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: false });

      const input = "p\u0430ypal"; // Mixed scripts
      const result = sanitizer.sanitize(input);

      expect(result).toBeDefined();
    });
  });

  describe("Security Error Codes", () => {
    it("should provide error code for homograph attack", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      try {
        sanitizer.sanitize("test\u0430"); // Latin + Cyrillic
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HebrewSecurityError);
        expect((error as HebrewSecurityError).code).toBe("HOMOGRAPH_ATTACK");
      }
    });

    it("should include detected scripts in error message", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      try {
        sanitizer.sanitize("test\u0430");
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as HebrewSecurityError).message).toContain("Latin");
        expect((error as HebrewSecurityError).message).toContain("Cyrillic");
      }
    });
  });

  describe("Configuration Options", () => {
    it("should apply all sanitization by default", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "text\u202E\u200B";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("text");
    });

    it("should allow disabling BiDi removal", () => {
      const sanitizer = new HebrewSanitizer({ removeBiDi: false });

      const input = "text\u202E";
      const result = sanitizer.sanitize(input);

      expect(result).toContain("\u202E");
    });

    it("should allow disabling zero-width removal", () => {
      const sanitizer = new HebrewSanitizer({ removeZeroWidth: false });

      const input = "te\u200Bxt";
      const result = sanitizer.sanitize(input);

      expect(result).toContain("\u200B");
    });

    it("should support custom configuration", () => {
      const sanitizer = new HebrewSanitizer({
        removeBiDi: true,
        removeZeroWidth: true,
        normalizeUnicode: true,
        detectHomographs: false,
      });

      const input = "text\u202E\u200B";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("text");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings", () => {
      const sanitizer = new HebrewSanitizer();

      const result = sanitizer.sanitize("");
      expect(result).toBe("");
    });

    it("should handle strings with only control characters", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "\u202E\u200B\u200C";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("");
    });

    it("should handle very long Hebrew text", () => {
      const sanitizer = new HebrewSanitizer();

      const longText = "שלום ".repeat(1000);
      const result = sanitizer.sanitize(longText);

      expect(result).toBe(longText);
      expect(result.length).toBe(longText.length);
    });

    it("should handle text with only spaces", () => {
      const sanitizer = new HebrewSanitizer();

      const input = "   ";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("   ");
    });

    it("should preserve Hebrew gershayim and geresh", () => {
      const sanitizer = new HebrewSanitizer();

      const input = 'ת"א'; // Tel Aviv abbreviation with gershayim
      const result = sanitizer.sanitize(input);

      expect(result).toBe('ת"א');
    });
  });

  describe("Real-World Attack Scenarios", () => {
    it("should prevent filename spoofing attack", () => {
      const sanitizer = new HebrewSanitizer();

      // Attacker tries to hide .exe extension using BiDi override
      const input = "document\u202Eexe.pdf";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("documentexe.pdf");
      expect(result).not.toContain("\u202E");
    });

    it("should prevent hidden text injection", () => {
      const sanitizer = new HebrewSanitizer();

      // Attacker injects hidden text using zero-width spaces
      const input = "normal\u200Bhidden\u200Btext";
      const result = sanitizer.sanitize(input);

      expect(result).toBe("normalhiddentext");
    });

    it("should prevent domain spoofing", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      // Attacker uses Cyrillic 'о' instead of Latin 'o'
      const input = "g\u043E\u043Egle.com"; // Cyrillic о (twice)

      expect(() => sanitizer.sanitize(input)).toThrow(HebrewSecurityError);
    });
  });

  describe("Batch Sanitization", () => {
    it("should sanitize array of strings", () => {
      const sanitizer = new HebrewSanitizer();

      const inputs = ["text\u202E", "more\u200B", "clean"];
      const results = sanitizer.sanitizeBatch(inputs);

      expect(results).toEqual(["text", "more", "clean"]);
    });

    it("should handle empty array", () => {
      const sanitizer = new HebrewSanitizer();

      const results = sanitizer.sanitizeBatch([]);
      expect(results).toEqual([]);
    });

    it("should throw on first error in batch with detectHomographs", () => {
      const sanitizer = new HebrewSanitizer({ detectHomographs: true });

      const inputs = ["clean", "bad\u0430", "more"];

      expect(() => sanitizer.sanitizeBatch(inputs)).toThrow(HebrewSecurityError);
    });
  });
});
