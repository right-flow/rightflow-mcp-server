/**
 * Response API Tests
 * Tests for form response submission and management endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResponsesService } from '../src/services/responses/responses.service';
import { getDb, closeDb } from '../src/lib/db';

describe('Response API', () => {
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
      description: 'Test form for API',
      status: 'published',
      fields: JSON.stringify([
        {
          id: 'name',
          type: 'text',
          label: 'Full Name',
          required: true,
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
        },
        {
          id: 'message',
          type: 'textarea',
          label: 'Message',
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
    await getDb()('responses').where({ form_id: testFormId }).del();
    await getDb()('usage_metrics').where({ user_id: testUserId }).del();
    await getDb()('forms').where({ id: testFormId }).del();
    await getDb()('users').where({ id: testUserId }).del();
    await getDb()('plans').where({ id: testPlanId }).del();
    await closeDb();
  });

  describe('POST /api/responses (submitResponse)', () => {
    it('accepts valid form submission', async () => {
      const responseData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: responseData,
        submitterIp: '192.168.1.1',
        submitterUserAgent: 'Mozilla/5.0',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.formId).toBe(testFormId);
      expect(result.data).toEqual(responseData);
      expect(result.submitterIp).toBe('192.168.1.1');
      expect(result.submitterUserAgent).toBe('Mozilla/5.0');
    });

    it('rejects submission with missing required fields', async () => {
      const invalidData = {
        message: 'Missing name and email',
      };

      await expect(
        responsesService.submitResponse({
          formId: testFormId,
          data: invalidData,
        }),
      ).rejects.toThrow('Missing required field');
    });

    it('rejects submission for non-existent form', async () => {
      const invalidFormId = crypto.randomUUID();

      await expect(
        responsesService.submitResponse({
          formId: invalidFormId,
          data: { name: 'Test', email: 'test@example.com' },
        }),
      ).rejects.toThrow('Form not found');
    });

    it('sanitizes HTML in submitted data', async () => {
      const dataWithHtml = {
        name: '<script>alert("xss")</script>Attacker',
        email: 'attacker@example.com',
      };

      const result = await responsesService.submitResponse({
        formId: testFormId,
        data: dataWithHtml,
      });

      expect(result.data.name).not.toContain('<script>');
      expect(result.data.name).toContain('Attacker');
    });
  });

  describe('GET /api/responses/:id (getResponse)', () => {
    it('retrieves response by ID', async () => {
      const created = await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'Jane Doe', email: 'jane@example.com' },
      });

      const retrieved = await responsesService.getResponse(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.data.name).toBe('Jane Doe');
    });

    it('throws error for non-existent response', async () => {
      const invalidId = crypto.randomUUID();

      await expect(
        responsesService.getResponse(invalidId),
      ).rejects.toThrow('Response not found');
    });
  });

  describe('GET /api/forms/:formId/responses (getFormResponses)', () => {
    it('retrieves all responses for a form', async () => {
      await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'User 1', email: 'user1@example.com' },
      });

      await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'User 2', email: 'user2@example.com' },
      });

      const responses = await responsesService.getFormResponses(testFormId);

      expect(responses).toHaveLength(2);
      expect(responses[0].data.name).toBeDefined();
      expect(responses[1].data.name).toBeDefined();
    });

    it('returns responses in DESC order (newest first)', async () => {
      const first = await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'First', email: 'first@example.com' },
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'Second', email: 'second@example.com' },
      });

      const responses = await responsesService.getFormResponses(testFormId);

      expect(responses[0].id).toBe(second.id);
      expect(responses[1].id).toBe(first.id);
    });

    it('returns empty array for form with no responses', async () => {
      const responses = await responsesService.getFormResponses(testFormId);

      expect(responses).toEqual([]);
    });
  });

  describe('DELETE /api/responses/:id (deleteResponse)', () => {
    it('deletes response successfully', async () => {
      const created = await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'To Delete', email: 'delete@example.com' },
      });

      await responsesService.deleteResponse(created.id);

      await expect(
        responsesService.getResponse(created.id),
      ).rejects.toThrow('Response not found');
    });

    it('decrements usage count on deletion', async () => {
      const created = await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'Test', email: 'test@example.com' },
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

  describe('GET /api/forms/:formId/export (exportResponses)', () => {
    beforeEach(async () => {
      await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'Alice', email: 'alice@example.com', message: 'Hello' },
      });

      await responsesService.submitResponse({
        formId: testFormId,
        data: { name: 'Bob', email: 'bob@example.com', message: 'World' },
      });
    });

    it('exports responses as JSON', async () => {
      const json = await responsesService.exportResponses(testFormId, 'json');

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBeDefined();
    });

    it('exports responses as CSV', async () => {
      const csv = await responsesService.exportResponses(testFormId, 'csv');

      expect(csv).toBeDefined();
      expect(csv).toContain('"Full Name","Email Address","Message"');
      expect(csv).toContain('"Alice","alice@example.com","Hello"');
      expect(csv).toContain('"Bob","bob@example.com","World"');
    });

    it('throws error for unsupported format', async () => {
      await expect(
        responsesService.exportResponses(testFormId, 'xml' as any),
      ).rejects.toThrow('Unsupported export format');
    });
  });
});
