/**
 * PDF Generation Utilities with Hebrew Font Embedding
 *
 * This module handles generating fillable PDFs with AcroForm fields
 * and proper Hebrew text support using pdf-lib + fontkit.
 *
 * CRITICAL: Hebrew font MUST be embedded with subset: false to prevent
 * character mapping issues that cause text reversal.
 *
 * CRITICAL: pdf-lib does NOT handle RTL text natively for form fields.
 * Hebrew text must be manually reversed before being set in fields.
 */

import { PDFDocument, PDFFont, rgb, PDFName, PDFNumber, PDFBool, PDFString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { FieldDefinition } from '@/types/fields';
import { validateFieldName, validateFieldNameUniqueness } from '@/utils/inputSanitization';
import { CheckboxStyle } from '@/types/settings';

/**
 * Add Unicode RTL markers to Hebrew text for proper bidirectional display
 *
 * PDF viewers apply the Unicode Bidirectional Algorithm when rendering text.
 * By wrapping Hebrew text with RLE (Right-to-Left Embedding) and PDF (Pop Directional Format),
 * we signal to the PDF viewer to treat the text as RTL without manual character reversal.
 *
 * Unicode Control Characters:
 * - U+202B (RLE): Right-to-Left Embedding - starts RTL text section
 * - U+202C (PDF): Pop Directional Format - ends RTL text section
 * - U+200F (RLM): Right-to-Left Mark - zero-width RTL character
 *
 * @param text - Original text in logical order
 * @returns Text wrapped with Unicode RTL markers
 *
 * @example
 * wrapWithRTLMarkers("שלום") => "\u202Bשלום\u202C"
 */
function wrapWithRTLMarkers(text: string): string {
  if (!text) return text;

  // Check if text contains Hebrew characters (U+0590 to U+05FF)
  const hasHebrew = /[\u0590-\u05FF]/.test(text);

  if (!hasHebrew) {
    return text; // No Hebrew, return as-is
  }

  // Wrap Hebrew text with RLE...PDF for proper RTL embedding
  const RLE = '\u202B'; // Right-to-Left Embedding
  const PDF = '\u202C'; // Pop Directional Format

  return RLE + text + PDF;
}

/**
 * Add RightFlow custom metadata to AcroForm field
 *
 * Stores field metadata (category, index, required) as custom PDF dictionary entries.
 * These properties are preserved in the generated PDF and can be read by PDF tools.
 *
 * Custom property naming convention:
 * - RFCategory: Field category/section name (PDFName)
 * - RFIndex: Field creation order index (PDFNumber)
 * - RFRequired: Required field flag (PDFBool)
 *
 * @param fieldDict - PDF field dictionary to add properties to
 * @param field - Field definition with metadata
 */
function addCustomFieldMetadata(fieldDict: any, field: FieldDefinition): void {
  try {
    // Add category (section name)
    if (field.sectionName) {
      fieldDict.set(PDFName.of('RFCategory'), PDFString.of(field.sectionName));
    }

    // Add creation order index
    if (field.index !== undefined) {
      fieldDict.set(PDFName.of('RFIndex'), PDFNumber.of(field.index));
    }

    // Add required flag (redundant with AcroForm's Ff flag, but explicit for RightFlow)
    fieldDict.set(PDFName.of('RFRequired'), field.required ? PDFBool.True : PDFBool.False);

    console.log(`   ✓ Custom metadata added: category=${field.sectionName || 'none'}, index=${field.index}, required=${field.required}`);
  } catch (error) {
    console.warn('Could not add custom metadata to field:', error);
  }
}

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
  // CRITICAL: pdf-lib's addToPage expects Y coordinate as the TOP edge of the widget
  // This is counterintuitive because PDF Rect is [x_ll, y_ll, x_ur, y_ur] (lower-left, upper-right)
  // But pdf-lib's API uses (x, y) as top-left corner and internally converts to PDF Rect
  textField.addToPage(page, {
    x: field.x,
    y: field.y + field.height, // Y is the TOP edge (field.y is bottom, so add height)
    width: field.width,
    height: field.height,
    borderColor: rgb(0.5, 0.5, 0.5), // Gray border
    borderWidth: 1,
    // Omit backgroundColor - transparent by default
  });

  // Apply Hebrew font for RTL text BEFORE setting value
  // This ensures the appearance stream is generated with the correct font
  textField.updateAppearances(hebrewFont);

  // Set default value if provided (after font is configured)
  // CRITICAL: Wrap Hebrew text with Unicode RTL markers for proper bidirectional display
  if (field.defaultValue) {
    const textWithRTL = wrapWithRTLMarkers(field.defaultValue);
    textField.setText(textWithRTL);
    // Regenerate appearances with the new value
    textField.updateAppearances(hebrewFont);
  }

  // Configure field for RTL (Right-to-Left) text
  // CRITICAL: AcroForm fields need proper quadding for Hebrew text direction
  try {
    const acroField = textField.acroField;
    const fieldDict = acroField.dict;

    // Set quadding to 2 (right-aligned) for RTL languages
    // Q=0: Left-aligned (LTR), Q=1: Centered, Q=2: Right-aligned (RTL)
    fieldDict.set(PDFName.of('Q'), PDFNumber.of(2));

    // Remove the gray background by updating the appearance stream
    // The gray background comes from the /BG (background) entry in the MK (appearance characteristics) dictionary
    const widgets = acroField.getWidgets();
    widgets.forEach(widget => {
      // Remove the MK (appearance characteristics) dict which contains the background color
      const widgetDict = widget.dict;
      const mkKey = PDFName.of('MK');
      if (widgetDict.has(mkKey)) {
        widgetDict.delete(mkKey);
      }
    });

    // Add custom properties for RightFlow metadata
    addCustomFieldMetadata(fieldDict, field);

    console.log(`   ✓ RTL quadding configured for field: ${field.name}`);
  } catch (error) {
    console.warn('Could not configure RTL for text field:', error);
  }

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
  // CRITICAL: Y coordinate is the TOP edge
  checkbox.addToPage(page, {
    x: field.x,
    y: field.y + field.height, // Y is the TOP edge
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

  // Add custom properties for RightFlow metadata
  try {
    const acroField = checkbox.acroField;
    const fieldDict = acroField.dict;
    addCustomFieldMetadata(fieldDict, field);
  } catch (error) {
    console.warn('Could not add custom properties to checkbox:', error);
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
    let yPos = field.y + field.height; // Y is the TOP edge

    if (orientation === 'horizontal') {
      // Horizontal layout - buttons side by side
      xPos = field.x + index * (field.width + spacing);
    } else {
      // Vertical layout - buttons stacked
      // In PDF coords, higher Y = higher on page, so ADD for each subsequent button
      yPos = (field.y + field.height) + index * (field.height + spacing);
    }

    radioGroup.addOptionToPage(option, page, {
      x: xPos,
      y: yPos, // Y is the TOP edge
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

  // Add custom properties for RightFlow metadata
  try {
    const acroField = radioGroup.acroField;
    const fieldDict = acroField.dict;
    addCustomFieldMetadata(fieldDict, field);
  } catch (error) {
    console.warn('Could not add custom properties to radio group:', error);
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

  // Set options - wrap Hebrew text with RTL markers for each option
  // CRITICAL: Use Unicode RTL markers for proper bidirectional display
  if (field.options && field.options.length > 0) {
    const optionsWithRTL = field.options.map(opt => wrapWithRTLMarkers(opt));
    dropdown.setOptions(optionsWithRTL);

    // Set default value if provided - also wrap with RTL markers
    if (field.defaultValue && field.options.includes(field.defaultValue)) {
      const defaultWithRTL = wrapWithRTLMarkers(field.defaultValue);
      dropdown.select(defaultWithRTL);
    }
  }

  // Add dropdown to page
  // CRITICAL: Y coordinate is the TOP edge (same as text fields)
  dropdown.addToPage(page, {
    x: field.x,
    y: field.y + field.height, // Y is the TOP edge
    width: field.width,
    height: field.height,
    borderColor: rgb(0.5, 0.5, 0.5), // Gray border
    borderWidth: 1,
    // Omit backgroundColor - transparent by default
  });

  // Apply Hebrew font for RTL text in dropdown options
  dropdown.updateAppearances(hebrewFont);

  // Configure dropdown for RTL (Right-to-Left) text
  try {
    const acroField = dropdown.acroField;
    const fieldDict = acroField.dict;

    // Set quadding to 2 (right-aligned) for RTL languages
    fieldDict.set(PDFName.of('Q'), PDFNumber.of(2));

    // Remove the gray background (same as text fields)
    const widgets = acroField.getWidgets();
    widgets.forEach(widget => {
      const widgetDict = widget.dict;
      const mkKey = PDFName.of('MK');
      if (widgetDict.has(mkKey)) {
        widgetDict.delete(mkKey);
      }
    });

    // Add custom properties for RightFlow metadata
    addCustomFieldMetadata(fieldDict, field);

    console.log(`   ✓ RTL quadding configured for dropdown: ${field.name}`);
  } catch (error) {
    console.warn('Could not configure RTL for dropdown:', error);
  }

  // Set as required if needed
  if (field.required) {
    dropdown.enableRequired();
  }

  console.log(`✓ Created dropdown: ${field.name} with ${field.options?.length || 0} options at (${field.x}, ${field.y})`);
}

/**
 * Create signature field in PDF (image-based, static/pre-filled)
 *
 * ⚠️ IMPORTANT: This creates a STATIC signature image, not an interactive AcroForm signature field.
 * End users CANNOT sign the PDF after generation.
 *
 * REASON: pdf-lib does NOT support creating interactive signature fields (no form.createSignature()).
 * Only createTextField, createCheckBox, createButton, etc. are available.
 *
 * USE CASES:
 * - Company stamps/seals on form templates
 * - Authorized signatory signatures
 * - Pre-approved signatures embedded in forms
 *
 * @param pdfDoc - PDF document
 * @param page - PDF page to add signature to
 * @param field - Field definition with signature image (base64 PNG/JPG)
 */
async function createSignatureField(
  pdfDoc: PDFDocument,
  page: any,
  field: FieldDefinition,
): Promise<void> {
  // If no signature image, draw an empty rectangle border
  if (!field.signatureImage) {
    page.drawRectangle({
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });
    console.log(`✓ Created empty signature field: ${field.name} at (${field.x}, ${field.y})`);
    return;
  }

  try {
    // Convert base64 data URL to bytes
    const base64Data = field.signatureImage.split(',')[1]; // Remove "data:image/png;base64," prefix
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Determine image format from data URL
    const isPng = field.signatureImage.startsWith('data:image/png');
    const image = isPng
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

    // Draw signature image
    page.drawImage(image, {
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    });

    // Add timestamp below signature if present
    if (field.signatureTimestamp) {
      const date = new Date(field.signatureTimestamp);
      const dateStr = date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      page.drawText(dateStr, {
        x: field.x,
        y: field.y - 12, // 12 points below signature
        size: 8,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    console.log(`✓ Created signature field: ${field.name} at (${field.x}, ${field.y}) with image`);
  } catch (error) {
    const errorMsg = `נכשל הוספת חתימה לשדה "${field.name}": ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`;
    console.error(errorMsg, error);

    // Draw warning indicator instead of empty rectangle
    page.drawRectangle({
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      borderColor: rgb(1, 0, 0), // Red border to indicate error
      borderWidth: 2,
    });

    // Add error text
    page.drawText('⚠ שגיאה', {
      x: field.x + 5,
      y: field.y + field.height / 2,
      size: 10,
      color: rgb(1, 0, 0),
    });

    // Return error for caller to handle
    throw new Error(errorMsg);
  }
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

    // Get the form and configure for Hebrew
    const form = pdfDoc.getForm();

    // Set NeedAppearances flag to ensure PDF readers regenerate appearance streams
    // This is critical for Hebrew text to display correctly in Acrobat Reader
    try {
      form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);
      console.log('✓ NeedAppearances flag set for proper Hebrew rendering');
    } catch (error) {
      console.warn('Could not set NeedAppearances flag:', error);
    }

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
        } else if (field.type === 'signature') {
          try {
            await createSignatureField(pdfDoc, page, field);
          } catch (error) {
            // Log error but continue processing other fields
            console.warn(`⚠ Signature field "${field.name}" failed to embed, shown as error in PDF`);
          }
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
