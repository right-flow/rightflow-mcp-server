/**
 * String interpolation utility for translations
 * Replaces {placeholder} patterns with provided values
 */

/**
 * Interpolate placeholders in a string with provided values
 * @param text - The string containing {placeholder} patterns
 * @param params - Object with key-value pairs for replacement
 * @returns Interpolated string
 *
 * @example
 * interpolate('Hello, {name}!', { name: 'John' }) // 'Hello, John!'
 * interpolate('Count: {count}', { count: 5 }) // 'Count: 5'
 */
export function interpolate(
  text: string,
  params?: Record<string, string | number>
): string {
  if (!params) return text;

  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, text);
}

/**
 * Check if a string contains placeholders
 * @param text - The string to check
 * @returns True if the string contains {placeholder} patterns
 */
export function hasPlaceholders(text: string): boolean {
  return /\{[^}]+\}/.test(text);
}

/**
 * Extract placeholder names from a string
 * @param text - The string to extract from
 * @returns Array of placeholder names
 *
 * @example
 * extractPlaceholders('Hello, {name}! You have {count} messages.')
 * // ['name', 'count']
 */
export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((match) => match.slice(1, -1));
}
