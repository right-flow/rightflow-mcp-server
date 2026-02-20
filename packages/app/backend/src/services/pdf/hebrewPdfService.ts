/**
 * Hebrew PDF Service for Backend
 *
 * This service enables server-side PDF generation with proper Hebrew/RTL support.
 * It ports the frontend pdfGeneration.ts logic to work in a Node.js environment.
 *
 * CRITICAL DESIGN DECISIONS:
 * 1. Font embedding uses subset: false - Required for Hebrew character mapping
 * 2. RTL text uses Unicode markers (RLE/PDF) - Not manual character reversal
 * 3. AcroForm quadding=2 for right-aligned Hebrew fields
 *
 * @module services/pdf/hebrewPdfService
 */

import { PDFDocument, PDFFont, rgb, PDFName, PDFNumber, PDFBool, PDFString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface FieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature' | 'static_text';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  label?: string;
  defaultValue?: string;
  required?: boolean;
  sectionName?: string;
  index?: number;
  autoFill?: boolean;
  options?: string[]; // For dropdown/radio
  direction?: 'ltr' | 'rtl';
}

export interface FillPdfRequest {
  templateId?: string;
  templateBuffer?: Buffer;
  data: Record<string, unknown>;
  outputFormat?: 'buffer' | 'base64';
  language?: 'he' | 'en';
}

export interface FillPdfResponse {
  success: boolean;
  pdfBuffer?: Buffer;
  pdfBase64?: string;
  error?: string;
  fieldsFilled?: number;
  generationTimeMs?: number;
}

export interface GeneratePdfRequest {
  templateBuffer: Buffer;
  fields: FieldDefinition[];
  language?: 'he' | 'en';
}

export interface GeneratePdfResponse {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
  generationTimeMs?: number;
}

// ============================================================================
// Hebrew Text Utilities
// ============================================================================

/**
 * Check if text contains Hebrew characters
 */
export function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

/**
 * Detect text direction based on content
 */
export function detectTextDirection(text: string): 'ltr' | 'rtl' {
  return containsHebrew(text) ? 'rtl' : 'ltr';
}

/**
 * Enhanced BiDi attack mitigation
 *
 * Removes dangerous Unicode control characters, invisible characters,
 * and applies NFKC normalization to prevent:
 * - BiDi (Bidirectional) text attacks
 * - Homograph attacks (Cyrillic lookalikes)
 * - Zero-width character injection
 * - Fullwidth character obfuscation
 */

// Dangerous Unicode control characters (BiDi attacks)
const BIDI_CONTROL_CHARS = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C\u2028\u2029]/g;

// Zero-width and invisible characters
const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF\u00AD]/g;

export interface SanitizationResult {
  sanitized: string;
  warnings: string[];
  containsConfusables: boolean;
  originalLength: number;
  sanitizedLength: number;
}

/**
 * Sanitize Hebrew input by removing dangerous Unicode control characters
 * Basic version - returns string only for backwards compatibility
 */
export function sanitizeHebrewInput(text: string): string {
  if (!text) return text;

  // Apply NFKC normalization (decomposes fullwidth chars, normalizes lookalikes)
  let result = text.normalize('NFKC');

  // Remove BiDi control characters
  result = result.replace(BIDI_CONTROL_CHARS, '');

  // Remove invisible characters
  result = result.replace(INVISIBLE_CHARS, '');

  return result;
}

/**
 * Enhanced sanitization with detailed result
 * Use this for critical fields that need audit logging
 */
