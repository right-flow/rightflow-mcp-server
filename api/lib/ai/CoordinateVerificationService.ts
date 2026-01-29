/**
 * CoordinateVerificationService - Layer 3 of PDF Field Location Optimization
 *
 * Verifies AI-detected field positions by comparing with actual PDF text content.
 * Uses Hebrew-aware text comparison with normalization.
 */

/**
 * Verification result for a single field
 */
export interface FieldVerificationResult {
  fieldName: string;
  labelVerified: boolean;
  confidence: number;          // 0-1 overall confidence
  positionConfidence: number;  // 0-1 position accuracy
  extractedText?: string;      // Text found at the location
  expectedLabel?: string;      // Label we expected to find
  suggestedCorrection?: {
    xOffset: number;           // Suggested X adjustment in points
    yOffset: number;           // Suggested Y adjustment in points
  };
}

/**
 * Hebrew text normalization utilities
 */
export class HebrewTextNormalizer {
  /**
   * Hebrew nikud (vowel marks) Unicode range: U+0591 to U+05C7
   */
  private static readonly NIKUD_PATTERN = /[\u0591-\u05C7]/g;

  /**
   * Final letters mapping (sofit forms to regular)
   */
  private static readonly FINAL_LETTERS: Record<string, string> = {
    'ם': 'מ',  // Final Mem -> Mem
    'ן': 'נ',  // Final Nun -> Nun
    'ך': 'כ',  // Final Kaf -> Kaf
    'ף': 'פ',  // Final Pe -> Pe
    'ץ': 'צ',  // Final Tsadi -> Tsadi
  };

  /**
   * Remove nikud (vowel marks) from Hebrew text
   */
  static removeNikud(text: string): string {
    return text.replace(this.NIKUD_PATTERN, '');
  }

  /**
   * Normalize final letters to their regular forms
   */
  static normalizeFinalLetters(text: string): string {
    let result = text;
    for (const [final, regular] of Object.entries(this.FINAL_LETTERS)) {
      result = result.replace(new RegExp(final, 'g'), regular);
    }
    return result;
  }

