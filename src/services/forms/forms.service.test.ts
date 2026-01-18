/**
 * Forms Service Tests (Phase 1)
 * Following TDD methodology - tests written before implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FormsService } from './forms.service';
import { closeDb } from '../../lib/db';
import crypto from 'crypto';

describe('FormsService (Form CRUD)', () => {
  let formsService: FormsService;
  let testUserId: string;

  beforeEach(async () => {
    formsService = new FormsService();
    testUserId = crypto.randomUUID();

    // Mock environment for testing
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'postgresql://postgres:test@localhost:5432/rightflow_test';
    }

    // Create test user in database (required for foreign key constraint)
    const db = await import('../../lib/db').then(m => m.getDb());
    await db('users').insert({
      id: testUserId,
      clerk_id: `clerk_${testUserId}`,
      email: `test-${testUserId}@example.com`,
      tenant_type: 'rightflow',
      created_at: new Date(),
    });
  });

  afterEach(async () => {
    // Clean up database connections
    await closeDb();
  });

  describe('Form Creation', () => {
    it('creates form with unique slug', async () => {
      const formData = {
        userId: testUserId,
        title: 'Test Form',
        description: 'A test form for unit testing',
        fields: [],
      };

      const result = await formsService.createForm(formData);

      expect(result.success).toBe(true);
      expect(result.form).toBeDefined();
      expect(result.form?.slug).toBeDefined();
      expect(result.form?.slug).toMatch(/^[a-z0-9-]+$/);  // Valid slug format
      expect(result.form?.status).toBe('draft');
    });

    it('generates unique slugs for duplicate titles', async () => {
      const formData = {
        userId: testUserId,
        title: 'Duplicate Title',
        fields: [],
      };

      const result1 = await formsService.createForm(formData);
      const result2 = await formsService.createForm(formData);

      expect(result1.form?.slug).not.toBe(result2.form?.slug);
    });

    it('validates required fields', async () => {
      const invalidFormData = {
        userId: testUserId,
        title: '',  // Empty title
        fields: [],
      };

      const result = await formsService.createForm(invalidFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('title');
    });

    it('supports RightFlow stations field', async () => {
      const formData = {
        userId: testUserId,
        title: 'Form with Stations',
        fields: [],
        stations: ['client', 'agent', 'manager'],
      };

      const result = await formsService.createForm(formData);

      expect(result.success).toBe(true);
      expect(result.form?.stations).toEqual(['client', 'agent', 'manager']);
    });
  });

  describe('Form Retrieval', () => {
    it('gets form by ID', async () => {
      const formData = {
        userId: testUserId,
        title: 'Retrievable Form',
        fields: [],
      };

      const created = await formsService.createForm(formData);
      const formId = created.form?.id;

      if (formId) {
        const result = await formsService.getFormById(formId);

        expect(result).toBeDefined();
        expect(result?.id).toBe(formId);
        expect(result?.title).toBe('Retrievable Form');
      }
    });

    it('gets form by slug', async () => {
      const formData = {
        userId: testUserId,
        title: 'Sluggable Form',
        fields: [],
      };

      const created = await formsService.createForm(formData);
      const slug = created.form?.slug;

      if (slug) {
        const result = await formsService.getFormBySlug(slug);

        expect(result).toBeDefined();
        expect(result?.slug).toBe(slug);
      }
    });

    it('lists user forms', async () => {
      // Create multiple forms
      await formsService.createForm({ userId: testUserId, title: 'Form 1', fields: [] });
      await formsService.createForm({ userId: testUserId, title: 'Form 2', fields: [] });
      await formsService.createForm({ userId: testUserId, title: 'Form 3', fields: [] });

      const forms = await formsService.getUserForms(testUserId);

      expect(forms.length).toBeGreaterThanOrEqual(3);
      expect(forms.every(f => f.user_id === testUserId)).toBe(true);
    });

    it('filters deleted forms from lists', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'To Be Deleted',
        fields: [],
      });

      if (created.form?.id) {
        await formsService.deleteForm(created.form.id, testUserId);

        const forms = await formsService.getUserForms(testUserId);
        expect(forms.every(f => f.id !== created.form?.id)).toBe(true);
      }
    });
  });

  describe('Form Updates', () => {
    it('updates form fields', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Updatable Form',
        fields: [],
      });

      const formId = created.form?.id;
      if (formId) {
        const updatedFields = [
          { id: '1', type: 'text', label: 'Name', required: true },
          { id: '2', type: 'email', label: 'Email', required: true },
        ];

        const result = await formsService.updateForm(formId, testUserId, {
          fields: updatedFields,
        });

        expect(result.success).toBe(true);
        expect(result.form?.fields).toEqual(updatedFields);
      }
    });

    it('updates form title and description', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Original Title',
        description: 'Original description',
        fields: [],
      });

      const formId = created.form?.id;
      if (formId) {
        const result = await formsService.updateForm(formId, testUserId, {
          title: 'Updated Title',
          description: 'Updated description',
        });

        expect(result.success).toBe(true);
        expect(result.form?.title).toBe('Updated Title');
        expect(result.form?.description).toBe('Updated description');
      }
    });

    it('prevents unauthorized updates', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Protected Form',
        fields: [],
      });

      const formId = created.form?.id;
      const unauthorizedUserId = crypto.randomUUID();

      if (formId) {
        const result = await formsService.updateForm(formId, unauthorizedUserId, {
          title: 'Hacked Title',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('unauthorized');
      }
    });
  });

  describe('Form Deletion', () => {
    it('deletes form and associated data', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Deletable Form',
        fields: [],
      });

      const formId = created.form?.id;
      if (formId) {
        const result = await formsService.deleteForm(formId, testUserId);

        expect(result.success).toBe(true);

        // Verify form is soft-deleted
        const deleted = await formsService.getFormById(formId);
        expect(deleted).toBeNull();
      }
    });

    it('prevents unauthorized deletions', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Protected Form',
        fields: [],
      });

      const formId = created.form?.id;
      const unauthorizedUserId = crypto.randomUUID();

      if (formId) {
        const result = await formsService.deleteForm(formId, unauthorizedUserId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('unauthorized');
      }
    });
  });

  describe('Form Publishing', () => {
    it('publishes draft form', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Publishable Form',
        fields: [],
      });

      const formId = created.form?.id;
      if (formId) {
        const result = await formsService.publishForm(formId, testUserId);

        expect(result.success).toBe(true);
        expect(result.form?.status).toBe('published');
        expect(result.form?.published_at).toBeDefined();
      }
    });

    it('unpublishes published form', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Unpublishable Form',
        fields: [],
      });

      const formId = created.form?.id;
      if (formId) {
        await formsService.publishForm(formId, testUserId);
        const result = await formsService.unpublishForm(formId, testUserId);

        expect(result.success).toBe(true);
        expect(result.form?.status).toBe('draft');
      }
    });
  });

  describe('Slug Generation', () => {
    it('generates URL-safe slugs', async () => {
      const testTitles = [
        'Form with Spaces',
        'Hebrew טופס',
        'Form-with-dashes',
        'Form_with_underscores',
        'Form!@#$%^&*()',
      ];

      for (const title of testTitles) {
        const result = await formsService.createForm({
          userId: testUserId,
          title,
          fields: [],
        });

        expect(result.form?.slug).toMatch(/^[a-z0-9-]+$/);
      }
    });

    it('handles slug collision race condition with retry logic', async () => {
      // This test verifies the race condition fix
      // When multiple forms with the same title are created concurrently,
      // each should get a unique slug

      const title = 'Duplicate Title Test';
      const promises = [
        formsService.createForm({ userId: testUserId, title, fields: [] }),
        formsService.createForm({ userId: testUserId, title, fields: [] }),
        formsService.createForm({ userId: testUserId, title, fields: [] }),
        formsService.createForm({ userId: testUserId, title, fields: [] }),
        formsService.createForm({ userId: testUserId, title, fields: [] }),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Extract slugs
      const slugs = results.map(r => r.form?.slug).filter(Boolean);

      // All slugs should be unique
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);

      // All slugs should be valid
      slugs.forEach(slug => {
        expect(slug).toMatch(/^[a-z0-9-]+$/);
      });
    });

    it('generates different suffixes on collision', async () => {
      // Create first form
      const result1 = await formsService.createForm({
        userId: testUserId,
        title: 'Collision Test',
        fields: [],
      });

      // Create second form with same title (will trigger retry logic)
      const result2 = await formsService.createForm({
        userId: testUserId,
        title: 'Collision Test',
        fields: [],
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const slug1 = result1.form?.slug;
      const slug2 = result2.form?.slug;

      // Slugs must be different
      expect(slug1).not.toBe(slug2);

      // Second slug should have a suffix
      if (slug1 && slug2) {
        expect(slug2).toContain('-');
        expect(slug2.startsWith(slug1.split('-')[0]!)).toBe(true);
      }
    });
  });

  describe('Multi-Tenant Form Access (TDD)', () => {
    it('getAccessibleForms() returns only personal forms when orgId is null', async () => {
      // Create personal form
      const personalForm = await formsService.createForm({
        userId: testUserId,
        title: 'Personal Form',
        fields: [],
      });

      expect(personalForm.success).toBe(true);

      // Get accessible forms with orgId=null (personal context)
      const forms = await formsService.getAccessibleForms(testUserId, null);

      expect(forms).toBeDefined();
      expect(forms.length).toBeGreaterThan(0);
      expect(forms.every(f => f.user_id === testUserId)).toBe(true);
      expect(forms.every(f => f.org_id === null)).toBe(true);
    });

    it('getAccessibleForms() returns only org forms when orgId is provided', async () => {
      const orgId = crypto.randomUUID(); // Use valid UUID for org_id
      const db = await import('../../lib/db').then(m => m.getDb());

      // Create organization first (required for foreign key constraint)
      await db('organizations').insert({
        id: orgId,
        name: 'Test Organization',
        owner_id: testUserId,
        created_at: new Date(),
      });

      // Create org form using the service (now supports orgId)
      const orgForm = await formsService.createForm({
        userId: testUserId,
        orgId,
        title: 'Org Form',
        fields: [],
      });

      expect(orgForm.success).toBe(true);

      // Get accessible forms with orgId (org context)
      const forms = await formsService.getAccessibleForms(testUserId, orgId);

      expect(forms).toBeDefined();
      expect(forms.every(f => f.org_id === orgId)).toBe(true);
    });

    it('getAccessibleForms() does not return forms from other orgs', async () => {
      const orgId1 = crypto.randomUUID(); // Use valid UUID for org_id
      const orgId2 = crypto.randomUUID(); // Use valid UUID for org_id
      const db = await import('../../lib/db').then(m => m.getDb());

      // Create organizations first (required for foreign key constraint)
      await db('organizations').insert([
        { id: orgId1, name: 'Organization 1', owner_id: testUserId, created_at: new Date() },
        { id: orgId2, name: 'Organization 2', owner_id: testUserId, created_at: new Date() },
      ]);

      // Create forms for org1 using service
      const org1Form = await formsService.createForm({
        userId: testUserId,
        orgId: orgId1,
        title: 'Org 1 Form',
        fields: [],
      });

      expect(org1Form.success).toBe(true);

      // Create forms for org2 using service
      const org2Form = await formsService.createForm({
        userId: testUserId,
        orgId: orgId2,
        title: 'Org 2 Form',
        fields: [],
      });

      expect(org2Form.success).toBe(true);

      // Get forms for org1
      const org1Forms = await formsService.getAccessibleForms(testUserId, orgId1);

      // Should only get org1 forms
      expect(org1Forms.every(f => f.org_id === orgId1)).toBe(true);
      expect(org1Forms.some(f => f.org_id === orgId2)).toBe(false);
    });

    it('getAccessibleForms() handles personal and org separation', async () => {
      const orgId = crypto.randomUUID(); // Use valid UUID for org_id
      const db = await import('../../lib/db').then(m => m.getDb());

      // Create organization first (required for foreign key constraint)
      await db('organizations').insert({
        id: orgId,
        name: 'Test Organization',
        owner_id: testUserId,
        created_at: new Date(),
      });

      // Create personal form
      await formsService.createForm({
        userId: testUserId,
        title: 'Personal Form',
        fields: [],
      });

      // Create org form using service
      const orgForm = await formsService.createForm({
        userId: testUserId,
        orgId,
        title: 'Org Form',
        fields: [],
      });

      expect(orgForm.success).toBe(true);

      // Get personal forms
      const personalForms = await formsService.getAccessibleForms(testUserId, null);
      expect(personalForms.every(f => f.org_id === null)).toBe(true);

      // Get org forms
      const orgForms = await formsService.getAccessibleForms(testUserId, orgId);
      expect(orgForms.every(f => f.org_id === orgId)).toBe(true);
    });
  });
});
