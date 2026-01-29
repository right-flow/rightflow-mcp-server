/**
 * Unit Tests for convertPolygonToBox()
 *
 * Tests the coordinate conversion from Azure's polygon format (inches, top-left origin)
 * to PDF box format (points, bottom-left origin).
 *
 * TDD Approach: RED phase - write tests first
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// Types
// ============================================================

interface PageInfo {
  pageNumber: number;
  width: number;  // PDF points (1/72 inch)
  height: number; // PDF points (1/72 inch)
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================
// Function Under Test
// ============================================================

const POINTS_PER_INCH = 72;

/**
 * Convert Azure bounding polygon (inches, clockwise from TL) to PDF points
 *
 * Azure polygon format: [x1, y1, x2, y2, x3, y3, x4, y4] in inches
 * Order: top-left, top-right, bottom-right, bottom-left (clockwise)
 * Origin: top-left (0,0 at top-left corner)
 *
 * PDF box format: {x, y, width, height} in points (1/72 inch)
 * Origin: bottom-left (0,0 at bottom-left corner)
 */
function convertPolygonToBox(
  polygon: number[],
  pageInfo: PageInfo,
): Box {
  if (!polygon || polygon.length < 8) {
    return { x: 0, y: 0, width: 50, height: 20 };
  }

  // Polygon points: [x1,y1, x2,y2, x3,y3, x4,y4]
  const [tlX, tlY, trX, trY, brX, brY, blX, blY] = polygon;

  // Convert inches to points
  // Use min/max across ALL coordinates to handle rotated/skewed boxes
  const xMin = Math.min(tlX, trX, brX, blX) * POINTS_PER_INCH;
  const xMax = Math.max(tlX, trX, brX, blX) * POINTS_PER_INCH;
  const yMin = Math.min(tlY, trY, brY, blY) * POINTS_PER_INCH; // Top of box
  const yMax = Math.max(tlY, trY, brY, blY) * POINTS_PER_INCH; // Bottom of box

  const width = xMax - xMin;
  const height = yMax - yMin;

  // Convert Y from top-origin to bottom-origin
  // PDF: y=0 at bottom, Azure: y=0 at top
  const pdfY = pageInfo.height - yMax;

  return {
    x: Math.round(xMin * 100) / 100,
    y: Math.round(pdfY * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
}

// ============================================================
// Tests
// ============================================================

describe('convertPolygonToBox', () => {
  const pageInfo: PageInfo = {
    pageNumber: 1,
    width: 595,  // A4 width in points
    height: 842, // A4 height in points
  };

  describe('Basic Conversion', () => {
    it('converts Azure polygon (inches) to PDF box (points)', () => {
      // Azure: 1x1 inch square at position (1,1) from top-left
      // [TL, TR, BR, BL] = [(1,1), (2,1), (2,2), (1,2)]
      const polygon = [1, 1, 2, 1, 2, 2, 1, 2];
      const box = convertPolygonToBox(polygon, pageInfo);

      // Expected:
      // x = 1 inch * 72 = 72 points from left
      // y = 842 - (2 inches * 72) = 698 points from bottom
      // width = 1 inch * 72 = 72 points
      // height = 1 inch * 72 = 72 points

      expect(box.x).toBeCloseTo(72, 1);
      expect(box.y).toBeCloseTo(698, 1);
      expect(box.width).toBeCloseTo(72, 1);
      expect(box.height).toBeCloseTo(72, 1);
    });

    it('converts small box (0.5x0.5 inches)', () => {
      // Half-inch square at (0.5, 0.5)
      const polygon = [0.5, 0.5, 1, 0.5, 1, 1, 0.5, 1];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.x).toBeCloseTo(36, 1); // 0.5 * 72
      expect(box.y).toBeCloseTo(770, 1); // 842 - (1 * 72)
      expect(box.width).toBeCloseTo(36, 1); // 0.5 * 72
      expect(box.height).toBeCloseTo(36, 1); // 0.5 * 72
    });

    it('converts large box (full page width)', () => {
      // Box spanning almost full A4 width
      // A4 = 8.27 x 11.69 inches
      const polygon = [0.5, 1, 7.77, 1, 7.77, 2, 0.5, 2];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.x).toBeCloseTo(36, 1);
      expect(box.width).toBeCloseTo(523.44, 1); // 7.27 * 72 = 523.44
      expect(box.height).toBeCloseTo(72, 1);
    });
  });

  describe('Coordinate System Conversion', () => {
    it('converts top-origin (Azure) to bottom-origin (PDF)', () => {
      // Box at top of page (y=0.5 inches from top)
      const polygon = [1, 0.5, 2, 0.5, 2, 1.5, 1, 1.5];
      const box = convertPolygonToBox(polygon, pageInfo);

      // Y should be high value (near top of PDF page)
      expect(box.y).toBeGreaterThan(700); // Near top in PDF coords
      expect(box.y).toBeCloseTo(734, 1); // 842 - (1.5 * 72)
    });

    it('converts box at bottom of page', () => {
      // Box at bottom of page (y=10 inches from top)
      // A4 height = 11.69 inches
      const polygon = [1, 10, 2, 10, 2, 11, 1, 11];
      const box = convertPolygonToBox(polygon, pageInfo);

      // Y should be low value (near bottom in PDF coords)
      expect(box.y).toBeLessThan(200);
      expect(box.y).toBeCloseTo(50, 1); // 842 - (11 * 72)
    });

    it('handles box in middle of page', () => {
      // Box at middle height (y=5 inches from top)
      const polygon = [2, 5, 3, 5, 3, 6, 2, 6];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.y).toBeCloseTo(410, 1); // 842 - (6 * 72) = middle-ish
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid polygon (empty array)', () => {
      const box = convertPolygonToBox([], pageInfo);

      // Should return default fallback
      expect(box).toEqual({ x: 0, y: 0, width: 50, height: 20 });
    });

    it('handles invalid polygon (too few points)', () => {
      const box = convertPolygonToBox([1, 1, 2, 2], pageInfo);

      expect(box).toEqual({ x: 0, y: 0, width: 50, height: 20 });
    });

    it('handles null/undefined polygon gracefully', () => {
      const box1 = convertPolygonToBox(null as any, pageInfo);
      const box2 = convertPolygonToBox(undefined as any, pageInfo);

      expect(box1).toEqual({ x: 0, y: 0, width: 50, height: 20 });
      expect(box2).toEqual({ x: 0, y: 0, width: 50, height: 20 });
    });

    it('handles zero-size box', () => {
      // All points at same location
      const polygon = [1, 1, 1, 1, 1, 1, 1, 1];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.width).toBe(0);
      expect(box.height).toBe(0);
      expect(box.x).toBeCloseTo(72, 1);
    });

    it('rounds coordinates to 2 decimal places', () => {
      // Use fractional inches that produce many decimal places
      const polygon = [1.123456, 1.654321, 2.345678, 1.654321, 2.345678, 2.876543, 1.123456, 2.876543];
      const box = convertPolygonToBox(polygon, pageInfo);

      // Check that values are rounded to 2 decimals
      expect(box.x).toBe(Math.round(box.x * 100) / 100);
      expect(box.y).toBe(Math.round(box.y * 100) / 100);
      expect(box.width).toBe(Math.round(box.width * 100) / 100);
      expect(box.height).toBe(Math.round(box.height * 100) / 100);
    });
  });

  describe('Different Page Sizes', () => {
    it('handles A4 portrait (595x842)', () => {
      const a4 = { pageNumber: 1, width: 595, height: 842 };
      const polygon = [1, 1, 2, 1, 2, 2, 1, 2];
      const box = convertPolygonToBox(polygon, a4);

      expect(box.y).toBeCloseTo(698, 1); // 842 - 144
    });

    it('handles A4 landscape (842x595)', () => {
      const a4Landscape = { pageNumber: 1, width: 842, height: 595 };
      const polygon = [1, 1, 2, 1, 2, 2, 1, 2];
      const box = convertPolygonToBox(polygon, a4Landscape);

      expect(box.y).toBeCloseTo(451, 1); // 595 - 144 (different page height!)
    });

    it('handles US Letter (612x792)', () => {
      const letter = { pageNumber: 1, width: 612, height: 792 };
      const polygon = [1, 1, 2, 1, 2, 2, 1, 2];
      const box = convertPolygonToBox(polygon, letter);

      expect(box.y).toBeCloseTo(648, 1); // 792 - 144
    });

    it('handles custom page size', () => {
      const custom = { pageNumber: 1, width: 400, height: 600 };
      const polygon = [0.5, 0.5, 1.5, 0.5, 1.5, 1.5, 0.5, 1.5];
      const box = convertPolygonToBox(polygon, custom);

      expect(box.x).toBeCloseTo(36, 1);
      expect(box.y).toBeCloseTo(492, 1); // 600 - 108
      expect(box.width).toBeCloseTo(72, 1);
      expect(box.height).toBeCloseTo(72, 1);
    });
  });

  describe('Rotated/Skewed Boxes', () => {
    it('handles non-perfect rectangle (slightly skewed)', () => {
      // Polygon where corners are slightly off
      const polygon = [1, 1, 2.1, 1.05, 2.05, 2, 0.95, 1.95];
      const box = convertPolygonToBox(polygon, pageInfo);

      // Should use min/max to create bounding box
      expect(box.x).toBeCloseTo(68.4, 1); // min(1, 0.95) * 72
      expect(box.width).toBeGreaterThan(70); // max(2.1, 2.05) - min(1, 0.95)
    });

    it('uses min/max for x coordinates', () => {
      // Intentionally out-of-order polygon
      // [TL, TR, BR, BL] but with x values: [2,1,1,2]
      const polygon = [2, 1, 1, 1, 1, 2, 2, 2];
      const box = convertPolygonToBox(polygon, pageInfo);

      // Should still produce correct box using min/max
      // min(2,1,1,2) = 1, max(2,1,1,2) = 2
      expect(box.x).toBeCloseTo(72, 1); // min * 72 = 1 * 72
      expect(box.width).toBeCloseTo(72, 1); // (max - min) * 72 = 1 * 72
    });

    it('uses min/max for y coordinates', () => {
      const polygon = [1, 2, 2, 1, 2, 2, 1, 1]; // Y values mixed
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.height).toBeCloseTo(72, 1); // max(2,2,2,1) - min(2,1,2,1)
    });
  });

  describe('Real-World Hebrew Form Scenarios', () => {
    it('converts typical label position (right side, RTL)', () => {
      // Hebrew label typically at x=6-7 inches from left
      // (which is ~1 inch from right on A4)
      const polygon = [6, 2, 7, 2, 7, 2.3, 6, 2.3];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.x).toBeGreaterThan(400); // Right side
      expect(box.x).toBeCloseTo(432, 1); // 6 * 72
      expect(box.width).toBeCloseTo(72, 1); // 1 inch label
      expect(box.height).toBeCloseTo(21.6, 1); // 0.3 inch height
    });

    it('converts typical input field position (left side, RTL)', () => {
      // Input field left of label in RTL form
      const polygon = [1, 2, 5.5, 2, 5.5, 2.3, 1, 2.3];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.x).toBeCloseTo(72, 1); // Left margin
      expect(box.width).toBeCloseTo(324, 1); // Wide input area
      expect(box.height).toBeCloseTo(21.6, 1);
    });

    it('converts checkbox/selection mark (small square)', () => {
      // Checkbox: 0.2x0.2 inches
      const polygon = [1, 3, 1.2, 3, 1.2, 3.2, 1, 3.2];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.width).toBeCloseTo(14.4, 1); // 0.2 * 72
      expect(box.height).toBeCloseTo(14.4, 1);
    });

    it('converts signature field (wide, short)', () => {
      // Signature: 3 inches wide, 0.5 inches tall
      const polygon = [2, 9, 5, 9, 5, 9.5, 2, 9.5];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.width).toBeCloseTo(216, 1); // 3 * 72
      expect(box.height).toBeCloseTo(36, 1); // 0.5 * 72
    });

    it('converts table cell', () => {
      // Table cell: 1.5 x 0.4 inches
      const polygon = [2, 4, 3.5, 4, 3.5, 4.4, 2, 4.4];
      const box = convertPolygonToBox(polygon, pageInfo);

      expect(box.width).toBeCloseTo(108, 1); // 1.5 * 72
      expect(box.height).toBeCloseTo(28.8, 1); // 0.4 * 72
    });
  });

  describe('Precision and Rounding', () => {
    it('maintains precision for small differences', () => {
      // Two boxes very close together - precision matters
      const polygon1 = [1, 1, 1.01, 1, 1.01, 1.2, 1, 1.2];
      const polygon2 = [1.02, 1, 1.03, 1, 1.03, 1.2, 1.02, 1.2];

      const box1 = convertPolygonToBox(polygon1, pageInfo);
      const box2 = convertPolygonToBox(polygon2, pageInfo);

      // Boxes should be distinguishable
      expect(box1.x).not.toBe(box2.x);
      expect(Math.abs(box1.x - box2.x)).toBeCloseTo(1.44, 1); // 0.02 inches
    });

    it('produces consistent results for equivalent polygons', () => {
      const polygon = [1, 1, 2, 1, 2, 2, 1, 2];

      const box1 = convertPolygonToBox(polygon, pageInfo);
      const box2 = convertPolygonToBox(polygon, pageInfo);
      const box3 = convertPolygonToBox([...polygon], pageInfo);

      expect(box1).toEqual(box2);
      expect(box1).toEqual(box3);
    });
  });

  describe('Performance', () => {
    it('handles many conversions efficiently', () => {
      const polygons = Array.from({ length: 1000 }, (_, i) => {
        const offset = i * 0.01;
        return [1 + offset, 1, 2 + offset, 1, 2 + offset, 2, 1 + offset, 2];
      });

      const start = Date.now();
      polygons.forEach(p => convertPolygonToBox(p, pageInfo));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // 1000 conversions in <50ms
    });
  });

  describe('Integration with Azure OCR Response', () => {
    it('converts real Azure line polygon', () => {
      // Simulated Azure OCR response polygon for a text line
      // "שם הלקוח:" at top-right of form
      const azurePolygon = [6.2, 1.5, 7.3, 1.5, 7.3, 1.78, 6.2, 1.78];
      const box = convertPolygonToBox(azurePolygon, pageInfo);

      expect(box.x).toBeCloseTo(446.4, 1);
      expect(box.y).toBeCloseTo(713.84, 1);
      expect(box.width).toBeCloseTo(79.2, 1);
      expect(box.height).toBeCloseTo(20.16, 1);
    });

    it('converts real Azure selection mark polygon', () => {
      // Checkbox from Azure
      const azurePolygon = [1.1, 5.2, 1.3, 5.2, 1.3, 5.4, 1.1, 5.4];
      const box = convertPolygonToBox(azurePolygon, pageInfo);

      expect(box.width).toBeCloseTo(14.4, 1);
      expect(box.height).toBeCloseTo(14.4, 1);
      expect(box.x).toBeCloseTo(79.2, 1);
    });
  });
});
