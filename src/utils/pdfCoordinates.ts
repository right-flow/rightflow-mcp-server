import { PDFCoords, ViewportCoords } from '@/types/fields';

/**
 * PDF Coordinate System Utilities
 *
 * CRITICAL: PDF and Canvas use different coordinate systems:
 * - PDF: Origin at BOTTOM-LEFT, y-axis goes UP
 * - Canvas: Origin at TOP-LEFT, y-axis goes DOWN
 *
 * These utilities handle conversion between the two systems.
 */

interface PageDimensions {
  width: number;  // in points
  height: number; // in points
}

/**
 * Converts viewport (canvas) coordinates to PDF coordinates
 * @param viewportX - X coordinate in pixels from left edge
 * @param viewportY - Y coordinate in pixels from TOP edge
 * @param pageDimensions - PDF page dimensions in points
 * @param scale - Current zoom scale (100 = 100%)
 * @param canvasWidth - Current width of the rendered canvas in pixels
 * @returns PDF coordinates in points
 */
export const viewportToPDFCoords = (
  viewportX: number,
  viewportY: number,
  pageDimensions: PageDimensions,
  _scale: number, // Kept for API compatibility, actual scale computed from dimensions
  canvasWidth: number,
): PDFCoords => {
  // Calculate the actual scale factor between canvas pixels and PDF points
  const pixelsToPointsScale = pageDimensions.width / canvasWidth;

  // Convert viewport pixels to PDF points
  const pdfX = viewportX * pixelsToPointsScale;

  // Flip y-axis: viewport Y from top, PDF Y from bottom
  const pdfY = pageDimensions.height - (viewportY * pixelsToPointsScale);

  return {
    x: pdfX,
    y: pdfY,
  };
};

/**
 * Converts PDF coordinates to viewport (canvas) coordinates
 * @param pdfX - X coordinate in points from left edge
 * @param pdfY - Y coordinate in points from BOTTOM edge
 * @param pageDimensions - PDF page dimensions in points
 * @param scale - Current zoom scale (100 = 100%)
 * @param canvasWidth - Current width of the rendered canvas in pixels
 * @returns Viewport coordinates in pixels
 */
export const pdfToViewportCoords = (
  pdfX: number,
  pdfY: number,
  pageDimensions: PageDimensions,
  _scale: number, // Kept for API compatibility, actual scale computed from dimensions
  canvasWidth: number,
): ViewportCoords => {
  // Calculate the actual scale factor between PDF points and canvas pixels
  const pointsToPixelsScale = canvasWidth / pageDimensions.width;

  // Convert PDF points to viewport pixels
  const viewportX = pdfX * pointsToPixelsScale;

  // Flip y-axis: PDF Y from bottom, viewport Y from top
  const viewportY = (pageDimensions.height - pdfY) * pointsToPixelsScale;

  return {
    x: viewportX,
    y: viewportY,
  };
};

/**
 * Converts a size in PDF points to viewport pixels
 * @param sizeInPoints - Size in PDF points
 * @param pageDimensions - PDF page dimensions in points
 * @param canvasWidth - Current width of the rendered canvas in pixels
 * @returns Size in pixels
 */
export const pointsToPixels = (
  sizeInPoints: number,
  pageDimensions: PageDimensions,
  canvasWidth: number,
): number => {
  const pointsToPixelsScale = canvasWidth / pageDimensions.width;
  return sizeInPoints * pointsToPixelsScale;
};

/**
 * Converts a size in viewport pixels to PDF points
 * @param sizeInPixels - Size in pixels
 * @param pageDimensions - PDF page dimensions in points
 * @param canvasWidth - Current width of the rendered canvas in pixels
 * @returns Size in PDF points
 */
export const pixelsToPoints = (
  sizeInPixels: number,
  pageDimensions: PageDimensions,
  canvasWidth: number,
): number => {
  const pixelsToPointsScale = pageDimensions.width / canvasWidth;
  return sizeInPixels * pixelsToPointsScale;
};

/**
 * Gets the bounding box of a click event relative to the PDF canvas
 * @param event - Mouse click event
 * @param canvasElement - The canvas element reference
 * @returns Viewport coordinates relative to canvas
 */
export const getCanvasRelativeCoords = (
  event: React.MouseEvent,
  canvasElement: HTMLElement,
): ViewportCoords => {
  const rect = canvasElement.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};
