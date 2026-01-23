/**
 * Input Sanitization Utilities
 *
 * Prevents XSS attacks and ensures safe handling of user input,
 * especially for Hebrew text which requires special Unicode handling.
 *
 * Security Considerations (per CLAUDE.md):
 * - Remove dangerous Unicode RTL/LTR control characters
 * - Escape HTML entities to prevent script injection
 * - Validate field names to prevent PDF parsing issues
 */

/**
 * Sanitize user-provided text input (labels, default values, etc.)
 *
 * Removes dangerous Unicode control characters while preserving legitimate Hebrew characters.
 * NOTE: Does NOT escape HTML - React handles that automatically.
 * Double-escaping causes issues like &amp;quot; instead of "
 *
 * @param input - Raw user input
 * @returns Sanitized string safe for rendering
 *
 * @example
 * sanitizeUserInput('שלום\u202Eעולם')
 * // Returns: 'שלוםעולם' (RTL override removed)
 *
 * sanitizeUserInput('שם "מיוחד"')
 * // Returns: 'שם "מיוחד"' (quotes preserved - React will escape when rendering)
 */
export function sanitizeUserInput(input: string | undefined | null): string {
  if (!input) return '';

  // Step 1: Remove dangerous Unicode control characters
  // These can hide malicious code or manipulate text direction in harmful ways
  const dangerousUnicodePattern = /[\u202A-\u202E\u2066-\u2069]/g;
  let cleaned = input.replace(dangerousUnicodePattern, '');

  // Step 2: Limit length to prevent DoS attacks
  const MAX_INPUT_LENGTH = 500;
  if (cleaned.length > MAX_INPUT_LENGTH) {
    cleaned = cleaned.substring(0, MAX_INPUT_LENGTH);
    console.warn(`Input truncated to ${MAX_INPUT_LENGTH} characters`);
  }

  return cleaned;
}

/**
 * Validate and sanitize field names
 *
 * Field names must be PDF-safe (only alphanumeric + underscore)
 * to prevent PDF parsing errors and potential injection attacks.
 *
 * @param name - Field name to validate
 * @returns Sanitized field name or error
 *
 * @example
 * validateFieldName('field_1') // Returns: 'field_1'
 * validateFieldName('שדה_1') // Returns error - Hebrew not allowed
 * validateFieldName('field<script>') // Returns error - special chars not allowed
 */
export function validateFieldName(name: string | undefined | null): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      sanitized: '',
      error: 'שם השדה לא יכול להיות רק',
    };
  }

  const trimmed = name.trim();

  // Field names must be PDF-safe: only English letters, numbers, underscore
  // Length: 1-100 characters
  const fieldNamePattern = /^[a-zA-Z0-9_]{1,100}$/;

  if (!fieldNamePattern.test(trimmed)) {
    return {
      isValid: false,
      sanitized: trimmed,
      error: 'שם שדה חייב להכיל רק אותיות אנגליות, מספרים וקו תחתון (_)',
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
}

/**
 * Check if field names are unique across template
 *
 * @param fields - Array of field definitions
 * @returns Validation result with duplicate names if found
 */
export function validateFieldNameUniqueness(
  fields: Array<{ id: string; name: string }>,
): {
  isValid: boolean;
  duplicates: string[];
} {
  const nameCount = new Map<string, number>();
  const duplicates: string[] = [];

  fields.forEach((field) => {
    const count = (nameCount.get(field.name) || 0) + 1;
    nameCount.set(field.name, count);
  });

  nameCount.forEach((count, name) => {
    if (count > 1) {
      duplicates.push(name);
    }
  });

  return {
    isValid: duplicates.length === 0,
    duplicates,
  };
}

/**
 * Get list of field IDs with validation errors
 *
 * @param fields - Array of field definitions
 * @returns Set of field IDs that have validation errors
 */
export function getFieldsWithErrors(
  fields: Array<{ id: string; name: string; type: string; width: number; height: number; x: number; y: number }>,
): Set<string> {
  const errorFieldIds = new Set<string>();

  // Check for duplicate field names
  const nameToFieldIds = new Map<string, string[]>();
  fields.forEach((field) => {
    if (!nameToFieldIds.has(field.name)) {
      nameToFieldIds.set(field.name, []);
    }
    nameToFieldIds.get(field.name)!.push(field.id);
  });

  // Mark all fields with duplicate names as errors
  nameToFieldIds.forEach((fieldIds) => {
    if (fieldIds.length > 1) {
      fieldIds.forEach((id) => errorFieldIds.add(id));
    }
  });

  // Check each field for validation errors
  fields.forEach((field) => {
    // Validate field name format
    const nameValidation = validateFieldName(field.name);
    if (!nameValidation.isValid) {
      errorFieldIds.add(field.id);
    }

    // Check minimum width for text fields
    if (field.type === 'text' && field.width < 36) {
      errorFieldIds.add(field.id);
    }

    // Check field dimensions
    if (field.x < 0 || field.y < 0 || field.width <= 0 || field.height <= 0) {
      errorFieldIds.add(field.id);
    }
  });

  return errorFieldIds;
}

/**
 * Sanitize file size to prevent integer overflow
 *
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns Whether size is valid
 */
export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize && Number.isFinite(size);
}

