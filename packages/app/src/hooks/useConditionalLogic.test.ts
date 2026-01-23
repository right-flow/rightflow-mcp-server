import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConditionalLogic } from './useConditionalLogic';
import { FieldDefinition } from '@/types/fields';
import { ConditionalRule } from '@/services/conditional';

/**
 * useConditionalLogic Hook Tests
 *
 * Tests for conditional logic evaluation in forms:
 * - Field visibility based on conditions
 * - Field requirement based on conditions
 * - Real-time updates when field values change
 */

const createMockField = (
  id: string,
  overrides: Partial<FieldDefinition> = {},
): FieldDefinition => ({
  id,
  type: 'text',
  name: `field_${id}`,
  label: `Field ${id}`,
  x: 100,
  y: 100,
  width: 150,
  height: 20,
  pageNumber: 1,
  required: false,
  direction: 'rtl',
  ...overrides,
});

describe('useConditionalLogic', () => {
  describe('getFieldState', () => {
    it('should return visible and not required for field without rules', () => {
      const fields: FieldDefinition[] = [
        createMockField('field1'),
        createMockField('field2'),
      ];

      const { result } = renderHook(() =>
        useConditionalLogic({ fields, fieldValues: {} }),
      );

      const state = result.current.getFieldState('field1');
      expect(state.visible).toBe(true);
      expect(state.required).toBe(false);
    });

    it('should show field when show condition is met', () => {
      const showRule: ConditionalRule = {
        id: 'rule1',
        sourceFieldId: 'dropdown1',
        operator: 'equals',
        value: 'אחר',
        action: 'show',
      };

      const fields: FieldDefinition[] = [
        createMockField('dropdown1', { type: 'dropdown', options: ['כן', 'לא', 'אחר'] }),
        createMockField('textField', {
          conditionalRules: [showRule],
          defaultVisibility: 'hidden',
        } as Partial<FieldDefinition>),
      ];

      const { result } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { dropdown1: 'אחר' },
        }),
      );

      const state = result.current.getFieldState('textField');
      expect(state.visible).toBe(true);
    });

    it('should hide field when show condition is not met', () => {
      const showRule: ConditionalRule = {
        id: 'rule1',
        sourceFieldId: 'dropdown1',
        operator: 'equals',
        value: 'אחר',
        action: 'show',
      };

      const fields: FieldDefinition[] = [
        createMockField('dropdown1', { type: 'dropdown', options: ['כן', 'לא', 'אחר'] }),
        createMockField('textField', {
          conditionalRules: [showRule],
          defaultVisibility: 'hidden',
        } as Partial<FieldDefinition>),
      ];

      const { result } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { dropdown1: 'כן' },
        }),
      );

      const state = result.current.getFieldState('textField');
      expect(state.visible).toBe(false);
    });

    it('should require field when require condition is met', () => {
      const requireRule: ConditionalRule = {
        id: 'rule1',
        sourceFieldId: 'checkbox1',
        operator: 'equals',
        value: true,
        action: 'require',
      };

      const fields: FieldDefinition[] = [
        createMockField('checkbox1', { type: 'checkbox' }),
        createMockField('textField', {
          conditionalRules: [requireRule],
          required: false,
        } as Partial<FieldDefinition>),
      ];

      const { result } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { checkbox1: true },
        }),
      );

      const state = result.current.getFieldState('textField');
      expect(state.required).toBe(true);
    });

    it('should handle Hebrew field values correctly', () => {
      const showRule: ConditionalRule = {
        id: 'rule1',
        sourceFieldId: 'status',
        operator: 'equals',
        value: 'פעיל',
        action: 'show',
      };

      const fields: FieldDefinition[] = [
        createMockField('status', { type: 'dropdown', options: ['פעיל', 'לא פעיל'] }),
        createMockField('details', {
          conditionalRules: [showRule],
          defaultVisibility: 'hidden',
        } as Partial<FieldDefinition>),
      ];

      const { result } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { status: 'פעיל' },
        }),
      );

      expect(result.current.getFieldState('details').visible).toBe(true);

      // Test with different Hebrew value
      const { result: result2 } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { status: 'לא פעיל' },
        }),
      );

      expect(result2.current.getFieldState('details').visible).toBe(false);
    });
  });

  describe('getAllFieldStates', () => {
    it('should return states for all fields', () => {
      const fields: FieldDefinition[] = [
        createMockField('field1'),
        createMockField('field2'),
        createMockField('field3'),
      ];

      const { result } = renderHook(() =>
        useConditionalLogic({ fields, fieldValues: {} }),
      );

      const allStates = result.current.getAllFieldStates();
      expect(Object.keys(allStates)).toHaveLength(3);
      expect(allStates['field1']).toBeDefined();
      expect(allStates['field2']).toBeDefined();
      expect(allStates['field3']).toBeDefined();
    });

    it('should update all states when conditions change', () => {
      const showRule: ConditionalRule = {
        id: 'rule1',
        sourceFieldId: 'toggle',
        operator: 'equals',
        value: true,
        action: 'show',
      };

      const fields: FieldDefinition[] = [
        createMockField('toggle', { type: 'checkbox' }),
        createMockField('dependent1', {
          conditionalRules: [showRule],
          defaultVisibility: 'hidden',
        } as Partial<FieldDefinition>),
        createMockField('dependent2', {
          conditionalRules: [showRule],
          defaultVisibility: 'hidden',
        } as Partial<FieldDefinition>),
      ];

      // Toggle is off
      const { result: resultOff } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { toggle: false },
        }),
      );

      const statesOff = resultOff.current.getAllFieldStates();
      expect(statesOff['dependent1'].visible).toBe(false);
      expect(statesOff['dependent2'].visible).toBe(false);

      // Toggle is on
      const { result: resultOn } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { toggle: true },
        }),
      );

      const statesOn = resultOn.current.getAllFieldStates();
      expect(statesOn['dependent1'].visible).toBe(true);
      expect(statesOn['dependent2'].visible).toBe(true);
    });
  });

  describe('getVisibleFields', () => {
    it('should return only visible fields', () => {
      const hideRule: ConditionalRule = {
        id: 'rule1',
        sourceFieldId: 'toggle',
        operator: 'equals',
        value: true,
        action: 'hide',
      };

      const fields: FieldDefinition[] = [
        createMockField('toggle', { type: 'checkbox' }),
        createMockField('alwaysVisible'),
        createMockField('hiddenWhenToggled', {
          conditionalRules: [hideRule],
        } as Partial<FieldDefinition>),
      ];

      const { result } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { toggle: true },
        }),
      );

      const visibleFields = result.current.getVisibleFields();
      expect(visibleFields).toHaveLength(2);
      expect(visibleFields.map((f) => f.id)).toContain('toggle');
      expect(visibleFields.map((f) => f.id)).toContain('alwaysVisible');
      expect(visibleFields.map((f) => f.id)).not.toContain('hiddenWhenToggled');
    });
  });

  describe('complex conditions', () => {
    it('should handle multiple AND conditions', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'yes',
          action: 'show',
          logicType: 'and',
        },
        {
          id: 'rule2',
          sourceFieldId: 'field2',
          operator: 'is_not_empty',
          value: '',
          action: 'show',
          logicType: 'and',
        },
      ];

      const fields: FieldDefinition[] = [
        createMockField('field1'),
        createMockField('field2'),
        createMockField('dependent', {
          conditionalRules: rules,
          defaultVisibility: 'hidden',
        } as Partial<FieldDefinition>),
      ];

      // Both conditions met
      const { result: resultBoth } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { field1: 'yes', field2: 'some value' },
        }),
      );
      expect(resultBoth.current.getFieldState('dependent').visible).toBe(true);

      // Only first condition met
      const { result: resultFirst } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { field1: 'yes', field2: '' },
        }),
      );
      expect(resultFirst.current.getFieldState('dependent').visible).toBe(false);
    });

    it('should handle OR conditions', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'option1',
          action: 'show',
          logicType: 'or',
        },
        {
          id: 'rule2',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'option2',
          action: 'show',
          logicType: 'or',
        },
      ];

      const fields: FieldDefinition[] = [
        createMockField('field1', { type: 'dropdown' }),
        createMockField('dependent', {
          conditionalRules: rules,
          defaultVisibility: 'hidden',
        } as Partial<FieldDefinition>),
      ];

      // First OR condition met
      const { result: result1 } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { field1: 'option1' },
        }),
      );
      expect(result1.current.getFieldState('dependent').visible).toBe(true);

      // Second OR condition met
      const { result: result2 } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { field1: 'option2' },
        }),
      );
      expect(result2.current.getFieldState('dependent').visible).toBe(true);

      // No condition met
      const { result: result3 } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { field1: 'option3' },
        }),
      );
      expect(result3.current.getFieldState('dependent').visible).toBe(false);
    });

    it('should handle contains operator with Hebrew', () => {
      const rule: ConditionalRule = {
        id: 'rule1',
        sourceFieldId: 'notes',
        operator: 'contains',
        value: 'דחוף',
        action: 'require',
      };

      const fields: FieldDefinition[] = [
        createMockField('notes'),
        createMockField('priority', {
          conditionalRules: [rule],
          required: false,
        } as Partial<FieldDefinition>),
      ];

      // Contains the Hebrew word
      const { result: result1 } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { notes: 'זה משהו דחוף מאוד' },
        }),
      );
      expect(result1.current.getFieldState('priority').required).toBe(true);

      // Does not contain
      const { result: result2 } = renderHook(() =>
        useConditionalLogic({
          fields,
          fieldValues: { notes: 'זה רגיל' },
        }),
      );
      expect(result2.current.getFieldState('priority').required).toBe(false);
    });
  });

  describe('memoization', () => {
    it('should return stable references when inputs do not change', () => {
      const fields: FieldDefinition[] = [createMockField('field1')];
      const fieldValues = { field1: 'test' };

      const { result, rerender } = renderHook(() =>
        useConditionalLogic({ fields, fieldValues }),
      );

      const firstGetFieldState = result.current.getFieldState;
      const firstGetAllFieldStates = result.current.getAllFieldStates;
      const firstGetVisibleFields = result.current.getVisibleFields;

      rerender();

      expect(result.current.getFieldState).toBe(firstGetFieldState);
      expect(result.current.getAllFieldStates).toBe(firstGetAllFieldStates);
      expect(result.current.getVisibleFields).toBe(firstGetVisibleFields);
    });
  });
});
