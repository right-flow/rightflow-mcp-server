/**
 * Base CSS Styles
 * Root variables, body, container, header, fieldset, form layout
 */

import type { HtmlFormTheme } from '../types';
import { getStyleVariations, getSpacingValues } from './css-utils';

/**
 * Generates base CSS styles (root variables, layout, typography)
 */
export function generateBaseCss(
  rtl: boolean,
  theme: HtmlFormTheme
): string {
  const { primaryColor, fontFamily, spacing, style } = theme;
  const sp = getSpacingValues(spacing);
  const sv = getStyleVariations(style, primaryColor);

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
  margin-${rtl ? 'right' : 'left'}: 4px;
  font-weight: 700;
  font-size: 14px;
}

/* Required field indicator - more prominent */
.form-group.required-field label::after {
  content: ' (${rtl ? 'חובה' : 'Required'})';
  color: #e53935;
  font-size: 11px;
  font-weight: 500;
  margin-${rtl ? 'right' : 'left'}: 4px;
}

.form-group.required-field .form-control,
.form-group.required-field input[type="text"],
.form-group.required-field input[type="email"],
.form-group.required-field input[type="tel"],
.form-group.required-field input[type="number"],
.form-group.required-field select,
.form-group.required-field textarea {
  border-${rtl ? 'right' : 'left'}: 3px solid #e53935;
}

.form-group.required-field.field-invalid .form-control,
.form-group.required-field.field-invalid input,
.form-group.required-field.field-invalid select,
.form-group.required-field.field-invalid textarea {
  border-color: #e53935;
  background-color: #fff5f5;
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}

/* Station-based field styling */
.form-group.station-agent {
  position: relative;
}

.form-group.station-agent::before {
  content: '${rtl ? 'שדה סוכן' : 'Agent Field'}';
  position: absolute;
  top: -8px;
  ${rtl ? 'left' : 'right'}: 8px;
  background: #5c6bc0;
  color: white;
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  z-index: 1;
}

.form-group.station-agent.station-disabled {
  opacity: 0.7;
  pointer-events: none;
}

.form-group.station-agent.station-disabled input,
.form-group.station-agent.station-disabled select,
.form-group.station-agent.station-disabled textarea,
.form-group.station-agent.station-disabled .signature-canvas {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.form-group.station-client.station-disabled {
  opacity: 0.7;
  pointer-events: none;
}

.form-group.station-client.station-disabled input,
.form-group.station-client.station-disabled select,
.form-group.station-client.station-disabled textarea,
.form-group.station-client.station-disabled .signature-canvas {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

/* Validation summary toast */
.validation-toast {
  position: fixed;
  top: 20px;
  ${rtl ? 'right' : 'left'}: 50%;
  transform: translateX(${rtl ? '50%' : '-50%'});
  background: #e53935;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 10000;
  font-size: 14px;
  font-weight: 500;
  animation: slideDown 0.3s ease;
}

.validation-toast.success {
  background: #4caf50;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(${rtl ? '50%' : '-50%'}) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(${rtl ? '50%' : '-50%'}) translateY(0);
  }
}
`;
}
