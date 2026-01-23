import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  evaluateAllConditions,
  getFieldVisibility,
  getFieldRequirement,
  type ConditionalRule,
  type FieldValues,
} from './conditional-evaluator';

describe('conditional-evaluator', () => {
  describe('evaluateCondition', () => {
    describe('equals operator', () => {
      it('should return true when values are equal (string)', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'yes',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'yes')).toBe(true);
      });

      it('should return false when values are not equal', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'yes',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'no')).toBe(false);
      });

      it('should handle Hebrew text comparison', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'כן',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'כן')).toBe(true);
        expect(evaluateCondition(rule, 'לא')).toBe(false);
      });

      it('should handle boolean values', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: true,
          action: 'show',
        };
        expect(evaluateCondition(rule, true)).toBe(true);
        expect(evaluateCondition(rule, false)).toBe(false);
      });

      it('should handle numeric values', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 42,
          action: 'show',
        };
        expect(evaluateCondition(rule, 42)).toBe(true);
        expect(evaluateCondition(rule, '42')).toBe(true); // String/number coercion
        expect(evaluateCondition(rule, 43)).toBe(false);
      });
    });

    describe('not_equals operator', () => {
      it('should return true when values are different', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'not_equals',
          value: 'yes',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'no')).toBe(true);
      });

      it('should return false when values are equal', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'not_equals',
          value: 'yes',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'yes')).toBe(false);
      });
    });

    describe('contains operator', () => {
      it('should return true when value contains substring', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'contains',
          value: 'hello',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'hello world')).toBe(true);
      });

      it('should return false when value does not contain substring', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'contains',
          value: 'goodbye',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'hello world')).toBe(false);
      });

      it('should handle Hebrew text', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'contains',
          value: 'שלום',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'שלום עולם')).toBe(true);
        expect(evaluateCondition(rule, 'להתראות')).toBe(false);
      });

      it('should be case insensitive', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'contains',
          value: 'Hello',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'HELLO WORLD')).toBe(true);
      });
    });

    describe('is_empty operator', () => {
      it('should return true for empty string', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'is_empty',
          value: '',
          action: 'show',
        };
        expect(evaluateCondition(rule, '')).toBe(true);
      });

      it('should return true for whitespace only', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'is_empty',
          value: '',
          action: 'show',
        };
        expect(evaluateCondition(rule, '   ')).toBe(true);
      });

      it('should return true for undefined/null', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'is_empty',
          value: '',
          action: 'show',
        };
        expect(evaluateCondition(rule, undefined)).toBe(true);
        expect(evaluateCondition(rule, null)).toBe(true);
      });

      it('should return false for non-empty value', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'is_empty',
          value: '',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'text')).toBe(false);
      });
    });

    describe('is_not_empty operator', () => {
      it('should return true for non-empty value', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'is_not_empty',
          value: '',
          action: 'show',
        };
        expect(evaluateCondition(rule, 'text')).toBe(true);
        expect(evaluateCondition(rule, 'שלום')).toBe(true);
      });

      it('should return false for empty value', () => {
        const rule: ConditionalRule = {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'is_not_empty',
          value: '',
          action: 'show',
        };
        expect(evaluateCondition(rule, '')).toBe(false);
        expect(evaluateCondition(rule, '   ')).toBe(false);
        expect(evaluateCondition(rule, undefined)).toBe(false);
      });
    });
  });

  describe('evaluateAllConditions', () => {
    const fieldValues: FieldValues = {
      field1: 'yes',
      field2: 'אחר',
      field3: '',
    };

    it('should return true when all AND conditions are met', () => {
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
          operator: 'equals',
          value: 'אחר',
          action: 'show',
          logicType: 'and',
        },
      ];
      expect(evaluateAllConditions(rules, fieldValues)).toBe(true);
    });

    it('should return false when any AND condition is not met', () => {
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
          operator: 'equals',
          value: 'no',
          action: 'show',
          logicType: 'and',
        },
      ];
      expect(evaluateAllConditions(rules, fieldValues)).toBe(false);
    });

    it('should return true when any OR condition is met', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'no',
          action: 'show',
          logicType: 'or',
        },
        {
          id: 'rule2',
          sourceFieldId: 'field2',
          operator: 'equals',
          value: 'אחר',
          action: 'show',
          logicType: 'or',
        },
      ];
      expect(evaluateAllConditions(rules, fieldValues)).toBe(true);
    });

    it('should return false when no OR condition is met', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'no',
          action: 'show',
          logicType: 'or',
        },
        {
          id: 'rule2',
          sourceFieldId: 'field2',
          operator: 'equals',
          value: 'different',
          action: 'show',
          logicType: 'or',
        },
      ];
      expect(evaluateAllConditions(rules, fieldValues)).toBe(false);
    });

    it('should default to AND logic when logicType is not specified', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'field1',
          operator: 'equals',
          value: 'yes',
          action: 'show',
        },
        {
          id: 'rule2',
          sourceFieldId: 'field2',
          operator: 'equals',
          value: 'אחר',
          action: 'show',
        },
      ];
      expect(evaluateAllConditions(rules, fieldValues)).toBe(true);
    });

    it('should return true for empty rules array', () => {
      expect(evaluateAllConditions([], fieldValues)).toBe(true);
    });
  });

  describe('getFieldVisibility', () => {
    const fieldValues: FieldValues = {
      dropdown1: 'אחר',
    };

    it('should return visible when show condition is met', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'dropdown1',
          operator: 'equals',
          value: 'אחר',
          action: 'show',
        },
      ];
      expect(getFieldVisibility(rules, fieldValues, 'hidden')).toBe('visible');
    });

    it('should return hidden when hide condition is met', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'dropdown1',
          operator: 'equals',
          value: 'אחר',
          action: 'hide',
        },
      ];
      expect(getFieldVisibility(rules, fieldValues, 'visible')).toBe('hidden');
    });

    it('should return default visibility when no conditions are met', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'dropdown1',
          operator: 'equals',
          value: 'different',
          action: 'show',
        },
      ];
      expect(getFieldVisibility(rules, fieldValues, 'hidden')).toBe('hidden');
      expect(getFieldVisibility(rules, fieldValues, 'visible')).toBe('visible');
    });

    it('should return visible by default when no rules exist', () => {
      expect(getFieldVisibility([], fieldValues, 'visible')).toBe('visible');
      expect(getFieldVisibility(undefined, fieldValues, 'visible')).toBe('visible');
    });
  });

  describe('getFieldRequirement', () => {
    const fieldValues: FieldValues = {
      checkbox1: true,
    };

    it('should return required when require condition is met', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'checkbox1',
          operator: 'equals',
          value: true,
          action: 'require',
        },
      ];
      expect(getFieldRequirement(rules, fieldValues, false)).toBe(true);
    });

    it('should return not required when unrequire condition is met', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'checkbox1',
          operator: 'equals',
          value: true,
          action: 'unrequire',
        },
      ];
      expect(getFieldRequirement(rules, fieldValues, true)).toBe(false);
    });

    it('should return default requirement when no conditions are met', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'checkbox1',
          operator: 'equals',
          value: false,
          action: 'require',
        },
      ];
      expect(getFieldRequirement(rules, fieldValues, false)).toBe(false);
    });
  });
});
