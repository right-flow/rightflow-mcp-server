/**
 * Unit Tests for resolveOverlaps()
 *
 * Tests the overlap detection and resolution algorithm for positioned fields.
 * Handles cases where multiple fields occupy the same space.
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
  required: boolean;
}

interface OverlapResolution {
  action: 'keep' | 'adjust' | 'flag' | 'remove';
  reason: string;
  adjustedBox?: Box;
}

interface ResolvedField extends PositionedField {
  resolution?: OverlapResolution;
  hasOverlap?: boolean;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate intersection area between two boxes
 */
function calculateIntersectionArea(box1: Box, box2: Box): number {
  const xOverlap = Math.max(
    0,
    Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y)
  );
  return xOverlap * yOverlap;
}

/**
 * Calculate overlap percentage relative to smaller box
 */
function calculateOverlapPercentage(box1: Box, box2: Box): number {
  const intersection = calculateIntersectionArea(box1, box2);
  if (intersection === 0) return 0;

  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const smallerArea = Math.min(area1, area2);

  return (intersection / smallerArea) * 100;
}

// ============================================================
// Function Under Test
// ============================================================

/**
 * Resolve overlapping fields
 *
 * Strategy:
 * - Detect overlaps using intersection area
 * - Prioritize fields by confidence score
 * - Adjust positions when possible
 * - Flag fields that need manual review
 *
 * @param fields - Array of positioned fields
 * @param overlapThreshold - Percentage threshold for considering overlap (default 30%)
 * @returns Array of resolved fields with adjustments
 */
function resolveOverlaps(
  fields: PositionedField[],
  overlapThreshold: number = 30
): ResolvedField[] {
  if (fields.length === 0) return [];
  if (fields.length === 1) return [{ ...fields[0] }];

  const resolved: ResolvedField[] = fields.map((f) => ({ ...f }));
  const CONFIDENCE_SIMILARITY_THRESHOLD = 0.1;

  // Process each pair of fields
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      const field1 = resolved[i];
      const field2 = resolved[j];

      // Only check fields on same page
      if (field1.pageNumber !== field2.pageNumber) continue;

      // Calculate overlap
      const box1: Box = {
        x: field1.x,
        y: field1.y,
        width: field1.width,
        height: field1.height,
      };
      const box2: Box = {
        x: field2.x,
        y: field2.y,
        width: field2.width,
        height: field2.height,
      };

      const overlapPct = calculateOverlapPercentage(box1, box2);

      if (overlapPct >= overlapThreshold) {
        // Mark both as having overlap
        field1.hasOverlap = true;
        field2.hasOverlap = true;

        // Determine resolution strategy
        const confidenceDiff = Math.abs(field1.confidence - field2.confidence);

        if (confidenceDiff < CONFIDENCE_SIMILARITY_THRESHOLD) {
          // Similar confidence - check if one is required
          const field1Required = field1.required && !field2.required;
          const field2Required = field2.required && !field1.required;

          if (field1Required) {
            // Keep required field
            field1.resolution = {
              action: 'keep',
              reason: 'Required field with similar confidence',
            };
            field2.resolution = {
              action: 'adjust',
              reason: 'Optional field with similar confidence',
              adjustedBox: calculateAdjustedPosition(box2, box1),
            };
          } else if (field2Required) {
            // Keep required field
            field2.resolution = {
              action: 'keep',
              reason: 'Required field with similar confidence',
            };
            field1.resolution = {
              action: 'adjust',
              reason: 'Optional field with similar confidence',
              adjustedBox: calculateAdjustedPosition(box1, box2),
            };
          } else {
            // Both required or both optional - flag for manual review
            if (!field1.resolution) {
              field1.resolution = {
                action: 'flag',
                reason: 'Similar confidence - manual review needed',
              };
            }
            if (!field2.resolution) {
              field2.resolution = {
                action: 'flag',
                reason: 'Similar confidence - manual review needed',
              };
            }
          }
        } else {
          // Different confidence - prioritize higher confidence
          const higherField = field1.confidence > field2.confidence ? field1 : field2;
          const lowerField = field1.confidence > field2.confidence ? field2 : field1;

          // If confidences are equal, prioritize required fields
          if (field1.confidence === field2.confidence) {
            const higherIsRequired = field1.required && !field2.required;
            const lowerIsRequired = field2.required && !field1.required;

            if (higherIsRequired) {
              higherField.resolution = {
                action: 'keep',
                reason: 'Required field with equal confidence',
              };
              lowerField.resolution = {
                action: 'adjust',
                reason: 'Lower priority (optional field)',
                adjustedBox: calculateAdjustedPosition(box2, box1),
              };
            } else if (lowerIsRequired) {
              const temp = higherField;
              higherField.resolution = lowerField.resolution;
              lowerField.resolution = temp.resolution;
            }
          } else {
            // Keep higher confidence
            if (!higherField.resolution) {
              higherField.resolution = {
                action: 'keep',
                reason: `Higher confidence (${higherField.confidence.toFixed(2)})`,
              };
            }

            // Adjust or remove lower confidence
            if (overlapPct > 80) {
              // High overlap - remove lower confidence field
              lowerField.resolution = {
                action: 'remove',
                reason: `Lower confidence (${lowerField.confidence.toFixed(2)})`,
              };
            } else {
              // Moderate overlap - adjust position
              const adjustedBox =
                lowerField === field1
                  ? calculateAdjustedPosition(box1, box2)
                  : calculateAdjustedPosition(box2, box1);

              lowerField.resolution = {
                action: 'adjust',
                reason: `Lower confidence (${lowerField.confidence.toFixed(2)})`,
                adjustedBox,
              };
            }
          }
        }
      }
    }
  }

  return resolved;
}