export function sanitizeHebrewInputDetailed(text: string, fieldType?: string): SanitizationResult {
  if (!text) {
    return {
      sanitized: '',
      warnings: [],
      containsConfusables: false,
      originalLength: 0,
      sanitizedLength: 0
    };
  }

  const warnings: string[] = [];
  let result = text;

  // Step 1: Apply NFKC normalization
  result = result.normalize('NFKC');

  // Step 2: Remove BiDi control characters
  const bidiMatches = text.match(BIDI_CONTROL_CHARS);
  if (bidiMatches) {
    warnings.push(`Removed ${bidiMatches.length} BiDi control characters`);
    result = result.replace(BIDI_CONTROL_CHARS, '');
  }

  // Step 3: Remove invisible characters
  const invisibleMatches = result.match(INVISIBLE_CHARS);
  if (invisibleMatches) {
    warnings.push(`Removed ${invisibleMatches.length} invisible characters`);
    result = result.replace(INVISIBLE_CHARS, '');
  }

  // Step 4: Detect confusable characters (Cyrillic lookalikes)
  let containsConfusables = false;
  if (/[\u0430\u0435\u043E\u0440\u0441\u0445]/.test(result)) {
    containsConfusables = true;
    warnings.push('Contains Cyrillic confusable characters');
  }

  // Step 5: Field-specific validation
  if (fieldType === 'israeli_id' || fieldType === 'phone' || fieldType === 'number') {
    const nonAsciiDigits = result.match(/[^\d\s\-]/g);
    if (nonAsciiDigits) {
      warnings.push(`Non-ASCII characters in numeric field: ${fieldType}`);
    }
  }

  return {
    sanitized: result,
    warnings,
    containsConfusables,
    originalLength: text.length,
    sanitizedLength: result.length
  };
}

/**
 * Sanitize filename for safe file system operations
 * Prevents path traversal and BiDi attacks in filenames
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'document';

  // Apply NFKC normalization
  let result = filename.normalize('NFKC');

  // Remove BiDi and invisible characters
  result = result.replace(BIDI_CONTROL_CHARS, '');
  result = result.replace(INVISIBLE_CHARS, '');

  // Only allow safe characters: Hebrew, Latin, digits, dash, underscore, dot, space
  const SAFE_FILENAME_CHARS = /[^\u0590-\u05FFa-zA-Z0-9\-_.\s]/g;
  result = result.replace(SAFE_FILENAME_CHARS, '_');

  // Collapse multiple underscores/spaces
  result = result.replace(/[_\s]+/g, '_');

  // Remove leading/trailing underscores and dots (security)
  result = result.replace(/^[_.\s]+|[_.\s]+$/g, '');

  // Enforce max length (preserve extension)
  if (result.length > 200) {
    const lastDot = result.lastIndexOf('.');
    const ext = lastDot > 0 ? result.slice(lastDot) : '';
    result = result.slice(0, 200 - ext.length) + ext;
  }

  // Fallback for empty result
  if (!result || result === '.') {
    result = 'document';
  }

  return result;
}

/**
 * Detect if text contains mixed scripts (potential spoofing)
 */
export function detectMixedScripts(text: string): { scripts: string[]; isSuspicious: boolean } {
  const scripts: Set<string> = new Set();

  if (/[a-zA-Z]/.test(text)) scripts.add('Latin');
  if (/[\u0590-\u05FF]/.test(text)) scripts.add('Hebrew');
  if (/[\u0400-\u04FF]/.test(text)) scripts.add('Cyrillic');
  if (/[\u0600-\u06FF]/.test(text)) scripts.add('Arabic');
  if (/[\u0370-\u03FF]/.test(text)) scripts.add('Greek');

  // Suspicious: mixing Latin with lookalike scripts
  const isSuspicious =
    (scripts.has('Latin') && scripts.has('Cyrillic')) ||
    (scripts.has('Latin') && scripts.has('Greek')) ||
    scripts.size > 2;

  return { scripts: Array.from(scripts), isSuspicious };
}

/**
 * Wrap Hebrew text with Unicode RTL markers for proper bidirectional display
 *
 * PDF viewers apply the Unicode Bidirectional Algorithm when rendering text.
 * By wrapping Hebrew text with RLE and PDF markers, we signal RTL direction
 * without manual character reversal.
 *
 * Unicode Control Characters:
 * - U+202B (RLE): Right-to-Left Embedding - starts RTL section
 * - U+202C (PDF): Pop Directional Format - ends RTL section
 */
export function wrapWithRTLMarkers(text: string): string {
  if (!text) return text;

  const hasHebrew = containsHebrew(text);
  if (!hasHebrew) return text;

  const RLE = '\u202B'; // Right-to-Left Embedding
  const PDF = '\u202C'; // Pop Directional Format

  return RLE + text + PDF;
}

/**
 * Validate Israeli ID number using Luhn algorithm variant
 */
