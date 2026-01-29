/**
 * AI utilities for PDF field extraction and verification
 */

export {
  CoordinateVerificationService,
  HebrewTextNormalizer,
  calculateLevenshteinDistance,
  calculateSimilarity,
  calculateHebrewSimilarity,
  calculateOverallConfidence,
  type FieldVerificationResult,
  type ExtractedTextItem,
  type FieldPosition,
  type PageDimensions,
} from './CoordinateVerificationService';

export {
  convertPdfjsTextItems,
  groupTextItems,
  findTextInRegion,
  findRtlLabels,
  type PdfjsTextItem,
  type TextExtractionResult,
  type ExtractTextFromPdf,
} from './PdfTextExtractor';

export {
  CalibrationService,
  isRtlForm,
  calculateAverageConfidence,
  type CalibrationMatrix,
  type CalibratedAnchor,
  type CalibratedField,
} from './CalibrationService';
