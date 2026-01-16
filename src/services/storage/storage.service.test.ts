/**
 * Railway Volume Storage Service Tests (Phase 0)
 * Following TDD methodology
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StorageService } from './storage.service';
import fs from 'fs/promises';

describe('StorageService (Railway Volume)', () => {
  let storageService: StorageService;
  const testStoragePath = './test-uploads';

  beforeAll(async () => {
    // Set test storage path
    process.env.STORAGE_PATH = testStoragePath;
    process.env.STORAGE_BASE_URL = 'http://localhost:3000/files';

    storageService = new StorageService();

    // Create test directory
    await fs.mkdir(testStoragePath, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Upload', () => {
    it('uploads PDF to Railway volume', async () => {
      const testBuffer = Buffer.from('Test PDF content');
      const fileName = 'test-form.pdf';

      const result = await storageService.uploadFile(testBuffer, fileName, {
        contentType: 'application/pdf',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.path).toContain(fileName);
      expect(result.url).toContain('files');
    });

    it('generates file URLs', async () => {
      const filePath = 'pdfs/user_123/form_456.pdf';

      const url = storageService.getFileUrl(filePath);

      expect(url).toBeDefined();
      expect(url).toContain('files');
      expect(url).toContain('form_456.pdf');
    });

    it('handles upload failures gracefully', async () => {
      // Try to upload to invalid path
      const invalidBuffer = Buffer.from('test');
      const invalidPath = '../../../etc/passwd';  // Path traversal attempt

      const result = await storageService.uploadFile(invalidBuffer, invalidPath, {
        contentType: 'application/pdf',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('File Retrieval', () => {
    it('downloads file from volume', async () => {
      // First upload a file
      const testBuffer = Buffer.from('Download test content');
      const fileName = 'download-test.pdf';

      await storageService.uploadFile(testBuffer, fileName, {
        contentType: 'application/pdf',
      });

      // Then download it
      const downloadedBuffer = await storageService.downloadFile(fileName);

      expect(downloadedBuffer).toBeDefined();
      expect(downloadedBuffer.toString()).toBe('Download test content');
    });

    it('handles non-existent files', async () => {
      const nonExistentFile = 'non-existent-file.pdf';

      await expect(async () => {
        await storageService.downloadFile(nonExistentFile);
      }).rejects.toThrow();
    });
  });

  describe('File Deletion', () => {
    it('deletes file from volume', async () => {
      // Upload a file
      const testBuffer = Buffer.from('Delete test');
      const fileName = 'to-delete.pdf';

      await storageService.uploadFile(testBuffer, fileName, {
        contentType: 'application/pdf',
      });

      // Delete it
      const result = await storageService.deleteFile(fileName);

      expect(result.success).toBe(true);

      // Verify it's gone
      await expect(async () => {
        await storageService.downloadFile(fileName);
      }).rejects.toThrow();
    });
  });

  describe('Path Sanitization', () => {
    it('sanitizes dangerous file paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'path/../../etc/passwd',
      ];

      dangerousPaths.forEach((dangPath) => {
        const sanitized = storageService.sanitizePath(dangPath);

        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('etc');
        expect(sanitized).not.toContain('system32');
      });
    });

    it('preserves valid paths', () => {
      const validPaths = [
        'pdfs/user_123/form.pdf',
        'filled/form_456/response_789.pdf',
        'temp/processing_123.pdf',
      ];

      validPaths.forEach((validPath) => {
        const sanitized = storageService.sanitizePath(validPath);

        expect(sanitized).toBe(validPath);
      });
    });
  });

  describe('Storage Organization', () => {
    it('organizes files by user and form', async () => {
      const userId = 'user_123';
      const formId = 'form_456';
      const fileName = 'document.pdf';

      const organizePath = storageService.organizePath({
        userId,
        formId,
        fileName,
        type: 'pdf',
      });

      expect(organizePath).toContain(userId);
      expect(organizePath).toContain(formId);
      expect(organizePath).toContain(fileName);
      expect(organizePath).toMatch(/pdfs\/user_123\/form_456\/document\.pdf/);
    });

    it('supports different file types', async () => {
      const pdfPath = storageService.organizePath({
        userId: 'user_1',
        formId: 'form_1',
        fileName: 'doc.pdf',
        type: 'pdf',
      });

      const filledPath = storageService.organizePath({
        userId: 'user_1',
        formId: 'form_1',
        fileName: 'filled.pdf',
        type: 'filled',
      });

      expect(pdfPath).toContain('pdfs/');
      expect(filledPath).toContain('filled/');
    });
  });

  describe('File Size Validation', () => {
    it('rejects files exceeding size limit', async () => {
      const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);
      const tooLargeBuffer = Buffer.alloc((maxSize + 1) * 1024 * 1024);  // Exceed limit

      const result = await storageService.uploadFile(tooLargeBuffer, 'huge.pdf', {
        contentType: 'application/pdf',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('size');
    });

    it('accepts files within size limit', async () => {
      const validBuffer = Buffer.alloc(1024 * 1024);  // 1MB

      const result = await storageService.uploadFile(validBuffer, 'valid-size.pdf', {
        contentType: 'application/pdf',
      });

      expect(result.success).toBe(true);
    });
  });
});
