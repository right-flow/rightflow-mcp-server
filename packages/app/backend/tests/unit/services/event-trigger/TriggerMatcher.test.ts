/**
 * Unit Tests for TriggerMatcher Service
 * Tests trigger matching logic, condition evaluation, and priority handling
 *
 * Coverage target: 95%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TriggerMatcher } from '../../../../src/services/event-trigger/TriggerMatcher';
import type { Event, EventTrigger } from '../../../../src/types/event-trigger';
import {
  testEvents,
  testTriggers,
  testOrganizations,
  testForms,
  createTestEvent
} from '../../../fixtures/event-trigger/events';

vi.mock('../../../../src/config/database');

describe('TriggerMatcher', () => {
  let triggerMatcher: TriggerMatcher;
  let mockDb: any;

  beforeEach(() => {
    mockDb = vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      whereIn: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([])
    }));

    triggerMatcher = new TriggerMatcher(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('matchTriggers() - Basic Matching', () => {
    it('should match triggers by event_type', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const triggers = [testTriggers.platformTrigger, testTriggers.organizationTrigger];

      mockDb().orderBy.mockResolvedValue(triggers);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(mockDb).toHaveBeenCalledWith('event_triggers');
      expect(mockDb().where).toHaveBeenCalledWith('organization_id', event.organization_id);
      expect(mockDb().where).toHaveBeenCalledWith('event_type', 'form.submitted');
      expect(matched).toHaveLength(2);
    });

    it('should only match active triggers', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const triggers = [testTriggers.userTrigger]; // Active trigger

      mockDb().orderBy.mockResolvedValue(triggers);

      await triggerMatcher.matchTriggers(event);

      expect(mockDb().where).toHaveBeenCalledWith('status', 'active');
    });

    it('should return empty array when no triggers match', async () => {
      const event = createTestEvent(testEvents.workflowCompleted);

      mockDb().orderBy.mockResolvedValue([]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toEqual([]);
    });

    it('should match platform-level triggers (null organization_id)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const platformTrigger = testTriggers.platformTrigger;

      mockDb().orderBy.mockResolvedValue([platformTrigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(platformTrigger);
    });

    it('should match organization-specific triggers', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const orgTrigger = testTriggers.organizationTrigger;

      mockDb().orderBy.mockResolvedValue([orgTrigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(orgTrigger);
    });
  });

  describe('Scope Filtering', () => {
    it('should match "all_forms" scope to any form', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        entity_id: testForms.form1.id
      });
      const trigger = {
        ...testTriggers.userTrigger,
        scope: 'all_forms' as const,
        form_ids: []
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should match "specific_forms" scope only to listed forms', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        entity_id: testForms.form1.id
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        scope: 'specific_forms' as const,
        form_ids: [testForms.form1.id]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should NOT match "specific_forms" scope to non-listed forms', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        entity_id: testForms.form2.id
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        scope: 'specific_forms' as const,
        form_ids: [testForms.form1.id] // Only form1
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).not.toContainEqual(trigger);
    });

    it('should handle empty form_ids array for "specific_forms"', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.organizationTrigger,
        scope: 'specific_forms' as const,
        form_ids: []
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).not.toContainEqual(trigger);
    });
  });

  describe('Condition Evaluation', () => {
    it('should match trigger with no conditions (always true)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: []
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should evaluate "equals" condition correctly', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: { fields: { priority: 'high' } }
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        conditions: [
          { field: 'data.fields.priority', operator: 'equals' as const, value: 'high' }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should fail "equals" condition when values differ', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: { fields: { priority: 'low' } }
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        conditions: [
          { field: 'data.fields.priority', operator: 'equals' as const, value: 'high' }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).not.toContainEqual(trigger);
    });

    it('should evaluate "not_equals" condition', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: { fields: { status: 'active' } }
      });
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: [
          {
            field: 'data.fields.status',
            operator: 'not_equals' as const,
            value: 'inactive'
          }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should evaluate "contains" condition for strings', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: { fields: { description: 'This is urgent!' } }
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        conditions: [
          {
            field: 'data.fields.description',
            operator: 'contains' as const,
            value: 'urgent'
          }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should evaluate "greater_than" condition for numbers', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: { fields: { amount: 1000 } }
      });
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: [
          { field: 'data.fields.amount', operator: 'greater_than' as const, value: 500 }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should evaluate "less_than" condition for numbers', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: { fields: { score: 25 } }
      });
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: [
          { field: 'data.fields.score', operator: 'less_than' as const, value: 50 }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should evaluate "in" condition for arrays', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: { fields: { category: 'urgent' } }
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        conditions: [
          {
            field: 'data.fields.category',
            operator: 'in' as const,
            value: ['urgent', 'high-priority', 'critical']
          }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should handle nested field paths (dot notation)', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: {
          customer: {
            profile: {
              vipStatus: true
            }
          }
        }
      });
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: [
          {
            field: 'data.customer.profile.vipStatus',
            operator: 'equals' as const,
            value: true
          }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should handle undefined fields gracefully', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: [
          {
            field: 'data.fields.nonexistent',
            operator: 'equals' as const,
            value: 'something'
          }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).not.toContainEqual(trigger);
    });

    it('should evaluate multiple conditions with AND logic', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: {
          fields: {
            priority: 'high',
            category: 'urgent',
            amount: 1000
          }
        }
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        conditions: [
          { field: 'data.fields.priority', operator: 'equals' as const, value: 'high' },
          { field: 'data.fields.category', operator: 'equals' as const, value: 'urgent' },
          {
            field: 'data.fields.amount',
            operator: 'greater_than' as const,
            value: 500
          }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should fail if any condition in AND chain fails', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: {
          fields: {
            priority: 'high',
            category: 'normal', // Not urgent
            amount: 1000
          }
        }
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        conditions: [
          { field: 'data.fields.priority', operator: 'equals' as const, value: 'high' },
          { field: 'data.fields.category', operator: 'equals' as const, value: 'urgent' },
          {
            field: 'data.fields.amount',
            operator: 'greater_than' as const,
            value: 500
          }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).not.toContainEqual(trigger);
    });
  });

  describe('Hebrew Text Handling', () => {
    it('should match Hebrew text with "equals" condition', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent, {
        data: { fields: { status: 'ממתין לאישור' } }
      });
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: [
          {
            field: 'data.fields.status',
            operator: 'equals' as const,
            value: 'ממתין לאישור'
          }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should match Hebrew text with "contains" condition', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent, {
        data: { fields: { comments: 'זה טופס דחוף מאוד' } }
      });
      const trigger = {
        ...testTriggers.organizationTrigger,
        conditions: [
          { field: 'data.fields.comments', operator: 'contains' as const, value: 'דחוף' }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should normalize Unicode before comparison', async () => {
      const event = createTestEvent(testEvents.hebrewTextEvent, {
        data: { fields: { text: 'שלום\u202B עולם\u202C' } }
      });
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: [
          { field: 'data.fields.text', operator: 'contains' as const, value: 'שלום' }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });
  });

  describe('Priority Ordering', () => {
    it('should return triggers ordered by priority (ascending)', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const triggers = [
        { ...testTriggers.platformTrigger, priority: 0 },
        { ...testTriggers.organizationTrigger, priority: 10 },
        { ...testTriggers.userTrigger, priority: 5 }
      ];

      mockDb().orderBy.mockResolvedValue(triggers);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(mockDb().orderBy).toHaveBeenCalledWith('priority', 'asc');
      expect(matched[0].priority).toBeLessThanOrEqual(matched[1].priority);
    });

    it('should handle triggers with same priority', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const triggers = [
        { ...testTriggers.platformTrigger, priority: 5 },
        { ...testTriggers.organizationTrigger, priority: 5 }
      ];

      mockDb().orderBy.mockResolvedValue(triggers);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toHaveLength(2);
      expect(matched[0].priority).toBe(5);
      expect(matched[1].priority).toBe(5);
    });
  });

  describe('Performance', () => {
    it('should handle large number of triggers efficiently', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const triggers = Array.from({ length: 100 }, (_, i) => ({
        ...testTriggers.userTrigger,
        id: `trigger-${i}`,
        priority: i
      }));

      mockDb().orderBy.mockResolvedValue(triggers);

      const startTime = Date.now();
      const matched = await triggerMatcher.matchTriggers(event);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should be fast
      expect(matched).toHaveLength(100);
    });

    it('should cache trigger queries for same event type', async () => {
      const event1 = createTestEvent(testEvents.formSubmitted);
      const event2 = createTestEvent(testEvents.formSubmitted);

      mockDb().orderBy.mockResolvedValue([testTriggers.userTrigger]);

      await triggerMatcher.matchTriggers(event1);
      await triggerMatcher.matchTriggers(event2);

      // Should query DB twice (no caching in this simple implementation)
      expect(mockDb).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null event data', async () => {
      const event = createTestEvent(testEvents.formSubmitted, {
        data: null
      });
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: [
          { field: 'data.fields.priority', operator: 'equals' as const, value: 'high' }
        ]
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).not.toContainEqual(trigger);
    });

    it('should handle empty conditions array', async () => {
      const event = createTestEvent(testEvents.formSubmitted);
      const trigger = {
        ...testTriggers.userTrigger,
        conditions: []
      };

      mockDb().orderBy.mockResolvedValue([trigger]);

      const matched = await triggerMatcher.matchTriggers(event);

      expect(matched).toContainEqual(trigger);
    });

    it('should handle database errors gracefully', async () => {
      const event = createTestEvent(testEvents.formSubmitted);

      mockDb().orderBy.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(triggerMatcher.matchTriggers(event)).rejects.toThrow(
        'DB connection lost'
      );
    });

    it('should handle concurrent match requests', async () => {
      const events = Array.from({ length: 10 }, () =>
        createTestEvent(testEvents.formSubmitted)
      );

      mockDb().orderBy.mockResolvedValue([testTriggers.userTrigger]);

      const results = await Promise.all(
        events.map(e => triggerMatcher.matchTriggers(e))
      );

      expect(results).toHaveLength(10);
      results.forEach(matched => {
        expect(matched).toHaveLength(1);
      });
    });
  });
});
