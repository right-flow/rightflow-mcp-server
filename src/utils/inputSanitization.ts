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
export function sanitizeFontSize(size: number | string | undefined): number {
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
