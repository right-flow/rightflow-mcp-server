/**
 * PdfTextExtractor - Text extraction utilities for PDF verification
 *
 * Note: Full text extraction requires pdfjs-dist which runs client-side.
 * This module provides interfaces and utilities for working with extracted text.
 *
 * For client-side usage with pdfjs-dist/react-pdf, use:
 * ```
 * import { pdfjs } from 'react-pdf';
 * const pdf = await pdfjs.getDocument(data).promise;
 * const page = await pdf.getPage(pageNum);
 * const textContent = await page.getTextContent();
 * ```
 */

import type { ExtractedTextItem, PageDimensions } from './CoordinateVerificationService';

/**
 * Raw text content item from pdfjs-dist
 */
export interface PdfjsTextItem {
  str: string;
  dir: 'ltr' | 'rtl';
  width: number;
  height: number;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, translateX, translateY]
}

/**
 * Convert pdfjs-dist text content to our ExtractedTextItem format
 */
export function convertPdfjsTextItems(
  items: PdfjsTextItem[],
  pageNumber: number,
  pageHeight: number,
): ExtractedTextItem[] {
  return items
    .filter(item => item.str.trim().length > 0)
    .map(item => {
      // Transform matrix: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const x = item.transform[4];
      const yFromBottom = item.transform[5];

      return {
        text: item.str,
        x,
        y: yFromBottom, // pdfjs uses bottom-left origin like PDF
        width: item.width,
        height: item.height,
        pageNumber,
      };
    });
}

/**
 * Group nearby text items that likely form a single label
 */
export function groupTextItems(
  items: ExtractedTextItem[],
  maxHorizontalGap: number = 10,
  maxVerticalGap: number = 5,
): ExtractedTextItem[] {
  if (items.length === 0) return [];

  // Sort by Y position (top to bottom), then X position
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.y - a.y; // Higher Y = higher on page
    if (Math.abs(yDiff) > maxVerticalGap) return yDiff;
    return a.x - b.x; // Left to right for same line
  });

  const groups: ExtractedTextItem[] = [];
  let currentGroup: ExtractedTextItem | null = null;

  for (const item of sorted) {
    if (!currentGroup) {
      currentGroup = { ...item };
      continue;
    }

    // Check if this item is on the same line and close enough
    const sameVerticalLine = Math.abs(item.y - currentGroup.y) <= maxVerticalGap;
    const closeHorizontally = item.x - (currentGroup.x + currentGroup.width) <= maxHorizontalGap;

    if (sameVerticalLine && closeHorizontally) {
      // Merge into current group
      currentGroup.text += ' ' + item.text;
      currentGroup.width = (item.x + item.width) - currentGroup.x;
    } else {
      // Start new group
      groups.push(currentGroup);
      currentGroup = { ...item };
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Find text items within a bounding box
 */
export function findTextInRegion(
  items: ExtractedTextItem[],
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  },
  padding: number = 10,
): ExtractedTextItem[] {
  const minX = region.x - padding;
  const maxX = region.x + region.width + padding;
  const minY = region.y - padding;
  const maxY = region.y + region.height + padding;

  return items.filter(item => {
    if (item.pageNumber !== region.pageNumber) return false;

    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;

    return (
      itemCenterX >= minX &&
      itemCenterX <= maxX &&
      itemCenterY >= minY &&
      itemCenterY <= maxY
    );
  });
}

/**
 * Extract Hebrew labels (typically to the right of input fields in RTL forms)
 */
export function findRtlLabels(
  items: ExtractedTextItem[],
  fieldX: number,
  fieldY: number,
  pageNumber: number,
  searchWidth: number = 150,
  searchHeight: number = 30,
): ExtractedTextItem[] {
  // For RTL forms, labels are to the RIGHT of the input field
  return items.filter(item => {
    if (item.pageNumber !== pageNumber) return false;

    // Label should be to the right of the field
    const isToTheRight = item.x > fieldX;
    // Within horizontal search range
    const withinHorizontal = item.x < fieldX + searchWidth;
    // Vertically aligned (same line)
    const verticallyAligned = Math.abs(item.y - fieldY) < searchHeight;

    return isToTheRight && withinHorizontal && verticallyAligned;
  });
}

/**
 * Interface for client-side text extraction results
 */
export interface TextExtractionResult {
  pageNumber: number;
  items: ExtractedTextItem[];
  dimensions: PageDimensions;
}

/**
 * Client-side extraction function signature
 * To be implemented using pdfjs-dist in the frontend
 */
export type ExtractTextFromPdf = (
  pdfData: ArrayBuffer | Uint8Array,
  pageNumbers?: number[],
) => Promise<TextExtractionResult[]>;
