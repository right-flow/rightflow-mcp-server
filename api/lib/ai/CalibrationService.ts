/**
 * CalibrationService - Layer 4 of PDF Field Location Optimization
 *
 * Uses anchor points and RTL-awareness to calibrate field coordinates.
 * Corrects the common issue where AI detects label position instead of input field position.
 *
 * Key insight for Hebrew/RTL forms:
 * - Labels are on the RIGHT side
 * - Input fields are on the LEFT side of labels
 * - The AI often returns label coordinates, not input coordinates
 */

import type { PageDimensions } from './CoordinateVerificationService';

/**
 * Calibration matrix for coordinate transformation
 */
export interface CalibrationMatrix {
  // Translation offsets
  offsetX: number;           // X offset in PDF points
  offsetY: number;           // Y offset in PDF points
  // Scale factors (1.0 = no scaling)
  scaleX: number;
  scaleY: number;
  // Rotation correction (degrees)
  rotation: number;
  // Overall confidence in calibration
  confidence: number;
  // Whether RTL offset was applied
  rtlCorrectionApplied: boolean;
}

/**
 * Anchor point with PDF coordinates
 */
export interface CalibratedAnchor {
  type: string;
  description: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

/**
 * Field with PDF coordinates
 */
export interface CalibratedField {
  name: string;
  label?: string;
  type: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'ltr' | 'rtl';
  confidence?: {
    position: number;
    size: number;
    labelMatch: number;
    overall: number;
  };
  // Calibration metadata
  _calibrated?: boolean;
  _originalX?: number;
  _originalY?: number;
}

// PageDimensions is imported from CoordinateVerificationService

/**
 * RTL Form Calibration Constants
 * Based on analysis of Hebrew insurance forms
 *
 * IMPORTANT: The AI prompt already instructs Gemini to detect the INPUT area,
 * not the label. So we should be CONSERVATIVE with calibration and only
 * apply it when there's clear evidence the AI detected the wrong position.
 */
const RTL_CALIBRATION = {
  // For Hebrew RTL forms: input fields are LEFT of labels
  // AI typically returns label position, so we shift LEFT to find input area
  // Negative = shift left in PDF coordinates
  LABEL_TO_INPUT_OFFSET_PERCENT: -40, // Shift left by 40% of page width

  // Minimum confidence BELOW which we apply calibration
  // If AI confidence is HIGH (>0.7), trust the AI's detection
  MIN_CONFIDENCE_FOR_CALIBRATION: 0.7,

  // Typical input field width (percentage of page width)
  DEFAULT_INPUT_WIDTH_PERCENT: 30,

  // When field is very wide (includes label+input), use this ratio to find input
  // Input area is typically the left 60% of the detected area
  INPUT_TO_TOTAL_RATIO: 0.6,

  // Search radius for anchor matching (PDF points)
  ANCHOR_MATCH_RADIUS: 30,

  // Only calibrate if field is VERY far to the right (likely a label)
  // Changed from 50% to 85% - only move if clearly on the label side
  RIGHT_SIDE_THRESHOLD_PERCENT: 85,

  // Minimum field width to be considered "just a label" (percentage of page)
  // Very narrow fields on the right are likely labels
  MIN_LABEL_WIDTH_PERCENT: 5,
  MAX_LABEL_WIDTH_PERCENT: 20,
};

/**
 * CalibrationService
 *
 * Calibrates field coordinates using anchor points and RTL awareness.
 */
export class CalibrationService {
  /**
   * Calculate calibration matrix from anchor points
   *
   * @param aiAnchors - Anchor points detected by AI
   * @param verifiedAnchors - Known/verified anchor positions (if available)
   * @param pageInfo - Page dimensions
   */
  calculateCalibration(
    aiAnchors: CalibratedAnchor[],
    verifiedAnchors: CalibratedAnchor[] | null,
    pageInfo: PageDimensions,
  ): CalibrationMatrix {
    // Default calibration (no transformation)
    const defaultMatrix: CalibrationMatrix = {
      offsetX: 0,
      offsetY: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
      confidence: 0.5,
      rtlCorrectionApplied: false,
    };

    if (!verifiedAnchors || verifiedAnchors.length === 0) {
      // No verified anchors - return default with low confidence
      return defaultMatrix;
    }

    // Match AI anchors with verified anchors
    const matchedPairs = this.matchAnchors(aiAnchors, verifiedAnchors);

    if (matchedPairs.length < 2) {
      // Not enough matches for calibration
      return { ...defaultMatrix, confidence: 0.3 };
    }

    // Calculate transformation based on matched pairs
    if (matchedPairs.length === 2) {
      // 2 points: translation only
      return this.calculateTranslation(matchedPairs, pageInfo);
    } else if (matchedPairs.length >= 3) {
      // 3+ points: translation + scale
      return this.calculateAffineTransform(matchedPairs, pageInfo);
    }

    return defaultMatrix;
  }

