/**
 * Form Versions API Tests
 * Tests for version management endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from './form-versions';
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

describe('Form Versions API', () => {
  let formsService: FormsService;
  let testUserId: string;
  let testFormId: string;
  let mockToken: string;

  beforeEach(async () => {
    formsService = new FormsService();
    testUserId = crypto.randomUUID();
    mockToken = `mock.jwt.token.${testUserId}`;

    // Setup test database from centralized config
    setupTestDatabase();

    // Create a test form
    const created = await formsService.createForm({
      userId: testUserId,
      title: 'Test Form for Versions API',
      fields: [{ id: '1', type: 'text', label: 'Test Field' }],
    });

    testFormId = created.form?.id || '';

    // Publish a few versions
    await formsService.publishForm(testFormId, testUserId, 'Version 1');
    await formsService.updateForm(testFormId, testUserId, {
      fields: [
        { id: '1', type: 'text', label: 'Test Field' },
        { id: '2', type: 'email', label: 'Email' },
      ],
    });
    await formsService.publishForm(testFormId, testUserId, 'Version 2');
  });

  afterEach(async () => {
    await closeDb();
  });

  describe('GET - Version History', () => {
    it('returns version history for a form', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          versions: expect.arrayContaining([
            expect.objectContaining({
              version_number: 1,
              notes: 'Version 1',
            }),
            expect.objectContaining({
              version_number: 2,
              notes: 'Version 2',
            }),
          ]),
        }),
      );
    });

    it('returns specific version by number', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId, version: '1' },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          version: expect.objectContaining({
            version_number: 1,
            notes: 'Version 1',
          }),
        }),
      );
    });

    it('requires formId parameter', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: {},
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('formId'),
        }),
      );
    });

    it('validates version number format', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId, version: 'invalid' },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid version number'),
        }),
      );
    });

    it('returns 404 for non-existent version', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId, version: '999' },
        headers: { authorization: `Bearer ${mockToken}` },
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

  describe('POST - Version Restoration', () => {
    it('restores a previous version', async () => {
      const req = createMockRequest({
        method: 'POST',
        query: { formId: testFormId, action: 'restore', version: '1' },
        headers: { authorization: `Bearer ${mockToken}` },
        body: { notes: 'Restored version 1' },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('restored'),
        }),
      );

      // Verify version 3 was created
      const versions = await formsService.getVersionHistory(testFormId);
      expect(versions.versions?.length).toBe(3);
      expect(versions.versions?.[0]?.version_number).toBe(3);
    });

    it('requires action parameter for POST', async () => {
      const req = createMockRequest({
        method: 'POST',
        query: { formId: testFormId },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('action'),
        }),
      );
    });

    it('requires version parameter for restore', async () => {
      const req = createMockRequest({
        method: 'POST',
        query: { formId: testFormId, action: 'restore' },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('version'),
        }),
      );
    });

    it('includes notes in restored version', async () => {
      const testNotes = 'Restored with custom notes';

      const req = createMockRequest({
        method: 'POST',
        query: { formId: testFormId, action: 'restore', version: '1' },
        headers: { authorization: `Bearer ${mockToken}` },
        body: { notes: testNotes },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify notes were saved
      const version3 = await formsService.getVersion(testFormId, 3);
      expect(version3?.notes).toBe(testNotes);
    });
  });

  describe('Authentication', () => {
    it('allows GET requests without auth for published forms', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId },
        headers: {}, // No authorization
      });

      const res = createMockResponse();

      await handler(req, res);

      // Should succeed for published forms
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          versions: expect.any(Array),
        }),
      );
    });

    it('requires auth for GET requests on draft forms', async () => {
      // Create a draft form
      const draftForm = await formsService.createForm({
        userId: testUserId,
        title: 'Draft Form',
        fields: [{ id: '1', type: 'text', label: 'Test' }],
      });

      const req = createMockRequest({
        method: 'GET',
        query: { formId: draftForm.form?.id },
        headers: {}, // No authorization
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Unauthorized'),
        }),
      );
    });

    it('requires auth for POST requests', async () => {
      const req = createMockRequest({
        method: 'POST',
        query: { formId: testFormId, action: 'restore', version: '1' },
        headers: {}, // No authorization
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Unauthorized'),
        }),
      );
    });

    it('extracts user ID from token', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      // Should not return 401 if token is extracted properly
      expect(res.status).not.toHaveBeenCalledWith(401);
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      const nonExistentFormId = crypto.randomUUID();

      const req = createMockRequest({
        method: 'GET',
        query: { formId: nonExistentFormId },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      // Should return empty array, not crash
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          versions: [],
        }),
      );
    });

    it('handles invalid form ID format', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: 'not-a-uuid' },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid'),
        }),
      );
    });
  });

  describe('HTTP Methods', () => {
    it('supports GET method', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('supports POST method', async () => {
      const req = createMockRequest({
        method: 'POST',
        query: { formId: testFormId, action: 'restore', version: '1' },
        headers: { authorization: `Bearer ${mockToken}` },
        body: {},
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects unsupported methods', async () => {
      const req = createMockRequest({
        method: 'PUT',
        query: { formId: testFormId },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Method'),
        }),
      );
    });
  });

  describe('Version Data Integrity', () => {
    it('returns complete version data', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId, version: '1' },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          version: expect.objectContaining({
            id: expect.any(String),
            form_id: testFormId,
            version_number: 1,
            title: expect.any(String),
            fields: expect.any(Array),
            published_by: expect.any(String),
            published_at: expect.anything(),
            created_at: expect.anything(),
          }),
        }),
      );
    });

    it('preserves field data from original version', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { formId: testFormId, version: '1' },
        headers: { authorization: `Bearer ${mockToken}` },
      });

      const res = createMockResponse();

      await handler(req, res);

      const callArg = (res.json as any).mock.calls[0][0];
      expect(callArg.version.fields).toEqual([
        expect.objectContaining({
          id: '1',
          type: 'text',
          label: 'Test Field',
        }),
      ]);
    });
  });
});