export function validateIsraeliId(id: string): boolean {
  if (!id || !/^\d{9}$/.test(id)) return false;

  // Reserved invalid IDs
  if (id === '000000000' || id === '999999999') return false;

  const digits = id.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let digit = digits[i] * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }

  return sum % 10 === 0;
}

// ============================================================================
// Font Management
// ============================================================================

let cachedHebrewFont: { buffer: Buffer; lastLoaded: number } | null = null;
const FONT_CACHE_TTL = 3600000; // 1 hour

/**
 * Get path to Hebrew font file
 */
function getHebrewFontPath(): string {
  // Check multiple possible locations
  const possiblePaths = [
    path.join(__dirname, '../../../../public/fonts/NotoSansHebrew-Regular.ttf'),
    path.join(__dirname, '../../../fonts/NotoSansHebrew-Regular.ttf'),
    path.join(__dirname, '../../fonts/NotoSansHebrew-Regular.ttf'),
    path.join(process.cwd(), 'fonts/NotoSansHebrew-Regular.ttf'),
    path.join(process.cwd(), 'public/fonts/NotoSansHebrew-Regular.ttf'),
  ];

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      return fontPath;
    }
  }

  throw new Error(
    `Hebrew font not found. Searched paths:\n${possiblePaths.join('\n')}\n` +
    'Please ensure NotoSansHebrew-Regular.ttf is in the fonts directory.'
  );
}

/**
 * Load Hebrew font bytes with caching
 */
function loadHebrewFontBytes(): Buffer {
  const now = Date.now();

  // Return cached font if still valid
  if (cachedHebrewFont && (now - cachedHebrewFont.lastLoaded) < FONT_CACHE_TTL) {
    return cachedHebrewFont.buffer;
  }

  // Load font from file
  const fontPath = getHebrewFontPath();
  const fontBuffer = fs.readFileSync(fontPath);

  // Cache for future use
  cachedHebrewFont = {
    buffer: fontBuffer,
    lastLoaded: now,
  };

  console.log(`[HebrewPDF] Loaded Hebrew font from: ${fontPath} (${fontBuffer.length} bytes)`);
  return fontBuffer;
}

/**
 * Embed Hebrew font into PDF document
 *
 * CRITICAL: subset: false is REQUIRED for Hebrew to prevent character mapping bugs
 */
async function embedHebrewFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  try {
    // Register fontkit for custom font embedding
    pdfDoc.registerFontkit(fontkit);

    // Load font bytes
    const fontBytes = loadHebrewFontBytes();

    // Embed font with subset: false (CRITICAL for Hebrew)
    const hebrewFont = await pdfDoc.embedFont(fontBytes, { subset: false });

    console.log('[HebrewPDF] Hebrew font embedded successfully');
    return hebrewFont;
  } catch (error) {
    console.error('[HebrewPDF] Failed to embed Hebrew font:', error);
    throw new Error('Cannot generate PDF: Hebrew font failed to load');
  }
}

// ============================================================================
// Field Creation
// ============================================================================

/**
 * Add custom RightFlow metadata to AcroForm field
 */
function addCustomFieldMetadata(fieldDict: any, field: FieldDefinition): void {
  try {
    if (field.sectionName) {
      fieldDict.set(PDFName.of('RFCategory'), PDFString.of(field.sectionName));
    }
    if (field.index !== undefined) {
      fieldDict.set(PDFName.of('RFIndex'), PDFNumber.of(field.index));
    }
    fieldDict.set(PDFName.of('RFRequired'), field.required ? PDFBool.True : PDFBool.False);
    if (field.autoFill !== undefined) {
      fieldDict.set(PDFName.of('RFAutoFill'), field.autoFill ? PDFBool.True : PDFBool.False);
    }
    fieldDict.set(PDFName.of('RFPageNumber'), PDFNumber.of(field.pageNumber));
    if (field.label) {
      fieldDict.set(PDFName.of('RFLabel'), PDFString.of(field.label));
    }
    fieldDict.set(PDFName.of('RFType'), PDFString.of(field.type));
  } catch (error) {
    console.warn('[HebrewPDF] Could not add custom metadata:', error);
  }
}

/**
 * Create text field with Hebrew RTL support
 */