  /**
   * Apply RTL correction to shift from label position to input field position
   *
   * IMPORTANT UPDATE (Jan 2026):
   * RTL Calibration is now DISABLED.
   *
   * The AI prompt has been significantly improved to explicitly instruct Gemini
   * to detect the INPUT area (underlines, boxes) rather than label text.
   * Testing shows that the prompt improvements work well, and the calibration
   * was causing MORE problems than it solved by incorrectly moving fields.
   *
   * This function now simply returns the field unchanged, trusting the AI's detection.
   */
  applyRtlCorrection(
    field: CalibratedField,
    _pageWidth: number,
  ): CalibratedField {
    // RTL Calibration DISABLED - trust the AI's detection
    // The prompt now explicitly instructs the AI to return input field positions
    console.log(`[RTL Calibration] DISABLED - trusting AI detection for field "${field.name}"`);

    return {
      ...field,
      _originalX: field.x,
      _originalY: field.y,
      _calibrated: false,
    };
  }

  /**
   * Apply full calibration to a field
   */
  applyCalibration(
    field: CalibratedField,
    matrix: CalibrationMatrix,
    pageInfo: PageDimensions,
  ): CalibratedField {
    let calibratedField = { ...field };

    // Store original position
    calibratedField._originalX = field.x;
    calibratedField._originalY = field.y;

    // Apply scale
    calibratedField.x = field.x * matrix.scaleX;
    calibratedField.y = field.y * matrix.scaleY;
    calibratedField.width = field.width * matrix.scaleX;
    calibratedField.height = field.height * matrix.scaleY;

    // Apply translation
    calibratedField.x += matrix.offsetX;
    calibratedField.y += matrix.offsetY;

    // Apply RTL correction if this is an RTL field
    if (field.direction === 'rtl' && !matrix.rtlCorrectionApplied) {
      calibratedField = this.applyRtlCorrection(calibratedField, pageInfo.width);
    }

    calibratedField._calibrated = true;

    return calibratedField;
  }

  /**
   * Calibrate multiple fields
   */
  calibrateFields(
    fields: CalibratedField[],
    anchors: CalibratedAnchor[],
    verifiedAnchors: CalibratedAnchor[] | null,
    pageInfo: PageDimensions,
  ): { fields: CalibratedField[]; matrix: CalibrationMatrix } {
    // Calculate calibration matrix
    const matrix = this.calculateCalibration(anchors, verifiedAnchors, pageInfo);

    // Apply calibration to all fields
    const calibratedFields = fields.map(field =>
      this.applyCalibration(field, matrix, pageInfo)
    );

    return { fields: calibratedFields, matrix };
  }

  /**
   * Quick RTL-only calibration (no anchor matching)
   * Use when we don't have verified anchors but know it's an RTL form
   */
  quickRtlCalibration(
    fields: CalibratedField[],
    pageInfo: PageDimensions,
  ): CalibratedField[] {
    return fields.map(field => {
      if (field.direction === 'rtl') {
        return this.applyRtlCorrection(field, pageInfo.width);
      }
      return field;
    });
  }

