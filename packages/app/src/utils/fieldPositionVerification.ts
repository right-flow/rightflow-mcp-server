/**
 * Field Position Verification - Client-side position correction
 *
 * Verifies AI-detected field positions by comparing with actual PDF text content.
 *
 * IMPORTANT UPDATE (Jan 2026):
 * The AI prompt now explicitly instructs Gemini to detect the INPUT area,
 * not the label. We should be CONSERVATIVE and only apply corrections when
 * there is HIGH CONFIDENCE that the AI made a mistake.
 *
 * Previous aggressive corrections caused MORE problems than they solved.
 * Now we only correct when:
 * 1. AI confidence is LOW
 * 2. Field position clearly overlaps with label text
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { FieldDefinition } from '@/types/fields';

/**
 * Text item extracted from PDF with position
 */
interface ExtractedTextItem {
  text: string;
  x: number;      // PDF points from left
  y: number;      // PDF points from bottom
  width: number;
  height: number;
  pageNumber: number;
}

/**
 * Verification result for a field
 */
interface FieldVerificationResult {
  field: FieldDefinition;
  labelFound: boolean;
  labelPosition?: { x: number; y: number };
  correctedPosition?: { x: number; y: number; width: number };
  confidenceBoost: number; // How much to boost confidence after verification
}

/**
 * Hebrew text normalization for comparison
 */
function normalizeHebrewText(text: string): string {
  return text
    // Remove nikud (vowel marks)
    .replace(/[\u0591-\u05C7]/g, '')
    // Normalize final letters
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ך/g, 'כ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    // Remove punctuation and whitespace
    .replace(/[\s\-_:;,.!?()[\]{}'"״׳]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;

  const n1 = normalizeHebrewText(str1);
  const n2 = normalizeHebrewText(str2);

  if (n1.length === 0 || n2.length === 0) return 0;

  // Quick check for exact match
  if (n1 === n2) return 1;

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    return 0.85;
  }

  // Levenshtein distance
  const m = n1.length;
  const n = n2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (n1[i - 1] === n2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const distance = dp[m][n];
  return 1 - (distance / Math.max(m, n));
}

/**
 * Extract all text items from a PDF page
 */
async function extractTextFromPage(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number,
): Promise<ExtractedTextItem[]> {
  try {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();

    return textContent.items
      .filter((item): item is typeof item & { str: string; transform: number[]; width: number; height: number } =>
        'str' in item && typeof item.str === 'string' && item.str.trim().length > 0
      )
      .map(item => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 50, // Default width if not available
        height: item.height || 12,
        pageNumber,
      }));
  } catch (error) {
    console.error(`[Verification] Failed to extract text from page ${pageNumber}:`, error);
    return [];
  }
}

/**
 * Find text items near a given position
 */
function findTextsNearPosition(
  textItems: ExtractedTextItem[],
  x: number,
  y: number,
  searchRadius: number,
  direction: 'rtl' | 'ltr',
): ExtractedTextItem[] {
  return textItems.filter(item => {
    const horizontalDistance = Math.abs(item.x - x);
    const verticalDistance = Math.abs(item.y - y);

    // For RTL forms, labels are to the RIGHT of input fields
    // So we should search more to the right
    const isToTheRight = item.x > x;
    const effectiveHorizontalRadius = direction === 'rtl' && isToTheRight
      ? searchRadius * 2 // Expand search to the right for RTL
      : searchRadius;

    return horizontalDistance <= effectiveHorizontalRadius && verticalDistance <= searchRadius;
  });
}

/**
 * Search for a label text in the entire page
 */
function searchForLabel(
  textItems: ExtractedTextItem[],
  label: string,
  similarityThreshold: number = 0.6,
): ExtractedTextItem | null {
  let bestMatch: { item: ExtractedTextItem; similarity: number } | null = null;

  for (const item of textItems) {
    const similarity = calculateSimilarity(item.text, label);
    if (similarity >= similarityThreshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { item, similarity };
      }
    }
  }

  return bestMatch?.item || null;
}

/**
 * Calculate input field position based on label position (for RTL Hebrew forms)
 *
 * In Hebrew RTL forms:
 * - Label is on the RIGHT
 * - Input field is on the LEFT of the label
 */
