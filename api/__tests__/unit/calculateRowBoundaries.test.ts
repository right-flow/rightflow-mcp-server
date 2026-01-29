/**
 * Unit Tests for calculateRowBoundaries()
 *
 * Tests the row detection and boundary calculation algorithm.
 * Groups fields into rows and calculates precise boundaries.
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
}

interface Row {
  rowNumber: number;
  y: number; // Average Y of all fields in row
  height: number; // Maximum height in row
  fields: PositionedField[];
  leftBoundary: number; // Leftmost X
  rightBoundary: number; // Rightmost X + width
}

interface FieldWithRowInfo extends PositionedField {
  rowNumber: number;
  rowY: number;
  rowHeight: number;
}

// ============================================================
// Function Under Test
// ============================================================

/**
 * Calculate row boundaries for positioned fields
 *
 * Groups fields into rows based on Y-coordinate proximity
 * and calculates boundary information for each row.
 *
 * @param fields - Array of positioned fields
 * @param rowTolerance - Y-difference threshold for same row (default 10px)
 * @returns Fields with row information
 */
function calculateRowBoundaries(
  fields: PositionedField[],
  rowTolerance: number = 10
): FieldWithRowInfo[] {
  if (fields.length === 0) return [];

  // Group fields by page first
  const fieldsByPage = new Map<number, PositionedField[]>();
  for (const field of fields) {
    if (!fieldsByPage.has(field.pageNumber)) {
      fieldsByPage.set(field.pageNumber, []);
    }
    fieldsByPage.get(field.pageNumber)!.push(field);
  }

  // Process each page separately
  const result: FieldWithRowInfo[] = [];
  let globalRowNumber = 1;

  for (const [pageNumber, pageFields] of fieldsByPage.entries()) {
    // Sort fields by Y coordinate
    const sorted = [...pageFields].sort((a, b) => a.y - b.y);

    // Group fields into rows
    const rows: PositionedField[][] = [];
    let currentRow: PositionedField[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const field = sorted[i];
      const prevField = sorted[i - 1];

      // Check if field is on same row as previous field
      if (Math.abs(field.y - prevField.y) <= rowTolerance) {
        currentRow.push(field);
      } else {
        // Start new row
        rows.push(currentRow);
        currentRow = [field];
      }
    }
    // Add last row
    rows.push(currentRow);

    // Calculate row info and assign to fields
    for (const row of rows) {
      const avgY = row.reduce((sum, f) => sum + f.y, 0) / row.length;
      const maxHeight = Math.max(...row.map((f) => f.height));

      for (const field of row) {
        result.push({
          ...field,
          rowNumber: globalRowNumber,
          rowY: avgY,
          rowHeight: maxHeight,
        });
      }

      globalRowNumber++;
    }
  }

  return result;
}

// ============================================================
// Tests
// ============================================================