function createTextField(
  pdfDoc: PDFDocument,
  page: any,
  field: FieldDefinition,
  hebrewFont: PDFFont,
): void {
  const form = pdfDoc.getForm();
  const textField = form.createTextField(field.name);

  // Add field to page
  textField.addToPage(page, {
    x: field.x,
    y: field.y + field.height,
    width: field.width,
    height: field.height,
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1,
  });

  // Apply Hebrew font
  textField.updateAppearances(hebrewFont);

  // Set default value with RTL markers
  if (field.defaultValue) {
    const textWithRTL = wrapWithRTLMarkers(field.defaultValue);
    textField.setText(textWithRTL);
    textField.updateAppearances(hebrewFont);
  }

  // Configure for RTL
  try {
    const acroField = textField.acroField;
    const fieldDict = acroField.dict;

    // Set quadding to 2 (right-aligned) for RTL
    fieldDict.set(PDFName.of('Q'), PDFNumber.of(2));

    // Remove gray background
    const widgets = acroField.getWidgets();
    widgets.forEach(widget => {
      const mkDict = widget.dict.get(PDFName.of('MK'));
      if (mkDict) {
        widget.dict.delete(PDFName.of('MK'));
      }
    });

    // Add custom metadata
    addCustomFieldMetadata(fieldDict, field);
  } catch (error) {
    console.warn('[HebrewPDF] Could not configure text field RTL:', error);
  }
}

/**
 * Create checkbox field
 */
function createCheckboxField(
  pdfDoc: PDFDocument,
  page: any,
  field: FieldDefinition,
): void {
  const form = pdfDoc.getForm();
  const checkbox = form.createCheckBox(field.name);

  checkbox.addToPage(page, {
    x: field.x,
    y: field.y + field.height,
    width: field.width,
    height: field.height,
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1,
  });

  // Check by default if defaultValue is truthy
  if (field.defaultValue === 'true' || field.defaultValue === '1') {
    checkbox.check();
  }

  // Add custom metadata
  try {
    const fieldDict = checkbox.acroField.dict;
    addCustomFieldMetadata(fieldDict, field);
  } catch (error) {
    console.warn('[HebrewPDF] Could not add checkbox metadata:', error);
  }
}

/**
 * Create dropdown field with Hebrew options
 */
function createDropdownField(
  pdfDoc: PDFDocument,
  page: any,
  field: FieldDefinition,
  hebrewFont: PDFFont,
): void {
  const form = pdfDoc.getForm();
  const dropdown = form.createDropdown(field.name);

  dropdown.addToPage(page, {
    x: field.x,
    y: field.y + field.height,
    width: field.width,
    height: field.height,
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1,
  });

  // Set options with RTL markers for Hebrew
  if (field.options && field.options.length > 0) {
    const processedOptions = field.options.map(opt => wrapWithRTLMarkers(opt));
    dropdown.setOptions(processedOptions);
  }

  dropdown.updateAppearances(hebrewFont);

  // Set default selection
  if (field.defaultValue) {
    const defaultWithRTL = wrapWithRTLMarkers(field.defaultValue);
    dropdown.select(defaultWithRTL);
    dropdown.updateAppearances(hebrewFont);
  }

  // Add custom metadata
  try {
    const fieldDict = dropdown.acroField.dict;
    addCustomFieldMetadata(fieldDict, field);
  } catch (error) {
    console.warn('[HebrewPDF] Could not add dropdown metadata:', error);
  }
}

// ============================================================================
// Main PDF Operations
// ============================================================================

/**
 * Fill PDF form with provided data
 *
 * This is the main function for filling existing PDF forms with Hebrew text support.
 */
