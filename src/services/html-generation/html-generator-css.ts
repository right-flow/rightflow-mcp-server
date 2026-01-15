/**
 * DocsFlow Design System CSS Template
 * Main orchestrator that combines CSS and JS from split modules
 * Adapted from FormFlowAI for RightFlow
 * Full RTL/Hebrew support
 */

import type { HtmlFormTheme } from './types';
import { generateBaseCss } from './css/css-base';
import { generateComponentsCss } from './css/css-components';
import { generateNavigationCss } from './css/css-navigation';
import { generateNavigationJs } from './js/js-navigation';
import { generateDatePickerJs } from './js/js-date-picker';
import { generateSignatureJs } from './js/js-signature';
import { generateValidationJs } from './js/js-validation';

// Re-export adjustColor for backward compatibility
export { adjustColor } from './css/css-utils';

/**
 * Generates RTL-aware CSS based on DocsFlow design system
 * Combines base, components, and navigation CSS
 */
export function generateDocsFlowCSS(
  rtl: boolean,
  theme: HtmlFormTheme
): string {
  const baseCss = generateBaseCss(rtl, theme);
  const componentsCss = generateComponentsCss(rtl, theme);
  const navigationCss = generateNavigationCss(rtl, theme);

  return baseCss + componentsCss + navigationCss;
}

/**
 * Generates JavaScript for form handling with multi-page tab navigation
 * Combines navigation, date picker, signature, and validation JS
 * @param formId - Form element ID
 * @param rtl - Right-to-left direction
 * @param totalFormPages - Number of form pages (excluding welcome page)
 * @param includeWelcome - Whether welcome page is included
 * @param userRole - Current user role (client or agent)
 */
export function generateFormJS(
  formId: string,
  rtl: boolean,
  totalFormPages: number = 1,
  includeWelcome: boolean = true,
  userRole: 'client' | 'agent' = 'client'
): string {
  const navigationJs = generateNavigationJs(
    formId,
    rtl,
    totalFormPages,
    includeWelcome,
    userRole
  );
  const datePickerJs = generateDatePickerJs();
  const signatureJs = generateSignatureJs();
  const validationJs = generateValidationJs(formId);

  return navigationJs + datePickerJs + signatureJs + validationJs;
}
