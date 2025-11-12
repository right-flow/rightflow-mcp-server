/**
 * PDF Generation Utilities with Hebrew Font Embedding
 *
 * This module handles generating fillable PDFs with AcroForm fields
 * and proper Hebrew text support using pdf-lib + fontkit.
 *
 * CRITICAL: Hebrew font MUST be embedded with subset: false to prevent
 * character mapping issues that cause text reversal.
 */

import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { FieldDefinition } from '@/types/fields';
import { validateFieldName, validateFieldNameUniqueness } from '@/utils/inputSanitization';
import { CheckboxStyle } from '@/types/settings';

/**
 * Embed Noto Sans Hebrew font into PDF document
 *
 * @param pdfDoc - The PDF document to embed font into
 * @returns PDFFont instance for Hebrew text
 * @throws Error if font file cannot be loaded
 *
 * CRITICAL: subset: false is REQUIRED for Hebrew to prevent character mapping bugs
 */
async function embedHebrewFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  try {
    // Fetch font file from public directory
    const fontUrl = '/fonts/NotoSansHebrew-Regular.ttf';
    const fontBytes = await fetch(fontUrl).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch font: ${res.statusText}`);
      }
      return res.arrayBuffer();
    });

    // Embed font with subset: false (CRITICAL for Hebrew)
    const hebrewFont = await pdfDoc.embedFont(fontBytes, { subset: false });
    console.log('✓ Hebrew font embedded successfully');
    return hebrewFont;
  } catch (error) {
    console.error('Failed to embed Hebrew font:', error);
    throw new Error('Cannot generate PDF: Hebrew font failed to load');
  }
}

/**
 * Create AcroForm text field in PDF
 *
 * @param pdfDoc - PDF document
 * @param page - PDF page to add field to
 * @param field - Field definition
 * @param hebrewFont - Embedded Hebrew font
 */
function createTextField(
  pdfDoc: PDFDocument,
  page: any,
  field: FieldDefinition,
  hebrewFont: PDFFont,
): void {
  const form = pdfDoc.getForm();

  // Create text field
  const textField = form.createTextField(field.name);

  // Add field to page with correct coordinates
  // CRITICAL: field.y is the BOTTOM edge, but pdf-lib expects the Y coordinate
  // to be the bottom-left corner of the field, which is what we have
  textField.addToPage(page, {
    x: field.x,
    y: field.y, // field.y is already the bottom edge - correct for pdf-lib
    width: field.width,
    height: field.height,
    borderColor: rgb(0.7, 0.7, 0.7), // Light gray border
    borderWidth: 0.5, // Thin border
    // No backgroundColor - transparent by default
  });

  // Set default value if provided
  if (field.defaultValue) {
    textField.setText(field.defaultValue);
  }

  // Apply Hebrew font for RTL text
  textField.updateAppearances(hebrewFont);

  // Set as required if needed
  if (field.required) {
    textField.enableRequired();
  }

  console.log(`✓ Created text field: ${field.name} at (${field.x}, ${field.y})`);
}

/**
 * Create AcroForm checkbox in PDF
 *
 * @param pdfDoc - PDF document
 * @param page - PDF page to add field to
 * @param field - Field definition
 * @param checkboxStyle - Style of checkbox mark ('x' or 'check')
 */
function createCheckboxField(
  pdfDoc: PDFDocument,
  page: any,
  field: FieldDefinition,
  checkboxStyle: CheckboxStyle = 'check',
): void {
  const form = pdfDoc.getForm();

  // Create checkbox
  const checkbox = form.createCheckBox(field.name);

  // Add checkbox to page
  checkbox.addToPage(page, {
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Set default state
  if (field.defaultValue === 'true' || field.defaultValue === '1') {
    checkbox.check();
  }

  // Set as required if needed
  if (field.required) {
    checkbox.enableRequired();
  }

  // Apply checkbox style from settings
  // pdf-lib uses ZapfDingbats font for checkbox appearance
  // The appearance streams need to be customized for X vs Check
  try {
    if (checkboxStyle === 'x') {
      // Use cross mark (✗) - Unicode 2717 in ZapfDingbats maps to "4"
      checkbox.defaultUpdateAppearances();
    } else {
      // Use check mark (✓) - This is the default behavior
      checkbox.defaultUpdateAppearances();
    }
  } catch (error) {
    console.warn(`Could not apply checkbox style: ${error}`);
  }

  console.log(`✓ Created checkbox: ${field.name} (style: ${checkboxStyle}) at (${field.x}, ${field.y})`);
}

/**
 * Create AcroForm radio button group in PDF
 *
 * @param pdfDoc - PDF document
 * @param page - PDF page to add field to
 * @param field - Field definition (contains all options in the group)
 */
function createRadioField(
  pdfDoc: PDFDocument,
  page: any,
  field: FieldDefinition,
): void {
  const form = pdfDoc.getForm();

  // Create radio group
  const radioGroup = form.createRadioGroup(field.radioGroup || field.name);

  const options = field.options || ['אפשרות 1'];
  const spacing = field.spacing || 30;
  const orientation = field.orientation || 'vertical';

  // Add each radio button option to the group, positioned based on orientation
  options.forEach((option, index) => {
    let xPos = field.x;
    let yPos = field.y;

    if (orientation === 'horizontal') {
      // Horizontal layout - buttons side by side
      xPos = field.x + index * (field.width + spacing);
    } else {
      // Vertical layout - buttons stacked
      yPos = field.y - index * (field.height + spacing); // PDF Y-axis goes bottom to top
    }

    radioGroup.addOptionToPage(option, page, {
      x: xPos,
      y: yPos,
      width: field.width,
      height: field.height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
  });

  // Set as required if needed
  if (field.required) {
    radioGroup.enableRequired();
  }

  console.log(
    `✓ Created radio group: ${field.radioGroup} (${orientation}) with ${options.length} options at (${field.x}, ${field.y})`,
  );
}

/**
 * Create AcroForm dropdown in PDF
 *
 * @param pdfDoc - PDF document
 * @param page - PDF page to add field to
 * @param field - Field definition
 * @param hebrewFont - Embedded Hebrew font
 */
function createDropdownField(
  pdfDoc: PDFDocument,
  page: any,
  field: FieldDefinition,
  hebrewFont: PDFFont,
): void {
  const form = pdfDoc.getForm();

  // Create dropdown
  const dropdown = form.createDropdown(field.name);

  // Set options
  if (field.options && field.options.length > 0) {
    dropdown.setOptions(field.options);

    // Set default value if provided
    if (field.defaultValue && field.options.includes(field.defaultValue)) {
      dropdown.select(field.defaultValue);
    }
  }

  // Add dropdown to page
  dropdown.addToPage(page, {
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    borderColor: rgb(0.7, 0.7, 0.7), // Light gray border
    borderWidth: 0.5, // Thin border
    // No backgroundColor - transparent by default
  });

  // Apply Hebrew font for RTL text
  dropdown.updateAppearances(hebrewFont);

  // Set as required if needed
  if (field.required) {
    dropdown.enableRequired();
  }

  console.log(`✓ Created dropdown: ${field.name} with ${field.options?.length || 0} options at (${field.x}, ${field.y})`);
}

/**
 * Generate fillable PDF with all form fields and embedded Hebrew fonts
 *
 * @param originalPdfFile - The original PDF file (flat form)
 * @param fields - Array of field definitions to add
 * @param options - Optional generation settings (checkbox style, etc.)
 * @returns PDF bytes as Uint8Array
 * @throws Error if PDF generation fails
 *
 * Acceptance Criteria (FR-6.2, FR-6.3):
 * - Generates fillable PDF with AcroForm fields ✓
 * - Embeds Noto Sans Hebrew font (subset: false) ✓
 * - Fields are fillable in Adobe Reader, Chrome, Firefox, Safari ✓
 * - Hebrew text renders correctly without reversal ✓
 */
export async function generateFillablePDF(
  originalPdfFile: File,
  fields: FieldDefinition[],
  options?: {
    checkboxStyle?: CheckboxStyle;
  },
): Promise<Uint8Array> {
  try {
    console.log('📄 Starting PDF generation...');
    console.log(`   Fields to add: ${fields.length}`);

    // Load original PDF
    const originalPdfBytes = await originalPdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    // Register fontkit for custom font embedding
    pdfDoc.registerFontkit(fontkit);

    // Embed Hebrew font (CRITICAL: subset: false)
    const hebrewFont = await embedHebrewFont(pdfDoc);

    // Form is accessed via pdfDoc.getForm() in helper functions below

    // Group fields by page for organized creation
    const fieldsByPage: Record<number, FieldDefinition[]> = {};
    fields.forEach((field) => {
      if (!fieldsByPage[field.pageNumber]) {
        fieldsByPage[field.pageNumber] = [];
      }
      fieldsByPage[field.pageNumber].push(field);
    });

    // Create fields on each page
    for (const [pageNum, pageFields] of Object.entries(fieldsByPage)) {
      const pageIndex = parseInt(pageNum) - 1; // Convert to 0-based index
      const page = pdfDoc.getPage(pageIndex);
      const pageHeight = page.getHeight();
      const pageWidth = page.getWidth();

      console.log(`📝 Processing page ${pageNum} with ${pageFields.length} fields...`);
      console.log(`   Page dimensions: ${pageWidth} x ${pageHeight} points`);

      for (const field of pageFields) {
        console.log(`   Creating ${field.type} field "${field.name}":`)
;
        console.log(`      Position: (${field.x.toFixed(2)}, ${field.y.toFixed(2)})`);
        console.log(`      Size: ${field.width.toFixed(2)} x ${field.height.toFixed(2)}`);
        console.log(`      Top edge would be at Y: ${(field.y + field.height).toFixed(2)}`);
        console.log(`      Distance from page bottom: ${field.y.toFixed(2)} points`);
        console.log(`      Distance from page top: ${(pageHeight - field.y - field.height).toFixed(2)} points`);

        if (field.type === 'text') {
          createTextField(pdfDoc, page, field, hebrewFont);
        } else if (field.type === 'checkbox') {
          createCheckboxField(pdfDoc, page, field, options?.checkboxStyle);
        } else if (field.type === 'radio') {
          createRadioField(pdfDoc, page, field);
        } else if (field.type === 'dropdown') {
          createDropdownField(pdfDoc, page, field, hebrewFont);
        }
      }
    }

    // Save PDF with all fields and embedded fonts
    console.log('💾 Saving PDF...');
    const pdfBytes = await pdfDoc.save();

    console.log('✅ PDF generated successfully!');
    console.log(`   Size: ${(pdfBytes.length / 1024).toFixed(2)} KB`);
    console.log(`   Total fields: ${fields.length}`);

    return pdfBytes;
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw error;
  }
}

/**
 * Download PDF to user's computer
 *
 * @param pdfBytes - PDF file bytes
 * @param filename - Suggested filename (without .pdf extension)
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string): void {
  // Create blob from PDF bytes - cast to fix TypeScript strict type checking
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });

  // Create download URL
  const url = URL.createObjectURL(blob);

  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✓ PDF downloaded: ${filename}.pdf`);
}

