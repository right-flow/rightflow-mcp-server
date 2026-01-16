/**
 * Button and Responsive CSS Styles
 * Submit button, validation, responsive, print styles
 */
import { adjustColor } from './css-utils';
/**
 * Generates CSS for buttons, validation feedback, and responsive layouts
 */
export function generateButtonsCss(_rtl, theme) {
    const { primaryColor, style } = theme;
    return `
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
`;
}
//# sourceMappingURL=css-buttons.js.map