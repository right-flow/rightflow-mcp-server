import { useMemo, useCallback } from 'react';
import { FieldDefinition } from '@/types/fields';
import {
  getFieldVisibility,
  getFieldRequirement,
  type FieldValues,
} from '@/services/conditional';

/**
 * Field state result from conditional logic evaluation
 */
export interface FieldState {
  /** Whether the field should be visible */
  visible: boolean;
  /** Whether the field should be required */
  required: boolean;
}

/**
 * Map of field IDs to their conditional states
 */
export type FieldStatesMap = Record<string, FieldState>;

/**
 * Props for the useConditionalLogic hook
 */
interface UseConditionalLogicProps {
  /** All fields in the form */
  fields: FieldDefinition[];
  /** Current values of all fields */
  fieldValues: FieldValues;
}

/**
 * Return type for the useConditionalLogic hook
 */
interface UseConditionalLogicResult {
  /** Get the conditional state for a specific field */
  getFieldState: (fieldId: string) => FieldState;
  /** Get conditional states for all fields */
  getAllFieldStates: () => FieldStatesMap;
  /** Get only the visible fields */
  getVisibleFields: () => FieldDefinition[];
}

/**
 * Hook for evaluating conditional logic in forms
 *
 * Determines field visibility and requirements based on conditional rules
 * and current field values.
 *
 * @param props - Fields and their current values
 * @returns Functions to query field states
 *
 * @example
 * ```tsx
 * const { getFieldState, getVisibleFields } = useConditionalLogic({
 *   fields: formFields,
 *   fieldValues: { dropdown1: 'אחר', checkbox1: true }
 * });
 *
 * // Check if a specific field should be visible
 * const { visible, required } = getFieldState('textField');
 *
 * // Get all fields that should be rendered
 * const visibleFields = getVisibleFields();
 * ```
 */
export function useConditionalLogic({
  fields,
  fieldValues,
}: UseConditionalLogicProps): UseConditionalLogicResult {
  // Create a map of field IDs to field definitions for quick lookup
  const fieldsMap = useMemo(() => {
    const map = new Map<string, FieldDefinition>();
    for (const field of fields) {
      map.set(field.id, field);
    }
    return map;
  }, [fields]);

  // Compute all field states
  const fieldStates = useMemo(() => {
    const states: FieldStatesMap = {};

    for (const field of fields) {
      const visibility = getFieldVisibility(
        field.conditionalRules,
        fieldValues,
        field.defaultVisibility || 'visible'
      );

      const requirement = getFieldRequirement(
        field.conditionalRules,
        fieldValues,
        field.required
      );

      states[field.id] = {
        visible: visibility === 'visible',
        required: requirement,
      };
    }

    return states;
  }, [fields, fieldValues]);

  // Get state for a specific field
  const getFieldState = useCallback(
    (fieldId: string): FieldState => {
      const state = fieldStates[fieldId];
      if (state) {
        return state;
      }

      // Return default state if field not found
      const field = fieldsMap.get(fieldId);
      return {
        visible: true,
        required: field?.required || false,
      };
    },
    [fieldStates, fieldsMap]
  );

  // Get all field states
  const getAllFieldStates = useCallback((): FieldStatesMap => {
    return fieldStates;
  }, [fieldStates]);

  // Get only visible fields
  const getVisibleFields = useCallback((): FieldDefinition[] => {
    return fields.filter((field) => {
      const state = fieldStates[field.id];
      return state ? state.visible : true;
    });
  }, [fields, fieldStates]);

  return {
    getFieldState,
    getAllFieldStates,
    getVisibleFields,
  };
}
