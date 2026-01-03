/**
 * DocsFlow Design System CSS Template
 * Adapted from FormFlowAI for RightFlow
 * Full RTL/Hebrew support
 */

import type { HtmlFormTheme } from './types';

/**
 * Generates RTL-aware CSS based on DocsFlow design system
 */
export function generateDocsFlowCSS(
  rtl: boolean,
  theme: HtmlFormTheme
): string {
  const { primaryColor, fontFamily, spacing, style } = theme;

  // Spacing values based on theme
  const spacingValues = {
    compact: { padding: '15px', gap: '10px', margin: '15px' },
    normal: { padding: '20px', gap: '15px', margin: '25px' },
    spacious: { padding: '30px', gap: '20px', margin: '35px' },
  };

  const sp = spacingValues[spacing];

  // Style-specific variations
  const styleVariations = {
    modern: {
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      inputBg: '#fafafa',
      legendStyle: `background: linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)});`,
    },
    classic: {
      borderRadius: '0',
      boxShadow: '0 0 15px rgba(0,0,0,0.1)',
      inputBg: '#fcfcfc',
      legendStyle: `background: ${primaryColor};`,
    },
    minimal: {
      borderRadius: '4px',
      boxShadow: 'none',
      inputBg: '#fff',
      legendStyle: `background: transparent; color: ${primaryColor}; border-bottom: 2px solid ${primaryColor};`,
    },
  };

  const sv = styleVariations[style];

  return `
:root {
  --primary-color: #333;
  --accent-color: ${primaryColor};
  --border-color: #999;
  --bg-color: #fff;
  --input-bg: ${sv.inputBg};
  --font-family: ${fontFamily};
}

* {
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  background-color: #f4f4f4;
  margin: 0;
  padding: 20px;
  direction: ${rtl ? 'rtl' : 'ltr'};
  line-height: 1.6;
}

.container {
  max-width: 900px;
  background: #fff;
  margin: 0 auto;
  padding: 40px;
  box-shadow: ${sv.boxShadow};
  border-radius: ${sv.borderRadius};
  border-top: 6px solid var(--accent-color);
}

/* Header */
header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: ${sp.padding};
  border-bottom: 1px solid #eee;
}

header h1 {
  font-size: 24px;
  margin: 0 0 10px 0;
  color: var(--primary-color);
}

header h2 {
  font-size: 18px;
  margin: 0 0 5px 0;
  font-weight: normal;
  color: #555;
}

header p {
  font-size: 14px;
  margin: 0;
  color: #777;
}

/* Fieldset / Sections */
fieldset {
  border: 1px solid var(--border-color);
  border-radius: ${sv.borderRadius};
  padding: ${sp.padding};
  margin-bottom: ${sp.margin};
  background-color: #fff;
}

legend {
  ${sv.legendStyle}
  color: white;
  padding: 6px 16px;
  font-weight: bold;
  font-size: 14px;
  border-radius: ${style === 'modern' ? '4px' : '0'};
}

.legend-note {
  font-size: 12px;
  color: #555;
  font-weight: normal;
  margin-${rtl ? 'right' : 'left'}: 10px;
}

/* Form rows - Flexbox */
.form-row {
  display: flex;
  width: 100%;
  gap: ${sp.gap};
  margin-bottom: ${sp.gap};
  align-items: flex-end;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  flex-direction: column;
  flex-basis: 0;
  min-width: 120px;
}

/* Labels */
label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--primary-color);
  line-height: 1.3;
}

label .required {
  color: #e53935;
  margin-${rtl ? 'right' : 'left'}: 2px;
}

/* Text inputs */
input[type="text"],
input[type="email"],
input[type="tel"],
input[type="date"],
input[type="number"],
input[type="url"],
input[type="password"] {
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: ${style === 'minimal' ? '0' : '4px'};
  padding: 0 10px;
  font-size: 14px;
  font-family: var(--font-family);
  width: 100%;
  background-color: var(--input-bg);
  transition: border-color 0.2s, box-shadow 0.2s;
}

input[type="text"]:focus,
input[type="email"]:focus,
input[type="tel"]:focus,
input[type="date"]:focus,
input[type="number"]:focus,
input[type="url"]:focus,
input[type="password"]:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px ${primaryColor}20;
  background-color: #fff;
}

/* Textarea */
textarea {
  border: 1px solid var(--border-color);
  border-radius: ${style === 'minimal' ? '0' : '4px'};
  padding: 10px;
  font-size: 14px;
  font-family: var(--font-family);
  width: 100%;
  min-height: 100px;
  resize: vertical;
  background-color: var(--input-bg);
}

textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px ${primaryColor}20;
}

/* Select / Dropdown */
select {
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: ${style === 'minimal' ? '0' : '4px'};
  padding: 0 10px;
  font-size: 14px;
  font-family: var(--font-family);
  width: 100%;
  background-color: var(--input-bg);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: ${rtl ? '10px' : 'calc(100% - 10px)'} center;
  padding-${rtl ? 'left' : 'right'}: 30px;
}

select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px ${primaryColor}20;
}

/* Checkbox & Radio wrapper */
.checkbox-wrapper,
.radio-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f9f9f9;
  padding: 12px;
  border: 1px dashed #ccc;
  border-radius: ${sv.borderRadius};
  flex-wrap: wrap;
}

.checkbox-label-main,
.radio-label-main {
  font-weight: bold;
  font-size: 13px;
  width: 100%;
  margin-bottom: 8px;
}

.checkbox-item,
.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-${rtl ? 'left' : 'right'}: 15px;
}

.checkbox-item input[type="checkbox"],
.radio-item input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--accent-color);
}

.checkbox-item label,
.radio-item label {
  font-weight: normal;
  font-size: 14px;
  margin: 0;
  cursor: pointer;
}

/* Radio group */
.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.radio-group.vertical {
  flex-direction: column;
}

/* Signature field - Canvas-based signature pad */
.signature-pad-container {
  border: 2px solid var(--border-color);
  border-radius: ${sv.borderRadius};
  background: #fff;
  overflow: hidden;
}

.signature-canvas {
  width: 100%;
  height: 120px;
  display: block;
  cursor: crosshair;
  touch-action: none;
  background: linear-gradient(to bottom, transparent 95%, #e0e0e0 95%);
  background-size: 100% 80px;
  background-position: bottom;
}

.signature-canvas.signing {
  cursor: crosshair;
}

.signature-canvas.has-signature {
  background: #fff;
}

.signature-controls {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  background: #f5f5f5;
  border-top: 1px solid var(--border-color);
  gap: 8px;
}

.signature-clear-btn {
  padding: 6px 16px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #fff;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-family);
}

.signature-clear-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}

.signature-pad-container.invalid .signature-canvas {
  border-color: #e53935;
}

/* Legacy signature box (fallback) */
.signature-box {
  border: 2px dashed var(--border-color);
  border-radius: ${sv.borderRadius};
  padding: 20px;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  color: #999;
  font-size: 14px;
}

/* Submit button */
.submit-wrapper {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

button[type="submit"],
.btn-submit {
  background: ${style === 'modern' ? `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)})` : primaryColor};
  color: white;
  padding: 14px 50px;
  border: none;
  border-radius: ${style === 'minimal' ? '0' : '6px'};
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-family: var(--font-family);
}

button[type="submit"]:hover,
.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px ${primaryColor}40;
}

button[type="submit"]:active,
.btn-submit:active {
  transform: translateY(0);
}

/* Validation */
.field-validation {
  font-size: 12px;
  color: #e53935;
  margin-top: 4px;
  min-height: 16px;
}

input:invalid:not(:placeholder-shown),
select:invalid:not(:placeholder-shown),
textarea:invalid:not(:placeholder-shown) {
  border-color: #e53935;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 20px;
    margin: 10px;
  }

  .form-row {
    flex-direction: column;
    gap: 10px;
  }

  .form-group {
    flex-basis: 100% !important;
    flex-grow: 1 !important;
  }

  button[type="submit"] {
    width: 100%;
  }
}

@media (max-width: 480px) {
  body {
    padding: 10px;
  }

  .container {
    padding: 15px;
    margin: 0;
    border-radius: 0;
  }

  header h1 {
    font-size: 20px;
  }

  fieldset {
    padding: 15px;
  }
}

/* Print styles */
@media print {
  body {
    background: white;
    padding: 0;
  }

  .container {
    box-shadow: none;
    max-width: 100%;
  }

  button[type="submit"],
  .page-navigation,
  .page-tabs {
    display: none;
  }

  .form-page {
    display: block !important;
    page-break-after: always;
  }
}

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

/**
 * Adjusts a hex color by a percentage
 * Positive = lighter, Negative = darker
 */
function adjustColor(hex: string, percent: number): string {
  // Remove # if present
  const color = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Adjust
  const adjust = (value: number) => {
    const adjusted = Math.round(value + (value * percent) / 100);
    return Math.min(255, Math.max(0, adjusted));
  };

  // Convert back to hex
  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

/**
 * Generates JavaScript for form handling with multi-page tab navigation
 * @param formId - Form element ID
 * @param rtl - Right-to-left direction
 * @param totalFormPages - Number of form pages (excluding welcome page)
 * @param includeWelcome - Whether welcome page is included
 */
export function generateFormJS(
  formId: string,
  rtl: boolean,
  totalFormPages: number = 1,
  includeWelcome: boolean = true
): string {
  const totalTabs = includeWelcome ? totalFormPages + 1 : totalFormPages;

  return `
