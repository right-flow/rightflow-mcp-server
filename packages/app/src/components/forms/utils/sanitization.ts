/**
 * Sanitization utilities for form inputs
 * Prevents XSS attacks and dangerous Unicode characters
 */

import DOMPurify from 'dompurify';

/**
 * Dangerous Unicode control characters that can be used for BiDi attacks
 * As specified in CLAUDE.md security section
 */
const DANGEROUS_UNICODE_CHARS = [
  '\u202A', // LEFT-TO-RIGHT EMBEDDING
  '\u202B', // RIGHT-TO-LEFT EMBEDDING
  '\u202C', // POP DIRECTIONAL FORMATTING
  '\u202D', // LEFT-TO-RIGHT OVERRIDE
  '\u202E', // RIGHT-TO-LEFT OVERRIDE
  '\u2066', // LEFT-TO-RIGHT ISOLATE
  '\u2067', // RIGHT-TO-LEFT ISOLATE
  '\u2068', // FIRST STRONG ISOLATE
  '\u2069', // POP DIRECTIONAL ISOLATE
];

/**
 * Create regex pattern for dangerous Unicode characters
 */
const DANGEROUS_UNICODE_REGEX = new RegExp(
  `[${DANGEROUS_UNICODE_CHARS.join('')}]`,
  'g'
);

/**
 * Sanitize text input to prevent XSS and BiDi attacks
 * Removes dangerous Unicode control characters
 */
export function sanitizeTextInput(input: string): string {
  if (!input) return '';

  // Remove dangerous Unicode control characters
  let sanitized = input.replace(DANGEROUS_UNICODE_REGEX, '');

  // Use DOMPurify to sanitize any HTML entities (for text fields, we strip all HTML)
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });

  return sanitized;
}

/**
 * Sanitize HTML content (for rich text editors if needed)
 * Allows safe HTML but removes dangerous elements and attributes
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';

  // First remove dangerous Unicode characters
  const withoutUnicode = html.replace(DANGEROUS_UNICODE_REGEX, '');

  // Then sanitize HTML with DOMPurify
  return DOMPurify.sanitize(withoutUnicode, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'ul', 'ol', 'li', 'blockquote',
      'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });
}

/**
 * Generate a simple hash from a string (for field name uniqueness)
 * Uses a basic hash algorithm to create a deterministic identifier
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36); // Convert to base36 (0-9, a-z)
}

/**
 * Sanitize field name to only allow safe characters
 * Allows alphanumeric, underscore, and hyphen
 *
 * For non-Latin text (Hebrew, Arabic, etc.), generates unique field name
 * by appending a hash of the original text to prevent name collisions
 */
export function sanitizeFieldName(name: string): string {
  if (!name) return '';

  const originalName = name; // Preserve original for hash generation

  // Replace spaces with underscores
  let sanitized = name.replace(/\s+/g, '_');

  // Remove any character that's not alphanumeric, underscore, or hyphen
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');

  // Ensure it doesn't start with a number
  if (sanitized && /^[0-9]/.test(sanitized)) {
    sanitized = 'field_' + sanitized;
  }

  // BUG FIX: If sanitization removed all characters (e.g., Hebrew-only text),
  // generate unique field name using hash of original text
  // This prevents name collisions when multiple Hebrew fields exist
  // Date: 2026-01-31
  // Issue: Hebrew fields "שם", "כתובת" both became 'field', causing collisions
  // Fix: Use hash-based unique identifier
  // Prevention: Added comprehensive Hebrew field name tests
  if (!sanitized || sanitized === '') {
    const hash = simpleHash(originalName);
    return `field_${hash}`;
  }

  return sanitized;
}

/**
 * Check if text contains RTL characters (Hebrew, Arabic, etc.)
 */
export function containsRTL(text: string): boolean {
  // Hebrew: \u0590-\u05FF
  // Arabic: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return rtlRegex.test(text);
}

/**
 * Get text direction based on content
 */
export function getTextDirection(text: string): 'ltr' | 'rtl' | 'auto' {
  if (!text) return 'auto';
  return containsRTL(text) ? 'rtl' : 'ltr';
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  // Remove dangerous Unicode characters
  let sanitized = email.replace(DANGEROUS_UNICODE_REGEX, '');

  // Remove any HTML tags
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  // Trim whitespace
  return sanitized.trim().toLowerCase();
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  // Remove dangerous Unicode characters
  let sanitized = phone.replace(DANGEROUS_UNICODE_REGEX, '');

  // Remove any HTML tags
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  // Keep only numbers, spaces, hyphens, parentheses, and plus sign
  return sanitized.replace(/[^0-9\s\-\(\)\+]/g, '');
}

/**
 * Sanitize file name to prevent directory traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';

  // Remove path separators and null bytes
  let sanitized = fileName.replace(/[\/\\:\*\?"<>\|]/g, '_');
  sanitized = sanitized.replace(/\0/g, '');

  // Remove dangerous Unicode characters
  sanitized = sanitized.replace(DANGEROUS_UNICODE_REGEX, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 250 - (ext?.length || 0));
    sanitized = ext ? `${name}.${ext}` : name;
  }

  return sanitized || 'file';
}