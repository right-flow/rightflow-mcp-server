/**
 * Component CSS Styles
 * Inputs, textarea, select, checkbox, radio, date picker, signature
 */

import type { HtmlFormTheme } from '../types';
import { getStyleVariations } from './css-utils';

/**
 * Generates CSS for form input components
 */
export function generateComponentsCss(
  rtl: boolean,
  theme: HtmlFormTheme,
): string {
  const { primaryColor, style } = theme;
  const sv = getStyleVariations(style, primaryColor);

  return `
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

/* Date Picker */
.date-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-input {
  flex: 1;
}

.date-picker-btn {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.date-picker-btn:hover {
  background: #f5f5f5;
  border-color: var(--accent-color);
}

.date-picker-calendar {
  position: absolute;
  top: 100%;
  ${rtl ? 'right' : 'left'}: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: ${sv.borderRadius};
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 12px;
  z-index: 1000;
  min-width: 280px;
}

.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.date-picker-nav {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.date-picker-nav:hover {
  background: #f0f0f0;
}

.date-picker-current {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
  text-align: center;
}

.date-picker-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.date-picker-day-header {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  padding: 4px;
}

.date-picker-day {
  aspect-ratio: 1;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.2s;
  padding: 4px;
}

.date-picker-day:hover:not(.empty):not(.disabled) {
  background: var(--accent-color);
  color: white;
}

.date-picker-day.today {
  font-weight: 700;
  color: var(--accent-color);
}

.date-picker-day.selected {
  background: var(--accent-color);
  color: white;
  font-weight: 600;
}

.date-picker-day.empty {
  cursor: default;
}

.date-picker-day.disabled {
  color: #ccc;
  cursor: not-allowed;
}

/* Date format hint */
.field-format-hint {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
  font-style: italic;
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
`;
}
