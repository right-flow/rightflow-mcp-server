/**
 * HTML Form Generation Types
 * Types for converting PDF field definitions to HTML forms
 */

import type { FieldDefinition } from '@/types/fields';

/**
 * HTML form field type - mapped from FieldDefinition.type
 * 'dropdown' becomes 'select' for HTML compatibility
 */
export type HtmlFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'signature';

/**
 * HTML form field - converted from FieldDefinition
 */
export interface HtmlFormField {
  id: string;
  name: string;
  type: HtmlFieldType;
  label?: string;
  required: boolean;
  placeholder?: string;
  value?: string;
  options?: string[]; // For select/radio
  position?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  section?: string; // Maps from sectionName
  tabOrder?: number; // Maps from index
  direction: 'ltr' | 'rtl';
}

/**
 * Field group for organizing fields by section
 */
export interface HtmlFieldGroup {
  id: string;
  title: string; // Section name (Hebrew)
  description?: string;
  fields: string[]; // Field IDs in this group
  order: number;
}

/**
 * Form theme configuration
 */
export interface HtmlFormTheme {
  primaryColor: string; // e.g., '#003399'
  fontFamily: string; // e.g., 'Segoe UI, Tahoma, sans-serif'
  spacing: 'compact' | 'normal' | 'spacious';
  style: 'modern' | 'classic' | 'minimal';
}

/**
 * Welcome page configuration (Phoenix-style intro page)
 */
export interface WelcomePageConfig {
  enabled: boolean;
  welcomeTitle?: string;
  welcomeText?: string;
  companyName?: string;
  infoBoxText?: string;
  documentsListTitle?: string;
  requiredDocuments?: string[];
}

/**
 * HTML generation options
 */
export interface HtmlGenerationOptions {
  formTitle?: string;
  formDescription?: string;
  language: 'hebrew' | 'english' | 'mixed';
  rtl: boolean;
  theme: HtmlFormTheme;
  includeValidation: boolean;
  generationMethod: 'ai' | 'template' | 'auto'; // 'auto' tries AI first, falls back to template
  welcomePage?: Partial<WelcomePageConfig>; // Phoenix-style welcome/intro page
}

/**
 * Default generation options
 */
export const DEFAULT_HTML_GENERATION_OPTIONS: HtmlGenerationOptions = {
  language: 'hebrew',
  rtl: true,
  theme: {
    primaryColor: '#003399',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    spacing: 'normal',
    style: 'modern',
  },
  includeValidation: true,
  generationMethod: 'auto',
  welcomePage: { enabled: true }, // Welcome page enabled by default
};

/**
 * Result of HTML generation
 */
export interface GeneratedHtmlResult {
  formId: string;
  htmlContent: string; // Complete standalone HTML document
  cssContent: string; // Extracted CSS (for reference)
  jsContent: string; // Extracted JS (for reference)
  metadata: {
    fieldCount: number;
    sectionCount: number;
    rtl: boolean;
    generatedAt: Date;
    method: 'gemini' | 'template'; // Which method was used
  };
}

/**
 * API request payload for HTML generation
 */
export interface HtmlGenerationRequest {
  fields: FieldDefinition[];
  options: Partial<HtmlGenerationOptions>;
}

/**
 * API response from HTML generation endpoint
 */
export interface HtmlGenerationResponse {
  success: boolean;
  data?: GeneratedHtmlResult;
  error?: string;
}
