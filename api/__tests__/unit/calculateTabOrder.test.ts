/**
 * Unit Tests for calculateTabOrder()
 *
 * Tests the tab order calculation algorithm for form fields.
 * Ensures logical navigation order for RTL Hebrew forms.
 *
 * TDD Approach: These tests are written BEFORE implementing the function.
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// Types
// ============================================================

interface PositionedField {
  type: string;
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  direction?: 'rtl' | 'ltr';
  sectionName?: string;
}

interface FieldWithTabOrder extends PositionedField {
  tabIndex: number;
}

// ============================================================
// Function Under Test
// ============================================================

/**
 * Calculate tab order for form fields
 *
 * Strategy for RTL forms:
 * - Top to bottom (by Y coordinate)
 * - Right to left within same row (by X coordinate, descending)
 * - Page order (page 1 before page 2)
 * - Section grouping (optional)
 *
 * @param fields - Array of positioned fields
 * @param direction - Form direction ('rtl' or 'ltr')
 * @returns Fields with tab index assigned
 */
function calculateTabOrder(
  fields: PositionedField[],
  direction: 'rtl' | 'ltr' = 'rtl'
): FieldWithTabOrder[] {
  if (fields.length === 0) return [];

  const ROW_TOLERANCE = 10; // Fields within 10px Y-difference are considered same row

  // Sort fields by:
  // 1. Page number
  // 2. Section (if provided)
  // 3. Y coordinate (top to bottom)
  // 4. X coordinate (RTL: right to left, LTR: left to right)
  const sorted = [...fields].sort((a, b) => {
    // 1. Page number
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }

    // 2. Section grouping (if both have sections)
    if (a.sectionName && b.sectionName) {
      if (a.sectionName !== b.sectionName) {
        return a.sectionName.localeCompare(b.sectionName, 'he');
      }
    }

    // 3. Y coordinate (top to bottom)
    // Use tolerance to group fields on same row
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff > ROW_TOLERANCE) {
      return a.y - b.y;
    }

    // 4. X coordinate (within same row)
    if (direction === 'rtl') {
      // RTL: right to left (descending X)
      return b.x - a.x;
    } else {
      // LTR: left to right (ascending X)
      return a.x - b.x;
    }
  });

  // Assign tab indices starting from 1
  return sorted.map((field, index) => ({
    ...field,
    tabIndex: index + 1,
  }));
}

// ============================================================
// Tests
// ============================================================