/**
 * Calculate adjusted position to avoid overlap
 */
function calculateAdjustedPosition(fieldBox: Box, conflictBox: Box): Box {
  // Try moving down first (most common case)
  const adjustedBox: Box = {
    x: fieldBox.x,
    y: conflictBox.y + conflictBox.height + 5, // 5px gap
    width: fieldBox.width,
    height: fieldBox.height,
  };

  return adjustedBox;
}

// ============================================================
// Tests
// ============================================================

describe('resolveOverlaps', () => {
  describe('Overlap Detection', () => {
    it('detects no overlap when fields are separated', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 250,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].hasOverlap).toBeFalsy();
      expect(resolved[1].hasOverlap).toBeFalsy();
      expect(resolved[0].resolution).toBeUndefined();
    });

    it('detects full overlap when fields are identical', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'שם',
          x: 100,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.8,
          required: false,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].hasOverlap).toBe(true);
      expect(resolved[1].hasOverlap).toBe(true);
    });

    it('detects partial overlap above threshold', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 150, // 50% overlap
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields, 30); // 30% threshold

      expect(resolved[0].hasOverlap).toBe(true);
      expect(resolved[1].hasOverlap).toBe(true);
    });

    it('ignores overlap below threshold', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 185, // 15% overlap
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields, 30); // 30% threshold

      expect(resolved[0].hasOverlap).toBeFalsy();
      expect(resolved[1].hasOverlap).toBeFalsy();
    });

    it('only detects overlaps on same page', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'שם',
          x: 100,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 2, // Different page
          confidence: 0.85,
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].hasOverlap).toBeFalsy();
      expect(resolved[1].hasOverlap).toBeFalsy();
    });
  });

  describe('Resolution Strategy - Confidence Priority', () => {
    it('keeps higher confidence field when fully overlapping', () => {
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
          confidence: 0.9, // Higher confidence
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'שם',
          x: 100,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.7, // Lower confidence
          required: false,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].resolution?.action).toBe('keep');
      expect(resolved[1].resolution?.action).toBe('remove');
    });

    it('adjusts lower confidence field when partially overlapping', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 150, // 50% overlap
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.75,
          required: false,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].resolution?.action).toBe('keep');
      expect(resolved[1].resolution?.action).toBe('adjust');
      expect(resolved[1].resolution?.adjustedBox).toBeDefined();
    });

    it('flags both fields when confidence is similar', () => {
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
          confidence: 0.85,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'שם מלא',
          x: 120,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.83, // Very similar confidence
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields);

      // When confidence is close (within 0.1), flag both for manual review
      expect(resolved[0].resolution?.action).toBe('flag');
      expect(resolved[1].resolution?.action).toBe('flag');
    });
  });

  describe('Resolution Strategy - Required Priority', () => {
    it('prioritizes required field over optional when confidence is equal', () => {
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
          confidence: 0.85,
          required: true, // Required
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 120,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
          required: false, // Optional
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].resolution?.action).toBe('keep');
      expect(resolved[1].resolution?.action).not.toBe('keep');
    });
  });

  describe('Position Adjustment', () => {
    it('moves overlapping field to nearest available space', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 150,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.75,
          required: false,
        },
      ];

      const resolved = resolveOverlaps(fields);

      const adjusted = resolved[1];
      if (adjusted.resolution?.action === 'adjust' && adjusted.resolution.adjustedBox) {
        // Should move to the left (RTL) or below
        const movedLeft = adjusted.resolution.adjustedBox.x < 150;
        const movedDown = adjusted.resolution.adjustedBox.y !== 100;
        expect(movedLeft || movedDown).toBe(true);
      }
    });

    it('preserves field dimensions when adjusting position', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 150,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.75,
          required: false,
        },
      ];

      const resolved = resolveOverlaps(fields);

      const adjusted = resolved[1];
      if (adjusted.resolution?.adjustedBox) {
        expect(adjusted.resolution.adjustedBox.width).toBe(100);
        expect(adjusted.resolution.adjustedBox.height).toBe(20);
      }
    });
  });

  describe('Multiple Overlaps', () => {
    it('handles chain of overlapping fields', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 150,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
          required: true,
        },
        {
          type: 'text',
          name: 'field3',
          label: 'עיר',
          x: 200,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.8,
          required: false,
        },
      ];

      const resolved = resolveOverlaps(fields);

      // All three overlap in a chain
      expect(resolved.filter((f) => f.hasOverlap).length).toBeGreaterThan(0);
    });

    it('resolves all overlaps in single pass', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 120,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
          required: true,
        },
        {
          type: 'text',
          name: 'field3',
          label: 'עיר',
          x: 300,
          y: 150,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.8,
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields);

      // Every field should have a resolution decision
      expect(resolved.every((f) => f.resolution !== undefined || !f.hasOverlap)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty field array', () => {
      const resolved = resolveOverlaps([]);
      expect(resolved).toEqual([]);
    });

    it('handles single field', () => {
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
          confidence: 0.9,
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].hasOverlap).toBeFalsy();
    });

    it('handles touching fields (adjacent but not overlapping)', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 200, // Exactly adjacent (100 + 100)
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].hasOverlap).toBeFalsy();
      expect(resolved[1].hasOverlap).toBeFalsy();
    });

    it('handles vertical overlap (stacked fields)', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'כתובת',
          x: 100,
          y: 110, // 50% vertical overlap
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.85,
          required: true,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].hasOverlap).toBe(true);
      expect(resolved[1].hasOverlap).toBe(true);
    });
  });

  describe('Resolution Reasons', () => {
    it('provides clear reason for each resolution', () => {
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
          confidence: 0.9,
          required: true,
        },
        {
          type: 'text',
          name: 'field2',
          label: 'שם',
          x: 100,
          y: 100,
          width: 100,
          height: 20,
          pageNumber: 1,
          confidence: 0.7,
          required: false,
        },
      ];

      const resolved = resolveOverlaps(fields);

      expect(resolved[0].resolution?.reason).toBeTruthy();
      expect(resolved[1].resolution?.reason).toBeTruthy();
      expect(resolved[1].resolution?.reason).toContain('confidence');
    });
  });
});
