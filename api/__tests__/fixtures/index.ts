/**
 * Test Fixtures for Hybrid Field Extraction
 *
 * This file contains mock data for testing Azure OCR, Gemini analysis,
 * and the hybrid extraction pipeline.
 */

import type { AnalyzeResultOutput } from '@azure-rest/ai-document-intelligence';

// ============================================================
// Types
// ============================================================

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrPageData {
  pageNumber: number;
  dimensions: { width: number; height: number };
  textLines: Array<{ content: string; box: Box }>;
  words: Array<{ content: string; box: Box }>;
  tables: Array<{
    rowCount: number;
    columnCount: number;
    cells: Array<{ rowIndex: number; columnIndex: number; content: string; box: Box }>;
  }>;
  selectionMarks: Array<{ state: string; box: Box; confidence: number }>;
  kvPairsWithValue: Array<{
    key: string;
    keyBox: Box;
    valueBox: Box;
    confidence: number;
  }>;
}

export interface GeminiField {
  labelText: string;
  fieldType: 'underline' | 'box_with_title' | 'digit_boxes' | 'table_cell' | 'title_right' | 'selection_mark';
  inputType: 'text' | 'checkbox' | 'radio' | 'signature' | 'dropdown' | 'date' | 'number';
  section?: string;
  required: boolean;
  visualDescription?: string;
  rowGroup?: string;
  relatedFields?: string[];
  hasVisibleBoundary?: boolean;
}

export interface GeminiPageResult {
  totalFieldCount: number;
  fields: GeminiField[];
  unlabeledFields?: Array<{
    fieldType: string;
    inputType: string;
    section?: string;
    visualDescription: string;
    nearbyText: string;
    relativePosition: 'left' | 'right' | 'above' | 'below';
  }>;
}

// ============================================================
// Mock Page Info
// ============================================================

export const mockPageInfo: PageInfo = {
  pageNumber: 1,
  width: 595,  // A4 width in PDF points
  height: 842, // A4 height in PDF points
};

// ============================================================
// Mock Azure OCR Response - Simple Hebrew Form
// ============================================================

/**
 * Mock Azure OCR response for a simple Hebrew form with:
 * - 5 text fields (underline style)
 * - 2 digit boxes (phone, ID)
 * - 3 checkboxes
 * - 1 signature field
 */
export const mockAzureOcrResponse: OcrPageData = {
  pageNumber: 1,
  dimensions: { width: 595, height: 842 },
  textLines: [
    // Row 1: Agent info - multi-field line
    { content: 'שם הסוכן:     מס\' הסוכן:', box: { x: 300, y: 700, width: 200, height: 20 } },
    // Row 2: Customer name
    { content: 'שם הלקוח:', box: { x: 450, y: 650, width: 80, height: 20 } },
    // Row 3: Address fields - multi-field line
    { content: 'עיר:    מיקוד:    רח\':', box: { x: 200, y: 600, width: 300, height: 20 } },
    // Row 4: Contact fields - multi-field line
    { content: 'טלפון:    פקס:    נייד:', box: { x: 200, y: 550, width: 300, height: 20 } },
    // Row 5: ID number
    { content: 'ת.ז:', box: { x: 470, y: 500, width: 40, height: 20 } },
    // Row 6: Signature
    { content: 'חתימה:', box: { x: 450, y: 450, width: 60, height: 20 } },
    // Row 7: Checkbox labels
    { content: 'אישור תקנון', box: { x: 420, y: 400, width: 100, height: 18 } },
    { content: 'אישור פרטיות', box: { x: 420, y: 370, width: 110, height: 18 } },
    { content: 'קבלת עדכונים', box: { x: 420, y: 340, width: 100, height: 18 } },
  ],
  words: [
    // Break down multi-field lines into words for precise matching
    { content: 'שם', box: { x: 480, y: 700, width: 25, height: 20 } },
    { content: 'הסוכן:', box: { x: 445, y: 700, width: 30, height: 20 } },
    { content: 'מס\'', box: { x: 370, y: 700, width: 25, height: 20 } },
    { content: 'הסוכן:', box: { x: 335, y: 700, width: 30, height: 20 } },
    { content: 'עיר:', box: { x: 470, y: 600, width: 30, height: 20 } },
    { content: 'מיקוד:', box: { x: 350, y: 600, width: 45, height: 20 } },
    { content: 'רח\':', box: { x: 210, y: 600, width: 30, height: 20 } },
  ],
  tables: [],
  selectionMarks: [
    { state: 'unselected', box: { x: 395, y: 400, width: 15, height: 15 }, confidence: 0.95 },
    { state: 'unselected', box: { x: 395, y: 370, width: 15, height: 15 }, confidence: 0.95 },
    { state: 'unselected', box: { x: 395, y: 340, width: 15, height: 15 }, confidence: 0.95 },
  ],
  kvPairsWithValue: [],
};

// ============================================================
// Mock Gemini Response - Matching Azure OCR
// ============================================================