/**
 * Validate PDF file by checking magic bytes
 *
 * More secure than just checking MIME type which can be spoofed.
 *
 * @param file - File to validate
 * @returns Promise resolving to validation result
 */
export async function validatePDFFile(file: File): Promise<{
  isValid: boolean;
  error?: string;
}> {
  // Check MIME type first (quick check)
  if (file.type !== 'application/pdf') {
    return {
      isValid: false,
      error: 'סוג הקובץ חייב להיות PDF',
    };
  }

  // Check file size (10MB limit per FR-1.1)
  if (!validateFileSize(file.size, 10 * 1024 * 1024)) {
    return {
      isValid: false,
      error: 'גודל הקובץ חייב להיות עד 10MB',
    };
  }

  // Check PDF magic bytes (%PDF)
  try {
    const arrayBuffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const magicBytes = String.fromCharCode(...bytes);

    if (!magicBytes.startsWith('%PDF')) {
      return {
        isValid: false,
        error: 'קובץ PDF לא תקין (חסרים magic bytes)',
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'שגיאה בבדיקת תקינות הקובץ',
    };
  }
}

/**
 * Sanitize font size input
 *
 * @param size - Font size input
 * @returns Clamped and validated font size
 */
export function sanitizeFontSize(size: number | string | undefined | null): number {
  const MIN_FONT_SIZE = 8;
  const MAX_FONT_SIZE = 24;
  const DEFAULT_FONT_SIZE = 12;

  if (size === undefined || size === null || size === '') {
    return DEFAULT_FONT_SIZE;
  }

  const numSize = typeof size === 'string' ? parseInt(size, 10) : size;

  if (!Number.isFinite(numSize) || Number.isNaN(numSize)) {
    return DEFAULT_FONT_SIZE;
  }

  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, numSize));
}

/**
 * Sanitize coordinates to prevent integer overflow or negative values
 *
 * @param coord - Coordinate value
 * @param max - Maximum allowed value
 * @returns Sanitized coordinate
 */
export function sanitizeCoordinate(coord: number, max: number = 10000): number {
  if (!Number.isFinite(coord) || Number.isNaN(coord)) {
    return 0;
  }

  return Math.max(0, Math.min(max, coord));
}