(function() {
  'use strict';

  const form = document.getElementById('${formId}');
  if (!form) return;

  // Multi-page navigation state
  const includeWelcome = ${includeWelcome};
  const totalFormPages = ${totalFormPages};
  const totalTabs = ${totalTabs};
  let currentTabIndex = 1; // 1-based index for tabs
  const completedTabs = new Set();

  // Page ID mapping: tab index -> page ID
  function getPageId(tabIndex) {
    if (includeWelcome && tabIndex === 1) {
      return 'welcome';
    }
    return includeWelcome ? tabIndex - 1 : tabIndex;
  }

  // Get navigation elements
  const pages = form.querySelectorAll('.form-page');
  const tabs = document.querySelectorAll('.page-tab');
  const connectors = document.querySelectorAll('.tab-connector');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const progressText = document.getElementById('page-progress-text');

  // Initialize page display
  function showTab(tabIndex) {
    if (tabIndex < 1 || tabIndex > totalTabs) return;

    const pageId = getPageId(tabIndex);

    // Hide all pages
    pages.forEach(function(page) {
      page.classList.remove('active');
    });

    // Show current page
    const activePage = document.getElementById('page-' + pageId);
    if (activePage) {
      activePage.classList.add('active');
    }

    // Update tabs
    tabs.forEach(function(tab, index) {
      tab.classList.remove('active');
      if (index + 1 === tabIndex) {
        tab.classList.add('active');
      }
    });

    // Update navigation buttons
    if (prevBtn) {
      prevBtn.disabled = tabIndex === 1;
    }
    if (nextBtn) {
      nextBtn.style.display = tabIndex === totalTabs ? 'none' : 'flex';
    }
    if (submitBtn) {
      submitBtn.style.display = tabIndex === totalTabs ? 'flex' : 'none';
    }

    // Update progress text
    if (progressText) {
      progressText.innerHTML = '${rtl ? 'עמוד' : 'Page'} <strong>' + tabIndex + '</strong> ${rtl ? 'מתוך' : 'of'} <strong>' + totalTabs + '</strong>';
    }

    currentTabIndex = tabIndex;
  }

  // Mark tab as completed
  function markTabCompleted(tabIndex) {
    completedTabs.add(tabIndex);
    const tab = tabs[tabIndex - 1];
    if (tab && tabIndex !== currentTabIndex) {
      tab.classList.add('completed');
    }
    // Update connector
    if (tabIndex < totalTabs && connectors[tabIndex - 1]) {
      connectors[tabIndex - 1].classList.add('completed');
    }
  }

  // Check if current page is welcome page (no validation needed)
  function isWelcomePage() {
    return includeWelcome && currentTabIndex === 1;
  }

  // Validate current page fields
  function validateCurrentPage() {
    // Welcome page has no required fields
    if (isWelcomePage()) return true;

    const pageId = getPageId(currentTabIndex);
    const activePage = document.getElementById('page-' + pageId);
    if (!activePage) return true;

    const requiredFields = activePage.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(function(field) {
      const validation = document.getElementById(field.id + '_validation');
      const value = field.type === 'checkbox' ? field.checked : field.value;

      if (!value || (typeof value === 'string' && value.trim() === '')) {
        isValid = false;
        field.style.borderColor = '#e53935';
        if (validation) {
          validation.textContent = '${rtl ? 'שדה חובה' : 'Required field'}';
        }
      } else {
        field.style.borderColor = '';
        if (validation) {
          validation.textContent = '';
        }
      }
    });

    return isValid;
  }

  // Navigation handlers
  function goToTab(tabIndex) {
    if (tabIndex < 1 || tabIndex > totalTabs) return;

    // Mark current tab as completed if moving forward
    if (tabIndex > currentTabIndex) {
      markTabCompleted(currentTabIndex);
    }

    showTab(tabIndex);
    // Scroll to top of form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function nextTab() {
    if (currentTabIndex < totalTabs) {
      if (validateCurrentPage()) {
        markTabCompleted(currentTabIndex);
        goToTab(currentTabIndex + 1);
      }
    }
  }

  function prevTab() {
    if (currentTabIndex > 1) {
      goToTab(currentTabIndex - 1);
    }
  }

  // Tab click handlers
  tabs.forEach(function(tab, index) {
    tab.addEventListener('click', function() {
      const targetTab = index + 1;
      // Allow going back freely, but validate when going forward
      if (targetTab <= currentTabIndex || completedTabs.has(targetTab - 1)) {
        goToTab(targetTab);
      } else if (targetTab === currentTabIndex + 1) {
        nextTab();
      }
    });
  });

  // Button click handlers
  if (prevBtn) {
    prevBtn.addEventListener('click', prevTab);
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', nextTab);
  }

  // Form submission handler
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Validate all form pages (skip welcome page)
    let allValid = true;
    const startTab = includeWelcome ? 2 : 1;

    for (let tabIdx = startTab; tabIdx <= totalTabs; tabIdx++) {
      const pageId = getPageId(tabIdx);
      const page = document.getElementById('page-' + pageId);
      if (!page) continue;

      const requiredFields = page.querySelectorAll('[required]');
      requiredFields.forEach(function(field) {
        const value = field.type === 'checkbox' ? field.checked : field.value;
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          allValid = false;
          if (tabIdx !== currentTabIndex) {
            goToTab(tabIdx);
          }
        }
      });
      if (!allValid) break;
    }

    if (!validateCurrentPage()) {
      allValid = false;
    }

    if (allValid) {
      // Collect form data
      const formData = new FormData(form);
      const data = {};
      formData.forEach(function(value, key) {
        if (data[key]) {
          if (Array.isArray(data[key])) {
            data[key].push(value);
          } else {
            data[key] = [data[key], value];
          }
        } else {
          data[key] = value;
        }
      });

      console.log('Form data:', data);
      alert('${rtl ? 'הטופס נשלח בהצלחה!' : 'Form submitted successfully!'}');
    }
  });

  // Clear validation on input
  form.querySelectorAll('input, select, textarea').forEach(function(field) {
    field.addEventListener('input', function() {
      this.style.borderColor = '';
      const validation = document.getElementById(this.id + '_validation');
      if (validation) {
        validation.textContent = '';
      }
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight') {
      ${rtl ? 'prevTab()' : 'nextTab()'};
    } else if (e.key === 'ArrowLeft') {
      ${rtl ? 'nextTab()' : 'prevTab()'};
    }
  });

  // ========================================
  // Signature Pad Functionality
  // ========================================

  // Initialize all signature pads
  const signaturePads = [];
  const signatureCanvases = form.querySelectorAll('.signature-canvas');

  signatureCanvases.forEach(function(canvas) {
    const ctx = canvas.getContext('2d');
    const container = canvas.closest('.signature-pad-container');
    const fieldId = container.dataset.fieldId;
    const hiddenInput = document.getElementById(fieldId);

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasSignature = false;

    // Set canvas size to match display size
    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    // Get position from event (mouse or touch)
    function getPosition(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    // Start drawing
    function startDrawing(e) {
      e.preventDefault();
      isDrawing = true;
      const pos = getPosition(e);
      lastX = pos.x;
      lastY = pos.y;
      canvas.classList.add('signing');
    }

    // Draw line
    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();

      const pos = getPosition(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastX = pos.x;
      lastY = pos.y;
      hasSignature = true;
      canvas.classList.add('has-signature');
    }

    // Stop drawing and save signature
    function stopDrawing() {
      if (isDrawing) {
        isDrawing = false;
        canvas.classList.remove('signing');
        saveSignature();
      }
    }

    // Save signature as base64 PNG
    function saveSignature() {
      if (hasSignature) {
        const dataUrl = canvas.toDataURL('image/png');
        hiddenInput.value = dataUrl;
        // Remove validation error if present
        container.classList.remove('invalid');
        const validation = document.getElementById(fieldId + '_validation');
        if (validation) validation.textContent = '';
      }
    }

    // Clear signature
    function clearSignature() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSignature = false;
      hiddenInput.value = '';
      canvas.classList.remove('has-signature');
      resizeCanvas(); // Reset canvas state
    }

    // Event listeners for mouse
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Event listeners for touch
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // Clear button
    const clearBtn = container.querySelector('.signature-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearSignature);
    }

    // Initialize canvas
    resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', function() {
      // Save current signature
      const currentData = hiddenInput.value;
      resizeCanvas();
      // Restore signature if exists
      if (currentData) {
        const img = new Image();
        img.onload = function() {
          ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        };
        img.src = currentData;
      }
    });

    // Store reference
    signaturePads.push({
      canvas: canvas,
      fieldId: fieldId,
      clear: clearSignature,
      hasSignature: function() { return hasSignature; }
    });
  });

  // Expose signature pads for external access
  window.formSignaturePads = signaturePads;

  // ========================================
  // Validation Engine
  // ========================================

  const ValidationEngine = {
    // Error messages (Hebrew)
    messages: {
      required: 'שדה חובה',
      digits_only: 'יש להזין ספרות בלבד',
      numeric: 'יש להזין מספר',
      length_min: 'אורך מינימלי: {min} תווים',
      length_between: 'אורך חייב להיות בין {min} ל-{max} תווים',
      length_exact: 'אורך חייב להיות {length} תווים',
      regex: 'פורמט לא תקין',
      israeli_id_checksum: 'מספר תעודת זהות לא תקין',
      valid_date: 'תאריך לא תקין',
      age_between: 'גיל חייב להיות בין {min} ל-{max}',
      not_in_future: 'תאריך לא יכול להיות בעתיד',
      in_list: 'ערך לא תקין',
      greater_than: 'ערך חייב להיות גדול מ-{min}',
      range: 'ערך חייב להיות בין {min} ל-{max}',
      required_checked: 'יש לסמן את התיבה',
      email: 'כתובת אימייל לא תקינה',
      mobile_il: 'מספר נייד לא תקין (05XXXXXXXX)',
      pad_id_to_9: '' // Preprocessor, no message
    },

    // Validator implementations
    validators: {
      required: function(value) {
        return value.trim() !== '';
      },

      digits_only: function(value) {
        if (value === '') return true;
        return /^[0-9]+$/.test(value);
      },

      numeric: function(value) {
        if (value === '') return true;
        return /^-?\\d+(\\.\\d+)?$/.test(value);
      },

      length_min: function(value, params) {
        if (value === '') return true;
        return value.length >= params.min;
      },

      length_between: function(value, params) {
        if (value === '') return true;
        return value.length >= params.min && value.length <= params.max;
      },

      length_exact: function(value, params) {
        if (value === '') return true;
        return value.length === params.length;
      },

      regex: function(value, params) {
        if (value === '') return true;
        try {
          var regex = new RegExp(params.pattern);
          return regex.test(value);
        } catch (e) {
          return false;
        }
      },

      greater_than: function(value, params) {
        if (value === '') return true;
        var num = parseFloat(value);
        if (isNaN(num)) return false;
        return num > params.min;
      },

      range: function(value, params) {
        if (value === '') return true;
        var num = parseFloat(value);
        if (isNaN(num)) return false;
        return num >= params.min && num <= params.max;
      },

      israeli_id_checksum: function(value) {
        if (value === '') return true;
        if (!/^\\d{8,9}$/.test(value)) return false;
        var id = value.padStart(9, '0');
        var sum = 0;
        for (var i = 0; i < 9; i++) {
          var digit = parseInt(id[i], 10) * ((i % 2) + 1);
          if (digit > 9) digit -= 9;
          sum += digit;
        }
        return sum % 10 === 0;
      },

      pad_id_to_9: function() {
        return true; // Preprocessor, always valid
      },

      valid_date: function(value) {
        if (value === '') return true;
        var date = new Date(value);
        return !isNaN(date.getTime());
      },

      age_between: function(value, params) {
        if (value === '') return true;
        var birthDate = new Date(value);
        if (isNaN(birthDate.getTime())) return false;
        var today = new Date();
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= params.min && age <= params.max;
      },

      not_in_future: function(value) {
        if (value === '') return true;
        var date = new Date(value);
        if (isNaN(date.getTime())) return false;
        var today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },

      in_list: function(value, params) {
        if (value === '') return true;
        var lists = {
          il_bank_codes: ['10', '11', '12', '13', '14', '17', '20', '31', '34', '46', '52', '54', '68']
        };
        var list = lists[params.listName];
        if (!list) return true;
        return list.indexOf(value) !== -1;
      },

      required_checked: function(value, params, element) {
        if (element && element.type === 'checkbox') {
          return element.checked;
        }
        return true;
      },

      email: function(value) {
        if (value === '') return true;
        return /^\\S+@\\S+\\.\\S+$/.test(value);
      },

      mobile_il: function(value) {
        if (value === '') return true;
        return /^05[0-9]{8}$/.test(value);
      }
    },

    // Get error message with parameter substitution
    getMessage: function(validatorName, params) {
      var msg = this.messages[validatorName] || 'ערך לא תקין';
      if (params) {
        for (var key in params) {
          msg = msg.replace('{' + key + '}', params[key]);
        }
      }
      return msg;
    },

    // Validate a single field
    validateField: function(element) {
      var validatorsAttr = element.getAttribute('data-validators');
      if (!validatorsAttr) return { valid: true, errors: [] };

      var validators;
      try {
        validators = JSON.parse(validatorsAttr.replace(/&quot;/g, '"'));
      } catch (e) {
        console.error('Failed to parse validators:', validatorsAttr);
        return { valid: true, errors: [] };
      }

      var value = element.value || '';
      var errors = [];

      for (var i = 0; i < validators.length; i++) {
        var v = validators[i];
        var validator = this.validators[v.name];
        if (!validator) continue;

        var isValid = validator(value, v.params || {}, element);
        if (!isValid) {
          var msg = this.getMessage(v.name, v.params);
          if (msg) errors.push(msg);
        }
      }

      return { valid: errors.length === 0, errors: errors };
    },

    // Show error for a field
    showError: function(element, errors) {
      var errorDiv = document.getElementById(element.id + '_validation');
      if (errorDiv) {
        errorDiv.textContent = errors.length > 0 ? errors[0] : '';
      }
      element.style.borderColor = errors.length > 0 ? '#e53935' : '';
    },

    // Initialize validation on form
    init: function(formId) {
      var self = this;
      var form = document.getElementById(formId);
      if (!form) return;

      // Validate on blur
      var validatedFields = form.querySelectorAll('[data-validators]');
      validatedFields.forEach(function(el) {
        el.addEventListener('blur', function() {
          var result = self.validateField(el);
          self.showError(el, result.errors);
        });

        // Clear error on input
        el.addEventListener('input', function() {
          self.showError(el, []);
        });
      });

      // Intercept form submit to validate
      form.addEventListener('submit', function(e) {
        var allValid = true;
        var firstInvalid = null;

        validatedFields.forEach(function(el) {
          var result = self.validateField(el);
          self.showError(el, result.errors);
          if (!result.valid) {
            allValid = false;
            if (!firstInvalid) firstInvalid = el;
          }
        });

        if (!allValid) {
          e.preventDefault();
          if (firstInvalid) firstInvalid.focus();
        }
      });
    }
  };

  // Initialize validation
  ValidationEngine.init('${formId}');

  // Initialize first tab (welcome page if enabled)
  showTab(1);
})();
`;
}
