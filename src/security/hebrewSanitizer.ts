/**
 * Hebrew Sanitizer - Security Component
 *
 * Prevents BiDi attacks and ensures safe Hebrew text processing.
 *
 * Security Features:
 * - BiDi control character removal (U+202A-202E, U+2066-2069, U+200E-200F, U+061C)
 * - Zero-width character removal (U+200B-200D)
 * - Unicode normalization (NFC)
 * - Homograph attack detection (mixed scripts)
 * - Hebrew text validation
 * - Batch sanitization
 *
 * @example Basic usage
 * ```typescript
 * const sanitizer = new HebrewSanitizer();
 * const safe = sanitizer.sanitize('text\u202Emalicious'); // Removes BiDi override
 * ```
 *
 * @example Homograph detection
 * ```typescript
 * const sanitizer = new HebrewSanitizer({ detectHomographs: true });
 * sanitizer.sanitize('pay\u0430al'); // Throws HebrewSecurityError (Cyrillic 'а')
 * ```
 */

/**
 * Hebrew sanitizer configuration options
 */
export interface HebrewSanitizerConfig {
  /** Remove BiDi control characters (default: true) */
  removeBiDi?: boolean;
  /** Remove zero-width characters (default: true) */
  removeZeroWidth?: boolean;
  /** Normalize Unicode to NFC form (default: false) */
  normalizeUnicode?: boolean;
  /** Detect homograph attacks (default: false) */
  detectHomographs?: boolean;
}

/**
 * Error codes for Hebrew security violations
 */
export const HebrewSecurityErrorCodes = {
  HOMOGRAPH_ATTACK: "HOMOGRAPH_ATTACK",
} as const;

export type HebrewSecurityErrorCode =
  (typeof HebrewSecurityErrorCodes)[keyof typeof HebrewSecurityErrorCodes];

/**
 * Error thrown when Hebrew security violations are detected
 */
export class HebrewSecurityError extends Error {
  constructor(
    message: string,
    public code: HebrewSecurityErrorCode,
    public detectedScripts?: string[]
  ) {
    super(message);
    this.name = "HebrewSecurityError";
  }
}

/**
 * BiDi control characters to remove
 * These can be used for text direction spoofing attacks
 */
const BIDI_CONTROL_CHARS =
  /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g;

/**
 * Zero-width characters to remove
 * These can be used to hide malicious text
 */
const ZERO_WIDTH_CHARS = /[\u200B-\u200D]/g;

/**
 * Unicode script detection patterns
 */
const SCRIPT_PATTERNS = {
  Latin: /[\u0041-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F]/,
  Cyrillic: /[\u0400-\u04FF]/,
  Hebrew: /[\u0590-\u05FF]/,
  Arabic: /[\u0600-\u06FF]/,
  Greek: /[\u0370-\u03FF]/,
  Common: /[\u0020-\u0040\u005B-\u0060\u007B-\u007E\u0030-\u0039]/,
} as const;

/**
 * Hebrew Sanitizer - Prevents BiDi attacks and homograph attacks
 *
 * Implements comprehensive Hebrew text security:
 * - Removes dangerous BiDi control characters that can spoof text direction
 * - Removes zero-width characters that can hide malicious content
 * - Optionally normalizes Unicode to prevent visual spoofing
 * - Optionally detects homograph attacks (mixed scripts)
 *
 * Common attack scenarios prevented:
 * - Filename spoofing (document.pdf showing as document.exe)
 * - Hidden text injection (using zero-width spaces)
 * - Domain spoofing (paypal vs pay\u0430al with Cyrillic 'а')
 * - RTL/LTR text direction manipulation
 */
export class HebrewSanitizer {
  private readonly config: Required<HebrewSanitizerConfig>;

  /**
   * Create a new Hebrew Sanitizer
   *
   * @param config - Sanitizer configuration
   *
   * @example
   * ```typescript
   * const sanitizer = new HebrewSanitizer({
   *   removeBiDi: true,
   *   removeZeroWidth: true,
   *   normalizeUnicode: true,
   *   detectHomographs: true,
   * });
   * ```
   */
  constructor(config: HebrewSanitizerConfig = {}) {
    this.config = {
      removeBiDi: config.removeBiDi ?? true,
      removeZeroWidth: config.removeZeroWidth ?? true,
      normalizeUnicode: config.normalizeUnicode ?? false,
      detectHomographs: config.detectHomographs ?? false,
    };
  }

