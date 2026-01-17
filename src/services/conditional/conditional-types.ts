/**
 * Conditional logic types for form fields
 * Supports showing/hiding fields based on other field values
 */

/**
 * Operators for conditional rules
 */
export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty';

/**
 * Actions that can be triggered by a conditional rule
 */
export type ConditionalAction = 'show' | 'hide' | 'require' | 'unrequire';

/**
 * Logic type for combining multiple rules
 */
export type LogicType = 'and' | 'or';

/**
 * A conditional rule that determines field behavior
 */
export interface ConditionalRule {
  /** Unique identifier for the rule */
  id: string;
  /** ID of the field whose value triggers this rule */
  sourceFieldId: string;
  /** Comparison operator */
  operator: ConditionalOperator;
  /** Value to compare against */
  value: string | number | boolean;
  /** Action to take when condition is met */
  action: ConditionalAction;
  /** How to combine with other rules (default: 'and') */
  logicType?: LogicType;
}

/**
 * Field visibility state
 */
export type FieldVisibility = 'visible' | 'hidden';

/**
 * Map of field IDs to their current values
 */
export type FieldValues = Record<string, string | number | boolean | undefined | null>;

/**
 * Result of evaluating conditional logic for a field
 */
export interface ConditionalResult {
  /** Whether the field should be visible */
  visible: boolean;
  /** Whether the field should be required */
  required: boolean;
}
