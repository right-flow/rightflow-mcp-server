/**
 * Field type definitions for PDF form fields
 */

export type FieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';

export type ToolMode = 'select' | 'text-field' | 'checkbox-field' | 'radio-field' | 'dropdown-field' | 'signature-field';

export interface FieldDefinition {
  id: string;
  type: FieldType;
  pageNumber: number;

  // Position in PDF coordinates (points)
  x: number;
  y: number;
  width: number;
  height: number;

  // Field properties
  name: string;
  label?: string;
  required: boolean;
  defaultValue?: string;
  sectionName?: string; // Section name for grouping fields
  index?: number; // Creation order index for HTML form generation

  // Hebrew-specific
  direction: 'ltr' | 'rtl';
  font?: string; // For text fields - Hebrew font embedding
  fontSize?: number;

  // Radio and dropdown specific
  options?: string[]; // For dropdown and radio fields - array of option labels
  radioGroup?: string; // For radio buttons - group name (radio only)
  spacing?: number; // Spacing between radio buttons (radio only)
  orientation?: 'vertical' | 'horizontal'; // Radio button layout direction (radio only)

  // Signature specific
  signatureImage?: string; // Base64 encoded signature image (PNG/JPG)
  signatureTimestamp?: string; // ISO timestamp when signature was captured

  // Validation (future enhancement)
  validation?: {
    type: 'text' | 'email' | 'number' | 'date';
    pattern?: string;
    maxLength?: number;
  };
}

export interface TemplateDefinition {
  id: string;
  name: string;
  pdfUrl: string;
  fields: FieldDefinition[];
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    hasHebrewText: boolean;
    totalPages: number;
  };
}

/**
 * Coordinate system types
 */

export interface PDFCoords {
  x: number; // Points from left edge
  y: number; // Points from BOTTOM edge (PDF origin)
}

export interface ViewportCoords {
  x: number; // Pixels from left edge
  y: number; // Pixels from TOP edge (Canvas origin)
}
