/**
 * Field Metadata Management
 *
 * Utilities for exporting/importing field metadata as JSON backup
 * This serves as a fallback if AcroForm custom properties fail to persist
 */

import { FieldDefinition } from '@/types/fields';

/**
 * Simplified field metadata for JSON export
 * Contains only essential properties needed to reconstruct fields
 */
export interface FieldMetadata {
  name: string;
  type: string;
  pageNumber: number;
  label?: string;
  sectionName?: string;
  index?: number;
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultValue?: string;
  options?: string[]; // For dropdown/radio
  radioGroup?: string; // For radio buttons
}

/**
 * Export field definitions to JSON string
 *
 * @param fields - Array of field definitions
 * @returns JSON string with field metadata
 */
export function exportFieldsToJSON(fields: FieldDefinition[]): string {
  const metadata: FieldMetadata[] = fields.map(field => ({
    name: field.name,
    type: field.type,
    pageNumber: field.pageNumber,
    label: field.label,
    sectionName: field.sectionName,
    index: field.index,
    required: field.required,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    defaultValue: field.defaultValue,
    options: field.options,
    radioGroup: field.radioGroup,
  }));

  return JSON.stringify(metadata, null, 2);
}

/**
 * Import field definitions from JSON string
 *
 * @param jsonString - JSON string with field metadata
 * @returns Array of field metadata
 * @throws Error if JSON is invalid
 */
export function importFieldsFromJSON(jsonString: string): FieldMetadata[] {
  try {
    const metadata = JSON.parse(jsonString);

    if (!Array.isArray(metadata)) {
      throw new Error('Invalid JSON: expected array of field definitions');
    }

    // Validate each field has required properties
    metadata.forEach((field, index) => {
      if (!field.name || !field.type || field.pageNumber === undefined) {
        throw new Error(`Invalid field at index ${index}: missing required properties`);
      }
    });

    return metadata;
  } catch (error) {
    throw new Error(`Failed to import fields from JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download field metadata as JSON file
 *
 * @param fields - Array of field definitions
 * @param filename - Name for the downloaded file (default: fields-metadata.json)
 */
export function downloadFieldMetadataJSON(fields: FieldDefinition[], filename = 'fields-metadata.json'): void {
  const jsonString = exportFieldsToJSON(fields);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Read field metadata from uploaded JSON file
 *
 * @param file - File object from file input
 * @returns Promise resolving to array of field metadata
 */
export async function readFieldMetadataJSON(file: File): Promise<FieldMetadata[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const metadata = importFieldsFromJSON(jsonString);
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
