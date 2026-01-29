/**
 * Unit Tests for positionFieldFromLabel()
 *
 * Tests the core field positioning logic that matches Gemini labels
 * with Azure OCR text and calculates field positions.
 *
 * TDD Approach: These tests are written BEFORE implementing the enhanced version.
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// Types
// ============================================================

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GeminiField {
  labelText: string;
  fieldType: 'underline' | 'box_with_title' | 'digit_boxes' | 'table_cell' | 'title_right' | 'selection_mark';
  inputType: 'text' | 'checkbox' | 'radio' | 'signature' | 'dropdown' | 'date' | 'number';
  section?: string;
  required: boolean;
  visualDescription?: string;
  rowGroup?: string;
  relatedFields?: string[];
  hasVisibleBoundary?: boolean;
}

interface OcrTextLine {
  content: string;
  box: Box;
}

interface OcrWord {
  content: string;
  box: Box;
}

interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

interface PositionedField {
  type: string;
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  direction: 'rtl' | 'ltr';
  required: boolean;
  confidence: number;
  sectionName?: string;
  _source: {
    matchedText: string;
    matchScore: number;
    labelBox: Box;
    fieldType: string;
  };
}

// ============================================================
// Helper Functions (from other modules)
// ============================================================

function hebrewTextSimilarity(a: string, b: string): number {
  const cleanA = a.trim().replace(/[:\s׃]+$/, '').replace(/\s+/g, ' ');
  const cleanB = b.trim().replace(/[:\s׃]+$/, '').replace(/\s+/g, ' ');

  if (cleanA === '' || cleanB === '') {
    return cleanA === cleanB ? 1.0 : 0;
  }

  if (cleanA === cleanB) return 1.0;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.9;

  const normA = cleanA.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
  const normB = cleanB.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
  if (normA === normB) return 0.95;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  return 0;
}

// ============================================================
// Function Under Test
// ============================================================

/**
 * Position a field based on Gemini label and Azure OCR data
 *
 * @param geminiField - Field definition from Gemini
 * @param ocrLines - Text lines from Azure OCR
 * @param ocrWords - Individual words from Azure OCR
 * @param pageInfo - Page dimensions
 * @returns Positioned field with coordinates, or null if no match found
 */
function positionFieldFromLabel(
  geminiField: GeminiField,
  ocrLines: OcrTextLine[],
  ocrWords: OcrWord[],
  pageInfo: PageInfo,
): PositionedField | null {
  if (!ocrLines || ocrLines.length === 0) {
    return null;
  }

  const MATCH_THRESHOLD = 0.85;

  // Step 1: Try word-level matching first (for multi-field lines)
  let bestMatch: { text: string; box: Box; score: number } | null = null;

  if (ocrWords && ocrWords.length > 0) {
    for (const word of ocrWords) {
      const score = hebrewTextSimilarity(geminiField.labelText, word.content);
      if (score >= MATCH_THRESHOLD) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { text: word.content, box: word.box, score };
        }
      }
    }
  }

  // Step 2: Fall back to line-level matching if word matching failed
  if (!bestMatch) {
    for (const line of ocrLines) {
      const score = hebrewTextSimilarity(geminiField.labelText, line.content);
      if (score >= MATCH_THRESHOLD) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { text: line.content, box: line.box, score };
        }
      }
    }
  }

  // No match found
  if (!bestMatch) {
    return null;
  }

  // Step 3: Calculate field position and dimensions based on field type
  const labelBox = bestMatch.box;
  let fieldBox: Box;

  // Hebrew text is RTL, so field goes to the LEFT of the label
  const leftMargin = 50; // Minimum distance from left edge
  const labelGap = 5; // Small gap between label and field

  if (geminiField.inputType === 'signature') {
    // Signature fields are larger
    const width = Math.min(200, labelBox.x - leftMargin - labelGap);
    const height = 50;
    fieldBox = {
      x: labelBox.x - width - labelGap,
      y: labelBox.y,
      width,
      height,
    };
  } else if (geminiField.fieldType === 'digit_boxes') {
    // Digit boxes are narrower
    const width = Math.min(150, labelBox.x - leftMargin - labelGap);
    const height = 25;
    fieldBox = {
      x: labelBox.x - width - labelGap,
      y: labelBox.y,
      width,
      height,
    };
  } else {
    // Default text field (underline)
    const width = Math.min(200, labelBox.x - leftMargin - labelGap);
    const height = labelBox.height;
    fieldBox = {
      x: labelBox.x - width - labelGap,
      y: labelBox.y,
      width,
      height,
    };
  }

  // Ensure field stays within page bounds
  if (fieldBox.x < 0) {
    fieldBox.width = fieldBox.width + fieldBox.x;
    fieldBox.x = 0;
  }
  if (fieldBox.x + fieldBox.width > pageInfo.width) {
    fieldBox.width = pageInfo.width - fieldBox.x;
  }

  // Step 4: Generate field name from label text
  const cleanLabel = geminiField.labelText
    .replace(/[:\s׃]+$/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\u0590-\u05FF\w]/g, '');
  const fieldName = cleanLabel || `field_${Math.random().toString(36).substring(7)}`;

  // Step 5: Calculate confidence based on match score and position certainty
  // Higher confidence for exact matches, lower for substring matches
  const baseConfidence = bestMatch.score >= 1.0 ? 0.9 : 0.75;

  // Step 6: Build positioned field
  const positioned: PositionedField = {
    type: geminiField.inputType,
    name: fieldName,
    label: geminiField.labelText.replace(/[:\s׃]+$/g, ''),
    x: Math.round(fieldBox.x * 100) / 100,
    y: Math.round(fieldBox.y * 100) / 100,
    width: Math.round(fieldBox.width * 100) / 100,
    height: Math.round(fieldBox.height * 100) / 100,
    pageNumber: pageInfo.pageNumber,
    direction: 'rtl',
    required: geminiField.required,
    confidence: baseConfidence,
    _source: {
      matchedText: bestMatch.text,
      matchScore: bestMatch.score,
      labelBox: labelBox,
      fieldType: geminiField.fieldType,
    },
  };

  if (geminiField.section) {
    positioned.sectionName = geminiField.section;
  }

  return positioned;
}