export async function fillPdfForm(
  pdfBuffer: Buffer,
  data: Record<string, unknown>,
  options: { language?: 'he' | 'en' } = {}
): Promise<FillPdfResponse> {
  const startTime = Date.now();

  try {
    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Embed Hebrew font
    const hebrewFont = await embedHebrewFont(pdfDoc);

    // Get form
    const form = pdfDoc.getForm();
    let fieldsFilled = 0;

    // Fill each field
    for (const [fieldName, value] of Object.entries(data)) {
      try {
        const field = form.getField(fieldName);
        if (!field) {
          console.warn(`[HebrewPDF] Field not found: ${fieldName}`);
          continue;
        }

        const fieldType = field.constructor.name;
        const stringValue = String(value);
        const sanitizedValue = sanitizeHebrewInput(stringValue);

        if (fieldType === 'PDFTextField') {
          const textField = form.getTextField(fieldName);
          const textWithRTL = wrapWithRTLMarkers(sanitizedValue);
          textField.setText(textWithRTL);
          textField.updateAppearances(hebrewFont);

          // Set quadding for RTL
          const fieldDict = textField.acroField.dict;
          if (containsHebrew(sanitizedValue)) {
            fieldDict.set(PDFName.of('Q'), PDFNumber.of(2));
          }
        } else if (fieldType === 'PDFCheckBox') {
          const checkbox = form.getCheckBox(fieldName);
          if (value === true || value === 'true' || value === '1') {
            checkbox.check();
          } else {
            checkbox.uncheck();
          }
        } else if (fieldType === 'PDFDropdown') {
          const dropdown = form.getDropdown(fieldName);
          const optionWithRTL = wrapWithRTLMarkers(sanitizedValue);
          dropdown.select(optionWithRTL);
          dropdown.updateAppearances(hebrewFont);
        } else if (fieldType === 'PDFRadioGroup') {
          const radioGroup = form.getRadioGroup(fieldName);
          radioGroup.select(sanitizedValue);
        }

        fieldsFilled++;
      } catch (fieldError) {
        console.warn(`[HebrewPDF] Error filling field ${fieldName}:`, fieldError);
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const generationTimeMs = Date.now() - startTime;

    console.log(`[HebrewPDF] Form filled successfully: ${fieldsFilled} fields in ${generationTimeMs}ms`);

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBytes),
      fieldsFilled,
      generationTimeMs,
    };
  } catch (error) {
    console.error('[HebrewPDF] Failed to fill PDF form:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      generationTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Generate fillable PDF with AcroForm fields
 *
 * Creates a new PDF with fillable fields positioned according to field definitions.
 */
export async function generateFillablePdf(
  templateBuffer: Buffer,
  fields: FieldDefinition[],
  options: { language?: 'he' | 'en' } = {}
): Promise<GeneratePdfResponse> {
  const startTime = Date.now();

  try {
    // Load template PDF
    const pdfDoc = await PDFDocument.load(templateBuffer);

    // Embed Hebrew font
    const hebrewFont = await embedHebrewFont(pdfDoc);

    // Get pages
    const pages = pdfDoc.getPages();

    // Sort fields by page and position
    const sortedFields = [...fields].sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) {
        return a.pageNumber - b.pageNumber;
      }
      // Sort top-to-bottom, left-to-right within page
      if (Math.abs(a.y - b.y) > 10) {
        return b.y - a.y; // Higher Y (top) first
      }
      return a.x - b.x; // Left to right
    });

    // Create fields
    for (const field of sortedFields) {
      const pageIndex = field.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        console.warn(`[HebrewPDF] Invalid page number for field ${field.name}: ${field.pageNumber}`);
        continue;
      }

      const page = pages[pageIndex];

      switch (field.type) {
        case 'text':
          createTextField(pdfDoc, page, field, hebrewFont);
          break;
        case 'checkbox':
          createCheckboxField(pdfDoc, page, field);
          break;
        case 'dropdown':
          createDropdownField(pdfDoc, page, field, hebrewFont);
          break;
        default:
          console.warn(`[HebrewPDF] Unsupported field type: ${field.type}`);
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const generationTimeMs = Date.now() - startTime;

    console.log(`[HebrewPDF] Generated fillable PDF with ${fields.length} fields in ${generationTimeMs}ms`);

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBytes),
      generationTimeMs,
    };
  } catch (error) {
    console.error('[HebrewPDF] Failed to generate fillable PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      generationTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Generate a simple PDF from scratch with data
 *
 * Creates a new PDF document without a template, rendering fields as text on the page.
 * This is used when no template PDF is available.
 *
 * @param fields - Field definitions with labels
 * @param data - Data to fill into fields
 * @param options - Generation options
 */
export async function generateSimplePdf(
  fields: Array<{ id: string; label?: string; label_he?: string; type: string }>,
  data: Record<string, unknown>,
  options: {
    language?: 'he' | 'en';
    title?: string;
    title_he?: string;
  } = {}
): Promise<GeneratePdfResponse> {
  const startTime = Date.now();

  try {
    // Create new PDF
    const pdfDoc = await PDFDocument.create();

    // Embed Hebrew font
    const hebrewFont = await embedHebrewFont(pdfDoc);
    const standardFont = await pdfDoc.embedFont('Helvetica');

    // Add pages as needed
    let page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    // Constants
    const margin = 50;
    const lineHeight = 25;
    const labelFontSize = 10;
    const valueFontSize = 12;
    let currentY = height - margin;

    // Title
    const title = options.language === 'he' && options.title_he
      ? options.title_he
      : options.title || 'Document';

    const titleFont = containsHebrew(title) ? hebrewFont : standardFont;
    const titleX = containsHebrew(title) ? width - margin : margin;

    page.drawText(title, {
      x: titleX,
      y: currentY,
      size: 16,
      font: titleFont,
      color: rgb(0, 0, 0),
    });

    currentY -= 40;

    // Draw separator line
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: width - margin, y: currentY },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    currentY -= 30;

    // Render fields
    for (const field of fields) {
      // Check if we need a new page
      if (currentY < margin + 50) {
        page = pdfDoc.addPage([595, 842]);
        currentY = height - margin;
      }

      const value = data[field.id];
      if (value === undefined || value === null) {
        continue; // Skip empty fields
      }

      const valueStr = String(value);
      const sanitizedValue = sanitizeHebrewInput(valueStr);

      // Label
      const label = options.language === 'he' && field.label_he
        ? field.label_he
        : field.label || field.id;

      const labelFont = containsHebrew(label) ? hebrewFont : standardFont;
      const labelX = containsHebrew(label) ? width - margin : margin;

      page.drawText(label + ':', {
        x: labelX,
        y: currentY,
        size: labelFontSize,
        font: labelFont,
        color: rgb(0.3, 0.3, 0.3),
      });

      currentY -= lineHeight;

      // Value
      const valueFont = containsHebrew(sanitizedValue) ? hebrewFont : standardFont;
      const valueX = containsHebrew(sanitizedValue) ? width - margin : margin;

      // Handle long text (wrap if needed)
      const maxWidth = width - (2 * margin);
      const words = sanitizedValue.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const textWidth = valueFont.widthOfTextAtSize(testLine, valueFontSize);

        if (textWidth > maxWidth && line) {
          // Draw current line
          page.drawText(line, {
            x: valueX,
            y: currentY,
            size: valueFontSize,
            font: valueFont,
            color: rgb(0, 0, 0),
          });

          currentY -= lineHeight;
          line = word;

          // Check if new page needed
          if (currentY < margin + 50) {
            page = pdfDoc.addPage([595, 842]);
            currentY = height - margin;
          }
        } else {
          line = testLine;
        }
      }

      // Draw last line
      if (line) {
        page.drawText(line, {
          x: valueX,
          y: currentY,
          size: valueFontSize,
          font: valueFont,
          color: rgb(0, 0, 0),
        });
      }

      currentY -= lineHeight + 10; // Extra spacing between fields
    }

    // Add generation timestamp at bottom
    const timestamp = new Date().toISOString();
    const timestampText = `Generated: ${timestamp}`;
    page.drawText(timestampText, {
      x: margin,
      y: 30,
      size: 8,
      font: standardFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const generationTimeMs = Date.now() - startTime;

    console.log(`[HebrewPDF] Generated simple PDF with ${fields.length} fields in ${generationTimeMs}ms`);

    return {
      success: true,
      pdfBuffer: Buffer.from(pdfBytes),
      generationTimeMs,
    };
  } catch (error) {
    console.error('[HebrewPDF] Failed to generate simple PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      generationTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Validate Hebrew font is available and working
 */
export async function validateHebrewFontSetup(): Promise<{
  success: boolean;
  fontPath?: string;
  fontSize?: number;
  error?: string;
}> {
  try {
    const fontPath = getHebrewFontPath();
    const fontBuffer = fs.readFileSync(fontPath);

    // Test embedding
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(fontBuffer, { subset: false });

    // Test encoding Hebrew text
    const testText = 'שלום עולם';
    const width = font.widthOfTextAtSize(testText, 12);

    return {
      success: true,
      fontPath,
      fontSize: fontBuffer.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
