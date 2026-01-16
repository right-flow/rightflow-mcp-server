/**
 * Navigation CSS Styles
 * Combines buttons, responsive, and tabs CSS
 */
import { generateButtonsCss } from './css-buttons';
import { generateTabsCss } from './css-tabs';
/**
 * Generates CSS for navigation, buttons, tabs, and responsive layouts
 * Combines buttons and tabs CSS for backward compatibility
 */
export function generateNavigationCss(rtl, theme) {
    const buttonsCss = generateButtonsCss(rtl, theme);
    const tabsCss = generateTabsCss(rtl, theme);
    return buttonsCss + tabsCss;
}
//# sourceMappingURL=css-navigation.js.map