  /**
   * Remove common punctuation and whitespace
   */
  static removePunctuation(text: string): string {
    return text.replace(/[\s\-_:;,.!?()[\]{}'"״׳]/g, '');
  }

  /**
   * Full normalization pipeline for Hebrew text comparison
   */
  static normalize(text: string): string {
    if (!text) return '';
    return this.removePunctuation(
      this.normalizeFinalLetters(
        this.removeNikud(text.trim())
      )
    ).toLowerCase();
  }
}

/**
 * Calculate text similarity using Levenshtein distance
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses normalized Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = calculateLevenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

/**
 * Calculate Hebrew-aware similarity score
 */
export function calculateHebrewSimilarity(text1: string, text2: string): number {
  const normalized1 = HebrewTextNormalizer.normalize(text1);
  const normalized2 = HebrewTextNormalizer.normalize(text2);
  return calculateSimilarity(normalized1, normalized2);
}

/**
 * Text item extracted from PDF with position
 */
export interface ExtractedTextItem {
  text: string;
  x: number;      // PDF points from left
  y: number;      // PDF points from bottom
  width: number;  // Approximate width
  height: number; // Approximate height
  pageNumber: number;
}

/**
 * Field position for verification
 */
export interface FieldPosition {
  name: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

/**
 * Page dimensions
 */
export interface PageDimensions {
  pageNumber: number;
  width: number;
  height: number;
}

/**
 * CoordinateVerificationService
 *
 * Verifies that AI-detected field positions match actual PDF content.
 */
export class CoordinateVerificationService {
  private readonly SIMILARITY_THRESHOLD = 0.6;
  private readonly SEARCH_RADIUS = 50; // Points to search around expected position

  /**
   * Verify a single field's position against extracted text
   */
  verifyFieldPosition(
    field: FieldPosition,
    textItems: ExtractedTextItem[],
  ): FieldVerificationResult {
    if (!field.label) {
      // No label to verify - assume position is correct
      return {
        fieldName: field.name,
        labelVerified: false,
        confidence: 0.5,
        positionConfidence: 0.5,
      };
    }

    // Find text items near the field's expected position
    const nearbyTexts = this.findTextsNearPosition(
      textItems,
      field.x,
      field.y,
      field.pageNumber,
      this.SEARCH_RADIUS
    );

    if (nearbyTexts.length === 0) {
      return {
        fieldName: field.name,
        labelVerified: false,
        confidence: 0.3,
        positionConfidence: 0.3,
        expectedLabel: field.label,
        extractedText: '(no text found nearby)',
      };
    }

    // Find the best matching text
    let bestMatch: { text: ExtractedTextItem; similarity: number } | null = null;

    for (const textItem of nearbyTexts) {
      const similarity = calculateHebrewSimilarity(field.label, textItem.text);
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { text: textItem, similarity };
      }
    }

    if (!bestMatch) {
      return {
        fieldName: field.name,
        labelVerified: false,
        confidence: 0.3,
        positionConfidence: 0.3,
        expectedLabel: field.label,
      };
    }

    const labelVerified = bestMatch.similarity >= this.SIMILARITY_THRESHOLD;

    // Calculate position offset if we found a match
    let suggestedCorrection: { xOffset: number; yOffset: number } | undefined;
    if (labelVerified && bestMatch.text) {
      const xOffset = bestMatch.text.x - field.x;
      const yOffset = bestMatch.text.y - field.y;
      if (Math.abs(xOffset) > 5 || Math.abs(yOffset) > 5) {
        suggestedCorrection = { xOffset, yOffset };
      }
    }

    return {
      fieldName: field.name,
      labelVerified,
      confidence: bestMatch.similarity,
      positionConfidence: labelVerified ? 0.8 : 0.4,
      extractedText: bestMatch.text.text,
      expectedLabel: field.label,
      suggestedCorrection,
    };
  }

  /**
   * Verify multiple fields
   */
  verifyFields(
    fields: FieldPosition[],
    textItems: ExtractedTextItem[],
  ): FieldVerificationResult[] {
    return fields.map(field => this.verifyFieldPosition(field, textItems));
  }

  /**
   * Find text items near a given position
   * For Hebrew (RTL), labels are typically to the RIGHT of input fields
   */
  private findTextsNearPosition(
    textItems: ExtractedTextItem[],
    x: number,
    y: number,
    pageNumber: number,
    radius: number,
  ): ExtractedTextItem[] {
    return textItems.filter(item => {
      if (item.pageNumber !== pageNumber) return false;

      // Calculate distance (allow wider horizontal search for RTL labels)
      const horizontalDistance = Math.abs(item.x - x);
      const verticalDistance = Math.abs(item.y - y);

      // For RTL forms, labels are often to the right, so expand search rightward
      const isRightOfField = item.x > x;
      const effectiveHorizontalRadius = isRightOfField ? radius * 1.5 : radius;

      return horizontalDistance <= effectiveHorizontalRadius && verticalDistance <= radius;
    });
  }

  /**
   * Search for specific text in a wider area (for correction suggestions)
   */
  searchForTextNearby(
    textItems: ExtractedTextItem[],
    label: string,
    x: number,
    y: number,
    pageNumber: number,
    maxRadius: number = 100,
  ): { found: boolean; position?: { x: number; y: number } } {
    const pageTexts = textItems.filter(item => item.pageNumber === pageNumber);

    let bestMatch: { text: ExtractedTextItem; similarity: number } | null = null;

    for (const textItem of pageTexts) {
      const distance = Math.sqrt(
        Math.pow(textItem.x - x, 2) + Math.pow(textItem.y - y, 2)
      );

      if (distance > maxRadius) continue;

      const similarity = calculateHebrewSimilarity(label, textItem.text);
      if (similarity >= this.SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { text: textItem, similarity };
        }
      }
    }

    if (bestMatch) {
      return {
        found: true,
        position: { x: bestMatch.text.x, y: bestMatch.text.y },
      };
    }

    return { found: false };
  }
}

/**
 * Calculate overall verification confidence for a set of results
 */
export function calculateOverallConfidence(results: FieldVerificationResult[]): number {
  if (results.length === 0) return 0;

  const verifiedCount = results.filter(r => r.labelVerified).length;
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  // Weight: 60% verification rate, 40% average confidence
  return (verifiedCount / results.length) * 0.6 + avgConfidence * 0.4;
}
