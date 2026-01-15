/**
 * Navigation CSS Styles
 * Combines buttons, responsive, and tabs CSS
 */

import type { HtmlFormTheme } from '../types';
import { generateButtonsCss } from './css-buttons';
import { generateTabsCss } from './css-tabs';

/**
 * Generates CSS for navigation, buttons, tabs, and responsive layouts
 * Combines buttons and tabs CSS for backward compatibility
 */
export function generateNavigationCss(
  rtl: boolean,
  theme: HtmlFormTheme
): string {
  const buttonsCss = generateButtonsCss(rtl, theme);
  const tabsCss = generateTabsCss(rtl, theme);

  return buttonsCss + tabsCss;
}
