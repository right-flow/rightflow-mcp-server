/**
 * Field Template Save/Load Utilities
 *
 * This module provides utilities for saving and loading field definitions
 * to/from JSON files, enabling template reuse across different PDF forms.
 */

import { FieldDefinition } from '@/types/fields';

/**
 * Template file format for saved field definitions
 */
export interface FieldTemplate {
  version: string; // Format version for future compatibility
  name: string; // Template name
  description?: string; // Optional description
  fields: FieldDefinition[]; // All field definitions
  createdAt: string; // ISO timestamp
  metadata: {
    totalFields: number;
    fieldTypes: Record<string, number>; // Count by type
    hasHebrewFields: boolean;
  };
}

/**
 * Save field definitions to a JSON file
 *
 * @param fields - Array of field definitions to save
 * @param templateName - Name for the template (optional, defaults to timestamp)
 * @param description - Optional description
 */
export function saveFieldsToFile(
  fields: FieldDefinition[],
  templateName?: string,
  description?: string,
): void {
  if (fields.length === 0) {
    throw new Error('לא ניתן לשמור תבנית ללא שדות');
  }

  // Generate default template name if not provided
  const name =
    templateName || `template_${new Date().toISOString().split('T')[0]}_${Date.now()}`;

  // Calculate metadata
  const fieldTypes: Record<string, number> = {};
  let hasHebrewFields = false;

  fields.forEach((field) => {
    // Count field types
    fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;

    // Check for Hebrew text (RTL direction or Hebrew characters in name/label)
    if (field.direction === 'rtl' || /[\u0590-\u05FF]/.test(field.name + (field.label || ''))) {
      hasHebrewFields = true;
    }
  });

  // Create template object
  const template: FieldTemplate = {
    version: '1.0',
    name,
    description,
    fields,
    createdAt: new Date().toISOString(),
    metadata: {
      totalFields: fields.length,
      fieldTypes,
      hasHebrewFields,
    },
  };

  // Convert to JSON
  const jsonStr = JSON.stringify(template, null, 2);

  // Create blob and download
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.json`;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✓ Field template saved: ${name}.json (${fields.length} fields)`);
}

/**
 * Load field definitions from a JSON file
 * Supports both new template format and legacy plain array format
 *
 * @param file - JSON file containing field template or plain array of fields
 * @returns Promise resolving to array of field definitions
 * @throws Error if file is invalid or incompatible
 */
export async function loadFieldsFromFile(file: File): Promise<FieldDefinition[]> {
  // Validate file type
  if (!file.name.endsWith('.json')) {
    throw new Error('אנא בחר קובץ JSON תקין');
  }

  // Read file contents
  const text = await file.text();

  let parsed: FieldTemplate | FieldDefinition[];
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('קובץ JSON לא תקין');
  }

  // Handle legacy format: plain array of fields
  let template: FieldTemplate;
  if (Array.isArray(parsed)) {
    // Convert legacy format to new template format
    console.log('Converting legacy field array format to template format...');
    template = {
      version: '1.0',
      name: file.name.replace('.json', ''),
      fields: parsed as FieldDefinition[],
      createdAt: new Date().toISOString(),
      metadata: {
        totalFields: parsed.length,
        fieldTypes: {},
        hasHebrewFields: false,
      },
    };
  } else if (parsed && typeof parsed === 'object') {
    template = parsed as FieldTemplate;
    // Validate new template format
    if (!template.version || !template.fields || !Array.isArray(template.fields)) {
      throw new Error('פורמט תבנית לא תקין');
    }
  } else {
    throw new Error('פורמט תבנית לא תקין');
  }

  // Version compatibility check (for future versions)
  if (template.version !== '1.0') {
    console.warn(`Template version ${template.version} may not be fully compatible`);
  }

  // Validate field structure - handle undefined/null fields gracefully
  const validatedFields = template.fields.filter((field, index) => {
    // Check if field is undefined or null
    if (!field || typeof field !== 'object') {
      console.warn(`Invalid field at index ${index}: field is ${field === null ? 'null' : 'undefined'}`);
      return false;
    }

    // Detailed validation logging
    try {
      const validations = {
        hasId: !!field.id,
        hasType: !!field.type,
        hasPageNumber: typeof field.pageNumber === 'number',
        hasX: typeof field.x === 'number',
        hasY: typeof field.y === 'number',
        hasWidth: typeof field.width === 'number',
        hasHeight: typeof field.height === 'number',
        hasName: typeof field.name === 'string',
        validType: ['text', 'checkbox', 'radio', 'dropdown', 'signature'].includes(field.type),
      };

      const isValid = Object.values(validations).every((v) => v === true);

      if (!isValid) {
        console.warn(`Invalid field at index ${index}:`, field);
        console.warn(`Validation results:`, validations);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error validating field at index ${index}:`, error);
      return false;
    }
  });

  if (validatedFields.length === 0) {
    const totalFields = template.fields.length;
    throw new Error(
      `לא נמצאו שדות תקינים בקובץ. ` +
      `נמצאו ${totalFields} שדות בסך הכל, אך כולם נכשלו בבדיקת התקינות. ` +
      `אנא בדוק את מבנה הקובץ ב-console לפרטים נוספים.`
    );
  }

  const skippedCount = template.fields.length - validatedFields.length;
  if (skippedCount > 0) {
    console.warn(
      `Some invalid fields were skipped (${skippedCount} out of ${template.fields.length} fields)`,
    );
    console.warn('Check console logs above for details about invalid fields');
  }

  // Normalize fields - ensure station has default value for backward compatibility
  const normalizedFields = validatedFields.map(field => ({
    ...field,
    station: field.station || 'client',
  }));

  console.log(`✓ Field template loaded: ${template.name} (${normalizedFields.length} fields)`);

  return normalizedFields;
}

/**
 * Validate a field template file without loading it
 * Supports both new template format and legacy plain array format
 *
 * @param file - JSON file to validate
 * @returns Validation result with metadata
 */
export async function validateFieldTemplateFile(
  file: File,
): Promise<{ isValid: boolean; error?: string; metadata?: FieldTemplate['metadata'] }> {
  try {
    if (!file.name.endsWith('.json')) {
      return { isValid: false, error: 'הקובץ חייב להיות מסוג JSON' };
    }

    const text = await file.text();
    const parsed = JSON.parse(text);

    // Handle legacy format: plain array of fields
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return { isValid: false, error: 'התבנית לא כוללת שדות' };
      }
      // Legacy format is valid
      return {
        isValid: true,
        metadata: {
          totalFields: parsed.length,
          fieldTypes: {},
          hasHebrewFields: false,
        },
      };
    }

    // New template format
    const template = parsed as FieldTemplate;
    if (!template.version || !template.fields || !Array.isArray(template.fields)) {
      return { isValid: false, error: 'פורמט תבנית לא תקין' };
    }

    if (template.fields.length === 0) {
      return { isValid: false, error: 'התבנית לא כוללת שדות' };
    }

    return {
      isValid: true,
      metadata: template.metadata,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'שגיאה בקריאת הקובץ',
    };
  }
}
