/**
 * PDF Text Extraction Utilities
 *
 * Extracts text content from PDF documents at specific coordinates
 * with proper Hebrew/RTL text handling.
 */

import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// TextItem type definition (not exported by pdfjs-dist)
interface TextItem {
  str: string;
  transform: number[]; // [a, b, c, d, x, y]
  width: number;
  height: number;
}

export interface TextExtractionOptions {
  x: number; // PDF coordinates (points)
  y: number; // PDF coordinates (points, from bottom)
  width: number; // PDF dimensions (points)
  height: number; // PDF dimensions (points)
  pageNumber: number;
}

/**
 * Extract text content from a specific area of a PDF page
 *
 * @param pdfDocument - The loaded PDF document
 * @param options - Coordinates and dimensions for extraction
 * @returns Extracted text content
 */
export async function extractTextFromPDFArea(
  pdfDocument: PDFDocumentProxy,
  options: TextExtractionOptions,
): Promise<string> {
  const { x, y, width, height, pageNumber } = options;

  try {
    // Get the specific page
    const page: PDFPageProxy = await pdfDocument.getPage(pageNumber);

    // Get text content
    const textContent = await page.getTextContent();

    // DEBUG: Log ALL text items on the page to help locate specific text
    console.log(`[PDF Text Extraction] Page has ${textContent.items.length} total text items`);
    console.log('[PDF Text Extraction] Searching for text items containing "שים לב"...');
    textContent.items.forEach((item, index) => {
      if ('str' in item) {
        const textItem = item as TextItem;
        if (textItem.str.includes('שים') || textItem.str.includes('לב')) {
          console.log(`  [${index}] "${textItem.str}" at X=${textItem.transform[4].toFixed(1)}, Y=${textItem.transform[5].toFixed(1)}`);
        }
      }
    });

    // Calculate bounding box in PDF coordinates
    // Note: Both field coordinates and textContent items use PDF coordinate system
    // where Y increases from bottom to top (same origin)
    const bottom = y; // Bottom of field
    const top = y + height; // Top of field
    const left = x;
    const right = x + width;

    console.log(`[PDF Text Extraction] Field coordinates: x=${x}, y=${y}, width=${width}, height=${height}, page=${pageNumber}`);
    console.log(`[PDF Text Extraction] Bounding box: X=[${left.toFixed(1)} to ${right.toFixed(1)}], Y=[${bottom.toFixed(1)} to ${top.toFixed(1)}]`);

    // Add margin for better text capture
    // Larger margin needed because PDF text coordinates don't always match visual position
    const margin = 10; // 10 points (~3.5mm) margin on all sides
    const boxLeft = left - margin;
    const boxRight = right + margin;
    const boxBottom = bottom - margin;
    const boxTop = top + margin;

    // Filter text items within the bounding box
    const textItems = textContent.items.filter((item) => {
      if (!('str' in item)) return false; // Skip non-text items

      const textItem = item as TextItem;
      const itemX = textItem.transform[4];
      const itemY = textItem.transform[5];

      // Check if text item is within or overlaps the bounding box
      // Y coordinates: bottom < itemY < top (because Y increases upward in PDF coords)
      return (
        itemX >= boxLeft &&
        itemX <= boxRight &&
        itemY >= boxBottom &&
        itemY <= boxTop
      );
    });

    // Sort text items by position (top-to-bottom, then right-to-left for RTL)
    textItems.sort((a, b) => {
      const aItem = a as TextItem;
      const bItem = b as TextItem;

      const aY = aItem.transform[5];
      const bY = bItem.transform[5];
      const aX = aItem.transform[4];
      const bX = bItem.transform[4];

      // First sort by Y (top to bottom)
      const yDiff = bY - aY; // Reverse because PDF Y increases upward
      if (Math.abs(yDiff) > 5) {
        // Items on different lines (5pt threshold)
        return yDiff;
      }

      // Same line - sort by X (right to left for RTL detection)
      // We'll handle the actual RTL ordering in the next step
      return aX - bX;
    });

    console.log(`[PDF Text Extraction] Found ${textItems.length} text items in bounding box`);

    // Extract text strings
    const extractedTexts = textItems.map((item) => {
      const textItem = item as TextItem;
      console.log(`  - Text: "${textItem.str}" at (${textItem.transform[4].toFixed(1)}, ${textItem.transform[5].toFixed(1)})`);
      return textItem.str;
    });

    // Join texts with spaces (simple approach)
    // TODO: Enhance with better line detection and RTL handling
    let extractedText = extractedTexts.join(' ').trim();

    // Clean up multiple spaces
    extractedText = extractedText.replace(/\s+/g, ' ');

    console.log(`[PDF Text Extraction] Final extracted text: "${extractedText}"`);

    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if text contains Hebrew characters
 */
export function containsHebrew(text: string): boolean {
  const hebrewPattern = /[\u0590-\u05FF]/;
  return hebrewPattern.test(text);
}

/**
 * Detect if text is primarily RTL (Hebrew/Arabic)
 */
export function isRTLText(text: string): boolean {
  const rtlPattern = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const rtlChars = (text.match(rtlPattern) || []).length;
  const totalChars = text.replace(/\s/g, '').length;

  // Consider text RTL if more than 50% of characters are RTL
  return rtlChars / totalChars > 0.5;
}
