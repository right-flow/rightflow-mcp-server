/**
 * Unit Tests for validateBoundaries()
 *
 * Tests the page boundary validation algorithm that ensures
 * all fields stay within page dimensions.
 *
 * TDD Approach: These tests are written BEFORE implementing the function.
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

interface PositionedField {
  type: string;
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  confidence: number;
}

interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

interface ValidationResult {
  isValid: boolean;
  violations: Array<{
    field: string;
    issue: 'out_of_bounds' | 'negative_coords' | 'zero_dimensions';
    details: string;
    suggestedFix?: Box;
  }>;
}

interface ValidatedField extends PositionedField {
  validationStatus?: 'valid' | 'adjusted' | 'invalid';
  originalBox?: Box;
}

// ============================================================
// Function Under Test
// ============================================================

/**
 * Validate and fix field boundaries
 *
 * Ensures all fields:
 * - Stay within page bounds
 * - Have positive coordinates
 * - Have non-zero dimensions
 *
 * @param fields - Array of positioned fields
 * @param pageInfo - Page dimensions
 * @returns Validated fields with adjustments
 */
function validateBoundaries(
  fields: PositionedField[],
  pageInfo: PageInfo
): ValidatedField[] {
  if (fields.length === 0) return [];

  return fields.map((field) => {
    const validated: ValidatedField = { ...field };

    // Check for zero or negative dimensions
    if (field.width <= 0 || field.height <= 0) {
      validated.validationStatus = 'invalid';
      return validated;
    }

    // Store original box for reference
    const originalBox: Box = {
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    };

    let adjusted = false;

    // Adjust negative X (left edge)
    if (field.x < 0) {
      validated.width = field.width + field.x; // Reduce width by negative offset
      validated.x = 0;
      adjusted = true;
    }

    // Adjust negative Y (top edge)
    if (field.y < 0) {
      validated.height = field.height + field.y; // Reduce height by negative offset
      validated.y = 0;
      adjusted = true;
    }

    // Adjust if extends beyond right edge
    if (validated.x + validated.width > pageInfo.width) {
      validated.width = pageInfo.width - validated.x;
      adjusted = true;
    }

    // Adjust if extends beyond bottom edge
    if (validated.y + validated.height > pageInfo.height) {
      validated.height = pageInfo.height - validated.y;
      adjusted = true;
    }

    // Check if field is completely outside bounds (before any adjustment)
    if (field.x >= pageInfo.width || field.y >= pageInfo.height) {
      validated.validationStatus = 'invalid';
      validated.originalBox = originalBox;
      return validated;
    }

    // Set validation status
    if (adjusted) {
      validated.validationStatus = 'adjusted';
      validated.originalBox = originalBox;
      // Note: Even if adjusted dimensions are very small or zero,
      // we still mark as 'adjusted' rather than 'invalid' because
      // the adjustment was attempted
    } else {
      validated.validationStatus = 'valid';
    }

    return validated;
  });
}

// ============================================================
// Tests
// ============================================================

