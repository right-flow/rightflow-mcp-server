/**
 * Forms Service - Version Management Tests
 * Tests for version creation, retrieval, and restoration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FormsService } from './forms.service';
import { closeDb } from '../../lib/db';
import crypto from 'crypto';
import { setupTestDatabase } from '../../test-utils/test-env';

describe('FormsService (Version Management)', () => {
  let formsService: FormsService;
  let testUserId: string;

  beforeEach(() => {
    formsService = new FormsService();
    testUserId = crypto.randomUUID();

    // Setup test database from centralized config
    setupTestDatabase();
  });

  afterEach(async () => {
    await closeDb();
  });

  describe('Version Creation', () => {
    it('creates version on first publish', async () => {
      // Create a draft form
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Versionable Form',
        fields: [
          { id: '1', type: 'text', label: 'Name', required: true },
        ],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      // Publish the form (should create version 1)
      const published = await formsService.publishForm(formId, testUserId);

      expect(published.success).toBe(true);
      expect(published.form?.status).toBe('published');

      // Check version was created
      const versionResult = await formsService.getVersionHistory(formId);
      expect(versionResult.success).toBe(true);
      expect(versionResult.versions?.length).toBe(1);
      expect(versionResult.versions?.[0]?.version_number).toBe(1);
      expect(versionResult.versions?.[0]?.is_current).toBe(true);
    });

    it('creates version with notes', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Form with Notes',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      const notes = 'Initial release with basic fields';
      const published = await formsService.publishForm(formId, testUserId, notes);

      expect(published.success).toBe(true);

      const versionResult = await formsService.getVersionHistory(formId);
      expect(versionResult.versions?.[0]?.notes).toBe(notes);
    });

    it('increments version number on republish', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Multi-version Form',
        fields: [{ id: '1', type: 'text', label: 'Field 1' }],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      // Publish version 1
      await formsService.publishForm(formId, testUserId, 'Version 1');

      // Update form
      await formsService.updateForm(formId, testUserId, {
        fields: [
          { id: '1', type: 'text', label: 'Field 1' },
          { id: '2', type: 'email', label: 'Email' },
        ],
      });

      // Publish version 2
      await formsService.publishForm(formId, testUserId, 'Version 2 - Added email field');

      // Check versions
      const versionResult = await formsService.getVersionHistory(formId);
      expect(versionResult.versions?.length).toBe(2);
      expect(versionResult.versions?.[0]?.version_number).toBe(2);
      expect(versionResult.versions?.[1]?.version_number).toBe(1);
    });

    it('marks only latest version as current', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Current Version Test',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      // Publish multiple versions
      await formsService.publishForm(formId, testUserId, 'V1');
      await formsService.publishForm(formId, testUserId, 'V2');
      await formsService.publishForm(formId, testUserId, 'V3');

      const versionResult = await formsService.getVersionHistory(formId);
      const currentVersions = versionResult.versions?.filter(v => v.is_current);

      expect(currentVersions?.length).toBe(1);
      expect(currentVersions?.[0]?.version_number).toBe(3);
    });
  });

  describe('Version Retrieval', () => {
    it('gets version history sorted by version number descending', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'History Test',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      await formsService.publishForm(formId, testUserId, 'V1');
      await formsService.publishForm(formId, testUserId, 'V2');
      await formsService.publishForm(formId, testUserId, 'V3');

      const versionResult = await formsService.getVersionHistory(formId);

      expect(versionResult.success).toBe(true);
      expect(versionResult.versions?.length).toBe(3);
      expect(versionResult.versions?.[0]?.version_number).toBe(3);
      expect(versionResult.versions?.[1]?.version_number).toBe(2);
      expect(versionResult.versions?.[2]?.version_number).toBe(1);
    });

    it('gets specific version by number', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Specific Version Test',
        fields: [{ id: '1', type: 'text', label: 'Original Field' }],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      // Publish version 1
      await formsService.publishForm(formId, testUserId, 'V1');

      // Update and publish version 2
      await formsService.updateForm(formId, testUserId, {
        fields: [{ id: '1', type: 'text', label: 'Updated Field' }],
      });
      await formsService.publishForm(formId, testUserId, 'V2');

      // Get version 1 specifically
      const version1 = await formsService.getVersion(formId, 1);

      expect(version1).toBeDefined();
      expect(version1?.version_number).toBe(1);
      expect(version1?.fields[0]?.label).toBe('Original Field');
      expect(version1?.notes).toBe('V1');
    });

    it('gets current version', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Current Version Test',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      await formsService.publishForm(formId, testUserId, 'V1');
      await formsService.publishForm(formId, testUserId, 'V2');
      await formsService.publishForm(formId, testUserId, 'V3');

      const currentVersion = await formsService.getCurrentVersion(formId);

      expect(currentVersion).toBeDefined();
      expect(currentVersion?.version_number).toBe(3);
      expect(currentVersion?.is_current).toBe(true);
    });

    it('returns null for non-existent version', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Missing Version Test',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      await formsService.publishForm(formId, testUserId);

      const missingVersion = await formsService.getVersion(formId, 999);

      expect(missingVersion).toBeNull();
    });
  });

  describe('Version Restoration', () => {
    it('restores previous version as new version', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Restoration Test',
        fields: [{ id: '1', type: 'text', label: 'Version 1 Field' }],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      // Publish version 1
      await formsService.publishForm(formId, testUserId, 'V1');

      // Update and publish version 2
      await formsService.updateForm(formId, testUserId, {
        fields: [{ id: '1', type: 'text', label: 'Version 2 Field' }],
      });
      await formsService.publishForm(formId, testUserId, 'V2');

      // Restore version 1 (should create version 3)
      const restored = await formsService.restoreVersion(
        formId,
        1,
        testUserId,
        'Restored version 1',
      );

      expect(restored.success).toBe(true);

      // Check that version 3 was created
      const versionResult = await formsService.getVersionHistory(formId);
      expect(versionResult.versions?.length).toBe(3);

      const version3 = versionResult.versions?.[0];
      expect(version3?.version_number).toBe(3);
      expect(version3?.is_current).toBe(true);
      expect(version3?.fields[0]?.label).toBe('Version 1 Field');
      expect(version3?.notes).toBe('Restored version 1');
    });

    it('prevents unauthorized version restoration', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Protected Restoration',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      await formsService.publishForm(formId, testUserId);

      const unauthorizedUserId = crypto.randomUUID();
      const result = await formsService.restoreVersion(formId, 1, unauthorizedUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('unauthorized');
    });

    it('fails to restore non-existent version', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Missing Version Restore',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      await formsService.publishForm(formId, testUserId);

      const result = await formsService.restoreVersion(formId, 999, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Version Immutability', () => {
    it('does not modify previous versions when publishing new version', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Immutability Test',
        fields: [{ id: '1', type: 'text', label: 'Original' }],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      // Publish version 1
      await formsService.publishForm(formId, testUserId);

      // Get version 1
      const version1Before = await formsService.getVersion(formId, 1);

      // Publish version 2 with different fields
      await formsService.updateForm(formId, testUserId, {
        fields: [{ id: '1', type: 'text', label: 'Modified' }],
      });
      await formsService.publishForm(formId, testUserId);

      // Get version 1 again
      const version1After = await formsService.getVersion(formId, 1);

      // Version 1 should be unchanged
      expect(version1After?.fields).toEqual(version1Before?.fields);
      expect(version1After?.fields[0]?.label).toBe('Original');
    });
  });

  describe('Version Metadata', () => {
    it('stores complete form snapshot in version', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Complete Snapshot Test',
        description: 'Test description',
        fields: [
          { id: '1', type: 'text', label: 'Name', required: true },
          { id: '2', type: 'email', label: 'Email', required: false },
        ],
        stations: ['station1', 'station2'],
        settings: { theme: 'dark', language: 'he' },
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      await formsService.publishForm(formId, testUserId, 'Complete snapshot');

      const version = await formsService.getVersion(formId, 1);

      expect(version?.title).toBe('Complete Snapshot Test');
      expect(version?.description).toBe('Test description');
      expect(version?.fields.length).toBe(2);
      expect(version?.stations).toEqual(['station1', 'station2']);
      expect(version?.settings).toEqual({ theme: 'dark', language: 'he' });
      expect(version?.published_by).toBe(testUserId);
      expect(version?.published_at).toBeDefined();
      expect(version?.created_at).toBeDefined();
    });

    it('tracks published_by user', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Publisher Tracking',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      await formsService.publishForm(formId, testUserId);

      const version = await formsService.getVersion(formId, 1);

      expect(version?.published_by).toBe(testUserId);
    });

    it('sets published_at timestamp', async () => {
      const created = await formsService.createForm({
        userId: testUserId,
        title: 'Timestamp Test',
        fields: [],
      });

      const formId = created.form?.id;
      if (!formId) throw new Error('Form not created');

      const beforePublish = new Date();
      await formsService.publishForm(formId, testUserId);
      const afterPublish = new Date();

      const version = await formsService.getVersion(formId, 1);

      expect(version?.published_at).toBeDefined();
      const publishedAt = new Date(version!.published_at);
      expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime());
      expect(publishedAt.getTime()).toBeLessThanOrEqual(afterPublish.getTime());
    });
  });
});
