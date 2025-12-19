import { describe, it, expect } from 'vitest';

/**
 * Unit Tests for Percentage to PDF Points Conversion
 *
 * Tests the coordinate conversion system used in api/extract-fields.ts
 * where AI returns percentage-based coordinates (0-100) and we convert
 * to PDF points.
 *
 * PDF Coordinate System:
 * - Origin at BOTTOM-LEFT
 * - Y-axis goes UP (y=0 is bottom, y=pageHeight is top)
 * - Units are points (1 point = 1/72 inch)
 *
 * AI Percentage System:
 * - xPercent: 0=left edge, 100=right edge
 * - yPercent: 0=top of page, 100=bottom of page
 */

// Standard PDF page sizes in points
const PAGE_SIZES = {
  A4: { width: 595, height: 842 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
};

interface AIFieldResponse {
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  pageNumber: number;
  label?: string;
  name: string;
  required: boolean;
  direction: 'ltr' | 'rtl';
}

/**
 * Convert percentage-based coordinates to PDF points
 * (Extracted from api/extract-fields.ts for testing)
 */
function convertPercentToPoints(
  field: AIFieldResponse,
  pageWidth: number = PAGE_SIZES.A4.width,
  pageHeight: number = PAGE_SIZES.A4.height
): {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  pageNumber: number;
  label?: string;
  name: string;
  required: boolean;
  direction: 'ltr' | 'rtl';
} {
  // Convert percentages to points
  const x = (field.xPercent / 100) * pageWidth;
  const width = (field.widthPercent / 100) * pageWidth;
  const height = (field.heightPercent / 100) * pageHeight;

  // Convert Y from top-based percentage to PDF bottom-based coordinate
  // yPercent=0 means top of page, yPercent=100 means bottom
  // In PDF: y=pageHeight is top, y=0 is bottom
  const yFromTop = (field.yPercent / 100) * pageHeight;
  const y = pageHeight - yFromTop - height; // Bottom edge of field in PDF coords

  return {
    type: field.type,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
    pageNumber: field.pageNumber,
    label: field.label,
    name: field.name,
    required: field.required,
    direction: field.direction,
  };
}

// Helper to create test field
function createTestField(overrides: Partial<AIFieldResponse> = {}): AIFieldResponse {
  return {
    type: 'text',
    xPercent: 0,
    yPercent: 0,
    widthPercent: 10,
    heightPercent: 3,
    pageNumber: 1,
    name: 'test_field',
    required: false,
    direction: 'ltr',
    ...overrides,
  };
}

// ============================================
// X Coordinate Conversion Tests
// ============================================

describe('X coordinate conversion (xPercent to x)', () => {
  describe('with A4 page (595pt width)', () => {
    it('converts 0% to x=0', () => {
      const field = createTestField({ xPercent: 0 });
      const result = convertPercentToPoints(field);
      expect(result.x).toBe(0);
    });

    it('converts 100% to x=595', () => {
      const field = createTestField({ xPercent: 100 });
      const result = convertPercentToPoints(field);
      expect(result.x).toBe(595);
    });

    it('converts 50% to x=297.5', () => {
      const field = createTestField({ xPercent: 50 });
      const result = convertPercentToPoints(field);
      expect(result.x).toBe(297.5);
    });

    it('converts 25% to x=148.75', () => {
      const field = createTestField({ xPercent: 25 });
      const result = convertPercentToPoints(field);
      expect(result.x).toBe(148.75);
    });

    it('converts 75% to x=446.25', () => {
      const field = createTestField({ xPercent: 75 });
      const result = convertPercentToPoints(field);
      expect(result.x).toBe(446.25);
    });
  });

  describe('with US Letter page (612pt width)', () => {
    it('converts 50% to x=306', () => {
      const field = createTestField({ xPercent: 50 });
      const result = convertPercentToPoints(field, PAGE_SIZES.LETTER.width, PAGE_SIZES.LETTER.height);
      expect(result.x).toBe(306);
    });

    it('converts 100% to x=612', () => {
      const field = createTestField({ xPercent: 100 });
      const result = convertPercentToPoints(field, PAGE_SIZES.LETTER.width, PAGE_SIZES.LETTER.height);
      expect(result.x).toBe(612);
    });
  });
});

// ============================================
// Y Coordinate Conversion Tests (TOP to BOTTOM-based)
// ============================================

describe('Y coordinate conversion (yPercent to y)', () => {
  describe('with A4 page (842pt height)', () => {
    it('converts 0% (top) to y near page top', () => {
      // Field at top: yPercent=0, height=3% (25.26pt)
      const field = createTestField({ yPercent: 0, heightPercent: 3 });
      const result = convertPercentToPoints(field);

      // y = 842 - 0 - 25.26 = 816.74
      expect(result.y).toBeCloseTo(816.74, 1);
    });

    it('converts 100% (bottom) to y=0 minus height', () => {
      // Field at bottom: yPercent=100, height=3%
      const field = createTestField({ yPercent: 100, heightPercent: 3 });
      const result = convertPercentToPoints(field);

      // yFromTop = 842, y = 842 - 842 - 25.26 = -25.26
      // Field extends below page (edge case)
      expect(result.y).toBeCloseTo(-25.26, 1);
    });

    it('converts 50% to center of page', () => {
      const field = createTestField({ yPercent: 50, heightPercent: 3 });
      const result = convertPercentToPoints(field);

      // yFromTop = 421, y = 842 - 421 - 25.26 = 395.74
      expect(result.y).toBeCloseTo(395.74, 1);
    });

    it('correctly positions field near bottom', () => {
      // Field at 97% from top (near bottom), 3% height
      const field = createTestField({ yPercent: 97, heightPercent: 3 });
      const result = convertPercentToPoints(field);

      // yFromTop = 816.74, y = 842 - 816.74 - 25.26 = 0
      expect(result.y).toBeCloseTo(0, 1);
    });
  });

  describe('Y coordinate validation', () => {
    it('higher yPercent results in lower y value (closer to bottom)', () => {
      const fieldTop = createTestField({ yPercent: 10, heightPercent: 3 });
      const fieldBottom = createTestField({ yPercent: 90, heightPercent: 3 });

      const resultTop = convertPercentToPoints(fieldTop);
      const resultBottom = convertPercentToPoints(fieldBottom);

      expect(resultTop.y).toBeGreaterThan(resultBottom.y);
    });
  });
});

// ============================================
// Width Conversion Tests
// ============================================

describe('Width conversion (widthPercent to width)', () => {
  describe('with A4 page (595pt width)', () => {
    it('converts 10% to width=59.5', () => {
      const field = createTestField({ widthPercent: 10 });
      const result = convertPercentToPoints(field);
      expect(result.width).toBe(59.5);
    });

    it('converts 25% to width=148.75', () => {
      const field = createTestField({ widthPercent: 25 });
      const result = convertPercentToPoints(field);
      expect(result.width).toBe(148.75);
    });

    it('converts 50% to width=297.5', () => {
      const field = createTestField({ widthPercent: 50 });
      const result = convertPercentToPoints(field);
      expect(result.width).toBe(297.5);
    });

    it('converts 100% to width=595', () => {
      const field = createTestField({ widthPercent: 100 });
      const result = convertPercentToPoints(field);
      expect(result.width).toBe(595);
    });
  });

  describe('typical field widths', () => {
    it('text field (25% width) = ~149pt', () => {
      const field = createTestField({ type: 'text', widthPercent: 25 });
      const result = convertPercentToPoints(field);
      expect(result.width).toBeCloseTo(148.75, 1);
    });

    it('checkbox (3% width) = ~18pt', () => {
      const field = createTestField({ type: 'checkbox', widthPercent: 3 });
      const result = convertPercentToPoints(field);
      expect(result.width).toBeCloseTo(17.85, 1);
    });

    it('signature (20% width) = 119pt', () => {
      const field = createTestField({ type: 'signature', widthPercent: 20 });
      const result = convertPercentToPoints(field);
      expect(result.width).toBe(119);
    });
  });
});

// ============================================
// Height Conversion Tests
// ============================================

describe('Height conversion (heightPercent to height)', () => {
  describe('with A4 page (842pt height)', () => {
    it('converts 3% to height=25.26', () => {
      const field = createTestField({ heightPercent: 3 });
      const result = convertPercentToPoints(field);
      expect(result.height).toBeCloseTo(25.26, 1);
    });

    it('converts 5% to height=42.1', () => {
      const field = createTestField({ heightPercent: 5 });
      const result = convertPercentToPoints(field);
      expect(result.height).toBe(42.1);
    });

    it('converts 10% to height=84.2', () => {
      const field = createTestField({ heightPercent: 10 });
      const result = convertPercentToPoints(field);
      expect(result.height).toBe(84.2);
    });
  });

  describe('typical field heights', () => {
    it('text field line (2.5% height) = ~21pt', () => {
      const field = createTestField({ type: 'text', heightPercent: 2.5 });
      const result = convertPercentToPoints(field);
      expect(result.height).toBeCloseTo(21.05, 1);
    });

    it('checkbox (2% height) = ~17pt', () => {
      const field = createTestField({ type: 'checkbox', heightPercent: 2 });
      const result = convertPercentToPoints(field);
      expect(result.height).toBeCloseTo(16.84, 1);
    });

    it('signature box (6% height) = ~50pt', () => {
      const field = createTestField({ type: 'signature', heightPercent: 6 });
      const result = convertPercentToPoints(field);
      expect(result.height).toBeCloseTo(50.52, 1);
    });
  });
});

// ============================================
// Full Field Conversion Tests
// ============================================

describe('full field conversion', () => {
  it('preserves all non-coordinate properties', () => {
    const field = createTestField({
      type: 'dropdown',
      label: 'בחר אפשרות',
      name: 'selection',
      required: true,
      direction: 'rtl',
      pageNumber: 3,
    });

    const result = convertPercentToPoints(field);

    expect(result.type).toBe('dropdown');
    expect(result.label).toBe('בחר אפשרות');
    expect(result.name).toBe('selection');
    expect(result.required).toBe(true);
    expect(result.direction).toBe('rtl');
    expect(result.pageNumber).toBe(3);
  });

  it('handles field without label', () => {
    const field = createTestField({ label: undefined });
    const result = convertPercentToPoints(field);
    expect(result.label).toBeUndefined();
  });

  it('converts realistic text field', () => {
    // Text field at 60% from left, 15% from top, 25% wide, 3% tall
    const field: AIFieldResponse = {
      type: 'text',
      xPercent: 60,
      yPercent: 15,
      widthPercent: 25,
      heightPercent: 3,
      pageNumber: 1,
      label: 'שם פרטי',
      name: 'first_name',
      required: true,
      direction: 'rtl',
    };

    const result = convertPercentToPoints(field);

    expect(result.x).toBe(357); // 60% of 595
    expect(result.width).toBe(148.75); // 25% of 595
    expect(result.height).toBeCloseTo(25.26, 1); // 3% of 842

    // Y: yFromTop = 15% of 842 = 126.3, y = 842 - 126.3 - 25.26 = 690.44
    expect(result.y).toBeCloseTo(690.44, 1);
  });

  it('converts realistic checkbox', () => {
    // Small checkbox at 10% from left, 30% from top
    const field: AIFieldResponse = {
      type: 'checkbox',
      xPercent: 10,
      yPercent: 30,
      widthPercent: 2,
      heightPercent: 2,
      pageNumber: 1,
      name: 'agree',
      required: false,
      direction: 'ltr',
    };

    const result = convertPercentToPoints(field);

    expect(result.x).toBe(59.5); // 10% of 595
    expect(result.width).toBe(11.9); // 2% of 595
    expect(result.height).toBeCloseTo(16.84, 1); // 2% of 842

    // Y: yFromTop = 30% of 842 = 252.6, y = 842 - 252.6 - 16.84 = 572.56
    expect(result.y).toBeCloseTo(572.56, 1);
  });
});

// ============================================
// Edge Cases and Boundary Tests
// ============================================

describe('edge cases', () => {
  it('handles 0% for all coordinates', () => {
    const field = createTestField({
      xPercent: 0,
      yPercent: 0,
      widthPercent: 0,
      heightPercent: 0,
    });

    const result = convertPercentToPoints(field);

    expect(result.x).toBe(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
    expect(result.y).toBe(842); // Top of page
  });

  it('handles 100% for position coordinates', () => {
    const field = createTestField({
      xPercent: 100,
      yPercent: 100,
      widthPercent: 10,
      heightPercent: 10,
    });

    const result = convertPercentToPoints(field);

    expect(result.x).toBe(595);
    // Y should be negative (field extends below page)
    expect(result.y).toBeLessThan(0);
  });

  it('handles decimal percentages', () => {
    const field = createTestField({
      xPercent: 33.33,
      yPercent: 66.66,
      widthPercent: 16.5,
      heightPercent: 4.25,
    });

    const result = convertPercentToPoints(field);

    // Verify rounding to 2 decimal places
    expect(result.x).toBeCloseTo(198.31, 1);
    expect(result.width).toBeCloseTo(98.18, 1);
    expect(result.height).toBeCloseTo(35.79, 1);
  });

  it('handles very small percentages', () => {
    const field = createTestField({
      xPercent: 0.5,
      yPercent: 0.5,
      widthPercent: 1,
      heightPercent: 0.5,
    });

    const result = convertPercentToPoints(field);

    expect(result.x).toBeCloseTo(2.98, 1); // 0.5% of 595
    expect(result.width).toBeCloseTo(5.95, 1); // 1% of 595
    expect(result.height).toBeCloseTo(4.21, 1); // 0.5% of 842
  });
});

// ============================================
// Different Page Size Tests
// ============================================

describe('different page sizes', () => {
  it('correctly converts for US Letter', () => {
    const field = createTestField({
      xPercent: 50,
      yPercent: 50,
      widthPercent: 20,
      heightPercent: 5,
    });

    const result = convertPercentToPoints(
      field,
      PAGE_SIZES.LETTER.width,
      PAGE_SIZES.LETTER.height
    );

    expect(result.x).toBe(306); // 50% of 612
    expect(result.width).toBeCloseTo(122.4, 1); // 20% of 612
    expect(result.height).toBeCloseTo(39.6, 1); // 5% of 792
  });

  it('correctly converts for Legal', () => {
    const field = createTestField({
      xPercent: 50,
      yPercent: 50,
      widthPercent: 20,
      heightPercent: 5,
    });

    const result = convertPercentToPoints(
      field,
      PAGE_SIZES.LEGAL.width,
      PAGE_SIZES.LEGAL.height
    );

    expect(result.x).toBe(306); // 50% of 612
    expect(result.width).toBeCloseTo(122.4, 1); // 20% of 612
    expect(result.height).toBeCloseTo(50.4, 1); // 5% of 1008
  });

  it('correctly converts for custom page size', () => {
    const customWidth = 400;
    const customHeight = 600;

    const field = createTestField({
      xPercent: 25,
      yPercent: 75,
      widthPercent: 50,
      heightPercent: 10,
    });

    const result = convertPercentToPoints(field, customWidth, customHeight);

    expect(result.x).toBe(100); // 25% of 400
    expect(result.width).toBe(200); // 50% of 400
    expect(result.height).toBe(60); // 10% of 600

    // Y: yFromTop = 75% of 600 = 450, y = 600 - 450 - 60 = 90
    expect(result.y).toBe(90);
  });
});

// ============================================
// Rounding Behavior Tests
// ============================================

describe('rounding behavior', () => {
  it('rounds to 2 decimal places', () => {
    const field = createTestField({
      xPercent: 33.333333,
      widthPercent: 33.333333,
    });

    const result = convertPercentToPoints(field);

    // Should be rounded to 2 decimal places
    const xStr = result.x.toString();
    const widthStr = result.width.toString();

    // Check that decimal places are limited
    if (xStr.includes('.')) {
      const decimals = xStr.split('.')[1].length;
      expect(decimals).toBeLessThanOrEqual(2);
    }

    if (widthStr.includes('.')) {
      const decimals = widthStr.split('.')[1].length;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });

  it('does not lose precision for common values', () => {
    const field = createTestField({
      xPercent: 50,
      widthPercent: 25,
      heightPercent: 5,
    });

    const result = convertPercentToPoints(field);

    // These should be exact
    expect(result.x).toBe(297.5);
    expect(result.width).toBe(148.75);
    expect(result.height).toBe(42.1);
  });
});

// ============================================
// Real-World Scenario Tests
// ============================================

describe('real-world scenarios', () => {
  describe('Hebrew insurance form field positions', () => {
    it('positions name field correctly (top-right area)', () => {
      // Hebrew forms: labels on right, fields extend left
      const field: AIFieldResponse = {
        type: 'text',
        xPercent: 50, // Right half of page
        yPercent: 10, // Near top
        widthPercent: 30,
        heightPercent: 3,
        pageNumber: 1,
        label: 'שם מלא',
        name: 'full_name',
        required: true,
        direction: 'rtl',
      };

      const result = convertPercentToPoints(field);

      // X should be in right half (50% = exactly at center, so use >=)
      expect(result.x).toBeGreaterThanOrEqual(PAGE_SIZES.A4.width / 2);

      // Y should be near top (high value in PDF coords)
      expect(result.y).toBeGreaterThan(700);
    });

    it('positions signature field correctly (bottom area)', () => {
      const field: AIFieldResponse = {
        type: 'signature',
        xPercent: 60,
        yPercent: 85, // Near bottom
        widthPercent: 25,
        heightPercent: 6,
        pageNumber: 1,
        label: 'חתימה',
        name: 'signature',
        required: true,
        direction: 'rtl',
      };

      const result = convertPercentToPoints(field);

      // Y should be near bottom (low value in PDF coords)
      expect(result.y).toBeLessThan(150);
    });

    it('positions checkbox group correctly', () => {
      const checkboxes = [
        { xPercent: 80, yPercent: 40 },
        { xPercent: 80, yPercent: 43 },
        { xPercent: 80, yPercent: 46 },
      ].map((pos, i) =>
        createTestField({
          type: 'checkbox',
          ...pos,
          widthPercent: 2,
          heightPercent: 2,
          name: `option_${i + 1}`,
        })
      );

      const results = checkboxes.map(cb => convertPercentToPoints(cb));

      // All checkboxes should have same X (aligned)
      expect(results[0].x).toBe(results[1].x);
      expect(results[1].x).toBe(results[2].x);

      // Y values should decrease (lower on page)
      expect(results[0].y).toBeGreaterThan(results[1].y);
      expect(results[1].y).toBeGreaterThan(results[2].y);

      // Spacing should be consistent
      const spacing1 = results[0].y - results[1].y;
      const spacing2 = results[1].y - results[2].y;
      expect(spacing1).toBeCloseTo(spacing2, 0);
    });
  });
});