describe('calculateTabOrder', () => {
  describe('RTL Tab Order (Hebrew)', () => {
    it('orders fields right-to-left in same row', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'עיר',
          x: 100,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'רחוב',
          x: 250,
          y: 100, // Same row
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field3',
          label: 'מיקוד',
          x: 400,
          y: 100, // Same row, rightmost
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      // RTL: rightmost field (x=400) should be first
      expect(ordered.find((f) => f.name === 'field3')?.tabIndex).toBe(1);
      expect(ordered.find((f) => f.name === 'field2')?.tabIndex).toBe(2);
      expect(ordered.find((f) => f.name === 'field1')?.tabIndex).toBe(3);
    });

    it('orders fields top-to-bottom across rows', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שורה 1',
          x: 300,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'שורה 2',
          x: 300,
          y: 150,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field3',
          label: 'שורה 3',
          x: 300,
          y: 200,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      expect(ordered[0].tabIndex).toBe(1);
      expect(ordered[1].tabIndex).toBe(2);
      expect(ordered[2].tabIndex).toBe(3);
    });

    it('combines top-to-bottom and right-to-left ordering', () => {
      const fields: PositionedField[] = [
        // Row 1
        {
          type: 'text',
          name: 'row1_left',
          label: 'שם',
          x: 100,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'row1_right',
          label: 'משפחה',
          x: 250,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        // Row 2
        {
          type: 'text',
          name: 'row2_left',
          label: 'עיר',
          x: 100,
          y: 150,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'row2_right',
          label: 'רחוב',
          x: 250,
          y: 150,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      // Row 1: Right to left
      expect(ordered.find((f) => f.name === 'row1_right')?.tabIndex).toBe(1);
      expect(ordered.find((f) => f.name === 'row1_left')?.tabIndex).toBe(2);
      // Row 2: Right to left
      expect(ordered.find((f) => f.name === 'row2_right')?.tabIndex).toBe(3);
      expect(ordered.find((f) => f.name === 'row2_left')?.tabIndex).toBe(4);
    });
  });

  describe('LTR Tab Order (English)', () => {
    it('orders fields left-to-right in same row', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'First',
          x: 400,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'Second',
          x: 250,
          y: 100, // Same row
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field3',
          label: 'Third',
          x: 100,
          y: 100, // Same row, leftmost
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'ltr');

      // LTR: leftmost field (x=100) should be first
      expect(ordered.find((f) => f.name === 'field3')?.tabIndex).toBe(1);
      expect(ordered.find((f) => f.name === 'field2')?.tabIndex).toBe(2);
      expect(ordered.find((f) => f.name === 'field1')?.tabIndex).toBe(3);
    });
  });

  describe('Row Detection', () => {
    it('considers fields on same row if Y difference is small', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 250,
          y: 103, // 3px difference - same row
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      // Should be treated as same row
      const tabIndex1 = ordered.find((f) => f.name === 'field1')?.tabIndex;
      const tabIndex2 = ordered.find((f) => f.name === 'field2')?.tabIndex;

      // field2 (x=250) should come before field1 (x=100) in RTL
      expect(tabIndex2).toBeLessThan(tabIndex1!);
    });

    it('considers fields on different rows if Y difference is large', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 100,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 250,
          y: 150, // 50px difference - different row
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      // Should be treated as different rows (top to bottom)
      const tabIndex1 = ordered.find((f) => f.name === 'field1')?.tabIndex;
      const tabIndex2 = ordered.find((f) => f.name === 'field2')?.tabIndex;

      // field1 (y=100) should come before field2 (y=150)
      expect(tabIndex1).toBeLessThan(tabIndex2!);
    });
  });

  describe('Multi-Page Forms', () => {
    it('orders page 1 before page 2', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'page2_field',
          label: 'שם',
          x: 300,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 2,
        },
        {
          type: 'text',
          name: 'page1_field',
          label: 'כתובת',
          x: 300,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      const page1TabIndex = ordered.find((f) => f.name === 'page1_field')?.tabIndex;
      const page2TabIndex = ordered.find((f) => f.name === 'page2_field')?.tabIndex;

      expect(page1TabIndex).toBeLessThan(page2TabIndex!);
    });
  });

  describe('Section Grouping', () => {
    it('keeps section fields together when sections are provided', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'personal_1',
          label: 'שם',
          x: 300,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          sectionName: 'פרטים אישיים',
        },
        {
          type: 'text',
          name: 'address_1',
          label: 'רחוב',
          x: 300,
          y: 150,
          width: 100,
          height: 20,
          pageNumber: 1,
          sectionName: 'כתובת',
        },
        {
          type: 'text',
          name: 'personal_2',
          label: 'ת.ז',
          x: 300,
          y: 120,
          width: 100,
          height: 20,
          pageNumber: 1,
          sectionName: 'פרטים אישיים',
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      // personal_1 and personal_2 should be consecutive
      const personal1Index = ordered.find((f) => f.name === 'personal_1')?.tabIndex;
      const personal2Index = ordered.find((f) => f.name === 'personal_2')?.tabIndex;

      expect(Math.abs(personal1Index! - personal2Index!)).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty field array', () => {
      const ordered = calculateTabOrder([], 'rtl');
      expect(ordered).toEqual([]);
    });

    it('handles single field', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 300,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      expect(ordered).toHaveLength(1);
      expect(ordered[0].tabIndex).toBe(1);
    });

    it('starts tab index at 1', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 300,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      expect(ordered[0].tabIndex).toBe(1); // Not 0
    });

    it('assigns unique tab indices', () => {
      const fields: PositionedField[] = [
        {
          type: 'text',
          name: 'field1',
          label: 'שם',
          x: 300,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 300,
          y: 150,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field3',
          label: 'עיר',
          x: 300,
          y: 200,
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      const tabIndices = ordered.map((f) => f.tabIndex);
      const uniqueIndices = new Set(tabIndices);

      expect(uniqueIndices.size).toBe(tabIndices.length);
    });
  });

  describe('Complex Layouts', () => {
    it('handles grid layout correctly', () => {
      const fields: PositionedField[] = [
        // Row 1
        { type: 'text', name: 'r1c1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'r1c2', label: '2', x: 200, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'r1c3', label: '3', x: 300, y: 100, width: 50, height: 20, pageNumber: 1 },
        // Row 2
        { type: 'text', name: 'r2c1', label: '4', x: 100, y: 150, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'r2c2', label: '5', x: 200, y: 150, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'r2c3', label: '6', x: 300, y: 150, width: 50, height: 20, pageNumber: 1 },
      ];

      const ordered = calculateTabOrder(fields, 'rtl');

      // RTL grid: row 1 right-to-left (3,2,1), then row 2 right-to-left (6,5,4)
      expect(ordered.find((f) => f.name === 'r1c3')?.tabIndex).toBe(1);
      expect(ordered.find((f) => f.name === 'r1c2')?.tabIndex).toBe(2);
      expect(ordered.find((f) => f.name === 'r1c1')?.tabIndex).toBe(3);
      expect(ordered.find((f) => f.name === 'r2c3')?.tabIndex).toBe(4);
      expect(ordered.find((f) => f.name === 'r2c2')?.tabIndex).toBe(5);
      expect(ordered.find((f) => f.name === 'r2c1')?.tabIndex).toBe(6);
    });
  });
});
