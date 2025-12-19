import { describe, it, expect } from 'vitest';
import {
  viewportToPDFCoords,
  pdfToViewportCoords,
  pointsToPixels,
  pixelsToPoints,
} from './pdfCoordinates';

/**
 * PDF Coordinate Conversion Tests
 *
 * These tests verify the coordinate conversion between:
 * - PDF coordinates: Origin at BOTTOM-LEFT, y-axis goes UP
 * - Viewport/Canvas coordinates: Origin at TOP-LEFT, y-axis goes DOWN
 */

// Standard A4 page dimensions in points (595 x 842)
const A4_PAGE = { width: 595, height: 842 };

// US Letter page dimensions in points (612 x 792)
const LETTER_PAGE = { width: 612, height: 792 };

describe('viewportToPDFCoords', () => {
  describe('basic coordinate conversion', () => {
    it('converts top-left corner correctly', () => {
      // Viewport top-left (0, 0) should map to PDF top-left (0, pageHeight)
      const result = viewportToPDFCoords(0, 0, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(842); // Page height
    });

    it('converts bottom-left corner correctly', () => {
      // Viewport bottom-left (0, pageHeight) should map to PDF bottom-left (0, 0)
      const result = viewportToPDFCoords(0, 842, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
    });

    it('converts top-right corner correctly', () => {
      // Viewport top-right (pageWidth, 0) should map to PDF top-right (pageWidth, pageHeight)
      const result = viewportToPDFCoords(595, 0, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(595);
      expect(result.y).toBeCloseTo(842);
    });

    it('converts bottom-right corner correctly', () => {
      // Viewport bottom-right (pageWidth, pageHeight) should map to PDF bottom-right (pageWidth, 0)
      const result = viewportToPDFCoords(595, 842, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(595);
      expect(result.y).toBeCloseTo(0);
    });

    it('converts center point correctly', () => {
      const result = viewportToPDFCoords(297.5, 421, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(297.5);
      expect(result.y).toBeCloseTo(421);
    });
  });

  describe('with different scales', () => {
    it('handles 50% zoom correctly', () => {
      // At 50% zoom, canvas is half the size
      const canvasWidth = 595 / 2; // 297.5 pixels
      const result = viewportToPDFCoords(148.75, 210.5, A4_PAGE, 50, canvasWidth);

      // Should still map to center of the page
      expect(result.x).toBeCloseTo(297.5);
      expect(result.y).toBeCloseTo(421);
    });

    it('handles 200% zoom correctly', () => {
      // At 200% zoom, canvas is double the size
      const canvasWidth = 595 * 2; // 1190 pixels
      const result = viewportToPDFCoords(595, 842, A4_PAGE, 200, canvasWidth);

      // Should map to center of the page
      expect(result.x).toBeCloseTo(297.5);
      expect(result.y).toBeCloseTo(421);
    });

    it('handles 150% zoom correctly', () => {
      const canvasWidth = 595 * 1.5; // 892.5 pixels
      const result = viewportToPDFCoords(0, 0, A4_PAGE, 150, canvasWidth);

      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(842);
    });
  });

  describe('with different page sizes', () => {
    it('works with US Letter page', () => {
      const result = viewportToPDFCoords(306, 0, LETTER_PAGE, 100, 612);

      expect(result.x).toBeCloseTo(306); // Half width
      expect(result.y).toBeCloseTo(792); // Top of page
    });

    it('works with custom page dimensions', () => {
      const customPage = { width: 400, height: 600 };
      const result = viewportToPDFCoords(200, 300, customPage, 100, 400);

      expect(result.x).toBeCloseTo(200);
      expect(result.y).toBeCloseTo(300);
    });
  });

  describe('edge cases', () => {
    it('handles very small coordinates', () => {
      const result = viewportToPDFCoords(0.5, 0.5, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(0.5);
      expect(result.y).toBeCloseTo(841.5);
    });

    it('handles coordinates outside page bounds', () => {
      // Should still convert, even if outside bounds
      const result = viewportToPDFCoords(700, 900, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(700);
      expect(result.y).toBeCloseTo(-58); // Below page bottom
    });
  });
});

describe('pdfToViewportCoords', () => {
  describe('basic coordinate conversion', () => {
    it('converts PDF bottom-left to viewport bottom-left', () => {
      const result = pdfToViewportCoords(0, 0, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(842); // Bottom of viewport
    });

    it('converts PDF top-left to viewport top-left', () => {
      const result = pdfToViewportCoords(0, 842, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
    });

    it('converts PDF center to viewport center', () => {
      const result = pdfToViewportCoords(297.5, 421, A4_PAGE, 100, 595);

      expect(result.x).toBeCloseTo(297.5);
      expect(result.y).toBeCloseTo(421);
    });
  });

  describe('with different scales', () => {
    it('handles 50% zoom correctly', () => {
      const canvasWidth = 595 / 2;
      const result = pdfToViewportCoords(297.5, 421, A4_PAGE, 50, canvasWidth);

      // At 50% zoom, everything is half size
      expect(result.x).toBeCloseTo(148.75);
      expect(result.y).toBeCloseTo(210.5);
    });

    it('handles 200% zoom correctly', () => {
      const canvasWidth = 595 * 2;
      const result = pdfToViewportCoords(297.5, 421, A4_PAGE, 200, canvasWidth);

      // At 200% zoom, everything is double size
      expect(result.x).toBeCloseTo(595);
      expect(result.y).toBeCloseTo(842);
    });
  });
});

describe('roundtrip conversion', () => {
  it('viewport -> PDF -> viewport returns original coordinates', () => {
    const originalX = 150;
    const originalY = 300;

    const pdfCoords = viewportToPDFCoords(originalX, originalY, A4_PAGE, 100, 595);
    const backToViewport = pdfToViewportCoords(pdfCoords.x, pdfCoords.y, A4_PAGE, 100, 595);

    expect(backToViewport.x).toBeCloseTo(originalX);
    expect(backToViewport.y).toBeCloseTo(originalY);
  });

  it('PDF -> viewport -> PDF returns original coordinates', () => {
    const originalX = 200;
    const originalY = 500; // PDF Y from bottom

    const viewportCoords = pdfToViewportCoords(originalX, originalY, A4_PAGE, 100, 595);
    const backToPDF = viewportToPDFCoords(viewportCoords.x, viewportCoords.y, A4_PAGE, 100, 595);

    expect(backToPDF.x).toBeCloseTo(originalX);
    expect(backToPDF.y).toBeCloseTo(originalY);
  });

  it('roundtrip works at different scales', () => {
    const originalX = 100;
    const originalY = 200;
    const canvasWidth = 595 * 1.5; // 150% zoom

    const pdfCoords = viewportToPDFCoords(originalX, originalY, A4_PAGE, 150, canvasWidth);
    const backToViewport = pdfToViewportCoords(pdfCoords.x, pdfCoords.y, A4_PAGE, 150, canvasWidth);

    expect(backToViewport.x).toBeCloseTo(originalX);
    expect(backToViewport.y).toBeCloseTo(originalY);
  });
});

describe('pointsToPixels', () => {
  it('converts points to pixels at 1:1 scale', () => {
    const result = pointsToPixels(100, A4_PAGE, 595);
    expect(result).toBeCloseTo(100);
  });

  it('converts points to pixels at 50% scale', () => {
    const canvasWidth = 595 / 2;
    const result = pointsToPixels(100, A4_PAGE, canvasWidth);
    expect(result).toBeCloseTo(50);
  });

  it('converts points to pixels at 200% scale', () => {
    const canvasWidth = 595 * 2;
    const result = pointsToPixels(100, A4_PAGE, canvasWidth);
    expect(result).toBeCloseTo(200);
  });

  it('handles zero input', () => {
    const result = pointsToPixels(0, A4_PAGE, 595);
    expect(result).toBe(0);
  });
});

describe('pixelsToPoints', () => {
  it('converts pixels to points at 1:1 scale', () => {
    const result = pixelsToPoints(100, A4_PAGE, 595);
    expect(result).toBeCloseTo(100);
  });

  it('converts pixels to points at 50% scale', () => {
    const canvasWidth = 595 / 2;
    const result = pixelsToPoints(50, A4_PAGE, canvasWidth);
    expect(result).toBeCloseTo(100);
  });

  it('converts pixels to points at 200% scale', () => {
    const canvasWidth = 595 * 2;
    const result = pixelsToPoints(200, A4_PAGE, canvasWidth);
    expect(result).toBeCloseTo(100);
  });

  it('handles zero input', () => {
    const result = pixelsToPoints(0, A4_PAGE, 595);
    expect(result).toBe(0);
  });
});

describe('pointsToPixels and pixelsToPoints roundtrip', () => {
  it('points -> pixels -> points returns original value', () => {
    const original = 150;
    const canvasWidth = 595 * 1.25; // 125% zoom

    const pixels = pointsToPixels(original, A4_PAGE, canvasWidth);
    const backToPoints = pixelsToPoints(pixels, A4_PAGE, canvasWidth);

    expect(backToPoints).toBeCloseTo(original);
  });
});

describe('field positioning scenarios', () => {
  describe('text field placement', () => {
    it('field at top of A4 page converts correctly', () => {
      // User places field near top of viewport (y=50px from top)
      const viewportCoords = viewportToPDFCoords(100, 50, A4_PAGE, 100, 595);

      // Should be near top of PDF page (high Y value)
      expect(viewportCoords.y).toBeCloseTo(792); // 842 - 50
      expect(viewportCoords.x).toBeCloseTo(100);
    });

    it('field at bottom of A4 page converts correctly', () => {
      // User places field near bottom of viewport (y=792px from top)
      const viewportCoords = viewportToPDFCoords(100, 792, A4_PAGE, 100, 595);

      // Should be near bottom of PDF page (low Y value)
      expect(viewportCoords.y).toBeCloseTo(50);
      expect(viewportCoords.x).toBeCloseTo(100);
    });
  });

  describe('field rendering from PDF', () => {
    it('field stored at PDF y=700 renders near top of viewport', () => {
      // Field stored at y=700 points from bottom in PDF
      const viewportCoords = pdfToViewportCoords(100, 700, A4_PAGE, 100, 595);

      // Should render near top of viewport (low Y value)
      expect(viewportCoords.y).toBeCloseTo(142); // 842 - 700
      expect(viewportCoords.x).toBeCloseTo(100);
    });

    it('field stored at PDF y=50 renders near bottom of viewport', () => {
      // Field stored at y=50 points from bottom in PDF
      const viewportCoords = pdfToViewportCoords(100, 50, A4_PAGE, 100, 595);

      // Should render near bottom of viewport (high Y value)
      expect(viewportCoords.y).toBeCloseTo(792);
      expect(viewportCoords.x).toBeCloseTo(100);
    });
  });
});
