/**
 * Golden PDFs Test Suite
 * Comprehensive test suite for PDF extraction accuracy
 *
 * Golden PDFs are reference PDFs with known expected outputs
 * Used to validate AI extraction accuracy and regression testing
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { extractFieldsWithAI } from '@/utils/aiFieldExtraction';
import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { RTLGuard } from '@/utils/rtl-guard';

// Types for Golden PDF test data
interface GoldenPDF {
  name: string;
  description: string;
  category: 'hebrew' | 'english' | 'mixed' | 'complex';
  expectedFields: ExpectedField[];
  pdfGenerator: () => Promise<File>;
}

interface ExpectedField {
  label: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
  required: boolean;
  direction: 'ltr' | 'rtl';
  pageNumber: number;
  // Tolerance for position matching (in points)
  positionTolerance?: number;
}

/**
 * Generate a simple Hebrew form PDF
 */
async function generateHebrewFormPDF(): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 842]); // A4 size

  // Load Hebrew font (would need actual font file in production)
  const helveticaFont = await pdfDoc.embedFont('Helvetica');

  // Add Hebrew form fields
  const fields = [
    { label: 'שם מלא', x: 100, y: 700 },
    { label: 'תעודת זהות', x: 100, y: 650 },
    { label: 'כתובת', x: 100, y: 600 },
    { label: 'טלפון', x: 100, y: 550 },
    { label: 'דוא״ל', x: 100, y: 500 },
  ];

  fields.forEach(field => {
    // Draw label
    page.drawText(field.label + ':', {
      x: field.x,
      y: field.y,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // Draw field box
    page.drawRectangle({
      x: field.x + 100,
      y: field.y - 5,
      width: 200,
      height: 25,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
  });

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], 'hebrew-form.pdf', { type: 'application/pdf' });
}

/**
 * Generate a mixed Hebrew-English form PDF
 */
async function generateMixedFormPDF(): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);

  const helveticaFont = await pdfDoc.embedFont('Helvetica');

  // Mixed fields
  const fields = [
    { label: 'Full Name / שם מלא', x: 100, y: 700, dir: 'mixed' },
    { label: 'ID Number', x: 100, y: 650, dir: 'ltr' },
    { label: 'כתובת בעברית', x: 100, y: 600, dir: 'rtl' },
    { label: 'Email Address', x: 100, y: 550, dir: 'ltr' },
    { label: 'טלפון נייד', x: 100, y: 500, dir: 'rtl' },
  ];

  fields.forEach(field => {
    page.drawText(field.label + ':', {
      x: field.x,
      y: field.y,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    page.drawRectangle({
      x: field.x + 150,
      y: field.y - 5,
      width: 200,
      height: 25,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
  });

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], 'mixed-form.pdf', { type: 'application/pdf' });
}

/**
 * Generate a complex form with checkboxes and radio buttons
 */
async function generateComplexFormPDF(): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);

  const helveticaFont = await pdfDoc.embedFont('Helvetica');

  // Text fields
  page.drawText('Personal Information:', {
    x: 50,
    y: 750,
    size: 14,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  // Checkboxes
  page.drawText('Services Required:', {
    x: 50,
    y: 600,
    size: 14,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  const checkboxes = [
    { label: 'Consultation', x: 70, y: 570 },
    { label: 'Implementation', x: 70, y: 540 },
    { label: 'Support', x: 70, y: 510 },
  ];

  checkboxes.forEach(cb => {
    // Draw checkbox
    page.drawRectangle({
      x: cb.x,
      y: cb.y,
      width: 15,
      height: 15,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Draw label
    page.drawText(cb.label, {
      x: cb.x + 25,
      y: cb.y + 3,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  });

  // Radio buttons
  page.drawText('Payment Method:', {
    x: 50,
    y: 450,
    size: 14,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  const radioButtons = [
    { label: 'Credit Card', x: 70, y: 420 },
    { label: 'Bank Transfer', x: 70, y: 390 },
    { label: 'Cash', x: 70, y: 360 },
  ];

  radioButtons.forEach(rb => {
    // Draw radio button (circle)
    page.drawCircle({
      x: rb.x + 7.5,
      y: rb.y + 7.5,
      size: 7.5,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Draw label
    page.drawText(rb.label, {
      x: rb.x + 25,
      y: rb.y + 3,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  });

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], 'complex-form.pdf', { type: 'application/pdf' });
}

// Define Golden PDFs test suite
const goldenPDFs: GoldenPDF[] = [
  {
    name: 'Hebrew Simple Form',
    description: 'Basic Hebrew form with text fields only',
    category: 'hebrew',
    pdfGenerator: generateHebrewFormPDF,
    expectedFields: [
      { label: 'שם מלא', type: 'text', required: false, direction: 'rtl', pageNumber: 1 },
      { label: 'תעודת זהות', type: 'text', required: false, direction: 'rtl', pageNumber: 1 },
      { label: 'כתובת', type: 'text', required: false, direction: 'rtl', pageNumber: 1 },
      { label: 'טלפון', type: 'text', required: false, direction: 'rtl', pageNumber: 1 },
      { label: 'דוא״ל', type: 'text', required: false, direction: 'rtl', pageNumber: 1 },
    ],
  },
  {
    name: 'Mixed Hebrew-English Form',
    description: 'Form with both Hebrew and English fields',
    category: 'mixed',
    pdfGenerator: generateMixedFormPDF,
    expectedFields: [
      { label: 'Full Name / שם מלא', type: 'text', required: false, direction: 'rtl', pageNumber: 1 },
      { label: 'ID Number', type: 'text', required: false, direction: 'ltr', pageNumber: 1 },
      { label: 'כתובת בעברית', type: 'text', required: false, direction: 'rtl', pageNumber: 1 },
      { label: 'Email Address', type: 'text', required: false, direction: 'ltr', pageNumber: 1 },
      { label: 'טלפון נייד', type: 'text', required: false, direction: 'rtl', pageNumber: 1 },
    ],
  },
  {
    name: 'Complex Form with Various Fields',
    description: 'Form with text fields, checkboxes, and radio buttons',
    category: 'complex',
    pdfGenerator: generateComplexFormPDF,
    expectedFields: [
      // Text fields would be detected
      { label: 'Personal Information', type: 'text', required: false, direction: 'ltr', pageNumber: 1 },
      // Checkboxes
      { label: 'Consultation', type: 'checkbox', required: false, direction: 'ltr', pageNumber: 1 },
      { label: 'Implementation', type: 'checkbox', required: false, direction: 'ltr', pageNumber: 1 },
      { label: 'Support', type: 'checkbox', required: false, direction: 'ltr', pageNumber: 1 },
      // Radio buttons
      { label: 'Credit Card', type: 'radio', required: false, direction: 'ltr', pageNumber: 1 },
      { label: 'Bank Transfer', type: 'radio', required: false, direction: 'ltr', pageNumber: 1 },
      { label: 'Cash', type: 'radio', required: false, direction: 'ltr', pageNumber: 1 },
    ],
  },
];

describe('Golden PDFs Test Suite', () => {
  let rtlGuard: RTLGuard;

  beforeAll(() => {
    rtlGuard = new RTLGuard('ltr');
  });

  describe('Field Extraction Accuracy', () => {
    goldenPDFs.forEach(goldenPDF => {
      it(`should correctly extract fields from ${goldenPDF.name}`, async () => {
        // Generate the test PDF
        const pdfFile = await goldenPDF.pdfGenerator();

        // Extract fields using AI
        const result = await extractFieldsWithAI(pdfFile);

        // Verify extraction results
        expect(result.fields).toBeDefined();
        expect(result.fields.length).toBeGreaterThan(0);

        // Check that expected fields are found
        goldenPDF.expectedFields.forEach(expectedField => {
          const foundField = result.fields.find(f =>
            f.label?.includes(expectedField.label) ||
            f.name?.includes(expectedField.label)
          );

          expect(foundField).toBeDefined();

          if (foundField) {
            // Verify field properties
            expect(foundField.type).toBe(expectedField.type);
            expect(foundField.pageNumber).toBe(expectedField.pageNumber);

            // Check direction detection for Hebrew fields
            if (expectedField.direction === 'rtl') {
              expect(foundField.direction).toBe('rtl');
            }
          }
        });
      }, 30000); // 30 second timeout for AI processing
    });
  });

  describe('RTL Direction Detection', () => {
    it('should correctly identify RTL fields in Hebrew PDFs', async () => {
      const hebrewPDF = await generateHebrewFormPDF();
      const result = await extractFieldsWithAI(hebrewPDF);

      const rtlFields = result.fields.filter(f => f.direction === 'rtl');
      expect(rtlFields.length).toBeGreaterThan(0);

      // All Hebrew fields should be RTL
      const hebrewFields = result.fields.filter(f =>
        /[\u0590-\u05FF]/.test(f.label || f.name || '')
      );

      hebrewFields.forEach(field => {
        expect(field.direction).toBe('rtl');
      });
    }, 30000);

    it('should handle mixed RTL/LTR content correctly', async () => {
      const mixedPDF = await generateMixedFormPDF();
      const result = await extractFieldsWithAI(mixedPDF);

      // Should have both RTL and LTR fields
      const rtlFields = result.fields.filter(f => f.direction === 'rtl');
      const ltrFields = result.fields.filter(f => f.direction === 'ltr');

      expect(rtlFields.length).toBeGreaterThan(0);
      expect(ltrFields.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Field Type Detection', () => {
    it('should correctly identify checkbox fields', async () => {
      const complexPDF = await generateComplexFormPDF();
      const result = await extractFieldsWithAI(complexPDF);

      const checkboxes = result.fields.filter(f => f.type === 'checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    }, 30000);

    it('should correctly identify radio button fields', async () => {
      const complexPDF = await generateComplexFormPDF();
      const result = await extractFieldsWithAI(complexPDF);

      const radioButtons = result.fields.filter(f => f.type === 'radio');
      expect(radioButtons.length).toBeGreaterThan(0);
    }, 30000);

    it('should correctly identify text fields', async () => {
      const hebrewPDF = await generateHebrewFormPDF();
      const result = await extractFieldsWithAI(hebrewPDF);

      const textFields = result.fields.filter(f => f.type === 'text');
      expect(textFields.length).toBe(5); // We created 5 text fields
    }, 30000);
  });

  describe('Position Accuracy', () => {
    it('should extract field positions within tolerance', async () => {
      const pdfFile = await generateHebrewFormPDF();
      const result = await extractFieldsWithAI(pdfFile);

      result.fields.forEach(field => {
        // Check that positions are defined
        expect(field.x).toBeDefined();
        expect(field.y).toBeDefined();
        expect(field.width).toBeGreaterThan(0);
        expect(field.height).toBeGreaterThan(0);

        // Positions should be within page bounds (A4: 595x842)
        expect(field.x).toBeGreaterThanOrEqual(0);
        expect(field.x).toBeLessThanOrEqual(595);
        expect(field.y).toBeGreaterThanOrEqual(0);
        expect(field.y).toBeLessThanOrEqual(842);
      });
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle corrupted PDFs gracefully', async () => {
      const corruptedPDF = new File(['corrupted data'], 'corrupted.pdf', { type: 'application/pdf' });

      await expect(extractFieldsWithAI(corruptedPDF)).rejects.toThrow();
    });

    it('should handle empty PDFs', async () => {
      const pdfDoc = await PDFDocument.create();
      const pdfBytes = await pdfDoc.save();
      const emptyPDF = new File([pdfBytes], 'empty.pdf', { type: 'application/pdf' });

      const result = await extractFieldsWithAI(emptyPDF);
      expect(result.fields).toEqual([]);
    }, 30000);
  });
});