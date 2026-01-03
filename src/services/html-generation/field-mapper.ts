/**
 * Field Mapper
 * Converts RightFlow FieldDefinition[] to HTML-friendly format
 */

import type { FieldDefinition } from '@/types/fields';
import type { HtmlFormField, HtmlFieldGroup, HtmlFieldType } from './types';

/**
 * Maps FieldDefinition.type to HtmlFieldType
 */
function mapFieldType(type: FieldDefinition['type']): HtmlFieldType {
  switch (type) {
    case 'dropdown':
      return 'select';
    case 'text':
    case 'checkbox':
    case 'radio':
    case 'signature':
      return type;
    default:
      return 'text';
  }
}

/**
 * Converts a single FieldDefinition to HtmlFormField
 */
function mapFieldToHtml(field: FieldDefinition): HtmlFormField {
  const htmlField: HtmlFormField = {
    id: field.id,
    name: field.name,
    type: mapFieldType(field.type),
    label: field.label,
    required: field.required,
    placeholder: field.label || field.name,
    value: field.defaultValue,
    options: field.options,
    position: {
      page: field.pageNumber,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
    },
    section: field.sectionName,
    tabOrder: field.index,
    direction: field.direction,
  };

  // Add validation properties if enabled
  if (field.validationType && field.validation?.enabled) {
    htmlField.validationType = field.validationType;
    htmlField.validators = field.validation.validators;
  }

  return htmlField;
}

/**
 * Converts FieldDefinition[] to HtmlFormField[]
 * Sorts by index (creation order) for proper tab ordering
 */
export function mapFieldsToHtml(fields: FieldDefinition[]): HtmlFormField[] {
  return fields
    .map(mapFieldToHtml)
    .sort((a, b) => {
      // Sort by tabOrder (index) if available
      if (a.tabOrder !== undefined && b.tabOrder !== undefined) {
        return a.tabOrder - b.tabOrder;
      }
      // Fallback to position-based sorting
      if (a.position && b.position) {
        // Sort by page first
        if (a.position.page !== b.position.page) {
          return a.position.page - b.position.page;
        }
        // Then by Y (top to bottom)
        const yDiff = b.position.y - a.position.y; // Higher Y = lower on page in PDF coords
        if (Math.abs(yDiff) > 10) return yDiff;
        // Then by X (RTL: right to left)
        return b.position.x - a.position.x;
      }
      return 0;
    });
}

/**
 * Creates field groups from sections
 * Groups fields by sectionName and orders them
 */
export function createFieldGroups(fields: FieldDefinition[]): HtmlFieldGroup[] {
  const sectionMap = new Map<string, FieldDefinition[]>();

  // Group fields by section
  for (const field of fields) {
    const section = field.sectionName || 'כללי'; // Default section name in Hebrew
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    sectionMap.get(section)!.push(field);
  }

  // Convert to HtmlFieldGroup array
  const groups: HtmlFieldGroup[] = [];
  let order = 0;

  for (const [sectionName, sectionFields] of sectionMap) {
    groups.push({
      id: `group_${order}`,
      title: sectionName,
      fields: sectionFields.map((f) => f.id),
      order: order++,
    });
  }

  // Sort groups by the position of their first field
  return groups.sort((a, b) => {
    const aFields = fields.filter((f) => a.fields.includes(f.id));
    const bFields = fields.filter((f) => b.fields.includes(f.id));

    if (aFields.length === 0 || bFields.length === 0) return 0;

    const aFirst = aFields[0];
    const bFirst = bFields[0];

    // Sort by page first
    if (aFirst.pageNumber !== bFirst.pageNumber) {
      return aFirst.pageNumber - bFirst.pageNumber;
    }

    // Then by Y position (higher Y in PDF = earlier)
    return bFirst.y - aFirst.y;
  });
}

/**
 * Detects if form should be RTL based on field content
 * Checks labels and names for Hebrew characters
 */
export function detectFormDirection(fields: FieldDefinition[]): 'rtl' | 'ltr' {
  const hebrewRegex = /[\u0590-\u05FF]/;

  for (const field of fields) {
    if (field.label && hebrewRegex.test(field.label)) {
      return 'rtl';
    }
    if (field.name && hebrewRegex.test(field.name)) {
      return 'rtl';
    }
    if (field.options) {
      for (const option of field.options) {
        if (hebrewRegex.test(option)) {
          return 'rtl';
        }
      }
    }
  }

  // Also check direction property
  const rtlCount = fields.filter((f) => f.direction === 'rtl').length;
  const ltrCount = fields.filter((f) => f.direction === 'ltr').length;

  return rtlCount >= ltrCount ? 'rtl' : 'ltr';
}

/**
 * Groups fields into rows based on Y position
 * Fields with similar Y positions are grouped into the same row
 */
export function groupFieldsIntoRows(
  fields: HtmlFormField[],
  threshold: number = 20
): HtmlFormField[][] {
  if (fields.length === 0) return [];

  // Sort by position
  const sorted = [...fields].sort((a, b) => {
    if (!a.position || !b.position) return 0;
    // Sort by page first
    if (a.position.page !== b.position.page) {
      return a.position.page - b.position.page;
    }
    // Then by Y (descending for PDF coords)
    return b.position.y - a.position.y;
  });

  const rows: HtmlFormField[][] = [];
  let currentRow: HtmlFormField[] = [sorted[0]];
  let currentY = sorted[0].position?.y ?? 0;

  for (let i = 1; i < sorted.length; i++) {
    const field = sorted[i];
    const fieldY = field.position?.y ?? 0;

    if (Math.abs(fieldY - currentY) <= threshold) {
      // Same row
      currentRow.push(field);
    } else {
      // New row
      rows.push(currentRow);
      currentRow = [field];
      currentY = fieldY;
    }
  }

  // Add last row
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Sort fields within each row by X position (RTL: right to left)
  for (const row of rows) {
    row.sort((a, b) => {
      if (!a.position || !b.position) return 0;
      return b.position.x - a.position.x; // RTL order
    });
  }

  return rows;
}