describe('calculateRowBoundaries', () => {
  describe('Single Row Detection', () => {
    it('identifies fields on same row with identical Y coordinates', () => {
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
          y: 100, // Same Y
          width: 100,
          height: 20,
          pageNumber: 1,
        },
        {
          type: 'text',
          name: 'field3',
          label: 'עיר',
          x: 400,
          y: 100, // Same Y
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const withRows = calculateRowBoundaries(fields);

      // All should be in same row
      expect(withRows[0].rowNumber).toBe(withRows[1].rowNumber);
      expect(withRows[1].rowNumber).toBe(withRows[2].rowNumber);
    });

    it('identifies fields on same row within tolerance', () => {
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
          y: 105, // 5px difference - within tolerance
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const withRows = calculateRowBoundaries(fields, 10);

      expect(withRows[0].rowNumber).toBe(withRows[1].rowNumber);
    });

    it('separates fields on different rows beyond tolerance', () => {
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
          x: 100,
          y: 150, // 50px difference - beyond tolerance
          width: 100,
          height: 20,
          pageNumber: 1,
        },
      ];

      const withRows = calculateRowBoundaries(fields, 10);

      expect(withRows[0].rowNumber).not.toBe(withRows[1].rowNumber);
    });
  });

  describe('Multiple Row Detection', () => {
    it('assigns sequential row numbers', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'r1f1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'r1f2', label: '2', x: 200, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'r2f1', label: '3', x: 100, y: 150, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'r2f2', label: '4', x: 200, y: 150, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'r3f1', label: '5', x: 100, y: 200, width: 50, height: 20, pageNumber: 1 },
      ];

      const withRows = calculateRowBoundaries(fields);

      // Row numbers should be sequential: 1, 2, 3
      const rowNumbers = [...new Set(withRows.map((f) => f.rowNumber))].sort((a, b) => a - b);
      expect(rowNumbers).toEqual([1, 2, 3]);
    });

    it('orders rows top to bottom', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'bottom', label: 'B', x: 100, y: 200, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'top', label: 'T', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'middle', label: 'M', x: 100, y: 150, width: 50, height: 20, pageNumber: 1 },
      ];

      const withRows = calculateRowBoundaries(fields);

      const topRow = withRows.find((f) => f.name === 'top')?.rowNumber;
      const middleRow = withRows.find((f) => f.name === 'middle')?.rowNumber;
      const bottomRow = withRows.find((f) => f.name === 'bottom')?.rowNumber;

      expect(topRow).toBeLessThan(middleRow!);
      expect(middleRow).toBeLessThan(bottomRow!);
    });
  });

  describe('Row Y Coordinate Calculation', () => {
    it('calculates average Y for row with identical fields', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'f1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'f2', label: '2', x: 200, y: 100, width: 50, height: 20, pageNumber: 1 },
      ];

      const withRows = calculateRowBoundaries(fields);

      expect(withRows[0].rowY).toBe(100);
      expect(withRows[1].rowY).toBe(100);
    });

    it('calculates average Y for row with varied Y coordinates', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'f1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'f2', label: '2', x: 200, y: 105, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'f3', label: '3', x: 300, y: 98, width: 50, height: 20, pageNumber: 1 },
      ];

      const withRows = calculateRowBoundaries(fields);

      // Average: (100 + 105 + 98) / 3 = 101
      expect(withRows[0].rowY).toBeCloseTo(101, 0);
      expect(withRows[1].rowY).toBeCloseTo(101, 0);
      expect(withRows[2].rowY).toBeCloseTo(101, 0);
    });
  });

  describe('Row Height Calculation', () => {
    it('uses maximum height in row', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'f1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'f2', label: '2', x: 200, y: 100, width: 50, height: 30, pageNumber: 1 },
        { type: 'text', name: 'f3', label: '3', x: 300, y: 100, width: 50, height: 25, pageNumber: 1 },
      ];

      const withRows = calculateRowBoundaries(fields);

      // All fields in row should have rowHeight = 30 (maximum)
      expect(withRows[0].rowHeight).toBe(30);
      expect(withRows[1].rowHeight).toBe(30);
      expect(withRows[2].rowHeight).toBe(30);
    });
  });

  describe('Multi-Page Support', () => {
    it('handles fields on different pages separately', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'p1f1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'p2f1', label: '2', x: 100, y: 100, width: 50, height: 20, pageNumber: 2 },
      ];

      const withRows = calculateRowBoundaries(fields);

      // Same Y on different pages should be different rows
      expect(withRows[0].rowNumber).not.toBe(withRows[1].rowNumber);
    });

    it('restarts row numbering per page', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'p1r1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'p1r2', label: '2', x: 100, y: 150, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'p2r1', label: '3', x: 100, y: 100, width: 50, height: 20, pageNumber: 2 },
        { type: 'text', name: 'p2r2', label: '4', x: 100, y: 150, width: 50, height: 20, pageNumber: 2 },
      ];

      const withRows = calculateRowBoundaries(fields);

      const p1Rows = withRows.filter((f) => f.pageNumber === 1).map((f) => f.rowNumber);
      const p2Rows = withRows.filter((f) => f.pageNumber === 2).map((f) => f.rowNumber);

      // Each page should have rows 1 and 2
      expect(Math.min(...p1Rows)).toBe(1);
      expect(Math.min(...p2Rows)).toBe(3); // Continues from page 1
    });
  });

  describe('Edge Cases', () => {
    it('handles empty field array', () => {
      const withRows = calculateRowBoundaries([]);
      expect(withRows).toEqual([]);
    });

    it('handles single field', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'f1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
      ];

      const withRows = calculateRowBoundaries(fields);

      expect(withRows).toHaveLength(1);
      expect(withRows[0].rowNumber).toBe(1);
      expect(withRows[0].rowY).toBe(100);
      expect(withRows[0].rowHeight).toBe(20);
    });

    it('handles fields with zero height', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'f1', label: '1', x: 100, y: 100, width: 50, height: 0, pageNumber: 1 },
        { type: 'text', name: 'f2', label: '2', x: 200, y: 100, width: 50, height: 20, pageNumber: 1 },
      ];

      const withRows = calculateRowBoundaries(fields);

      // Row height should be 20 (non-zero field)
      expect(withRows[0].rowHeight).toBe(20);
      expect(withRows[1].rowHeight).toBe(20);
    });

    it('handles custom tolerance', () => {
      const fields: PositionedField[] = [
        { type: 'text', name: 'f1', label: '1', x: 100, y: 100, width: 50, height: 20, pageNumber: 1 },
        { type: 'text', name: 'f2', label: '2', x: 200, y: 115, width: 50, height: 20, pageNumber: 1 },
      ];

      // 15px difference - same row with tolerance=20, different with tolerance=10
      const sameRow = calculateRowBoundaries(fields, 20);
      const diffRow = calculateRowBoundaries(fields, 10);

      expect(sameRow[0].rowNumber).toBe(sameRow[1].rowNumber);
      expect(diffRow[0].rowNumber).not.toBe(diffRow[1].rowNumber);
    });
  });

  describe('Real-World Scenarios', () => {
    it('handles typical Hebrew form with multiple rows', () => {
      const fields: PositionedField[] = [
        // Row 1: Agent info
        { type: 'text', name: 'agent_name', label: 'שם הסוכן', x: 300, y: 700, width: 150, height: 20, pageNumber: 1 },
        { type: 'text', name: 'agent_num', label: 'מס\' הסוכן', x: 100, y: 700, width: 150, height: 20, pageNumber: 1 },
        // Row 2: Customer name
        { type: 'text', name: 'customer', label: 'שם הלקוח', x: 200, y: 650, width: 200, height: 20, pageNumber: 1 },
        // Row 3: Address fields
        { type: 'text', name: 'city', label: 'עיר', x: 400, y: 600, width: 80, height: 20, pageNumber: 1 },
        { type: 'text', name: 'zip', label: 'מיקוד', x: 280, y: 600, width: 80, height: 20, pageNumber: 1 },
        { type: 'text', name: 'street', label: 'רח\'', x: 100, y: 600, width: 150, height: 20, pageNumber: 1 },
      ];

      const withRows = calculateRowBoundaries(fields);

      // Should identify 3 rows
      const uniqueRows = [...new Set(withRows.map((f) => f.rowNumber))];
      expect(uniqueRows.length).toBe(3);

      // Row 1 should have 2 fields
      const row1Fields = withRows.filter((f) => f.rowY === 700);
      expect(row1Fields.length).toBe(2);

      // Row 3 should have 3 fields
      const row3Fields = withRows.filter((f) => f.rowY === 600);
      expect(row3Fields.length).toBe(3);
    });
  });
});
