/**
 * Response Service Tests
 * Tests for form submission and response management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResponsesService } from './responses.service';
import { getDb, closeDb } from '../../lib/db';

describe('ResponsesService', () => {
  let responsesService: ResponsesService;
  let testUserId: string;
  let testFormId: string;
  let testPlanId: string;

  beforeEach(async () => {
    responsesService = new ResponsesService();

    // Create test plan
    const [plan] = await getDb()('plans').insert({
      id: crypto.randomUUID(),
      name: 'Free',
      monthly_price_ils: 0,
      max_forms: 3,
      max_responses_monthly: 100,
      max_storage_mb: 100,
      features: {},
      is_active: true,
    }).returning('*');
    testPlanId = plan.id;

    // Create test user with unique identifiers
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const [user] = await getDb()('users').insert({
      id: crypto.randomUUID(),
      clerk_id: `test_${uniqueId}`,
      email: `test_${uniqueId}@example.com`,
      plan_id: testPlanId,
      tenant_type: 'rightflow',
    }).returning('*');
    testUserId = user.id;

    // Create test form with unique slug
    const uniqueSlug = `test-form-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const [form] = await getDb()('forms').insert({
      id: crypto.randomUUID(),
      user_id: testUserId,
      slug: uniqueSlug,
      title: 'Test Form',
      description: 'Test form for responses',
      status: 'published',
      fields: JSON.stringify([
        {
          id: 'field1',
          type: 'text',
          label: 'Name',
          required: true,
        },
        {
          id: 'field2',
          type: 'email',
          label: 'Email',
          required: true,
        },
        {
          id: 'field3',
          type: 'text',
          label: 'Phone',
          required: false,
        },
      ]),
      tenant_type: 'rightflow',
    }).returning('*');
    testFormId = form.id;

    // Create usage metrics
    await getDb()('usage_metrics').insert({
      id: crypto.randomUUID(),
      user_id: testUserId,
      forms_count: 1,
      responses_count: 0,
      storage_used_bytes: 0,
      period_start: new Date(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  });

  afterEach(async () => {
    // Clean up test data - check if variables are defined first
    if (testFormId) {
      await getDb()('responses').where({ form_id: testFormId }).del();
      await getDb()('forms').where({ id: testFormId }).del();
    }
    if (testUserId) {
      await getDb()('usage_metrics').where({ user_id: testUserId }).del();
      await getDb()('users').where({ id: testUserId }).del();
    }
    if (testPlanId) {
      await getDb()('plans').where({ id: testPlanId }).del();
    }
    await closeDb();
  });

  describe('submitResponse', () => {
    it('stores form submission with valid data', async () => {
      const responseData = {
        field1: 'John Doe',
        field2: 'john@example.com',
        field3: '555-1234',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: responseData,
        submitterIp: '192.168.1.1',
        submitterUserAgent: 'Mozilla/5.0 Test',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.formId).toBe(testFormId);
      expect(result.data).toEqual(responseData);

      // Verify stored in database
      const stored = await getDb()('responses').where({ id: result.id }).first();
      expect(stored).toBeDefined();
      expect(stored.form_id).toBe(testFormId);
    });

    it('validates required fields', async () => {
      const invalidData = {
        field3: '555-1234', // Missing required field1 and field2
      };

      await expect(
        responsesService.submitResponse({
          formId: testFormId,
          data: invalidData,
        }),
      ).rejects.toThrow('Missing required field: Name');
    });

    it('accepts submission with optional fields missing', async () => {
      const validData = {
        field1: 'Jane Doe',
        field2: 'jane@example.com',
        // field3 is optional, so can be omitted
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: validData,
      });

      expect(result).toBeDefined();
      expect(result.data).toEqual(validData);
    });

    it('throws error for invalid form ID', async () => {
      const invalidFormId = crypto.randomUUID();

      await expect(
        responsesService.submitResponse({
          formId: invalidFormId,
          data: { field1: 'Test', field2: 'test@example.com' },
        }),
      ).rejects.toThrow('Form not found');
    });

    it('stores submitter metadata', async () => {
      const responseData = {
        field1: 'Test User',
        field2: 'test@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: responseData,
        submitterIp: '10.0.0.1',
        submitterUserAgent: 'Chrome/91.0',
      });

      const stored = await getDb()('responses').where({ id: result.id }).first();
      expect(stored.submitter_ip).toBe('10.0.0.1');
      expect(stored.submitter_user_agent).toBe('Chrome/91.0');
    });

    it('increments user response count', async () => {
      const responseData = {
        field1: 'Test',
        field2: 'test@example.com',
      };

      const usageBefore = await getDb()('usage_metrics')
        .where({ user_id: testUserId })
        .first();
      expect(Number(usageBefore.responses_count)).toBe(0);

      await responsesService.submitResponse({
        formId: testFormId,
        data: responseData,
      });

      const usageAfter = await getDb()('usage_metrics')
        .where({ user_id: testUserId })
        .first();
      expect(Number(usageAfter.responses_count)).toBe(1);
    });

    it('sanitizes HTML in text fields', async () => {
      const dataWithHtml = {
        field1: '<script>alert("xss")</script>John',
        field2: 'test@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithHtml,
      });

      // HTML should be stripped from field1
      expect(result.data.field1).not.toContain('<script>');
      expect(result.data.field1).toContain('John');
    });

    it('sanitizes image tags with onerror handlers', async () => {
      const dataWithXss = {
        field1: '<img src=x onerror="alert(1)">Name',
        field2: 'test@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithXss,
      });

      // All HTML tags should be removed
      expect(result.data.field1).not.toContain('<img');
      expect(result.data.field1).not.toContain('onerror');
      expect(result.data.field1).not.toContain('<');
      expect(result.data.field1).not.toContain('>');
      expect(result.data.field1).toBe('Name');
    });

    it('sanitizes javascript: protocol URLs', async () => {
      const dataWithJsUrl = {
        field1: 'javascript:alert(1)', // eslint-disable-line no-script-url
        field2: 'test@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithJsUrl,
      });

      // javascript: should be removed
      expect(result.data.field1).not.toContain('javascript:'); // eslint-disable-line no-script-url
      expect(result.data.field1).toBe('alert(1)');
    });

    it('sanitizes event handlers in attributes', async () => {
      const dataWithEvents = {
        field1: '<div onclick="alert(1)" onload="alert(2)">Content</div>',
        field2: 'test@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithEvents,
      });

      // All HTML and event handlers should be removed
      expect(result.data.field1).not.toContain('onclick');
      expect(result.data.field1).not.toContain('onload');
      expect(result.data.field1).not.toContain('<div');
      expect(result.data.field1).toBe('Content');
    });

    it('sanitizes iframe, object, and embed tags', async () => {
      const dataWithDangerousTags = {
        field1: '<iframe src="evil.com"></iframe><object data="evil"></object><embed src="evil">Text',
        field2: 'test@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithDangerousTags,
      });

      // All dangerous tags should be removed
      expect(result.data.field1).not.toContain('<iframe');
      expect(result.data.field1).not.toContain('<object');
      expect(result.data.field1).not.toContain('<embed');
      expect(result.data.field1).toBe('Text');
    });

    it('sanitizes data URIs', async () => {
      const dataWithDataUri = {
        field1: 'data:text/html,<script>alert(1)</script>Name',
        field2: 'test@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithDataUri,
      });

      // data:text/html should be removed
      expect(result.data.field1).not.toContain('data:text/html');
      expect(result.data.field1).not.toContain('<script>');
    });

    it('sanitizes Unicode RTL control characters', async () => {
      const dataWithRtl = {
        field1: 'Normal\u202Ehidden\u202Ctext',
        field2: 'test@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithRtl,
      });

      // RTL control characters should be removed
      expect(result.data.field1).not.toContain('\u202E');
      expect(result.data.field1).not.toContain('\u202C');
      expect(result.data.field1).toBe('Normalhiddentext');
    });

    it('sanitizes nested objects recursively', async () => {
      const dataWithNestedXss = {
        field1: 'John',
        field2: 'test@example.com',
        nested: {
          dangerous: '<script>alert("nested")</script>Content',
          safe: 'Normal text',
        },
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithNestedXss,
      });

      // Nested dangerous content should be sanitized (tags removed but content preserved)
      expect(result.data.nested.dangerous).not.toContain('<script>');
      expect(result.data.nested.dangerous).toBe('alert("nested")Content');
      expect(result.data.nested.safe).toBe('Normal text');
    });

    it('preserves normal text and special characters', async () => {
      const normalData = {
        field1: 'John "The Boss" Doe',
        field2: 'test@example.com & others',
        field3: 'Phone: 555-1234',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: normalData,
      });

      // Normal text with quotes, ampersands, and other characters should be preserved
      expect(result.data.field1).toBe('John "The Boss" Doe');
      expect(result.data.field2).toBe('test@example.com & others');
      expect(result.data.field3).toBe('Phone: 555-1234');
    });
  });

  describe('getResponse', () => {
    it('retrieves response by ID', async () => {
      // Create a response first
      const responseData = {
        field1: 'Test User',
        field2: 'test@example.com',
      };

      const created = await responsesService.submitResponse({
        formId: testFormId,
        data: responseData,
      });

      // Retrieve it
      const retrieved = await responsesService.getResponse(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.data).toEqual(responseData);
    });

    it('throws error for non-existent response', async () => {
      const invalidId = crypto.randomUUID();

      await expect(
        responsesService.getResponse(invalidId),
      ).rejects.toThrow('Response not found');
    });
  });

  describe('getFormResponses', () => {
    it('retrieves all responses for a form', async () => {
      // Create multiple responses
      await responsesService.submitResponse({
        formId: testFormId,
        data: { field1: 'User 1', field2: 'user1@example.com' },
      });

      await responsesService.submitResponse({
        formId: testFormId,
        data: { field1: 'User 2', field2: 'user2@example.com' },
      });

      const responses = await responsesService.getFormResponses(testFormId);

      expect(responses).toHaveLength(2);
      expect(responses[0].data.field1).toBeDefined();
      expect(responses[1].data.field1).toBeDefined();
    });

    it('returns empty array for form with no responses', async () => {
      const responses = await responsesService.getFormResponses(testFormId);

      expect(responses).toEqual([]);
    });

    it('orders responses by submitted_at DESC', async () => {
      // Create responses with slight delay
      const response1 = await responsesService.submitResponse({
        formId: testFormId,
        data: { field1: 'First', field2: 'first@example.com' },
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await responsesService.submitResponse({
        formId: testFormId,
        data: { field1: 'Second', field2: 'second@example.com' },
      });

      const responses = await responsesService.getFormResponses(testFormId);

      // Most recent should be first
      expect(responses[0].id).toBe(response2.id);
      expect(responses[1].id).toBe(response1.id);
    });
  });

  describe('deleteResponse', () => {
    it('deletes response by ID', async () => {
      const created = await responsesService.submitResponse({
        formId: testFormId,
        data: { field1: 'To Delete', field2: 'delete@example.com' },
      });

      await responsesService.deleteResponse(created.id);

      const deleted = await getDb()('responses').where({ id: created.id }).first();
      expect(deleted).toBeUndefined();
    });

    it('decrements user response count on deletion', async () => {
      const created = await responsesService.submitResponse({
        formId: testFormId,
        data: { field1: 'Test', field2: 'test@example.com' },
      });

      const usageBefore = await getDb()('usage_metrics')
        .where({ user_id: testUserId })
        .first();
      expect(Number(usageBefore.responses_count)).toBe(1);

      await responsesService.deleteResponse(created.id);

      const usageAfter = await getDb()('usage_metrics')
        .where({ user_id: testUserId })
        .first();
      expect(Number(usageAfter.responses_count)).toBe(0);
    });
  });

  describe('exportResponses', () => {
    beforeEach(async () => {
      // Create sample responses
      await responsesService.submitResponse({
        formId: testFormId,
        data: { field1: 'User 1', field2: 'user1@example.com', field3: '111-1111' },
      });

      await responsesService.submitResponse({
        formId: testFormId,
        data: { field1: 'User 2', field2: 'user2@example.com', field3: '222-2222' },
      });
    });

    it('exports responses as JSON', async () => {
      const json = await responsesService.exportResponses(testFormId, 'json');

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].field1).toBeDefined();
    });

    it('exports responses as CSV', async () => {
      const csv = await responsesService.exportResponses(testFormId, 'csv');

      expect(csv).toBeDefined();
      expect(csv).toContain('"Name","Email","Phone"'); // Headers
      expect(csv).toContain('"User 1","user1@example.com","111-1111"');
      expect(csv).toContain('"User 2","user2@example.com","222-2222"');
    });

    it('exports CSV with proper quote escaping for values containing quotes', async () => {
      // Create response with quotes in the value
      await responsesService.submitResponse({
        formId: testFormId,
        data: {
          field1: 'John "The Boss" Doe',
          field2: 'john@example.com',
          field3: '555-0000',
        },
      });

      const csv = await responsesService.exportResponses(testFormId, 'csv');

      // Quotes should be doubled per RFC 4180
      expect(csv).toContain('"John ""The Boss"" Doe"');
    });

    it('exports CSV with proper handling of commas in values', async () => {
      // Create response with commas in the value
      await responsesService.submitResponse({
        formId: testFormId,
        data: {
          field1: 'Doe, John',
          field2: 'john@example.com',
          field3: '555-0000',
        },
      });

      const csv = await responsesService.exportResponses(testFormId, 'csv');

      // Value with comma should be wrapped in quotes
      expect(csv).toContain('"Doe, John"');
      // Should not break CSV structure
      const lines = csv.split('\n');
      const dataRow = lines.find(line => line.includes('Doe, John'));
      expect(dataRow).toBeDefined();
      // Count the number of commas outside quotes (should be 2, between 3 fields)
      const fields = dataRow!.match(/"([^"]*(?:""[^"]*)*)"/g);
      expect(fields).toHaveLength(3);
    });

    it('exports CSV with proper handling of newlines in values', async () => {
      // Create response with newline in the value
      await responsesService.submitResponse({
        formId: testFormId,
        data: {
          field1: 'Line 1\nLine 2',
          field2: 'john@example.com',
          field3: '555-0000',
        },
      });

      const csv = await responsesService.exportResponses(testFormId, 'csv');

      // Value with newline should be wrapped in quotes
      expect(csv).toContain('"Line 1\nLine 2"');
      // The CSV structure should remain intact
      const lines = csv.split('\n');
      // Header + 2 previous responses + 1 new response with embedded newline
      // Note: The newline inside the quoted field doesn't count as a row separator
      expect(lines.length).toBeGreaterThanOrEqual(4);
    });

    it('exports empty CSV when no responses exist', async () => {
      // Create a new form with no responses
      const [emptyForm] = await getDb()('forms').insert({
        id: crypto.randomUUID(),
        user_id: testUserId,
        slug: `empty-form-${Date.now()}`,
        title: 'Empty Form',
        status: 'published',
        fields: JSON.stringify([{ id: 'f1', label: 'Field 1', type: 'text' }]),
        tenant_type: 'rightflow',
      }).returning('*');

      const csv = await responsesService.exportResponses(emptyForm.id, 'csv');

      expect(csv).toBe('');

      // Clean up
      await getDb()('forms').where({ id: emptyForm.id }).del();
    });
  });
});
