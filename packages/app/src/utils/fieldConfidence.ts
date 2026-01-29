/**
 * Field Confidence Utilities - Layer 5 of PDF Field Location Optimization
 *
 * Provides utility functions for computing confidence-based styling classes
 * and confidence level categorization for AI-detected field positions.
 */

import type { FieldConfidence } from '@/types/fields';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Confidence thresholds for visual indicators
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.7,   // >= 70% is high confidence
  MEDIUM: 0.4, // >= 40% is medium confidence
  // < 40% is low confidence
} as const;

/**
 * Determine confidence level from overall confidence score
 */
export function getConfidenceLevel(confidence?: FieldConfidence): ConfidenceLevel | null {
  if (!confidence || confidence.overall === undefined) {
    return null; // No confidence data available
  }

  const score = confidence.overall;

  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'high';
  } else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Get CSS class name for confidence-based field marker styling
 */
export function getConfidenceClassName(
  confidence?: FieldConfidence,
  manuallyAdjusted?: boolean,
): string {
  // If manually adjusted, override with green "verified" style
  if (manuallyAdjusted) {
    return 'field-marker-manually-adjusted';
  }

  const level = getConfidenceLevel(confidence);
  if (!level) {
    return ''; // No confidence styling if no data
  }

  return `field-marker-confidence-${level}`;
}

/**
 * Get CSS class name for confidence badge
 */
export function getConfidenceBadgeClassName(confidence?: FieldConfidence): string {
  const level = getConfidenceLevel(confidence);
  if (!level) {
    return '';
  }

  return `field-confidence-badge field-confidence-badge-${level}`;
}

/**
 * Get human-readable confidence label (Hebrew)
 */
export function getConfidenceLabel(confidence?: FieldConfidence): string {
  const level = getConfidenceLevel(confidence);
  if (!level) {
    return '';
  }

  const labels: Record<ConfidenceLevel, string> = {
    high: 'דיוק גבוה',
    medium: 'דיוק בינוני',
    low: 'דיוק נמוך - גרור לתיקון',
  };

  return labels[level];
}

/**
 * Format confidence score as percentage string
 */
export function formatConfidencePercent(confidence?: FieldConfidence): string {
  if (!confidence || confidence.overall === undefined) {
    return '';
  }

  return `${Math.round(confidence.overall * 100)}%`;
}

/**
 * Check if field needs user attention (low confidence and not manually adjusted)
 */
export function needsUserAttention(
  confidence?: FieldConfidence,
  manuallyAdjusted?: boolean,
): boolean {
  if (manuallyAdjusted) {
    return false;
  }

  const level = getConfidenceLevel(confidence);
  return level === 'low';
}