// ============================================================
// Tests
// ============================================================

describe('positionFieldFromLabel', () => {
  const mockPageInfo: PageInfo = {
    pageNumber: 1,
    width: 595,
    height: 842,
  };

  describe('Label Matching', () => {
    it('matches exact label text', () => {
      const geminiField: GeminiField = {
        labelText: 'שם הלקוח:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם הלקוח:', box: { x: 450, y: 650, width: 80, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result?._source.matchedText).toBe('שם הלקוח:');
      expect(result?._source.matchScore).toBeGreaterThanOrEqual(0.85);
    });

    it('matches label without trailing colon', () => {
      const geminiField: GeminiField = {
        labelText: 'שם הלקוח:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם הלקוח', box: { x: 450, y: 650, width: 80, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result?._source.matchScore).toBeGreaterThanOrEqual(0.85);
    });

    it('matches label as substring of longer OCR line', () => {
      const geminiField: GeminiField = {
        labelText: 'שם הסוכן:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם הסוכן:     מס\' הסוכן:', box: { x: 300, y: 700, width: 200, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result?._source.matchScore).toBeGreaterThanOrEqual(0.85);
    });

    it('returns null for no match', () => {
      const geminiField: GeminiField = {
        labelText: 'תאריך:',
        fieldType: 'underline',
        inputType: 'date',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם הלקוח:', box: { x: 450, y: 650, width: 80, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).toBeNull();
    });

    it('returns best match when multiple candidates exist', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם הלקוח:', box: { x: 450, y: 650, width: 80, height: 20 } }, // Substring match (0.9)
        { content: 'שם:', box: { x: 450, y: 600, width: 40, height: 20 } }, // Exact match (1.0)
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result?._source.matchedText).toBe('שם:');
      expect(result?._source.matchScore).toBe(1.0);
    });
  });

  describe('Field Type - Underline', () => {
    it('positions field to the right of label for RTL text', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 450, y: 650, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      // Field should start to the LEFT of label (RTL direction)
      expect(result!.x).toBeLessThan(450);
      // Field should be on same Y line as label
      expect(result!.y).toBe(650);
      // Field should have reasonable width (100-300 for text field)
      expect(result!.width).toBeGreaterThanOrEqual(100);
      expect(result!.width).toBeLessThanOrEqual(300);
    });

    it('sets direction to rtl for Hebrew text', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 450, y: 650, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result!.direction).toBe('rtl');
    });

    it('calculates field width based on row space to left', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 400, y: 650, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      // Field should extend from left margin to label
      // If label starts at x=400, field should use space from ~50 to ~395
      expect(result!.x).toBeGreaterThanOrEqual(50);
      expect(result!.x).toBeLessThan(400);
      expect(result!.x + result!.width).toBeLessThanOrEqual(400);
    });
  });

  describe('Field Type - Digit Boxes', () => {
    it('creates narrower field for digit boxes', () => {
      const geminiField: GeminiField = {
        labelText: 'ת.ז:',
        fieldType: 'digit_boxes',
        inputType: 'number',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'ת.ז:', box: { x: 470, y: 500, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      // Digit boxes are typically narrower than text fields
      expect(result!.width).toBeGreaterThanOrEqual(80);
      expect(result!.width).toBeLessThanOrEqual(200);
    });

    it('sets appropriate height for digit boxes', () => {
      const geminiField: GeminiField = {
        labelText: 'טלפון:',
        fieldType: 'digit_boxes',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'טלפון:', box: { x: 450, y: 550, width: 50, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      // Digit boxes typically have slightly taller height to accommodate box borders
      expect(result!.height).toBeGreaterThanOrEqual(20);
      expect(result!.height).toBeLessThanOrEqual(30);
    });
  });

  describe('Field Type - Signature', () => {
    it('creates larger field for signature', () => {
      const geminiField: GeminiField = {
        labelText: 'חתימה:',
        fieldType: 'underline',
        inputType: 'signature',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'חתימה:', box: { x: 450, y: 450, width: 60, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      // Signature fields need larger dimensions
      expect(result!.width).toBeGreaterThanOrEqual(150);
      expect(result!.height).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Multi-Field Lines (Word-Level Matching)', () => {
    it('uses word-level matching for multi-field lines', () => {
      const geminiField: GeminiField = {
        labelText: 'מיקוד:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'עיר:    מיקוד:    רח\':', box: { x: 200, y: 600, width: 300, height: 20 } },
      ];

      const ocrWords: OcrWord[] = [
        { content: 'עיר:', box: { x: 470, y: 600, width: 30, height: 20 } },
        { content: 'מיקוד:', box: { x: 350, y: 600, width: 45, height: 20 } },
        { content: 'רח\':', box: { x: 210, y: 600, width: 30, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, ocrWords, mockPageInfo);

      expect(result).not.toBeNull();
      // Should match the word "מיקוד:" specifically
      expect(result?._source.matchedText).toBe('מיקוד:');
      // Field should be positioned relative to the word box, not the line box
      expect(result!.x).toBeLessThan(350); // To the left of the word at x=350
    });

    it('falls back to line matching when words not available', () => {
      const geminiField: GeminiField = {
        labelText: 'מיקוד:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'עיר:    מיקוד:    רח\':', box: { x: 200, y: 600, width: 300, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      // Should still find a match using line-level matching
      expect(result?._source.matchScore).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Metadata Population', () => {
    it('populates type correctly based on inputType', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 450, y: 650, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result!.type).toBe('text');
    });

    it('generates name from label text', () => {
      const geminiField: GeminiField = {
        labelText: 'שם הלקוח:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם הלקוח:', box: { x: 450, y: 650, width: 80, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result!.name).toBeTruthy();
      expect(result!.name.length).toBeGreaterThan(0);
    });

    it('populates required flag from Gemini field', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: false,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 450, y: 650, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result!.required).toBe(false);
    });

    it('populates section name from Gemini field', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
        section: 'פרטים אישיים',
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 450, y: 650, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result!.sectionName).toBe('פרטים אישיים');
    });

    it('populates _source metadata for debugging', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 450, y: 650, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result!._source).toBeDefined();
      expect(result!._source.matchedText).toBe('שם:');
      expect(result!._source.matchScore).toBe(1.0);
      expect(result!._source.labelBox).toEqual({ x: 450, y: 650, width: 40, height: 20 });
      expect(result!._source.fieldType).toBe('underline');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty OCR lines', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const result = positionFieldFromLabel(geminiField, [], [], mockPageInfo);

      expect(result).toBeNull();
    });

    it('handles label at page edge', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 550, y: 650, width: 40, height: 20 } }, // Very close to right edge
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      // Field should be positioned to the left, not extend beyond page
      expect(result!.x).toBeGreaterThanOrEqual(0);
      expect(result!.x + result!.width).toBeLessThanOrEqual(mockPageInfo.width);
    });

    it('handles very long label text', () => {
      const geminiField: GeminiField = {
        labelText: 'שם המוסד הרפואי אליו נשלחו התוצאות:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם המוסד הרפואי אליו נשלחו התוצאות:', box: { x: 300, y: 650, width: 250, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result!.width).toBeGreaterThan(0);
    });

    it('handles label with special characters', () => {
      const geminiField: GeminiField = {
        labelText: 'דוא"ל:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'דוא"ל:', box: { x: 450, y: 650, width: 50, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result?._source.matchScore).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Confidence Scoring', () => {
    it('sets higher confidence for exact match', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם:', box: { x: 450, y: 650, width: 40, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('sets lower confidence for substring match', () => {
      const geminiField: GeminiField = {
        labelText: 'שם:',
        fieldType: 'underline',
        inputType: 'text',
        required: true,
      };

      const ocrLines: OcrTextLine[] = [
        { content: 'שם הלקוח:', box: { x: 450, y: 650, width: 80, height: 20 } },
      ];

      const result = positionFieldFromLabel(geminiField, ocrLines, [], mockPageInfo);

      expect(result).not.toBeNull();
      // Substring match should have slightly lower confidence than exact match
      expect(result!.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result!.confidence).toBeLessThan(0.95);
    });
  });
});
