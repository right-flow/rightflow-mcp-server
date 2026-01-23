/**
 * Tabs and Welcome Page CSS Styles
 * Welcome page (Phoenix Design) and multi-page tab navigation
 */

import type { HtmlFormTheme } from '../types';
import { adjustColor, getStyleVariations } from './css-utils';

/**
 * Generates CSS for welcome page and multi-page tab navigation
 */
export function generateTabsCss(
  rtl: boolean,
  theme: HtmlFormTheme,
): string {
  const { primaryColor } = theme;
  const sv = getStyleVariations(theme.style, primaryColor);

  return `
/* ========================================
   Welcome Page Styles (Phoenix Design)
   ======================================== */

.welcome-page {
  padding: 30px 20px;
}

.welcome-section-title {
  border-${rtl ? 'right' : 'left'}: 5px solid var(--accent-color);
  padding-${rtl ? 'right' : 'left'}: 15px;
  margin: 25px 0 15px;
  color: var(--primary-color);
  font-size: 20px;
  font-weight: bold;
}

.welcome-text {
  font-size: 15px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 15px;
}

.welcome-info-box {
  background: #f0f7ff;
  border-${rtl ? 'right' : 'left'}: 4px solid var(--accent-color);
  padding: 15px 20px;
  margin: 20px 0;
  font-size: 14px;
  border-radius: ${sv.borderRadius};
}

.welcome-info-box strong {
  color: var(--accent-color);
}

.welcome-documents-list {
  margin: 15px 0;
  padding-${rtl ? 'right' : 'left'}: 25px;
}

.welcome-documents-list li {
  margin-bottom: 10px;
  font-size: 14px;
  color: #333;
}

.welcome-documents-list li::marker {
  color: var(--accent-color);
}

.welcome-company-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 10px 0;
}

/* ========================================
   Multi-Page Tab Navigation
   ======================================== */

/* Page tabs container */
.page-tabs {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
  padding: 20px 0;
  border-bottom: 1px solid #eee;
}

/* Tab indicator (circle with page number) */
.page-tab {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #ddd;
  background: #fff;
  color: #999;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.page-tab:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  transform: scale(1.1);
}

.page-tab.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
  box-shadow: 0 4px 12px ${primaryColor}40;
}

.page-tab.completed {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.page-tab.completed::after {
  content: '✓';
  position: absolute;
  top: -5px;
  ${rtl ? 'left' : 'right'}: -5px;
  width: 18px;
  height: 18px;
  background: #4caf50;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

/* Connector line between tabs */
.tab-connector {
  width: 30px;
  height: 2px;
  background: #ddd;
  transition: background 0.3s ease;
}

.tab-connector.completed {
  background: #4caf50;
}

/* Form pages container */
.form-pages {
  position: relative;
  min-height: 300px;
}

/* Individual page */
.form-page {
  display: none;
  animation: fadeIn 0.3s ease;
}

.form-page.active {
  display: block;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Page title */
.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--accent-color);
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title .page-number {
  width: 28px;
  height: 28px;
  background: var(--accent-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

/* Navigation buttons */
.page-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  gap: 15px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: 2px solid var(--accent-color);
  background: white;
  color: var(--accent-color);
  font-size: 14px;
  font-weight: 600;
  border-radius: ${sv.borderRadius};
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-family);
}

.nav-btn:hover:not(:disabled) {
  background: var(--accent-color);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px ${primaryColor}30;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-btn.primary {
  background: var(--accent-color);
  color: white;
}

.nav-btn.primary:hover:not(:disabled) {
  background: ${adjustColor(primaryColor, -15)};
}

/* Arrow icons for navigation */
.nav-btn .arrow {
  font-size: 18px;
  line-height: 1;
}

/* Page progress indicator */
.page-progress {
  text-align: center;
  color: #666;
  font-size: 14px;
}

.page-progress strong {
  color: var(--accent-color);
}

/* Responsive adjustments for tabs */
@media (max-width: 768px) {
  .page-tabs {
    gap: 8px;
    flex-wrap: wrap;
  }

  .page-tab {
    width: 36px;
    height: 36px;
    font-size: 13px;
  }

  .tab-connector {
    width: 20px;
  }

  .page-navigation {
    flex-direction: column;
    gap: 10px;
  }

  .nav-btn {
    width: 100%;
    justify-content: center;
  }

  .page-progress {
    order: -1;
    margin-bottom: 10px;
  }
}

@media (max-width: 480px) {
  .page-tab {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .tab-connector {
    width: 15px;
  }
}
`;
}
