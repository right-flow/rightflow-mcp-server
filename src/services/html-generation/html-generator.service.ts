/**
 * HTML Generator Service
 * Template-based HTML form generation (no AI)
 * Acts as fallback when AI generation fails
 */

import type { FieldDefinition } from '@/types/fields';
import type {
  HtmlFormField,
  HtmlFieldGroup,
  HtmlGenerationOptions,
  GeneratedHtmlResult,
  WelcomePageConfig,
} from './types';
import {
  mapFieldsToHtml,
  createFieldGroups,
  detectFormDirection,
  groupFieldsIntoRows,
} from './field-mapper';
import { generateDocsFlowCSS, generateFormJS } from './html-generator-css';
import {
  sanitizeHexColor,
  sanitizeFontSize,
  sanitizeFontWeight,
  sanitizeFontStyle,
  sanitizeTextAlign,
} from '@/utils/inputSanitization';

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates the welcome/intro page HTML (Phoenix-style)
 */
function generateWelcomePageHtml(
  rtl: boolean,
  welcomeConfig?: Partial<WelcomePageConfig>,
): string {
  const config: WelcomePageConfig = {
    enabled: true,
    welcomeTitle: welcomeConfig?.welcomeTitle || (rtl ? 'ברוכים הבאים!' : 'Welcome!'),
    welcomeText: welcomeConfig?.welcomeText ||
      (rtl
        ? 'תודה על השימוש במערכת הטפסים הממחושבת שלנו.'
        : 'Thank you for using our digital form system.'),
    companyName: welcomeConfig?.companyName || '',
    infoBoxText: welcomeConfig?.infoBoxText ||
      (rtl
        ? 'במהלך מילוי הטופס יתכן ותידרשו לצרף מסמכים נוספים. אנא הכינו את המסמכים הנדרשים מראש.'
        : 'During the form filling process, you may be required to attach additional documents. Please prepare the required documents in advance.'),
    documentsListTitle: welcomeConfig?.documentsListTitle ||
      (rtl ? 'להלן רשימת המסמכים הנדרשים:' : 'Required documents:'),
    requiredDocuments: welcomeConfig?.requiredDocuments ||
      (rtl
        ? ['צילום תעודת זהות וספח', 'מסמכים תומכים רלוונטיים']
        : ['Copy of ID', 'Relevant supporting documents']),
  };

  let documentsListHtml = '';
  if (config.requiredDocuments && config.requiredDocuments.length > 0) {
    documentsListHtml = `
      <p class="welcome-text">${escapeHtml(config.documentsListTitle || '')}</p>
      <ul class="welcome-documents-list">
        ${config.requiredDocuments.map(doc => `<li>${escapeHtml(doc)}</li>`).join('\n        ')}
      </ul>`;
  }

  return `
    <div class="form-page welcome-page active" id="page-welcome" role="tabpanel">
      <div class="welcome-section-title">${escapeHtml(config.welcomeTitle || '')}</div>
      <p class="welcome-text">${escapeHtml(config.welcomeText || '')}</p>
      ${config.companyName ? `<p class="welcome-company-name">${escapeHtml(config.companyName)}</p>` : ''}
      <div class="welcome-info-box">
        <strong>${rtl ? 'שימו לב:' : 'Please note:'}</strong> ${escapeHtml(config.infoBoxText || '')}
      </div>
      ${documentsListHtml}
    </div>`;
}

/**
 * Generates HTML for a single field
 */
function generateFieldHtml(
  field: HtmlFormField,
  includeValidation: boolean,
): string {
  const flexGrow = field.position?.width
    ? Math.max(1, Math.round(field.position.width / 50))
    : 1;
  const displayLabel = field.label || field.name;
  // Static text fields don't need form-group wrapper or label
  if (field.type === 'static-text') {
    return generateInputHtml(field);
  }

  const requiredMark = field.required ? '<span class="required">*</span>' : '';
  const requiredClass = field.required ? ' required-field' : '';
  const stationClass = field.station ? ` station-${escapeHtml(field.station)}` : '';

  let fieldHtml = `
    <div class="form-group${requiredClass}${stationClass}" style="flex-grow: ${flexGrow};" data-field-id="${escapeHtml(field.id)}" data-station="${escapeHtml(field.station || 'client')}">
      <label for="${escapeHtml(field.id)}">
        ${escapeHtml(displayLabel)}${requiredMark}
      </label>`;

  fieldHtml += generateInputHtml(field);

  if (includeValidation) {
    fieldHtml += `
      <div class="field-validation" id="${escapeHtml(field.id)}_validation" role="alert" aria-live="polite"></div>`;
  }

  fieldHtml += `
    </div>`;

  return fieldHtml;
}