/**
 * Validate and sanitize hex color input
 *
 * Ensures color values are valid hex codes to prevent XSS and injection attacks.
 * Supports 3-digit (#RGB) and 6-digit (#RRGGBB) hex color formats.
 *
 * @param color - Color input to validate
 * @param fallback - Fallback color if invalid (default: '#000000')
 * @returns Valid hex color or fallback
 *
 * @example
 * sanitizeHexColor('#ff0000') // Returns: '#ff0000'
 * sanitizeHexColor('#f00') // Returns: '#f00'
 * sanitizeHexColor('red') // Returns: '#000000' (fallback)
 * sanitizeHexColor('<script>alert(1)</script>') // Returns: '#000000' (fallback)
 * sanitizeHexColor('#ff00') // Returns: '#000000' (invalid format)
 */
export function sanitizeHexColor(
  color: string | undefined | null,
  fallback: string = '#000000',
): string {
  if (!color) return fallback;

  // Remove any whitespace
  const cleaned = color.trim();

  // Validate hex color format: # followed by either 3 or 6 hex digits
  const hexColorPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  if (!hexColorPattern.test(cleaned)) {
    console.warn(`Invalid hex color format: "${color}". Using fallback: ${fallback}`);
    return fallback;
  }

  // Convert to lowercase for consistency
  return cleaned.toLowerCase();
}

/**
 * Sanitize font weight value to prevent CSS injection
 *
 * Uses whitelist approach - only allows specific CSS font-weight values.
 *
 * @param fontWeight - Font weight input
 * @returns Validated font weight ('normal' or 'bold')
 *
 * @example
 * sanitizeFontWeight('bold') // Returns: 'bold'
 * sanitizeFontWeight('900') // Returns: 'normal' (invalid)
 * sanitizeFontWeight('bold; color: red') // Returns: 'normal' (injection attempt)
 */
export function sanitizeFontWeight(fontWeight: string | undefined | null): 'normal' | 'bold' {
  const allowedValues = ['normal', 'bold'] as const;
  if (!fontWeight || !allowedValues.includes(fontWeight as 'normal' | 'bold')) {
    return 'normal';
  }
  return fontWeight as 'normal' | 'bold';
}

/**
 * Sanitize font style value to prevent CSS injection
 *
 * Uses whitelist approach - only allows specific CSS font-style values.
 *
 * @param fontStyle - Font style input
 * @returns Validated font style ('normal' or 'italic')
 *
 * @example
 * sanitizeFontStyle('italic') // Returns: 'italic'
 * sanitizeFontStyle('oblique') // Returns: 'normal' (not allowed)
 * sanitizeFontStyle('italic; display: none') // Returns: 'normal' (injection attempt)
 */
export function sanitizeFontStyle(fontStyle: string | undefined | null): 'normal' | 'italic' {
  const allowedValues = ['normal', 'italic'] as const;
  if (!fontStyle || !allowedValues.includes(fontStyle as 'normal' | 'italic')) {
    return 'normal';
  }
  return fontStyle as 'normal' | 'italic';
}

/**
 * Sanitize text alignment value to prevent CSS injection
 *
 * Uses whitelist approach - only allows specific CSS text-align values.
 * Supports RTL default alignment.
 *
 * @param textAlign - Text alignment input
 * @param defaultAlign - Default alignment if invalid (default: 'left')
 * @returns Validated text alignment
 *
 * @example
 * sanitizeTextAlign('center') // Returns: 'center'
 * sanitizeTextAlign('justify') // Returns: 'left' (not allowed)
 * sanitizeTextAlign('right', 'right') // Returns: 'right' (with RTL default)
 * sanitizeTextAlign('left; display: none', 'left') // Returns: 'left' (injection attempt blocked)
 */
export function sanitizeTextAlign(
  textAlign: string | undefined | null,
  defaultAlign: 'left' | 'center' | 'right' = 'left',
): 'left' | 'center' | 'right' {
  const allowedValues = ['left', 'center', 'right'] as const;
  if (!textAlign || !allowedValues.includes(textAlign as 'left' | 'center' | 'right')) {
    return defaultAlign;
  }
  return textAlign as 'left' | 'center' | 'right';
}
