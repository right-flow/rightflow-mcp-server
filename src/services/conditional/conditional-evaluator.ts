/**
 * Conditional logic evaluator for form fields
 * Evaluates rules to determine field visibility and requirements
 */

import type {
  ConditionalRule,
  FieldValues,
  FieldVisibility,
} from './conditional-types';

// Re-export types for convenience
export type { ConditionalRule, FieldValues, FieldVisibility };

/**
 * Evaluates a single condition against a field value
 * @param rule - The conditional rule to evaluate
 * @param fieldValue - The current value of the source field
 * @returns true if the condition is met, false otherwise
 */
export function evaluateCondition(
  rule: ConditionalRule,
  fieldValue: string | number | boolean | undefined | null
): boolean {
  const { operator, value } = rule;

  switch (operator) {
    case 'equals':
      return compareValues(fieldValue, value);

    case 'not_equals':
      return !compareValues(fieldValue, value);

    case 'contains':
      return containsValue(fieldValue, value);

    case 'is_empty':
      return isEmpty(fieldValue);

    case 'is_not_empty':
      return !isEmpty(fieldValue);

    default:
      return false;
  }
}

/**
 * Compares two values for equality, with type coercion for strings/numbers
 */
function compareValues(
  actual: string | number | boolean | undefined | null,
  expected: string | number | boolean
): boolean {
  // Handle null/undefined
  if (actual === null || actual === undefined) {
    return expected === '' || expected === null || expected === undefined;
  }

  // Handle boolean comparison
  if (typeof expected === 'boolean') {
    return actual === expected;
  }

  // Handle numeric comparison with string coercion
  if (typeof expected === 'number') {
    const numActual = typeof actual === 'string' ? parseFloat(actual) : actual;
    return numActual === expected;
  }

  // String comparison (case-sensitive for exact match)
  return String(actual) === String(expected);
}

/**
 * Checks if a value contains a substring (case-insensitive)
 */
function containsValue(
  actual: string | number | boolean | undefined | null,
  searchValue: string | number | boolean
): boolean {
  if (actual === null || actual === undefined) {
    return false;
  }

  const actualStr = String(actual).toLowerCase();
  const searchStr = String(searchValue).toLowerCase();

  return actualStr.includes(searchStr);
}

/**
 * Checks if a value is empty (null, undefined, empty string, or whitespace)
 */
function isEmpty(value: string | number | boolean | undefined | null): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  return false;
}

/**
 * Evaluates all conditions for a field
 * @param rules - Array of conditional rules
 * @param fieldValues - Map of field IDs to their current values
 * @returns true if all conditions are satisfied, false otherwise
 */
export function evaluateAllConditions(
  rules: ConditionalRule[],
  fieldValues: FieldValues
): boolean {
  if (!rules || rules.length === 0) {
    return true;
  }

  // Determine if we're using OR logic (any rule has logicType: 'or')
  const hasOrLogic = rules.some((rule) => rule.logicType === 'or');

  if (hasOrLogic) {
    // OR logic: at least one condition must be true
    return rules.some((rule) => {
      const sourceValue = fieldValues[rule.sourceFieldId];
      return evaluateCondition(rule, sourceValue);
    });
  } else {
    // AND logic (default): all conditions must be true
    return rules.every((rule) => {
      const sourceValue = fieldValues[rule.sourceFieldId];
      return evaluateCondition(rule, sourceValue);
    });
  }
}

/**
 * Determines the visibility of a field based on its conditional rules
 * @param rules - Array of conditional rules for this field
 * @param fieldValues - Map of field IDs to their current values
 * @param defaultVisibility - Default visibility when no rules match
 * @returns 'visible' or 'hidden'
 */
export function getFieldVisibility(
  rules: ConditionalRule[] | undefined,
  fieldValues: FieldValues,
  defaultVisibility: FieldVisibility = 'visible'
): FieldVisibility {
  if (!rules || rules.length === 0) {
    return defaultVisibility;
  }

  // Filter rules by action type
  const showRules = rules.filter((r) => r.action === 'show');
  const hideRules = rules.filter((r) => r.action === 'hide');

  // Check show rules
  if (showRules.length > 0) {
    const showConditionMet = evaluateAllConditions(showRules, fieldValues);
    if (showConditionMet) {
      return 'visible';
    }
  }

  // Check hide rules
  if (hideRules.length > 0) {
    const hideConditionMet = evaluateAllConditions(hideRules, fieldValues);
    if (hideConditionMet) {
      return 'hidden';
    }
  }

  return defaultVisibility;
}

/**
 * Determines if a field is required based on its conditional rules
 * @param rules - Array of conditional rules for this field
 * @param fieldValues - Map of field IDs to their current values
 * @param defaultRequired - Default required state when no rules match
 * @returns true if field should be required, false otherwise
 */
export function getFieldRequirement(
  rules: ConditionalRule[] | undefined,
  fieldValues: FieldValues,
  defaultRequired: boolean = false
): boolean {
  if (!rules || rules.length === 0) {
    return defaultRequired;
  }

  // Filter rules by action type
  const requireRules = rules.filter((r) => r.action === 'require');
  const unrequireRules = rules.filter((r) => r.action === 'unrequire');

  // Check require rules
  if (requireRules.length > 0) {
    const requireConditionMet = evaluateAllConditions(requireRules, fieldValues);
    if (requireConditionMet) {
      return true;
    }
  }

  // Check unrequire rules
  if (unrequireRules.length > 0) {
    const unrequireConditionMet = evaluateAllConditions(unrequireRules, fieldValues);
    if (unrequireConditionMet) {
      return false;
    }
  }

  return defaultRequired;
}