/**
 * Generates validation data attributes for a field
 */
function generateValidationAttrs(field: HtmlFormField): string {
  if (!field.validationType || !field.validators || field.validators.length === 0) {
    return '';
  }

  const validatorsJson = JSON.stringify(field.validators)
    .replace(/"/g, '&quot;'); // Escape quotes for HTML attribute

  return `
    data-validation-type="${escapeHtml(field.validationType)}"
    data-validators="${validatorsJson}"
  `.trim();
}

/**
 * Generates the input element HTML based on field type
 */
function generateInputHtml(field: HtmlFormField): string {
  const validationAttrs = generateValidationAttrs(field);
  const baseAttrs = `
    id="${escapeHtml(field.id)}"
    name="${escapeHtml(field.id)}"
    ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''}
    ${field.required ? 'required' : ''}
    ${field.value ? `value="${escapeHtml(field.value)}"` : ''}
    ${field.tabOrder !== undefined ? `tabindex="${field.tabOrder}"` : ''}
    ${validationAttrs}
  `.trim();

  switch (field.type) {
    case 'textarea':
      return `<textarea class="form-control" ${baseAttrs} rows="4"></textarea>`;

    case 'select': {
      let html = `<select class="form-control" ${baseAttrs}>`;
      html += `<option value="">בחר...</option>`;
      if (field.options) {
        for (const option of field.options) {
          html += `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`;
        }
      }
      html += `</select>`;
      return html;
    }

    case 'checkbox':
      return `
        <div class="checkbox-item">
          <input type="checkbox" ${baseAttrs} value="1">
          <label for="${escapeHtml(field.id)}" style="margin:0; font-weight:normal;">
            ${escapeHtml(field.label || field.name)}
          </label>
        </div>`;

    case 'radio': {
      if (field.options && field.options.length > 0) {
        let html = '<div class="radio-group">';
        for (let i = 0; i < field.options.length; i++) {
          const option = field.options[i];
          const optionId = `${field.id}_${i}`;
          html += `
            <div class="radio-item">
              <input type="radio" id="${escapeHtml(optionId)}" name="${escapeHtml(field.id)}"
                     value="${escapeHtml(option)}" ${field.required ? 'required' : ''}>
              <label for="${escapeHtml(optionId)}">${escapeHtml(option)}</label>
            </div>`;
        }
        html += '</div>';
        return html;
      }
      return `<input type="radio" ${baseAttrs}>`;
    }

    case 'signature':
      return `
        <div class="signature-pad-container" data-field-id="${escapeHtml(field.id)}">
          <canvas class="signature-canvas" id="${escapeHtml(field.id)}_canvas"></canvas>
          <input type="hidden" id="${escapeHtml(field.id)}" name="${escapeHtml(field.id)}"
                 class="signature-data" ${field.required ? 'required' : ''}>
          <div class="signature-controls">
            <button type="button" class="signature-clear-btn" data-canvas="${escapeHtml(field.id)}_canvas">
              ${field.direction === 'ltr' ? 'Clear' : 'נקה'}
            </button>
          </div>
        </div>`;

    case 'static-text': {
      // BUG FIX: Sanitize all CSS values to prevent CSS injection attacks
      // Date: 2026-01-05
      // Issue: CSS values were inserted directly into inline styles without validation
      // Fix: Added comprehensive sanitization for all style properties
      // Context: Fixes Bug #2 - CSS Injection Vulnerability
      // Prevention: Added sanitization functions and validation

      // Sanitize text alignment with RTL default
      const defaultAlign = field.direction === 'rtl' ? 'right' : 'left';
      const textAlign = sanitizeTextAlign(field.textAlign, defaultAlign);

      // Sanitize colors (validate hex format, prevent injection)
      const backgroundColor = sanitizeHexColor(field.backgroundColor, 'transparent');
      const textColor = sanitizeHexColor(field.textColor, '#1f2937');

      // Sanitize font properties (only allow specific values)
      const fontWeight = sanitizeFontWeight(field.fontWeight);
      const fontStyle = sanitizeFontStyle(field.fontStyle);

      // Sanitize font size (clamp to safe range)
      const fontSize = sanitizeFontSize(field.fontSize);

      // BUG FIX: Border width check handles 0 correctly
      // Date: 2026-01-05
      // Issue: field.borderWidth && field.borderColor treated 0 as falsy
      // Fix: Explicitly check for undefined/null instead of truthy check
      // Context: Fixes Bug #1 - Border Width Check, same as StaticTextField fix
      // Prevention: Border width 0 now correctly shows 'none' border
      const borderColor = sanitizeHexColor(field.borderColor, '#000000');
      const borderStyle =
        field.borderWidth !== undefined &&
        field.borderWidth !== null &&
        field.borderColor
          ? `${field.borderWidth}px solid ${borderColor}`
          : 'none';

      return `
        <div class="static-text-field" style="
          text-align: ${textAlign};
          background-color: ${backgroundColor};
          color: ${textColor};
          font-weight: ${fontWeight};
          font-style: ${fontStyle};
          font-size: ${fontSize}pt;
          border: ${borderStyle};
          padding: 8px;
          margin-bottom: 12px;
          white-space: pre-wrap;
          direction: ${field.direction};
        ">
          ${escapeHtml(field.content || '')}
        </div>`;
    }

    case 'email':
      return `<input type="email" class="form-control" ${baseAttrs}>`;

    case 'tel':
      return `<input type="tel" class="form-control" ${baseAttrs}>`;

    case 'date': {
      // Get date format from validators or use default
      const dateFormat = 'dd/mm/yyyy';
      const formatHint = field.direction === 'rtl' ? `פורמט: ${dateFormat}` : `Format: ${dateFormat}`;
      return `
        <div class="date-picker-wrapper" data-field-id="${escapeHtml(field.id)}">
          <input type="text" class="form-control date-input" ${baseAttrs}
                 placeholder="${dateFormat}" pattern="\\d{2}/\\d{2}/\\d{4}">
          <button type="button" class="date-picker-btn" aria-label="${field.direction === 'rtl' ? 'בחר תאריך' : 'Select date'}">📅</button>
          <div class="date-picker-calendar" style="display: none;"></div>
        </div>
        <div class="field-format-hint">${escapeHtml(formatHint)}</div>`;
    }

    case 'number':
      return `<input type="number" class="form-control" ${baseAttrs}>`;

    case 'text':
    default:
      return `<input type="text" class="form-control" ${baseAttrs}>`;
  }
}


/**
 * Groups fields by page number
 */
function groupFieldsByPage(
  fields: HtmlFormField[],
): Map<number, HtmlFormField[]> {
  const pageMap = new Map<number, HtmlFormField[]>();

  for (const field of fields) {
    const pageNum = field.position?.page ?? 1;
    if (!pageMap.has(pageNum)) {
      pageMap.set(pageNum, []);
    }
    pageMap.get(pageNum)!.push(field);
  }

  return pageMap;
}

/**
 * Generates tab indicators HTML
 * @param totalPages - Number of form pages (excluding welcome page)
 * @param includeWelcome - Whether to include welcome page tab
 */
function generateTabsHtml(
  totalPages: number,
  includeWelcome: boolean,
): string {
  const totalTabs = includeWelcome ? totalPages + 1 : totalPages;
  if (totalTabs <= 1) return '';

  let html = '<div class="page-tabs" role="tablist">';

  for (let i = 1; i <= totalTabs; i++) {
    const isWelcomeTab = includeWelcome && i === 1;
    const pageId = isWelcomeTab ? 'welcome' : (includeWelcome ? i - 1 : i);
    const isActive = i === 1;

    html += `
      <div class="page-tab${isActive ? ' active' : ''}"
           role="tab"
           aria-selected="${isActive}"
           aria-controls="page-${pageId}"
           tabindex="${isActive ? 0 : -1}"
           data-page="${pageId}">
        ${i}
      </div>`;

    // Add connector between tabs (except after last)
    if (i < totalTabs) {
      html += '<div class="tab-connector"></div>';
    }
  }

  html += '</div>';
  return html;
}

/**
 * Generates navigation buttons HTML
 * @param totalPages - Number of form pages (excluding welcome page)
 * @param rtl - Right-to-left direction
 * @param includeWelcome - Whether welcome page is included
 */
function generateNavigationHtml(
  totalPages: number,
  rtl: boolean,
  includeWelcome: boolean,
): string {
  const totalTabs = includeWelcome ? totalPages + 1 : totalPages;

  if (totalTabs <= 1) {
    // Single page - just show submit button
    return `
    <div class="submit-wrapper">
      <button type="submit" class="btn-submit">
        ${rtl ? 'שלח טופס' : 'Submit Form'}
      </button>
    </div>`;
  }

  const prevArrow = rtl ? '→' : '←';
  const nextArrow = rtl ? '←' : '→';

  return `
    <div class="page-navigation">
      <button type="button" id="prev-btn" class="nav-btn" disabled>
        <span class="arrow">${prevArrow}</span>
        ${rtl ? 'חזור' : 'Back'}
      </button>

      <div class="page-progress" id="page-progress-text">
        ${rtl ? 'עמוד' : 'Page'} <strong>1</strong> ${rtl ? 'מתוך' : 'of'} <strong>${totalTabs}</strong>
      </div>

      <button type="button" id="next-btn" class="nav-btn primary">
        ${rtl ? 'המשך' : 'Continue'}
        <span class="arrow">${nextArrow}</span>
      </button>

      <button type="submit" id="submit-btn" class="nav-btn primary" style="display: none;">
        ${rtl ? 'שלח טופס' : 'Submit Form'}
      </button>
    </div>`;
}

/**
 * Generates HTML for a single page of fields
 */
function generatePageHtml(
  pageNum: number,
  fields: HtmlFormField[],
  groups: HtmlFieldGroup[],
  includeValidation: boolean,
  rtl: boolean,
  isActive: boolean = false,
): string {
  // Filter groups that have fields on this page
  const pageFieldIds = new Set(fields.map((f) => f.id));
  const pageGroups = groups.filter((g) =>
    g.fields.some((fid) => pageFieldIds.has(fid)),
  );

  let html = `
    <div class="form-page${isActive ? ' active' : ''}" id="page-${pageNum}" role="tabpanel">
      <div class="page-title">
        <span class="page-number">${pageNum}</span>
        ${rtl ? `עמוד ${pageNum}` : `Page ${pageNum}`}
      </div>`;

  if (pageGroups.length > 0) {
    for (const group of pageGroups) {
      // Only include fields from this page
      const groupFieldsOnPage = fields.filter((f) => group.fields.includes(f.id));
      if (groupFieldsOnPage.length === 0) continue;

      const rows = groupFieldsIntoRows(groupFieldsOnPage);

      html += `
      <fieldset>
        <legend>${escapeHtml(group.title)}</legend>
        ${group.description ? `<p class="legend-note">${escapeHtml(group.description)}</p>` : ''}`;

      for (const row of rows) {
        html += '<div class="form-row">';
        for (const field of row) {
          html += generateFieldHtml(field, includeValidation);
        }
        html += '</div>';
      }

      html += '</fieldset>';
    }
  } else {
    // No groups - render all page fields in rows
    const rows = groupFieldsIntoRows(fields);
    html += `<fieldset><legend>${rtl ? 'פרטים' : 'Details'}</legend>`;
    for (const row of rows) {
      html += '<div class="form-row">';
      for (const field of row) {
        html += generateFieldHtml(field, includeValidation);
      }
      html += '</div>';
    }
    html += '</fieldset>';
  }

  html += '</div>';
  return html;
}

/**
 * Main HTML generation function (template-based)
 * Generates multi-page tabbed form with navigation
 * Includes Phoenix-style welcome page by default
 */
export async function generateHtmlFormTemplate(
  fields: FieldDefinition[],
  options: Partial<HtmlGenerationOptions> = {},
): Promise<GeneratedHtmlResult> {
  const formId = `form_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;

  // Detect RTL if not specified
  const rtl = options.rtl ?? detectFormDirection(fields) === 'rtl';

  // Welcome page is enabled by default
  const includeWelcome = options.welcomePage?.enabled !== false;

  // Merge options with defaults
  const finalOptions: HtmlGenerationOptions = {
    formTitle: options.formTitle || 'טופס',
    formDescription: options.formDescription,
    language: options.language || (rtl ? 'hebrew' : 'english'),
    rtl,
    theme: {
      primaryColor: options.theme?.primaryColor || '#003399',
      fontFamily:
        options.theme?.fontFamily ||
        "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      spacing: options.theme?.spacing || 'normal',
      style: options.theme?.style || 'modern',
    },
    includeValidation: options.includeValidation ?? true,
    generationMethod: 'template',
    welcomePage: options.welcomePage,
  };

  // Convert fields
  const htmlFields = mapFieldsToHtml(fields);
  const groups = createFieldGroups(fields);

  // Group fields by page
  const pageMap = groupFieldsByPage(htmlFields);
  const pageNumbers = Array.from(pageMap.keys()).sort((a, b) => a - b);
  const totalPages = pageNumbers.length || 1;

  // Generate CSS and JS with page count (including welcome page)
  const cssContent = generateDocsFlowCSS(finalOptions.rtl, finalOptions.theme);
  const jsContent = generateFormJS(formId, finalOptions.rtl, totalPages, includeWelcome, finalOptions.userRole || 'client');

  // Build HTML document
  const dirAttr = finalOptions.rtl ? 'dir="rtl"' : '';
  const langAttr = finalOptions.rtl ? 'lang="he"' : 'lang="en"';

  let htmlContent = `<!DOCTYPE html>
<html ${langAttr} ${dirAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(finalOptions.formTitle || 'טופס')}</title>
  <style>
${cssContent}
  </style>
</head>
<body>

<div class="container">
  <header>
    <h1>${escapeHtml(finalOptions.formTitle || 'טופס')}</h1>
    ${finalOptions.formDescription ? `<p>${escapeHtml(finalOptions.formDescription)}</p>` : ''}
  </header>

  ${generateTabsHtml(totalPages, includeWelcome)}

  <form id="${formId}" novalidate>
    <div class="form-pages">
`;

  // Add welcome page if enabled (first page)
  if (includeWelcome) {
    htmlContent += generateWelcomePageHtml(finalOptions.rtl, finalOptions.welcomePage);
  }

  // Generate form pages
  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];
    const pageFields = pageMap.get(pageNum) || [];
    htmlContent += generatePageHtml(
      i + 1, // Use 1-based index for display
      pageFields,
      groups,
      finalOptions.includeValidation,
      finalOptions.rtl,
      !includeWelcome && i === 0, // Only first form page is active if no welcome page
    );
  }

  // If no pages (shouldn't happen), create single page with all fields
  if (pageNumbers.length === 0) {
    htmlContent += generatePageHtml(
      1,
      htmlFields,
      groups,
      finalOptions.includeValidation,
      finalOptions.rtl,
      !includeWelcome, // Active only if no welcome page
    );
  }

  htmlContent += `
    </div>
    ${generateNavigationHtml(totalPages, finalOptions.rtl, includeWelcome)}
  </form>
</div>

<script>
${jsContent}
</script>

</body>
</html>`;

  return {
    formId,
    htmlContent,
    cssContent,
    jsContent,
    metadata: {
      fieldCount: fields.length,
      sectionCount: groups.length,
      rtl: finalOptions.rtl,
      generatedAt: new Date(),
      method: 'template',
    },
  };
}
