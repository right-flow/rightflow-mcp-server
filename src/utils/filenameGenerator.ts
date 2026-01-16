/**
 * Filename Generation Utilities
 *
 * Generates custom filenames based on user-defined templates from settings.
 */

import { NamingSettings } from '@/types/settings';

/**
 * Sanitize text for use in filenames
 * Removes or replaces characters that are invalid in filenames
 *
 * @param text - Text to sanitize
 * @returns Sanitized text safe for filenames
 */
function sanitizeForFilename(text: string): string {
  if (!text) return '';

  // Replace invalid filename characters with underscore
  // Invalid characters: \ / : * ? " < > |
  return text
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .trim();
}

/**
 * Maximum filename length (leaving room for .pdf/.zip extension)
 */
const MAX_FILENAME_LENGTH = 200;

/**
 * Generate filename from naming settings template
 *
 * Builds a filename by evaluating the template segments and replacing
 * parameters with their actual values from the naming settings.
 *
 * @param namingSettings - Naming configuration from settings store
 * @param fallbackFilename - Fallback name if template is empty or invalid
 * @returns Generated filename (without extension)
 *
 * @example
 * // Template: [insuranceCompany]_[insuranceBranch]_[formName]
 * // With values: "כלל ביטוח", "ביטוח חיים", "טופס תביעה"
 * // Returns: "כלל_ביטוח_ביטוח_חיים_טופס_תביעה"
 */
export function generateFilename(
  namingSettings: NamingSettings,
  fallbackFilename: string = 'document',
): string {
  // If no template defined, use fallback
  if (!namingSettings.filenameTemplate || namingSettings.filenameTemplate.length === 0) {
    return sanitizeForFilename(fallbackFilename);
  }

  // Build filename from template segments
  const filenameParts = namingSettings.filenameTemplate.map((segment) => {
    if (segment.type === 'parameter') {
      // Map parameter name to actual value
      const parameterMap: Record<string, string> = {
        insuranceCompany: namingSettings.insuranceCompany || '',
        insuranceBranch: namingSettings.insuranceBranch || '',
        formName: namingSettings.formName || '',
      };

      const value = parameterMap[segment.value];

      // Warn if parameter is unknown
      if (value === undefined) {
        console.warn(`Unknown parameter in filename template: "${segment.value}"`);
        return '';
      }

      return sanitizeForFilename(value);
    } else {
      // Separator - sanitize and use default if empty
      const sanitized = sanitizeForFilename(segment.value);
      return sanitized || '_'; // Default to underscore if empty after sanitization
    }
  });

  // Join parts and remove consecutive underscores
  let filename = filenameParts
    .filter((part) => part.length > 0) // Remove empty parts
    .join('')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

  // If result is empty, use fallback
  if (!filename || filename.trim() === '') {
    return sanitizeForFilename(fallbackFilename);
  }

  // Check maximum length and truncate if necessary
  if (filename.length > MAX_FILENAME_LENGTH) {
    console.warn(
      `Filename too long (${filename.length} chars), truncating to ${MAX_FILENAME_LENGTH}`,
    );
    filename = filename.substring(0, MAX_FILENAME_LENGTH);
  }

  return filename;
}

/**
 * Preview filename that will be generated (used in settings UI)
 *
 * Similar to generateFilename but includes placeholder text for empty values
 * to help users visualize the template. Uses the same sanitization logic
 * as generateFilename to show accurate preview.
 *
 * @param namingSettings - Naming configuration
 * @returns Preview string with placeholders for empty values
 */
export function previewFilename(namingSettings: NamingSettings): string {
  if (!namingSettings.filenameTemplate || namingSettings.filenameTemplate.length === 0) {
    return '[ריק - לחץ "הוסף פרמטר" להתחיל]';
  }

  const parts = namingSettings.filenameTemplate.map((segment) => {
    if (segment.type === 'parameter') {
      const parameterMap: Record<string, string> = {
        insuranceCompany: namingSettings.insuranceCompany || '[חברה]',
        insuranceBranch: namingSettings.insuranceBranch || '[ענף]',
        formName: namingSettings.formName || '[טופס]',
      };

      const value = parameterMap[segment.value] || '[לא ידוע]';
      // Apply same sanitization as generateFilename for accurate preview
      return sanitizeForFilename(value);
    } else {
      // Apply same sanitization and default to underscore if empty
      const sanitized = sanitizeForFilename(segment.value);
      return sanitized || '_';
    }
  });

  const preview = parts.join('');

  // Show length warning if approaching limit
  if (preview.length > MAX_FILENAME_LENGTH) {
    return preview.substring(0, MAX_FILENAME_LENGTH) + '... [חרג מהאורך המקסימלי]';
  }

  return preview;
}