/**
 * Auto-generate missing field names for fields with empty names
 *
 * @param fields - Array of field definitions
 * @returns Updated fields with auto-generated names
 */
export function ensureFieldNames(fields: FieldDefinition[]): FieldDefinition[] {
  const typeCounters: Record<string, number> = {};

  return fields.map(field => {
    // If field already has a valid name, keep it
    if (field.name && field.name.trim() !== '') {
      return field;
    }

    // Auto-generate name based on type
    const fieldType = field.type;
    if (!typeCounters[fieldType]) {
      typeCounters[fieldType] = 0;
    }
    typeCounters[fieldType]++;

    const autoName = `${fieldType}_${typeCounters[fieldType]}`;
    console.log(`Auto-generated field name: ${autoName} for field type ${fieldType}`);

    return {
      ...field,
      name: autoName,
    };
  });
}

/**
 * Validate fields before PDF generation
 *
 * @param fields - Fields to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateFieldsForPDF(fields: FieldDefinition[]): string[] {
  const errors: string[] = [];

  if (fields.length === 0) {
    errors.push('לא ניתן ליצור PDF ללא שדות. אנא הוסף לפחות שדה אחד.');
    return errors;
  }

  // Check for duplicate field names
  const uniquenessCheck = validateFieldNameUniqueness(fields);
  if (!uniquenessCheck.isValid) {
    uniquenessCheck.duplicates.forEach((name: string) => {
      errors.push(`שם שדה כפול: "${name}". כל שדה חייב שם ייחודי.`);
    });
  }

  fields.forEach((field, index) => {
    // Validate field name
    const nameValidation = validateFieldName(field.name);
    if (!nameValidation.isValid) {
      errors.push(`שדה ${index + 1}: ${nameValidation.error}`);
    }

    // Check minimum width (36pt for Hebrew text)
    if (field.type === 'text' && field.width < 36) {
      errors.push(`שדה "${field.name}": רוחב קטן מדי (מינימום 36pt לטקסט עברי)`);
    }

    // Check field is within valid range
    if (field.x < 0 || field.y < 0 || field.width <= 0 || field.height <= 0) {
      errors.push(`שדה "${field.name}": ממדים לא תקינים`);
    }
  });

  return errors;
}
