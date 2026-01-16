/**
 * Validator Implementations
 * Each validator returns true if valid, false if invalid
 */

export type ValidatorFunction = (
  value: string,
  params?: Record<string, unknown>,
  element?: HTMLElement
) => boolean;

/**
 * Required field - value must not be empty
 */
export function validateRequired(value: string): boolean {
  return value.trim() !== '';
}

/**
 * Digits only - value must contain only digits
 */
export function validateDigitsOnly(value: string): boolean {
  if (value === '') return true; // Empty is ok, use required for mandatory
  return /^[0-9]+$/.test(value);
}

/**
 * Numeric - value must be a valid number (including negative and decimal)
 */
export function validateNumeric(value: string): boolean {
  if (value === '') return true;
  return /^-?\d+(\.\d+)?$/.test(value);
}

/**
 * Length minimum - value must have at least min characters
 */
export function validateLengthMin(
  value: string,
  params: { min: number },
): boolean {
  if (value === '') return true;
  return value.length >= params.min;
}

/**
 * Length between - value length must be between min and max
 */
export function validateLengthBetween(
  value: string,
  params: { min: number; max: number },
): boolean {
  if (value === '') return true;
  return value.length >= params.min && value.length <= params.max;
}

/**
 * Length exact - value must have exactly the specified length
 */
export function validateLengthExact(
  value: string,
  params: { length: number },
): boolean {
  if (value === '') return true;
  return value.length === params.length;
}

/**
 * Regex pattern - value must match the provided pattern
 */
export function validateRegex(
  value: string,
  params: { pattern: string },
): boolean {
  if (value === '') return true;
  try {
    const regex = new RegExp(params.pattern);
    return regex.test(value);
  } catch {
    console.error('Invalid regex pattern:', params.pattern);
    return false;
  }
}

/**
 * Greater than - numeric value must be greater than min
 */
export function validateGreaterThan(
  value: string,
  params: { min: number },
): boolean {
  if (value === '') return true;
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  return num > params.min;
}

/**
 * Range - numeric value must be between min and max (inclusive)
 */
export function validateRange(
  value: string,
  params: { min: number; max: number },
): boolean {
  if (value === '') return true;
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  return num >= params.min && num <= params.max;
}

/**
 * Israeli ID Checksum - validates Israeli ID number using Luhn variant
 */
export function validateIsraeliId(value: string): boolean {
  if (value === '') return true;

  // Must be 8-9 digits
  if (!/^\d{8,9}$/.test(value)) return false;

  // Pad to 9 digits
  const id = value.padStart(9, '0');

  // Luhn variant algorithm for Israeli ID
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(id[i], 10) * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }

  return sum % 10 === 0;
}

/**
 * Pad ID to 9 - helper to pad Israeli ID to 9 digits (preprocessor, always returns true)
 */
export function padIdTo9(_value: string): boolean {
  // This is a preprocessor, not a validator
  // The actual padding happens during form submission
  return true;
}

/**
 * Valid date - value must be a valid date
 */
export function validateDate(value: string): boolean {
  if (value === '') return true;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Age between - calculates age from date and checks if within range
 */
export function validateAge(
  value: string,
  params: { min: number; max: number },
): boolean {
  if (value === '') return true;

  const birthDate = new Date(value);
  if (isNaN(birthDate.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred yet this year
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= params.min && age <= params.max;
}

/**
 * Not in future - date must not be in the future
 */
export function validateNotInFuture(value: string): boolean {
  if (value === '') return true;

  const date = new Date(value);
  if (isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  return date <= today;
}

/**
 * In list - value must be in a predefined list
 */
export function validateInList(
  value: string,
  params: { listName: string },
): boolean {
  if (value === '') return true;

  // Predefined lists
  const lists: Record<string, string[]> = {
    il_bank_codes: [
      '10', // בנק לאומי
      '11', // דיסקונט
      '12', // הפועלים
      '13', // איגוד
      '14', // אוצר החייל
      '17', // מרכנתיל
      '20', // מזרחי טפחות
      '31', // הבינלאומי
      '34', // ערבי ישראלי
      '46', // מסד
      '52', // פאגי
      '54', // ירושלים
      '68', // דקסיה
    ],
  };

  const list = lists[params.listName];
  if (!list) {
    console.warn('Unknown list:', params.listName);
    return true; // Don't block if list is unknown
  }

  return list.includes(value);
}

/**
 * Required checked - checkbox must be checked
 */
export function validateRequiredChecked(
  _value: string,
  _params?: Record<string, unknown>,
  element?: HTMLElement,
): boolean {
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    return element.checked;
  }
  return true;
}

/**
 * Email validation
 */
export function validateEmail(value: string): boolean {
  if (value === '') return true;
  return /^\S+@\S+\.\S+$/.test(value);
}

/**
 * Israeli mobile phone validation
 */
export function validateMobileIL(value: string): boolean {
  if (value === '') return true;
  return /^05[0-9]{8}$/.test(value);
}

/**
 * Map of validator names to functions
 */
export const validators: Record<string, ValidatorFunction> = {
  required: validateRequired,
  digits_only: validateDigitsOnly,
  numeric: validateNumeric,
  length_min: validateLengthMin as ValidatorFunction,
  length_between: validateLengthBetween as ValidatorFunction,
  length_exact: validateLengthExact as ValidatorFunction,
  regex: validateRegex as ValidatorFunction,
  greater_than: validateGreaterThan as ValidatorFunction,
  range: validateRange as ValidatorFunction,
  israeli_id_checksum: validateIsraeliId,
  pad_id_to_9: padIdTo9,
  valid_date: validateDate,
  age_between: validateAge as ValidatorFunction,
  not_in_future: validateNotInFuture,
  in_list: validateInList as ValidatorFunction,
  required_checked: validateRequiredChecked,
  email: validateEmail,
  mobile_il: validateMobileIL,
};

/**
 * Run a single validator
 */
export function runValidator(
  validatorName: string,
  value: string,
  params?: Record<string, unknown>,
  element?: HTMLElement,
): boolean {
  const validator = validators[validatorName];
  if (!validator) {
    console.warn('Unknown validator:', validatorName);
    return true; // Don't block on unknown validators
  }
  return validator(value, params, element);
}
