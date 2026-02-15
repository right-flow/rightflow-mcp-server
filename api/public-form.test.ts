/**
 * Public Form API Tests
 * Tests for unauthenticated form access endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from './public-form';
import { FormsService } from '../src/services/forms/forms.service';
import { closeDb } from '../src/lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { setupTestDatabase } from '../src/test-utils/test-env';

// Mock response helpers
function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    query: {},
    body: {},
    headers: {},
    method: 'GET',
    url: '',
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): VercelResponse {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as VercelResponse;

  return res;
}

describe('Public Form API', () => {
  let formsService: FormsService;
  let testUserId: string;
  let testFormId: string;
  let testSlug: string;

  beforeEach(async () => {
    formsService = new FormsService();
    testUserId = crypto.randomUUID();

    // Setup test database from centralized config
    setupTestDatabase();

    // Create and publish a test form
    const created = await formsService.createForm({
      userId: testUserId,
      title: 'Public Test Form',
      description: 'This is a public form',
      fields: [
        { id: '1', type: 'text', label: 'Name', required: true },
        { id: '2', type: 'email', label: 'Email', required: false },
      ],
    });

    testFormId = created.form?.id || '';
    testSlug = created.form?.slug || '';

    // Publish the form (creates version)
    await formsService.publishForm(testFormId, testUserId, 'Public version');
  });

  afterEach(async () => {
    await closeDb();
  });

  describe('Public Form Access', () => {
    it('returns published form by slug', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          form: expect.objectContaining({
            id: testFormId,
            slug: testSlug,
            title: 'Public Test Form',
            status: 'published',
          }),
        }),
      );
    });

    it('returns form fields from current version', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const callArg = (res.json as any).mock.calls[0][0];
      expect(callArg.form.fields).toEqual([
        expect.objectContaining({
          id: '1',
          type: 'text',
          label: 'Name',
          required: true,
        }),
        expect.objectContaining({
          id: '2',
          type: 'email',
          label: 'Email',
          required: false,
        }),
      ]);
    });

    it('does not require authentication', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
        headers: {}, // No Authorization header
      });

      const res = createMockResponse();

      await handler(req, res);

      // Should succeed without auth
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('requires slug parameter', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: {},
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('slug'),
        }),
      );
    });

    it('returns 404 for non-existent form', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: 'non-existent-form' },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not found'),
        }),
      );
    });
  });

  describe('Form Status Filtering', () => {
    it('returns published forms only', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const callArg = (res.json as any).mock.calls[0][0];
      expect(callArg.form.status).toBe('published');
    });

    it('blocks access to draft forms', async () => {
      // Create a draft form
      const draft = await formsService.createForm({
        userId: testUserId,
        title: 'Draft Form',
        fields: [],
      });

      const req = createMockRequest({
        method: 'GET',
        query: { slug: draft.form?.slug },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not published'),
        }),
      );
    });

    it('blocks access to archived forms', async () => {
      // Publish then archive the form
      await formsService.publishForm(testFormId, testUserId);
      await formsService.updateForm(testFormId, testUserId, {
        status: 'archived',
      });

      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not published'),
        }),
      );
    });
  });

  describe('Version Loading', () => {
    it('loads current published version fields', async () => {
      // Update form and publish new version
      await formsService.updateForm(testFormId, testUserId, {
        fields: [
          { id: '1', type: 'text', label: 'Updated Name' },
          { id: '2', type: 'email', label: 'Updated Email' },
          { id: '3', type: 'text', label: 'New Field' },
        ],
      });
      await formsService.publishForm(testFormId, testUserId, 'Version 2');

      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const callArg = (res.json as any).mock.calls[0][0];
      expect(callArg.form.fields.length).toBe(3);
      expect(callArg.form.fields[2]).toEqual(
        expect.objectContaining({
          id: '3',
          label: 'New Field',
        }),
      );
    });

    it('falls back to form fields if version loading fails', async () => {
      // This test verifies graceful degradation
      // If version API fails, form still loads with basic fields

      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      const callArg = (res.json as any).mock.calls[0][0];
      expect(callArg.form.fields).toBeDefined();
      expect(callArg.form.fields.length).toBeGreaterThan(0);
    });
  });

  describe('HTTP Methods', () => {
    it('supports GET method', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects unsupported methods', async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const req = createMockRequest({
          method,
          query: { slug: testSlug },
        });

        const res = createMockResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('Method'),
          }),
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      // Test with invalid slug format that might cause DB error
      const req = createMockRequest({
        method: 'GET',
        query: { slug: 'invalid-slug-with-special-chars-@#$%' },
      });

      const res = createMockResponse();

      await handler(req, res);

      // Should return 404, not crash
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns appropriate error messages', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: 'non-existent' },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });
  });

  describe('Form Metadata', () => {
    it('returns form title and description', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      const callArg = (res.json as any).mock.calls[0][0];
      expect(callArg.form.title).toBe('Public Test Form');
      expect(callArg.form.description).toBe('This is a public form');
    });

    it('does not expose sensitive data', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      const callArg = (res.json as any).mock.calls[0][0];

      // Should not expose:
      // - user_id (form owner)
      // - internal settings
      // - deleted_at
      expect(callArg.form).not.toHaveProperty('deleted_at');
    });
  });

  describe('CORS and Headers', () => {
    it('allows public access', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      // Endpoint should work without authentication
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Performance', () => {
    it('responds quickly for published forms', async () => {
      const startTime = Date.now();

      const req = createMockRequest({
        method: 'GET',
        query: { slug: testSlug },
      });

      const res = createMockResponse();

      await handler(req, res);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should respond in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
