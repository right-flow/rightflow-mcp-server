import type { Language } from '@/store/appStore';

/**
 * Detects the primary language of a text string based on Unicode character ranges.
 *
 * @param text - Input text to analyze
 * @param threshold - Minimum percentage (0-1) for language confidence (default: 0.5)
 * @returns Detected language ('he', 'en', 'ar') or null if ambiguous
 *
 * @example
 * detectLanguage("שלום עולם") // => 'he'
 * detectLanguage("Hello world") // => 'en'
 * detectLanguage("مرحبا") // => 'ar'
 * detectLanguage("Hello שלום") // => null (mixed)
 */
export function detectLanguage(
  text: string,
  threshold: number = 0.5
): Language | null {
  // Validate input
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Split into characters
  const chars = text.split('');

  // Filter to alphabetic characters only (exclude numbers, punctuation, emoji, whitespace)
  const alphabeticChars = chars.filter((c) => /\p{L}/u.test(c));

  if (alphabeticChars.length === 0) {
    return null; // Only numbers/punctuation
  }

  // Count characters by language
  const hebrew = alphabeticChars.filter((c) =>
    /[\u0590-\u05FF]/u.test(c) // Hebrew block (includes nikud U+0591-U+05BD)
  );

  const arabic = alphabeticChars.filter((c) =>
    /[\u0600-\u06FF]/u.test(c) // Arabic block (includes diacritics U+064B-U+0652)
  );

  const latin = alphabeticChars.filter((c) =>
    /[A-Za-z]/u.test(c) // Latin alphabet
  );

  // Calculate percentages
  const hebrewPct = hebrew.length / alphabeticChars.length;
  const arabicPct = arabic.length / alphabeticChars.length;
  const latinPct = latin.length / alphabeticChars.length;

  // Return language if it exceeds threshold
  if (hebrewPct >= threshold) return 'he';
  if (arabicPct >= threshold) return 'ar';
  if (latinPct >= threshold) return 'en';

  // Mixed or ambiguous
  return null;
}

/**
 * Creates a debounced language detector that delays detection until user stops typing.
 * Useful for input fields to avoid triggering detection on every keystroke.
 *
 * @param callback - Function to call with detected language
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Debounced detector function
 *
 * @example
 * const detector = createDebouncedDetector((lang) => {
 *   console.log('Detected:', lang);
 * }, 500);
 *
 * // User types "שלום" over 200ms
 * detector("ש");   // Queued
 * detector("של");  // Queued (previous cancelled)
 * detector("שלו"); // Queued (previous cancelled)
 * detector("שלום"); // Queued (previous cancelled)
 * // After 500ms of inactivity: callback fires with 'he'
 */
export function createDebouncedDetector(
  callback: (language: Language) => void,
  delay: number = 500
): (text: string) => void {
  let timeoutId: NodeJS.Timeout | undefined;

  return (text: string) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      const detected = detectLanguage(text);
      if (detected) {
        callback(detected);
      }
    }, delay);
  };
}
