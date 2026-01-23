/**
 * Hebrew text utilities for RTL support and text direction detection
 */

/**
 * Detects if text contains Hebrew characters
 */
export const containsHebrew = (text: string): boolean => {
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
};

/**
 * Detects the primary direction of text (RTL for Hebrew, LTR otherwise)
 */
export const detectTextDirection = (text: string): 'ltr' | 'rtl' => {
  return containsHebrew(text) ? 'rtl' : 'ltr';
};

/**
 * Sanitizes Hebrew input by removing dangerous Unicode control characters
 * while preserving safe RTL/LTR marks if needed
 */
export const sanitizeHebrewInput = (text: string): string => {
  // Remove dangerous directional embeddings/overrides and isolates
  // but keep the text itself
  return text
    .replace(/[\u202A-\u202E]/g, '') // Remove directional embeddings/overrides
    .replace(/[\u2066-\u2069]/g, ''); // Remove isolates
};

/**
 * Generates a safe field name from Hebrew text
 * Replaces Hebrew characters with transliteration or removes them
 */
export const generateSafeFieldName = (hebrewText: string): string => {
  // Remove Hebrew and special characters, keep only ASCII alphanumeric and underscores
  const safeName = hebrewText
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim underscores from start/end

  // If empty after sanitization, generate a default name
  return safeName || `field_${Date.now()}`;
};

/**
 * Validates if a string is a valid field name (ASCII alphanumeric + underscore)
 */
export const isValidFieldName = (name: string): boolean => {
  return /^[a-zA-Z0-9_]+$/.test(name);
};
