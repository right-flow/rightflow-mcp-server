/**
 * TriggerMatcher Service
 * Matches events to triggers based on event type, scope, and conditions
 * Evaluates complex conditions with support for operators and nested fields
 */

import type { Knex } from 'knex';
import type { Event, EventTrigger, TriggerCondition } from '../../types/event-trigger';

export class TriggerMatcher {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  /**
   * Find all triggers that match the given event
   * Returns triggers ordered by priority (ascending)
   */
  async matchTriggers(event: Event): Promise<EventTrigger[]> {
    // Query triggers for this organization and event type
    const query = this.db('event_triggers')
      .where('organization_id', event.organization_id)
      .where('event_type', event.event_type)
      .where('status', 'active')
      .orderBy('priority', 'asc');

    const triggers = await query;

    // Filter by scope and evaluate conditions
    const matchedTriggers: EventTrigger[] = [];

    for (const trigger of triggers) {
      // Parse JSON fields
      const parsedTrigger: EventTrigger = {
        ...trigger,
        form_ids: Array.isArray(trigger.form_ids)
          ? trigger.form_ids
          : JSON.parse(trigger.form_ids || '[]'),
        conditions: Array.isArray(trigger.conditions)
          ? trigger.conditions
          : JSON.parse(trigger.conditions || '[]'),
      };

      // Check scope
      if (!this.matchesScope(parsedTrigger, event)) {
        continue;
      }

      // Evaluate conditions
      if (!this.evaluateConditions(parsedTrigger.conditions, event)) {
        continue;
      }

      matchedTriggers.push(parsedTrigger);
    }

    return matchedTriggers;
  }

  /**
   * Check if event matches trigger scope
   */
  private matchesScope(trigger: EventTrigger, event: Event): boolean {
    if (trigger.scope === 'all_forms') {
      return true;
    }

    if (trigger.scope === 'specific_forms') {
      if (!trigger.form_ids || trigger.form_ids.length === 0) {
        return false;
      }

      // Check if event's entity_id is in the form_ids list
      return trigger.form_ids.includes(event.entity_id);
    }

    return false;
  }

  /**
   * Evaluate all conditions (AND logic)
   * Returns true if all conditions pass
   */
  private evaluateConditions(conditions: TriggerCondition[], event: Event): boolean {
    // No conditions = always match
    if (!conditions || conditions.length === 0) {
      return true;
    }

    // All conditions must pass (AND logic)
    return conditions.every(condition => this.evaluateCondition(condition, event));
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: TriggerCondition, event: Event): boolean {
    // Get field value using dot notation (e.g., "data.fields.priority")
    const fieldValue = this.getNestedValue(event, condition.field);

    // Handle undefined/null fields
    if (fieldValue === undefined || fieldValue === null) {
      if (condition.operator === 'is_null') return true;
      if (condition.operator === 'is_not_null') return false;
      return false; // Other operators fail for null values
    }

    // Normalize strings (remove Unicode control characters)
    const normalizedFieldValue =
      typeof fieldValue === 'string' ? this.normalizeString(fieldValue) : fieldValue;
    const normalizedConditionValue =
      typeof condition.value === 'string'
        ? this.normalizeString(condition.value)
        : condition.value;

    // Evaluate based on operator
    switch (condition.operator) {
      case 'equals':
        return normalizedFieldValue === normalizedConditionValue;

      case 'not_equals':
        return normalizedFieldValue !== normalizedConditionValue;

      case 'contains':
        if (typeof normalizedFieldValue !== 'string') return false;
        return normalizedFieldValue.includes(normalizedConditionValue);

      case 'not_contains':
        if (typeof normalizedFieldValue !== 'string') return false;
        return !normalizedFieldValue.includes(normalizedConditionValue);

      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);

      case 'less_than':
        return Number(fieldValue) < Number(condition.value);

      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(condition.value);

      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(condition.value);

      case 'in':
        if (!Array.isArray(condition.value)) return false;
        return condition.value.includes(normalizedFieldValue);

      case 'not_in':
        if (!Array.isArray(condition.value)) return false;
        return !condition.value.includes(normalizedFieldValue);

      case 'is_null':
        return false; // Already handled above

      case 'is_not_null':
        return true; // Already handled above

      default:
        console.warn(`TriggerMatcher: Unknown operator "${condition.operator}"`);
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   * Example: "data.fields.priority" -> event.data.fields.priority
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Normalize string by removing dangerous Unicode control characters
   */
  private normalizeString(str: string): string {
    const dangerousUnicode = /[\u202A-\u202E\u2066-\u2069]/g;
    return str.replace(dangerousUnicode, '');
  }
}