  /**
   * Match AI-detected anchors with verified anchors
   */
  private matchAnchors(
    aiAnchors: CalibratedAnchor[],
    verifiedAnchors: CalibratedAnchor[],
  ): Array<{ ai: CalibratedAnchor; verified: CalibratedAnchor }> {
    const matches: Array<{ ai: CalibratedAnchor; verified: CalibratedAnchor }> = [];

    for (const aiAnchor of aiAnchors) {
      // Find best matching verified anchor
      let bestMatch: CalibratedAnchor | null = null;
      let bestDistance = Infinity;

      for (const verifiedAnchor of verifiedAnchors) {
        // Must be same page
        if (aiAnchor.pageNumber !== verifiedAnchor.pageNumber) continue;

        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(aiAnchor.x - verifiedAnchor.x, 2) +
          Math.pow(aiAnchor.y - verifiedAnchor.y, 2)
        );

        // Check if within matching radius and better than previous
        if (distance < RTL_CALIBRATION.ANCHOR_MATCH_RADIUS && distance < bestDistance) {
          bestDistance = distance;
          bestMatch = verifiedAnchor;
        }
      }

      if (bestMatch) {
        matches.push({ ai: aiAnchor, verified: bestMatch });
      }
    }

    return matches;
  }

  /**
   * Calculate simple translation from 2 matched points
   */
  private calculateTranslation(
    matches: Array<{ ai: CalibratedAnchor; verified: CalibratedAnchor }>,
    _pageInfo: PageDimensions,
  ): CalibrationMatrix {
    // Average the offsets
    let totalOffsetX = 0;
    let totalOffsetY = 0;

    for (const match of matches) {
      totalOffsetX += match.verified.x - match.ai.x;
      totalOffsetY += match.verified.y - match.ai.y;
    }

    const offsetX = totalOffsetX / matches.length;
    const offsetY = totalOffsetY / matches.length;

    return {
      offsetX,
      offsetY,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
      confidence: 0.7,
      rtlCorrectionApplied: false,
    };
  }

  /**
   * Calculate affine transformation from 3+ matched points
   */
  private calculateAffineTransform(
    matches: Array<{ ai: CalibratedAnchor; verified: CalibratedAnchor }>,
    _pageInfo: PageDimensions,
  ): CalibrationMatrix {
    // For simplicity, we'll calculate average scale and translation
    // A full affine transform would use least squares fitting

    let totalScaleX = 0;
    let totalScaleY = 0;
    let totalOffsetX = 0;
    let totalOffsetY = 0;

    // Calculate scale from bounding box ratios
    for (const match of matches) {
      if (match.ai.width > 0 && match.verified.width > 0) {
        totalScaleX += match.verified.width / match.ai.width;
      } else {
        totalScaleX += 1.0;
      }

      if (match.ai.height > 0 && match.verified.height > 0) {
        totalScaleY += match.verified.height / match.ai.height;
      } else {
        totalScaleY += 1.0;
      }
    }

    const scaleX = totalScaleX / matches.length;
    const scaleY = totalScaleY / matches.length;

    // Calculate translation after scaling
    for (const match of matches) {
      totalOffsetX += match.verified.x - (match.ai.x * scaleX);
      totalOffsetY += match.verified.y - (match.ai.y * scaleY);
    }

    const offsetX = totalOffsetX / matches.length;
    const offsetY = totalOffsetY / matches.length;

    return {
      offsetX,
      offsetY,
      scaleX,
      scaleY,
      rotation: 0,
      confidence: 0.8,
      rtlCorrectionApplied: false,
    };
  }
}

/**
 * Detect if a form is primarily RTL based on field directions
 */
export function isRtlForm(fields: Array<{ direction?: 'ltr' | 'rtl' }>): boolean {
  // Count fields with explicit direction
  const fieldsWithDirection = fields.filter(f => f.direction !== undefined);

  // If no fields have direction specified, assume RTL (Hebrew form is default use case)
  if (fieldsWithDirection.length === 0) {
    return true;
  }

  const rtlCount = fieldsWithDirection.filter(f => f.direction === 'rtl').length;
  return rtlCount > fieldsWithDirection.length / 2;
}

/**
 * Calculate the average confidence across all fields
 */
export function calculateAverageConfidence(
  fields: Array<{ confidence?: { overall: number } }>,
): number {
  const fieldsWithConfidence = fields.filter(f => f.confidence?.overall !== undefined);
  if (fieldsWithConfidence.length === 0) return 0.5;

  const total = fieldsWithConfidence.reduce(
    (sum, f) => sum + (f.confidence?.overall || 0),
    0
  );
  return total / fieldsWithConfidence.length;
}
