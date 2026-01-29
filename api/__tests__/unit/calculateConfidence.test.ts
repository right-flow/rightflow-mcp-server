/**
 * Unit Tests for calculateConfidence()
 *
 * Tests the multi-factor confidence scoring algorithm for positioned fields.
 * Combines label match quality, position certainty, and type certainty.
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

interface ConfidenceFactors {
  labelMatch: number; // 0-1: How well the label matched (from hebrewTextSimilarity)
  positionCertainty: number; // 0-1: How certain we are about field position
  typeCertainty: number; // 0-1: How certain we are about field type
  visualBoundary?: boolean; // Whether field has visible boundary
}

interface ConfidenceResult {
  overall: number; // 0-1: Combined confidence score
  breakdown: {
    labelMatch: number;
    positionCertainty: number;
    typeCertainty: number;
  };
  quality: 'high' | 'medium' | 'low'; // Quality classification
}

// ============================================================
// Function Under Test
// ============================================================

/**
 * Calculate overall confidence score for a positioned field
 *
 * Combines multiple confidence factors with weighted formula:
 * - Label match: 30% weight (how well label text matched)
 * - Position certainty: 50% weight (how certain field position is)
 * - Type certainty: 20% weight (how certain field type is)
 *
 * @param factors - Individual confidence factors
 * @returns Confidence result with overall score and breakdown
 */
function calculateConfidence(factors: ConfidenceFactors): ConfidenceResult {
  // Weights for confidence factors
  const LABEL_WEIGHT = 0.3;
  const POSITION_WEIGHT = 0.5;
  const TYPE_WEIGHT = 0.2;
  const VISUAL_BOUNDARY_BOOST = 0.05;

  // Calculate weighted score
  let overall =
    factors.labelMatch * LABEL_WEIGHT +
    factors.positionCertainty * POSITION_WEIGHT +
    factors.typeCertainty * TYPE_WEIGHT;

  // Add bonus for visual boundary detection
  if (factors.visualBoundary === true) {
    overall += VISUAL_BOUNDARY_BOOST;
  }

  // Cap at 1.0
  overall = Math.min(overall, 1.0);

  // Determine quality classification
  let quality: 'high' | 'medium' | 'low';
  if (overall >= 0.85) {
    quality = 'high';
  } else if (overall >= 0.70) {
    quality = 'medium';
  } else {
    quality = 'low';
  }

  return {
    overall,
    breakdown: {
      labelMatch: factors.labelMatch,
      positionCertainty: factors.positionCertainty,
      typeCertainty: factors.typeCertainty,
    },
    quality,
  };
}

// ============================================================
// Tests
// ============================================================

