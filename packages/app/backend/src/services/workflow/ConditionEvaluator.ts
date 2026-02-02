/**
 * ConditionEvaluator Service
 * Evaluates conditions and logical expressions in workflows
 */

import { Condition, WorkflowContext } from './types';
import { get } from 'lodash';

export class ConditionEvaluator {
  /**
   * Evaluate multiple conditions with AND/OR operator
   */
  async evaluate(
    conditions: Condition[],
    operator: 'AND' | 'OR',
    context: WorkflowContext
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means pass
    }

    const results = await Promise.all(
      conditions.map(condition => this.evaluateSingle(condition, context))
    );

    if (operator === 'AND') {
      return results.every(result => result === true);
    } else {
      return results.some(result => result === true);
    }
  }

  /**
   * Evaluate a single condition
   */
  async evaluateSingle(
    condition: Condition,
    context: WorkflowContext
  ): Promise<boolean> {
    const { field, operator, value, dataType } = condition;

    // Get the field value from context
    const fieldValue = this.getFieldValue(field, context);

    // Cast values to appropriate types
    const castFieldValue = this.castValue(fieldValue, dataType);
    const castCompareValue = this.castValue(value, dataType);

    // Perform comparison
    switch (operator) {
      case 'eq':
        return this.equals(castFieldValue, castCompareValue);

      case 'ne':
        return !this.equals(castFieldValue, castCompareValue);

      case 'gt':
        return this.greaterThan(castFieldValue, castCompareValue);

      case 'lt':
        return this.lessThan(castFieldValue, castCompareValue);

      case 'gte':
        return this.greaterThanOrEqual(castFieldValue, castCompareValue);

      case 'lte':
        return this.lessThanOrEqual(castFieldValue, castCompareValue);

      case 'contains':
        return this.contains(castFieldValue, castCompareValue);

      case 'exists':
        return this.exists(fieldValue);

      case 'in':
        return this.isIn(castFieldValue, castCompareValue);

      case 'not_in':
        return !this.isIn(castFieldValue, castCompareValue);

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(field: string, context: WorkflowContext): any {
    // Support nested field access with dot notation
    // e.g., "formData.customer.age" or "variables.totalAmount"

    // First try direct context properties
    if (context.hasOwnProperty(field)) {
      return (context as any)[field];
    }

    // Try formData
    if (field.startsWith('formData.') || context.formData.hasOwnProperty(field)) {
      const formField = field.startsWith('formData.')
        ? field.substring('formData.'.length)
        : field;
      return get(context.formData, formField);
    }

    // Try variables
    if (field.startsWith('variables.') || context.variables.hasOwnProperty(field)) {
      const varField = field.startsWith('variables.')
        ? field.substring('variables.'.length)
        : field;
      return get(context.variables, varField);
    }

    // Try metadata
    if (field.startsWith('metadata.') && context.metadata) {
      const metaField = field.substring('metadata.'.length);
      return get(context.metadata, metaField);
    }

    // Use lodash get for deep nested access
    return get(context, field);
  }

  /**
   * Cast value to specified data type
   */
  private castValue(value: any, dataType?: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (!dataType) {
      return value; // Return as-is if no type specified
    }

    switch (dataType) {
      case 'string':
        return String(value);

      case 'number':
        return Number(value);

      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);

      case 'date':
        if (value instanceof Date) {
          return value;
        }
        return new Date(value);

      case 'array':
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return [value]; // Wrap single value in array
          }
        }
        return [value];

      default:
        return value;
    }
  }

  /**
   * Equality comparison (handles arrays and objects)
   */
  private equals(a: any, b: any): boolean {
    // Handle null/undefined
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, index) => this.equals(val, b[index]));
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.equals(a[key], b[key]));
    }

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Primitive comparison
    return a === b;
  }

  /**
   * Greater than comparison
   */
  private greaterThan(a: any, b: any): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() > b.getTime();
    }
    return a > b;
  }

  /**
   * Less than comparison
   */
  private lessThan(a: any, b: any): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() < b.getTime();
    }
    return a < b;
  }

  /**
   * Greater than or equal comparison
   */
  private greaterThanOrEqual(a: any, b: any): boolean {
    return this.equals(a, b) || this.greaterThan(a, b);
  }

  /**
   * Less than or equal comparison
   */
  private lessThanOrEqual(a: any, b: any): boolean {
    return this.equals(a, b) || this.lessThan(a, b);
  }

  /**
   * Contains check (string or array)
   */
  private contains(value: any, searchValue: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    // String contains
    if (typeof value === 'string' && typeof searchValue === 'string') {
      return value.toLowerCase().includes(searchValue.toLowerCase());
    }

    // Array contains
    if (Array.isArray(value)) {
      return value.some(item => this.equals(item, searchValue));
    }

    // Object contains key
    if (typeof value === 'object' && typeof searchValue === 'string') {
      return searchValue in value;
    }

    return false;
  }

  /**
   * Existence check
   */
  private exists(value: any): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Check if value is in array
   */
  private isIn(value: any, array: any): boolean {
    if (!Array.isArray(array)) {
      return false;
    }
    return array.some(item => this.equals(value, item));
  }

  /**
   * Evaluate complex expressions (for advanced use)
   */
  async evaluateExpression(
    expression: string,
    context: WorkflowContext
  ): Promise<any> {
    // This could be enhanced with a safe expression evaluator
    // For now, we'll just support simple variable substitution
    let result = expression;

    // Replace variable references ${variableName} with actual values
    const variablePattern = /\$\{([^}]+)\}/g;
    const matches = expression.match(variablePattern);

    if (matches) {
      for (const match of matches) {
        const varName = match.slice(2, -1); // Remove ${ and }
        const value = this.getFieldValue(varName, context);
        result = result.replace(match, String(value));
      }
    }

    return result;
  }

  /**
   * Validate a condition object
   */
  validateCondition(condition: Condition): boolean {
    if (!condition.field || !condition.operator) {
      return false;
    }

    const validOperators = [
      'eq', 'ne', 'gt', 'lt', 'gte', 'lte',
      'contains', 'exists', 'in', 'not_in'
    ];

    if (!validOperators.includes(condition.operator)) {
      return false;
    }

    // 'exists' operator doesn't need a value
    if (condition.operator === 'exists') {
      return true;
    }

    // All other operators need a value
    return condition.value !== undefined;
  }

  /**
   * Helper: Check if value is truthy
   */
  isTruthy(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return Boolean(value);
  }

  /**
   * Helper: Format value for display
   */
  formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}