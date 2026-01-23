/**
 * Tests for Offline Storage Service
 * Uses IndexedDB for storing form data when offline
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OfflineStorageService,
  type OfflineFormData,
  type OfflineResponse,
  type SyncQueueItem,
} from './offline-storage.service';

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: vi.fn(),
  close: vi.fn(),
  objectStoreNames: { contains: vi.fn(() => true) },
};

const mockIDBObjectStore = {
  put: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
};

const mockIDBTransaction = {
  objectStore: vi.fn(() => mockIDBObjectStore),
  oncomplete: null as (() => void) | null,
  onerror: null as ((event: Event) => void) | null,
};

const mockIDBRequest = {
  result: null as unknown,
  onsuccess: null as (() => void) | null,
  onerror: null as ((event: Event) => void) | null,
};

// Setup mock indexedDB
const mockIndexedDB = {
  open: vi.fn(() => {
    const request = { ...mockIDBRequest };
    setTimeout(() => {
      request.result = mockIDBDatabase;
      request.onsuccess?.();
    }, 0);
    return request;
  }),
};

describe('OfflineStorageService', () => {
  let service: OfflineStorageService;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', mockIndexedDB);
    service = new OfflineStorageService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Form Data Storage', () => {
    it('should save form data to IndexedDB', async () => {
      const formData: OfflineFormData = {
        formId: 'form-123',
        slug: 'test-form',
        name: 'טופס בדיקה',
        fields: [
          { id: 'field1', name: 'name', type: 'text', label: 'שם' },
        ],
        cachedAt: new Date().toISOString(),
      };

      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.put.mockImplementation(() => {
        const req = { ...mockIDBRequest };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      await expect(service.saveFormData(formData)).resolves.not.toThrow();
    });

    it('should retrieve form data by slug', async () => {
      const expectedData: OfflineFormData = {
        formId: 'form-123',
        slug: 'test-form',
        name: 'טופס בדיקה',
        fields: [],
        cachedAt: new Date().toISOString(),
      };

      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.get.mockImplementation(() => {
        const req = { ...mockIDBRequest, result: expectedData };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const result = await service.getFormData('test-form');
      expect(result).toEqual(expectedData);
    });

    it('should return null for non-existent form', async () => {
      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.get.mockImplementation(() => {
        const req = { ...mockIDBRequest, result: undefined };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const result = await service.getFormData('non-existent');
      expect(result).toBeNull();
    });

    it('should handle Hebrew form names correctly', async () => {
      const hebrewFormData: OfflineFormData = {
        formId: 'form-hebrew',
        slug: 'hebrew-form',
        name: 'טופס הרשמה לקורס מתקדם',
        fields: [
          { id: 'f1', name: 'full_name', type: 'text', label: 'שם מלא' },
          { id: 'f2', name: 'phone', type: 'text', label: 'טלפון נייד' },
        ],
        cachedAt: new Date().toISOString(),
      };

      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.put.mockImplementation(() => {
        const req = { ...mockIDBRequest };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      await expect(service.saveFormData(hebrewFormData)).resolves.not.toThrow();
    });
  });

  describe('Response Queue', () => {
    it('should add response to sync queue', async () => {
      const response: OfflineResponse = {
        id: 'resp-1',
        formId: 'form-123',
        data: { name: 'ישראל ישראלי', phone: '0501234567' },
        submittedAt: new Date().toISOString(),
        status: 'pending',
      };

      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.put.mockImplementation(() => {
        const req = { ...mockIDBRequest };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      await expect(service.queueResponse(response)).resolves.not.toThrow();
    });

    it('should get all pending responses', async () => {
      const pendingResponses: OfflineResponse[] = [
        {
          id: 'resp-1',
          formId: 'form-123',
          data: { name: 'שם 1' },
          submittedAt: new Date().toISOString(),
          status: 'pending',
        },
        {
          id: 'resp-2',
          formId: 'form-123',
          data: { name: 'שם 2' },
          submittedAt: new Date().toISOString(),
          status: 'pending',
        },
      ];

      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.getAll.mockImplementation(() => {
        const req = { ...mockIDBRequest, result: pendingResponses };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const result = await service.getPendingResponses();
      expect(result).toHaveLength(2);
    });

    it('should mark response as synced', async () => {
      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.get.mockImplementation(() => {
        const req = {
          ...mockIDBRequest,
          result: {
            id: 'resp-1',
            status: 'pending',
          },
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });
      mockIDBObjectStore.put.mockImplementation(() => {
        const req = { ...mockIDBRequest };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      await expect(service.markAsSynced('resp-1')).resolves.not.toThrow();
    });

    it('should remove synced response from queue', async () => {
      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.delete.mockImplementation(() => {
        const req = { ...mockIDBRequest };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      await expect(service.removeFromQueue('resp-1')).resolves.not.toThrow();
    });
  });

  describe('Sync Queue Management', () => {
    it('should get queue size', async () => {
      const items: SyncQueueItem[] = [
        { id: '1', type: 'response', data: {}, createdAt: '', status: 'pending' },
        { id: '2', type: 'response', data: {}, createdAt: '', status: 'pending' },
        { id: '3', type: 'response', data: {}, createdAt: '', status: 'synced' },
      ];

      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.getAll.mockImplementation(() => {
        const req = { ...mockIDBRequest, result: items };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      const count = await service.getQueueSize();
      expect(count).toBe(2); // Only pending items
    });

    it('should clear all cached data', async () => {
      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
      mockIDBObjectStore.clear.mockImplementation(() => {
        const req = { ...mockIDBRequest };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      });

      await expect(service.clearAllData()).resolves.not.toThrow();
    });
  });

  describe('Storage Limits', () => {
    it('should check if storage is available', async () => {
      const isAvailable = await service.isStorageAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should estimate storage usage', async () => {
      // Mock navigator.storage
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            usage: 1024 * 1024, // 1MB
            quota: 100 * 1024 * 1024, // 100MB
          }),
        },
      });

      const estimate = await service.getStorageEstimate();
      expect(estimate).toHaveProperty('usage');
      expect(estimate).toHaveProperty('quota');
    });
  });
});