describe('calculateConfidence', () => {
  describe('Weighted Formula', () => {
    it('applies correct weights to factors (30% label, 50% position, 20% type)', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 1.0,
        positionCertainty: 0.8,
        typeCertainty: 0.9,
      };

      const result = calculateConfidence(factors);

      // Expected: 1.0 * 0.3 + 0.8 * 0.5 + 0.9 * 0.2 = 0.3 + 0.4 + 0.18 = 0.88
      expect(result.overall).toBeCloseTo(0.88, 2);
    });

    it('returns 1.0 for perfect scores', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 1.0,
        positionCertainty: 1.0,
        typeCertainty: 1.0,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBe(1.0);
      expect(result.quality).toBe('high');
    });

    it('returns lower score when label match is poor', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.5, // Low label match
        positionCertainty: 1.0,
        typeCertainty: 1.0,
      };

      const result = calculateConfidence(factors);

      // Expected: 0.5 * 0.3 + 1.0 * 0.5 + 1.0 * 0.2 = 0.15 + 0.5 + 0.2 = 0.85
      expect(result.overall).toBeCloseTo(0.85, 2);
    });

    it('prioritizes position certainty (highest weight)', () => {
      const lowPosition: ConfidenceFactors = {
        labelMatch: 1.0,
        positionCertainty: 0.5, // Low position certainty
        typeCertainty: 1.0,
      };

      const lowLabel: ConfidenceFactors = {
        labelMatch: 0.5,
        positionCertainty: 1.0,
        typeCertainty: 1.0,
      };

      const resultLowPosition = calculateConfidence(lowPosition);
      const resultLowLabel = calculateConfidence(lowLabel);

      // Low position should have bigger impact than low label
      expect(resultLowPosition.overall).toBeLessThan(resultLowLabel.overall);
    });
  });

  describe('Quality Classification', () => {
    it('classifies high confidence (>= 0.85)', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 1.0,
        positionCertainty: 0.9,
        typeCertainty: 0.8,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBeGreaterThanOrEqual(0.85);
      expect(result.quality).toBe('high');
    });

    it('classifies medium confidence (0.70 - 0.85)', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.8,
        positionCertainty: 0.7,
        typeCertainty: 0.8,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBeGreaterThanOrEqual(0.70);
      expect(result.overall).toBeLessThan(0.85);
      expect(result.quality).toBe('medium');
    });

    it('classifies low confidence (< 0.70)', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.6,
        positionCertainty: 0.5,
        typeCertainty: 0.6,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBeLessThan(0.70);
      expect(result.quality).toBe('low');
    });
  });

  describe('Breakdown Preservation', () => {
    it('preserves individual factor scores in breakdown', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.95,
        positionCertainty: 0.85,
        typeCertainty: 0.90,
      };

      const result = calculateConfidence(factors);

      expect(result.breakdown.labelMatch).toBe(0.95);
      expect(result.breakdown.positionCertainty).toBe(0.85);
      expect(result.breakdown.typeCertainty).toBe(0.90);
    });
  });

  describe('Visual Boundary Bonus', () => {
    it('boosts confidence when visual boundary detected', () => {
      const withBoundary: ConfidenceFactors = {
        labelMatch: 0.9,
        positionCertainty: 0.8,
        typeCertainty: 0.8,
        visualBoundary: true,
      };

      const withoutBoundary: ConfidenceFactors = {
        labelMatch: 0.9,
        positionCertainty: 0.8,
        typeCertainty: 0.8,
        visualBoundary: false,
      };

      const resultWith = calculateConfidence(withBoundary);
      const resultWithout = calculateConfidence(withoutBoundary);

      // Visual boundary should provide a small boost (e.g., +0.05)
      expect(resultWith.overall).toBeGreaterThan(resultWithout.overall);
      expect(resultWith.overall - resultWithout.overall).toBeCloseTo(0.05, 2);
    });

    it('caps overall score at 1.0 even with boundary bonus', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 1.0,
        positionCertainty: 1.0,
        typeCertainty: 1.0,
        visualBoundary: true,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero scores', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0,
        positionCertainty: 0,
        typeCertainty: 0,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBe(0);
      expect(result.quality).toBe('low');
    });

    it('handles partial zeros', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 1.0,
        positionCertainty: 0,
        typeCertainty: 1.0,
      };

      const result = calculateConfidence(factors);

      // Expected: 1.0 * 0.3 + 0 * 0.5 + 1.0 * 0.2 = 0.3 + 0 + 0.2 = 0.5
      expect(result.overall).toBeCloseTo(0.5, 2);
      expect(result.quality).toBe('low');
    });

    it('handles values at boundaries', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.85,
        positionCertainty: 0.85,
        typeCertainty: 0.85,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBeCloseTo(0.85, 2);
      // At boundary - should be classified as 'high'
      expect(result.quality).toBe('high');
    });
  });

  describe('Real-World Scenarios', () => {
    it('exact label match with good position certainty', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 1.0, // Exact match
        positionCertainty: 0.9, // Clear field boundary
        typeCertainty: 0.85, // Underline pattern detected
        visualBoundary: true,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBeGreaterThan(0.9);
      expect(result.quality).toBe('high');
    });

    it('substring label match with uncertain position', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.9, // Substring match
        positionCertainty: 0.7, // Estimated position (no clear boundary)
        typeCertainty: 0.8, // Type inferred from context
        visualBoundary: false,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBeGreaterThan(0.7);
      expect(result.overall).toBeLessThan(0.85);
      expect(result.quality).toBe('medium');
    });

    it('fuzzy label match with multi-field line', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.85, // Nikud difference
        positionCertainty: 0.75, // Multi-field line (less certain about boundaries)
        typeCertainty: 0.8, // Type clear from visual pattern
        visualBoundary: false,
      };

      const result = calculateConfidence(factors);

      expect(result.overall).toBeGreaterThan(0.75);
      expect(result.quality).toBe('medium');
    });

    it('weak label match with good position results in medium confidence', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.6, // Below typical threshold
        positionCertainty: 0.8, // But good position certainty
        typeCertainty: 0.7,
      };

      const result = calculateConfidence(factors);

      // Expected: 0.6 * 0.3 + 0.8 * 0.5 + 0.7 * 0.2 = 0.72
      expect(result.overall).toBeCloseTo(0.72, 2);
      // Good position (50% weight) compensates for weak label → medium quality
      expect(result.quality).toBe('medium');
    });

    it('high label match with uncertain position and type', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 1.0, // Perfect match
        positionCertainty: 0.6, // Uncertain position
        typeCertainty: 0.6, // Uncertain type
      };

      const result = calculateConfidence(factors);

      // Expected: 1.0 * 0.3 + 0.6 * 0.5 + 0.6 * 0.2 = 0.3 + 0.3 + 0.12 = 0.72
      expect(result.overall).toBeCloseTo(0.72, 2);
      expect(result.quality).toBe('medium');
    });
  });

  describe('Consistency and Determinism', () => {
    it('returns same result for same inputs', () => {
      const factors: ConfidenceFactors = {
        labelMatch: 0.87,
        positionCertainty: 0.92,
        typeCertainty: 0.78,
      };

      const result1 = calculateConfidence(factors);
      const result2 = calculateConfidence(factors);

      expect(result1.overall).toBe(result2.overall);
      expect(result1.quality).toBe(result2.quality);
    });

    it('is order-independent (factors can be provided in any order)', () => {
      const factors1: ConfidenceFactors = {
        labelMatch: 0.9,
        positionCertainty: 0.8,
        typeCertainty: 0.85,
      };

      const factors2: ConfidenceFactors = {
        typeCertainty: 0.85,
        labelMatch: 0.9,
        positionCertainty: 0.8,
      };

      const result1 = calculateConfidence(factors1);
      const result2 = calculateConfidence(factors2);

      expect(result1.overall).toBe(result2.overall);
    });
  });

  describe('Score Ranges', () => {
    it('always returns score between 0 and 1', () => {
      const testCases: ConfidenceFactors[] = [
        { labelMatch: 0, positionCertainty: 0, typeCertainty: 0 },
        { labelMatch: 1, positionCertainty: 1, typeCertainty: 1 },
        { labelMatch: 0.5, positionCertainty: 0.7, typeCertainty: 0.3 },
        { labelMatch: 1, positionCertainty: 0, typeCertainty: 1, visualBoundary: true },
      ];

      testCases.forEach((factors) => {
        const result = calculateConfidence(factors);
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(1);
      });
    });
  });
});