  /**
   * Sanitize Hebrew text
   *
   * Removes dangerous control characters and optionally detects security threats.
   *
   * @param text - Text to sanitize
   * @returns Sanitized text
   * @throws HebrewSecurityError if security violations detected
   *
   * @example
   * ```typescript
   * const sanitizer = new HebrewSanitizer();
   * const safe = sanitizer.sanitize('text\u202Emalicious');
   * // Returns: "textmalicious" (BiDi override removed)
   * ```
   */
  sanitize(text: string): string {
    let result = text;

    // 1. Detect homograph attacks FIRST (before sanitization)
    if (this.config.detectHomographs) {
      this.detectHomographAttack(result);
    }

    // 2. Remove BiDi control characters
    if (this.config.removeBiDi) {
      result = this.removeBiDiChars(result);
    }

    // 3. Remove zero-width characters
    if (this.config.removeZeroWidth) {
      result = this.removeZeroWidthChars(result);
    }

    // 4. Normalize Unicode
    if (this.config.normalizeUnicode) {
      result = this.normalizeUnicode(result);
    }

    return result;
  }

  /**
   * Sanitize multiple strings in batch
   *
   * @param texts - Array of texts to sanitize
   * @returns Array of sanitized texts
   * @throws HebrewSecurityError on first security violation
   *
   * @example
   * ```typescript
   * const sanitizer = new HebrewSanitizer();
   * const results = sanitizer.sanitizeBatch(['text\u202E', 'more\u200B']);
   * // Returns: ['text', 'more']
   * ```
   */
  sanitizeBatch(texts: string[]): string[] {
    return texts.map((text) => this.sanitize(text));
  }

  /**
   * Remove BiDi control characters
   *
   * Removes:
   * - U+202A-202E (LRE, RLE, PDF, LRO, RLO)
   * - U+2066-2069 (LRI, RLI, FSI, PDI)
   * - U+200E-200F (LRM, RLM)
   * - U+061C (ALM)
   *
   * @param text - Text to process
   * @returns Text with BiDi characters removed
   */
  private removeBiDiChars(text: string): string {
    return text.replace(BIDI_CONTROL_CHARS, "");
  }

  /**
   * Remove zero-width characters
   *
   * Removes:
   * - U+200B (ZERO WIDTH SPACE)
   * - U+200C (ZERO WIDTH NON-JOINER)
   * - U+200D (ZERO WIDTH JOINER)
   *
   * @param text - Text to process
   * @returns Text with zero-width characters removed
   */
  private removeZeroWidthChars(text: string): string {
    return text.replace(ZERO_WIDTH_CHARS, "");
  }

  /**
   * Normalize Unicode to NFC form
   *
   * Converts decomposed characters (NFD) to composed form (NFC)
   * to prevent visual spoofing with combining characters.
   *
   * @param text - Text to normalize
   * @returns Normalized text
   */
  private normalizeUnicode(text: string): string {
    return text.normalize("NFC");
  }

  /**
   * Detect homograph attacks (mixed scripts)
   *
   * Checks if text contains characters from multiple scripts
   * that could be used for visual spoofing (e.g., Cyrillic 'а'
   * mixed with Latin characters).
   *
   * Allowed combinations:
   * - Latin + Common (numbers, punctuation)
   * - Hebrew + Common
   * - Hebrew + Latin + Common
   *
   * Rejected combinations:
   * - Any script + Cyrillic (common attack vector)
   * - Three or more non-Common scripts mixed together
   *
   * @param text - Text to check
   * @throws HebrewSecurityError if homograph attack detected
   */
  private detectHomographAttack(text: string): void {
    const detectedScripts = this.detectScripts(text);

    // Filter out "Common" script (numbers, punctuation, spaces)
    const nonCommonScripts = detectedScripts.filter(
      (script) => script !== "Common"
    );

    // Allow single script or no scripts
    if (nonCommonScripts.length <= 1) {
      return;
    }

    // Allow Hebrew + Latin combination (common in Israeli context)
    if (
      nonCommonScripts.length === 2 &&
      nonCommonScripts.includes("Hebrew") &&
      nonCommonScripts.includes("Latin")
    ) {
      return;
    }

    // Reject any combination involving Cyrillic (common attack vector)
    if (nonCommonScripts.includes("Cyrillic")) {
      throw new HebrewSecurityError(
        `Homograph attack detected: mixed scripts (${nonCommonScripts.join(", ")})`,
        HebrewSecurityErrorCodes.HOMOGRAPH_ATTACK,
        nonCommonScripts
      );
    }

    // Reject any other multi-script combination
    if (nonCommonScripts.length > 2) {
      throw new HebrewSecurityError(
        `Homograph attack detected: mixed scripts (${nonCommonScripts.join(", ")})`,
        HebrewSecurityErrorCodes.HOMOGRAPH_ATTACK,
        nonCommonScripts
      );
    }
  }

  /**
   * Detect which scripts are present in the text
   *
   * @param text - Text to analyze
   * @returns Array of detected script names
   */
  private detectScripts(text: string): string[] {
    const scripts = new Set<string>();

    for (const char of text) {
      for (const [scriptName, pattern] of Object.entries(SCRIPT_PATTERNS)) {
        if (pattern.test(char)) {
          scripts.add(scriptName);
          break;
        }
      }
    }

    return Array.from(scripts);
  }
}
