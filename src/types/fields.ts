/**
 * Field type definitions for PDF form fields
 */

import type { ConditionalRule, FieldVisibility } from '@/services/conditional/conditional-types';

export type FieldType =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'signature'
  | 'static-text'
  // Mobile-specific field types
  | 'qr-scan'       // QR code scanner
  | 'barcode-scan'  // Barcode scanner
  | 'camera'        // Photo capture
  | 'gps-location'  // GPS coordinates
  | 'file-upload';  // File upload

// Re-export conditional types for convenience
export type { ConditionalRule, FieldVisibility };

export type ToolMode =
  | 'select'
  | 'text-field'
  | 'checkbox-field'
  | 'radio-field'
  | 'dropdown-field'
  | 'signature-field'
  | 'static-text-field'
  // Mobile-specific tool modes
  | 'qr-scan-field'
  | 'barcode-scan-field'
  | 'camera-field'
  | 'gps-location-field'
  | 'file-upload-field';

/**
 * Validator configuration for field validation
 */
export interface ValidatorConfig {
  name: string;                        // e.g., "israeli_id_checksum", "length_between"
  params?: Record<string, unknown>;    // e.g., { min: 8, max: 9 }
}

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
  autoFill?: boolean; // Whether the field should be auto-filled
  sectionName?: string; // Section name for grouping fields
  station?: string; // Filling station: 'client' (default), 'agent', or custom value
  index?: number; // Creation order index for HTML form generation

  // Hebrew-specific
  direction: 'ltr' | 'rtl';
  font?: string; // For text fields - Hebrew font embedding
  fontSize?: number;

  // Radio and dropdown specific
  options?: string[]; // For dropdown and radio fields - array of option labels (static)
  dataSourceId?: string; // For dropdown fields - dynamic data source ID (replaces static options)
  radioGroup?: string; // For radio buttons - group name (radio only)
  spacing?: number; // Spacing between radio buttons (radio only) - legacy field
  orientation?: 'vertical' | 'horizontal'; // Radio button layout direction (radio only)
  buttonSpacing?: number; // Precise spacing between button centers (in points, from AI detection)
  buttonSize?: number; // Size of individual buttons (in points, from AI detection)

  // Signature specific
  signatureImage?: string; // Base64 encoded signature image (PNG/JPG)
  signatureTimestamp?: string; // ISO timestamp when signature was captured

  // Static text specific
  content?: string; // Static text content to display (static-text only)
  textAlign?: 'left' | 'center' | 'right'; // Text alignment (static-text only)
  backgroundColor?: string; // Background color (static-text only)
  textColor?: string; // Text color (static-text only)
  fontWeight?: 'normal' | 'bold'; // Font weight (static-text only)
  fontStyle?: 'normal' | 'italic'; // Font style (static-text only)
  borderColor?: string; // Border color (static-text only)
  borderWidth?: number; // Border width in pixels (static-text only)

  // Mobile field specific properties
  scannedData?: string; // Scanned QR code or barcode data (qr-scan, barcode-scan only)
  capturedImage?: string; // Base64 encoded captured image (camera only)
  captureTimestamp?: string; // ISO timestamp when photo was captured (camera only)
  latitude?: number; // GPS latitude (gps-location only)
  longitude?: number; // GPS longitude (gps-location only)
  accuracy?: number; // GPS accuracy in meters (gps-location only)
  locationTimestamp?: string; // ISO timestamp when location was captured (gps-location only)
  uploadedFile?: string; // Base64 encoded file data (file-upload only)
  fileName?: string; // Original file name (file-upload only)
  fileType?: string; // MIME type (file-upload only)
  fileSize?: number; // File size in bytes (file-upload only)
  maxFileSize?: number; // Maximum file size in MB (file-upload only)
  acceptedFileTypes?: string[]; // Accepted MIME types (file-upload only)

  // Validation
  validationType?: string; // Field type ID from validation rules (e.g., "identity.israeli_id")
  validation?: {
    enabled: boolean;              // Whether validation is active for this field
    validators?: ValidatorConfig[]; // Array of validators to apply
  };

  // Conditional logic
  conditionalRules?: ConditionalRule[]; // Rules for showing/hiding/requiring this field
  defaultVisibility?: FieldVisibility;   // Default visibility state ('visible' or 'hidden')
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
export interface GuidanceText {
  id: string;
  content: string;
  pageNumber: number;
  x: number; // PDF coordinates
  y: number;
  width: number;
  height: number;
}

export interface PageMetadata {
  pageNumber: number;
  sections: Array<{ name: string; y: number; height: number }>;
  guidanceTexts: GuidanceText[];
}

/**
 * Form identification metadata extracted from PDF
 */
export interface FormMetadata {
  companyName: string;
  formName: string;
  confidence: 'high' | 'medium' | 'low';
}
