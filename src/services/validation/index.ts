/**
 * Validation Service - Barrel Export
 */

// Types and Constants from validation-rules.types
export {
  type ValidationRulesConfig,
  type FieldTypeDefinition,
  type DetectionMatch,
  type DetectionResult,
  type ValidatorDefinition,
  type ValidatorsLibraryConfig,
  FIELD_TYPE_DISPLAY_NAMES,
  VALIDATOR_ERROR_MESSAGES,
} from './validation-rules.types';

// Validation Rules
export {
  validationRules,
  getFieldTypeIds,
  getFieldTypeById,
} from './validation-rules';

// Field Type Detector
export {
  detectFieldType,
  getAvailableFieldTypes,
  getValidatorsForFieldType,
} from './field-type-detector';

// Validators
export {
  validators,
  runValidator,
  validateRequired,
  validateDigitsOnly,
  validateNumeric,
  validateLengthMin,
  validateLengthBetween,
  validateLengthExact,
  validateRegex,
  validateGreaterThan,
  validateRange,
  validateIsraeliId,
  validateDate,
  validateAge,
  validateNotInFuture,
  validateInList,
  validateRequiredChecked,
  validateEmail,
  validateMobileIL,
} from './validators';
