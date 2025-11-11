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
 *
 * @param file - JSON file containing field template
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

  let template: FieldTemplate;
  try {
    template = JSON.parse(text);
  } catch (error) {
    throw new Error('קובץ JSON לא תקין');
  }

  // Validate template format
  if (!template.version || !template.fields || !Array.isArray(template.fields)) {
    throw new Error('פורמט תבנית לא תקין');
  }

  // Version compatibility check (for future versions)
  if (template.version !== '1.0') {
    console.warn(`Template version ${template.version} may not be fully compatible`);
  }

  // Validate field structure
  const validatedFields = template.fields.filter((field) => {
    // Basic required properties
    if (
      !field.id ||
      !field.type ||
      typeof field.pageNumber !== 'number' ||
      typeof field.x !== 'number' ||
      typeof field.y !== 'number' ||
      typeof field.width !== 'number' ||
      typeof field.height !== 'number' ||
      typeof field.name !== 'string'
    ) {
      console.warn(`Invalid field skipped:`, field);
      return false;
    }

    // Type validation
    if (!['text', 'checkbox', 'radio', 'dropdown'].includes(field.type)) {
      console.warn(`Unknown field type ${field.type}, skipping`);
      return false;
    }

    return true;
  });

  if (validatedFields.length === 0) {
    throw new Error('לא נמצאו שדות תקינים בקובץ');
  }

  if (validatedFields.length < template.fields.length) {
    console.warn(
      `Some invalid fields were skipped (${template.fields.length - validatedFields.length} fields)`,
    );
  }

  console.log(`✓ Field template loaded: ${template.name} (${validatedFields.length} fields)`);

  return validatedFields;
}

/**
 * Validate a field template file without loading it
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
    const template: FieldTemplate = JSON.parse(text);

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