export const mockGeminiResponse: GeminiPageResult = {
  totalFieldCount: 12,
  fields: [
    {
      labelText: 'שם הסוכן:',
      fieldType: 'underline',
      inputType: 'text',
      section: 'פרטי סוכן',
      required: true,
      rowGroup: 'row_1',
      relatedFields: ['מס\' הסוכן:'],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'מס\' הסוכן:',
      fieldType: 'digit_boxes',
      inputType: 'number',
      section: 'פרטי סוכן',
      required: true,
      rowGroup: 'row_1',
      relatedFields: ['שם הסוכן:'],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'שם הלקוח:',
      fieldType: 'underline',
      inputType: 'text',
      section: 'פרטי לקוח',
      required: true,
      rowGroup: 'row_2',
      relatedFields: [],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'עיר:',
      fieldType: 'underline',
      inputType: 'text',
      section: 'כתובת',
      required: true,
      rowGroup: 'row_3',
      relatedFields: ['מיקוד:', 'רח\':'],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'מיקוד:',
      fieldType: 'underline',
      inputType: 'text',
      section: 'כתובת',
      required: true,
      rowGroup: 'row_3',
      relatedFields: ['עיר:', 'רח\':'],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'רח\':',
      fieldType: 'underline',
      inputType: 'text',
      section: 'כתובת',
      required: true,
      rowGroup: 'row_3',
      relatedFields: ['עיר:', 'מיקוד:'],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'טלפון:',
      fieldType: 'digit_boxes',
      inputType: 'text',
      section: 'פרטי קשר',
      required: true,
      rowGroup: 'row_4',
      relatedFields: ['פקס:', 'נייד:'],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'פקס:',
      fieldType: 'digit_boxes',
      inputType: 'text',
      section: 'פרטי קשר',
      required: false,
      rowGroup: 'row_4',
      relatedFields: ['טלפון:', 'נייד:'],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'נייד:',
      fieldType: 'digit_boxes',
      inputType: 'text',
      section: 'פרטי קשר',
      required: true,
      rowGroup: 'row_4',
      relatedFields: ['טלפון:', 'פקס:'],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'ת.ז:',
      fieldType: 'digit_boxes',
      inputType: 'number',
      section: 'זיהוי',
      required: true,
      rowGroup: 'row_5',
      relatedFields: [],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'חתימה:',
      fieldType: 'underline',
      inputType: 'signature',
      section: 'אישורים',
      required: true,
      rowGroup: 'row_6',
      relatedFields: [],
      hasVisibleBoundary: true,
    },
    {
      labelText: 'אישור תקנון',
      fieldType: 'selection_mark',
      inputType: 'checkbox',
      section: 'אישורים',
      required: true,
      rowGroup: 'row_7',
      relatedFields: [],
      hasVisibleBoundary: false,
    },
  ],
};

// ============================================================
// Mock Expected Fields Output
// ============================================================

/**
 * Expected output after hybrid extraction (Azure + Gemini + Matching)
 */
export const mockExpectedFields = [
  {
    type: 'text',
    name: 'agent_name',
    label: 'שם הסוכן',
    x: 30,
    y: 700,
    width: 405,
    height: 20,
    pageNumber: 1,
    direction: 'rtl',
    required: true,
    confidence: 0.8,
    sectionName: 'פרטי סוכן',
  },
  {
    type: 'text',
    name: 'number',
    label: 'מס\' הסוכן',
    x: 135,
    y: 700,
    width: 190,
    height: 22,
    pageNumber: 1,
    direction: 'rtl',
    required: true,
    confidence: 0.8,
    sectionName: 'פרטי סוכן',
  },
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Create a minimal mock Azure DI API response
 */
export function createMockAzureResponse(ocrData: OcrPageData): Partial<AnalyzeResultOutput> {
  return {
    pages: [
      {
        pageNumber: ocrData.pageNumber,
        width: ocrData.dimensions.width / 72, // Convert points to inches
        height: ocrData.dimensions.height / 72,
        unit: 'inch',
        lines: ocrData.textLines.map((line) => ({
          content: line.content,
          polygon: boxToPolygon(line.box, ocrData.dimensions),
        })),
        words: ocrData.words.map((word) => ({
          content: word.content,
          polygon: boxToPolygon(word.box, ocrData.dimensions),
          confidence: 0.99,
        })),
        selectionMarks: ocrData.selectionMarks.map((mark) => ({
          state: mark.state as any,
          polygon: boxToPolygon(mark.box, ocrData.dimensions),
          confidence: mark.confidence,
        })),
      },
    ],
    tables: [],
    keyValuePairs: [],
  };
}

/**
 * Convert PDF box (points, bottom-left origin) to Azure polygon (inches, top-left origin)
 */
function boxToPolygon(box: Box, pageDims: { width: number; height: number }): number[] {
  const xMin = box.x / 72;
  const xMax = (box.x + box.width) / 72;
  const yMin = (pageDims.height - box.y - box.height) / 72; // Convert to top-origin
  const yMax = (pageDims.height - box.y) / 72;

  // Return clockwise from top-left: TL, TR, BR, BL
  return [
    xMin, yMin,  // TL
    xMax, yMin,  // TR
    xMax, yMax,  // BR
    xMin, yMax,  // BL
  ];
}

/**
 * Create a mock PDF base64 string (minimal valid PDF structure)
 */
export function createMockPdfBase64(): string {
  // Minimal PDF structure - not a real PDF, but sufficient for tests that don't parse it
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
182
%%EOF`;

  return Buffer.from(pdfContent).toString('base64');
}