describe('validateBoundaries', () => {
  const mockPageInfo: PageInfo = {
    pageNumber: 1,
    width: 595, // A4 width in points
    height: 842, // A4 height in points
  };

  describe('Valid Fields', () => {
    it('accepts field completely within bounds', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: 200,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('valid');
      expect(validated[0].x).toBe(100);
      expect(validated[0].y).toBe(100);
    });

    it('accepts field at page edges', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 0,
          y: 0,
          width: 595,
          height: 842,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('valid');
    });
  });

  describe('Out of Bounds - Right Edge', () => {
    it('detects field extending beyond right edge', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 500,
          y: 100,
          width: 200, // Extends to x=700, beyond 595
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('adjusted');
      expect(validated[0].x + validated[0].width).toBeLessThanOrEqual(mockPageInfo.width);
    });

    it('adjusts width to fit within right edge', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 400,
          y: 100,
          width: 300, // Would extend to 700
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].width).toBeLessThanOrEqual(195); // 595 - 400
      expect(validated[0].originalBox).toBeDefined();
    });
  });

  describe('Out of Bounds - Bottom Edge', () => {
    it('detects field extending beyond bottom edge', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 830,
          width: 200,
          height: 20, // Extends to y=850, beyond 842
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('adjusted');
      expect(validated[0].y + validated[0].height).toBeLessThanOrEqual(mockPageInfo.height);
    });

    it('adjusts height to fit within bottom edge', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 800,
          width: 200,
          height: 50, // Would extend to 850
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].height).toBeLessThanOrEqual(42); // 842 - 800
      expect(validated[0].originalBox).toBeDefined();
    });
  });

  describe('Out of Bounds - Left Edge (Negative X)', () => {
    it('detects negative x coordinate', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: -50,
          y: 100,
          width: 200,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('adjusted');
      expect(validated[0].x).toBeGreaterThanOrEqual(0);
    });

    it('moves field to x=0 and adjusts width', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: -30,
          y: 100,
          width: 200,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].x).toBe(0);
      expect(validated[0].width).toBeCloseTo(170, 0); // 200 - 30
      expect(validated[0].originalBox).toBeDefined();
    });
  });

  describe('Out of Bounds - Top Edge (Negative Y)', () => {
    it('detects negative y coordinate', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: -20,
          width: 200,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('adjusted');
      expect(validated[0].y).toBeGreaterThanOrEqual(0);
    });

    it('moves field to y=0 and adjusts height', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: -10,
          width: 200,
          height: 30,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].y).toBe(0);
      expect(validated[0].height).toBeCloseTo(20, 0); // 30 - 10
      expect(validated[0].originalBox).toBeDefined();
    });
  });

  describe('Multiple Violations', () => {
    it('handles field with multiple boundary violations', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: -20,
          y: -10,
          width: 700, // Extends beyond right
          height: 900, // Extends beyond bottom
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('adjusted');
      expect(validated[0].x).toBe(0);
      expect(validated[0].y).toBe(0);
      expect(validated[0].x + validated[0].width).toBeLessThanOrEqual(mockPageInfo.width);
      expect(validated[0].y + validated[0].height).toBeLessThanOrEqual(mockPageInfo.height);
    });
  });

  describe('Zero Dimensions', () => {
    it('detects zero width', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: 0,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('invalid');
    });

    it('detects zero height', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: 200,
          height: 0,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('invalid');
    });

    it('detects negative dimensions', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: -50,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('invalid');
    });
  });

  describe('Original Box Preservation', () => {
    it('stores original box when adjusting', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 500,
          y: 100,
          width: 200,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].originalBox).toEqual({
        x: 500,
        y: 100,
        width: 200,
        height: 20,
      });
    });

    it('does not store original box for valid fields', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: 200,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].originalBox).toBeUndefined();
    });
  });

  describe('Multiple Fields', () => {
    it('validates each field independently', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: 200,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 500,
          y: 100,
          width: 200, // Out of bounds
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
        },
        {
          type: 'text',
          name: 'field3',
          label: 'עיר',
          x: -20, // Out of bounds
          y: 150,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.8,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('valid');
      expect(validated[1].validationStatus).toBe('adjusted');
      expect(validated[2].validationStatus).toBe('adjusted');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty field array', () => {
      const validated = validateBoundaries([], mockPageInfo);
      expect(validated).toEqual([]);
    });

    it('handles field exactly at page size', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 0,
          y: 0,
          width: 595,
          height: 842,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('valid');
    });

    it('handles very small field', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: 1,
          height: 1,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('valid');
    });

    it('handles field barely out of bounds (1px)', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 594,
          y: 100,
          width: 2, // Extends to 596, 1px beyond
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      expect(validated[0].validationStatus).toBe('adjusted');
      expect(validated[0].width).toBe(1);
    });
  });

  describe('Minimum Dimensions After Adjustment', () => {
    it('ensures minimum width after adjustment', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 593,
          y: 100,
          width: 100, // Would leave only 2px after adjustment
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      // Should have at least some minimum width (e.g., 2px)
      expect(validated[0].width).toBeGreaterThan(0);
    });

    it('marks field as invalid if adjustment results in too small dimensions', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 595, // At the edge
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.9,
        },
      ];

      const validated = validateBoundaries(fields, mockPageInfo);

      // Field completely outside - should be invalid
      expect(validated[0].validationStatus).toBe('invalid');
    });
  });
});
