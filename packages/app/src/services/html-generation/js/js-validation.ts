/**
 * Validation Engine JavaScript
 * Form field validation with Hebrew messages
 */

/**
 * Generates JavaScript for the validation engine
 */
export function generateValidationJs(formId: string): string {
  return `
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
