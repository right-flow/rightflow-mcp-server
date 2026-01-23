/**
 * PDF AcroForm Field Extraction Utilities
 *
 * This module extracts existing AcroForm fields from uploaded PDFs
 * and converts them into FieldDefinition objects for the editor.
 *
 * Supports: Text fields, Checkboxes, Radio buttons, Dropdowns
 */

import { PDFDocument } from 'pdf-lib';
import { FieldDefinition } from '@/types/fields';

/**
 * Extract all AcroForm fields from a PDF file
 *
 * @param pdfFile - The PDF file to extract fields from
 * @returns Array of FieldDefinition objects
 * @throws Error if PDF cannot be loaded or parsed
 */
export async function extractFieldsFromPDF(pdfFile: File): Promise<FieldDefinition[]> {
  try {
    console.log('📋 Extracting AcroForm fields from PDF...');

    // Load PDF document
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the form (AcroForm)
    const form = pdfDoc.getForm();
    const allFields = form.getFields();

    console.log(`   Found ${allFields.length} form fields`);

    if (allFields.length === 0) {
      console.log('   No AcroForm fields found in PDF');
      return [];
    }

    const extractedFields: FieldDefinition[] = [];

    // Process each field
    for (const field of allFields) {
      try {
        const fieldName = field.getName();
        const fieldType = getFieldType(field);

        if (!fieldType) {
          console.warn(`   Skipping unsupported field type: ${fieldName}`);
          continue;
        }

        // Get field widgets (visual representations on pages)
        const widgets = (field as any).acroField.getWidgets();

        // Process each widget (a field can appear on multiple pages)
        for (let widgetIndex = 0; widgetIndex < widgets.length; widgetIndex++) {
          const widget = widgets[widgetIndex];

          // Get page reference and find page number
          const pageRef = widget.P();
          if (!pageRef) {
            console.warn(`   Widget ${widgetIndex} for field "${fieldName}" has no page reference`);
            continue;
          }

          const pages = pdfDoc.getPages();
          let pageNumber = -1;

          // Find which page this widget is on
          for (let i = 0; i < pages.length; i++) {
            if (pages[i].ref === pageRef) {
              pageNumber = i + 1; // Convert to 1-based
              break;
            }
          }

          if (pageNumber === -1) {
            console.warn(`   Could not find page for field "${fieldName}"`);
            continue;
          }

          // Get rectangle (position and size)
          const rect = widget.getRectangle();
          if (!rect) {
            console.warn(`   Widget for field "${fieldName}" has no rectangle`);
            continue;
          }

          // Convert PDF coordinates to our coordinate system
          // PDF: origin at bottom-left, Y goes up
          // Our system: origin at bottom-left, Y goes up (same as PDF)
          const x = rect.x;
          const y = rect.y;
          const width = rect.width;
          const height = rect.height;

          // Extract field-specific properties
          const fieldDef: Omit<FieldDefinition, 'id'> = {
            type: fieldType,
            pageNumber,
            x,
            y,
            width,
            height,
            name: fieldName,
            required: false, // Default, can be enhanced later
            direction: 'rtl', // Default to RTL for Hebrew
          };

          // Extract type-specific properties
          if (fieldType === 'text') {
            const textField = field as any;
            try {
              const text = textField.getText?.() || '';
              if (text) {
                fieldDef.defaultValue = text;
              }
            } catch (e) {
              // Ignore if getText fails
            }
          } else if (fieldType === 'checkbox') {
            const checkbox = field as any;
            try {
              const isChecked = checkbox.isChecked?.() || false;
              fieldDef.defaultValue = isChecked ? 'true' : 'false';
            } catch (e) {
              // Ignore if isChecked fails
            }
          } else if (fieldType === 'radio') {
            const radioGroup = field as any;
            try {
              const options = radioGroup.getOptions?.() || [];
              fieldDef.options = options;
              fieldDef.radioGroup = fieldName;

              const selected = radioGroup.getSelected?.();
              if (selected) {
                fieldDef.defaultValue = selected;
              }
            } catch (e) {
              // Ignore if methods fail
            }
          } else if (fieldType === 'dropdown') {
            const dropdown = field as any;
            try {
              const options = dropdown.getOptions?.() || [];
              fieldDef.options = options;

              const selected = dropdown.getSelected?.();
              if (selected && selected.length > 0) {
                fieldDef.defaultValue = selected[0];
              }
            } catch (e) {
              // Ignore if methods fail
            }
          }

          // Generate unique ID
          const fieldWithId: FieldDefinition = {
            ...fieldDef,
            id: `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };

          extractedFields.push(fieldWithId);

          console.log(
            `   ✓ Extracted ${fieldType} field: "${fieldName}" on page ${pageNumber} at (${x.toFixed(1)}, ${y.toFixed(1)})`,
          );
        }
      } catch (error) {
        console.error(`   Error processing field:`, error);
        // Continue with next field
      }
    }

    console.log(`✅ Successfully extracted ${extractedFields.length} fields from PDF`);
    return extractedFields;
  } catch (error) {
    console.error('❌ Failed to extract fields from PDF:', error);
    throw new Error('Could not extract fields from PDF. The file may not contain AcroForm fields.');
  }
}

/**
 * Determine the field type from a pdf-lib field object
 *
 * @param field - pdf-lib form field
 * @returns Field type or null if unsupported
 */
function getFieldType(field: any): 'text' | 'checkbox' | 'radio' | 'dropdown' | null {
  const constructor = field.constructor.name;

  // Map pdf-lib field types to our types
  if (constructor === 'PDFTextField') {
    return 'text';
  } else if (constructor === 'PDFCheckBox') {
    return 'checkbox';
  } else if (constructor === 'PDFRadioGroup') {
    return 'radio';
  } else if (constructor === 'PDFDropdown') {
    return 'dropdown';
  } else if (constructor === 'PDFOptionList') {
    // Treat list boxes as dropdowns
    return 'dropdown';
  } else if (constructor === 'PDFButton') {
    // Skip push buttons (not form data)
    return null;
  } else if (constructor === 'PDFSignature') {
    // Skip signature fields (not supported yet)
    return null;
  }

  return null;
}

/**
 * Check if a PDF file has AcroForm fields
 *
 * @param pdfFile - The PDF file to check
 * @returns True if PDF contains AcroForm fields
 */
export async function hasAcroFormFields(pdfFile: File): Promise<boolean> {
  try {
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    return fields.length > 0;
  } catch (error) {
    console.error('Error checking for AcroForm fields:', error);
    return false;
  }
}