function calculateInputPositionFromLabel(
  labelX: number,
  labelY: number,
  labelWidth: number,
  pageWidth: number,
  fieldType: string,
): { x: number; y: number; width: number } {
  // For RTL forms, input is to the LEFT of label
  // Calculate appropriate width based on available space

  // Start from left edge of page with some margin
  const inputX = Math.max(20, pageWidth * 0.05);

  // Width extends from left margin to just before the label
  // Leave gap between input and label (consider label width for proper spacing)
  const gapBeforeLabel = Math.max(10, labelWidth * 0.2);
  const inputWidth = Math.max(50, labelX - inputX - gapBeforeLabel);

  // For checkbox/radio, use smaller width
  const effectiveWidth = fieldType === 'checkbox' || fieldType === 'radio'
    ? Math.min(inputWidth, 20)
    : inputWidth;

  return {
    x: inputX,
    y: labelY,
    width: effectiveWidth,
  };
}

/**
 * Verify and correct a single field's position
 */
async function verifyFieldPosition(
  field: FieldDefinition,
  textItems: ExtractedTextItem[],
  pageWidth: number,
): Promise<FieldVerificationResult> {
  const result: FieldVerificationResult = {
    field,
    labelFound: false,
    confidenceBoost: 0,
  };

  // If no label, can't verify
  if (!field.label) {
    return result;
  }

  // First, check if label exists near the detected position
  const nearbyTexts = findTextsNearPosition(
    textItems,
    field.x + field.width, // Check to the right of field (where label should be in RTL)
    field.y,
    100, // Search radius
    field.direction || 'rtl',
  );

  // Try to find the label in nearby texts
  let foundLabel: ExtractedTextItem | null = null;
  for (const textItem of nearbyTexts) {
    const similarity = calculateSimilarity(textItem.text, field.label);
    if (similarity >= 0.6) {
      foundLabel = textItem;
      break;
    }
  }

  // If not found nearby, search the entire page
  if (!foundLabel) {
    foundLabel = searchForLabel(
      textItems.filter(t => t.pageNumber === field.pageNumber),
      field.label,
    );
  }

  if (foundLabel) {
    result.labelFound = true;
    result.labelPosition = { x: foundLabel.x, y: foundLabel.y };

    // Check if the current field position makes sense given the label position
    const isRtl = field.direction === 'rtl';

    if (isRtl) {
      // For RTL: label should be to the RIGHT of input field
      // If AI detected position is to the RIGHT of label, it detected the label position
      // We need to shift to the LEFT

      const fieldRightEdge = field.x + field.width;
      const labelLeftEdge = foundLabel.x;

      // If field's right edge is near or past the label, we're detecting the label position
      if (fieldRightEdge > labelLeftEdge - 30) {
        // Calculate correct input position
        const correctedPos = calculateInputPositionFromLabel(
          foundLabel.x,
          foundLabel.y,
          foundLabel.width,
          pageWidth,
          field.type,
        );

        result.correctedPosition = correctedPos;
        result.confidenceBoost = 0.2; // Boost confidence since we verified
        console.log(`[Verification] Field "${field.label}": correcting position from x=${field.x.toFixed(1)} to x=${correctedPos.x.toFixed(1)}`);
      } else {
        // Position seems correct
        result.confidenceBoost = 0.15;
      }
    }
  } else {
    console.log(`[Verification] Field "${field.label}": label not found in PDF text`);
    // Could not find label - decrease confidence
    result.confidenceBoost = -0.1;
  }

  return result;
}

/**
 * Verify and correct positions for all fields
 *
 * @param fields - Fields from AI detection
 * @param pdfDocument - Loaded PDF document (from react-pdf/pdfjs-dist)
 * @param pageDimensions - Map of page number to { width, height }
 * @returns Fields with corrected positions
 */
export async function verifyAndCorrectFieldPositions(
  fields: FieldDefinition[],
  pdfDocument: PDFDocumentProxy,
  pageDimensions: Map<number, { width: number; height: number }>,
): Promise<FieldDefinition[]> {
  console.log(`[Verification] Starting position verification for ${fields.length} fields`);

  // Group fields by page
  const fieldsByPage = new Map<number, FieldDefinition[]>();
  for (const field of fields) {
    if (!fieldsByPage.has(field.pageNumber)) {
      fieldsByPage.set(field.pageNumber, []);
    }
    fieldsByPage.get(field.pageNumber)!.push(field);
  }

  // Process each page
  const correctedFields: FieldDefinition[] = [];

  for (const [pageNumber, pageFields] of fieldsByPage) {
    // Extract text from page
    const textItems = await extractTextFromPage(pdfDocument, pageNumber);
    console.log(`[Verification] Page ${pageNumber}: extracted ${textItems.length} text items`);

    const pageDims = pageDimensions.get(pageNumber) || { width: 595, height: 842 };

    // Verify each field on this page
    for (const field of pageFields) {
      const result = await verifyFieldPosition(field, textItems, pageDims.width);

      // Apply corrections
      const correctedField: FieldDefinition = { ...field };

      if (result.correctedPosition) {
        correctedField.x = result.correctedPosition.x;
        correctedField.y = result.correctedPosition.y;
        correctedField.width = result.correctedPosition.width;
        // Mark as having been position-corrected
        (correctedField as FieldDefinition & { _positionCorrected?: boolean })._positionCorrected = true;
      }

      // Update confidence if present
      if (correctedField.confidence && result.confidenceBoost !== 0) {
        const newOverall = Math.max(0, Math.min(1,
          (correctedField.confidence.overall || 0.5) + result.confidenceBoost
        ));
        correctedField.confidence = {
          ...correctedField.confidence,
          overall: newOverall,
          position: result.labelFound ? 0.85 : (correctedField.confidence.position || 0.5),
        };
      }

      correctedFields.push(correctedField);
    }
  }

  // Count corrections made
  const correctionCount = correctedFields.filter(
    f => (f as FieldDefinition & { _positionCorrected?: boolean })._positionCorrected
  ).length;
  console.log(`[Verification] Completed: ${correctionCount}/${fields.length} fields had positions corrected`);

  return correctedFields;
}

/**
 * Quick check if verification is likely to help
 *
 * IMPORTANT UPDATE (Jan 2026):
 * Position verification is now DISABLED by default.
 * The AI prompt instructs Gemini to detect input areas, not labels.
 * Running verification was causing MORE problems than it solved.
 *
 * Only enable verification if:
 * 1. Most fields have LOW confidence scores
 * 2. AND fields are positioned very far right (>90% from left)
 *
 * For now, we return false to skip verification entirely and trust the AI.
 * This can be re-enabled in the future if needed with better heuristics.
 */
export function shouldVerifyPositions(fields: FieldDefinition[]): boolean {
  // DISABLED: Trust the AI's detection for now
  // Previous verification was causing more harm than good
  console.log(`[Verification Check] Skipping position verification (disabled - trusting AI detection)`);
  return false;

  // Original logic kept for reference:
  /*
  if (fields.length === 0) return false;

  // Check if RTL fields seem to be on the wrong side (right side of page)
  const rtlFields = fields.filter(f => f.direction === 'rtl');
  if (rtlFields.length === 0) return false;

  // Only verify if most fields have LOW confidence
  const lowConfidenceFields = rtlFields.filter(
    f => f.confidence && f.confidence.position < 0.5
  );
  const lowConfidenceRatio = lowConfidenceFields.length / rtlFields.length;
  if (lowConfidenceRatio < 0.5) {
    console.log(`[Verification Check] Skipping - most fields have good confidence`);
    return false;
  }

  // Assume A4 page width if not available
  const assumedPageWidth = 595;
  const pageCenter = assumedPageWidth / 2;

  // Count how many RTL text fields are on the far right side of page (>90%)
  const rtlTextFields = rtlFields.filter(f => f.type === 'text');
  const onFarRightSide = rtlTextFields.filter(f => f.x > assumedPageWidth * 0.9).length;

  // Only verify if most text fields are on far right side (>70%)
  const rightSideRatio = rtlTextFields.length > 0 ? onFarRightSide / rtlTextFields.length : 0;

  console.log(`[Verification Check] ${onFarRightSide}/${rtlTextFields.length} RTL text fields on far right (${(rightSideRatio * 100).toFixed(0)}%)`);

  return rightSideRatio > 0.7;
  */
}
