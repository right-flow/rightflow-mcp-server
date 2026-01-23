/**
 * Tests for useOfflineSync Hook
 * Manages offline form submissions and synchronization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';

// Mock the offline storage service
vi.mock('@/services/offline/offline-storage.service', () => ({
  offlineStorage: {
    queueResponse: vi.fn(),
    getPendingResponses: vi.fn(),
    markAsSynced: vi.fn(),
    removeFromQueue: vi.fn(),
    getQueueSize: vi.fn(),
    isStorageAvailable: vi.fn(),
  },
}));

// Get mocked functions
import { offlineStorage } from '@/services/offline/offline-storage.service';

const mockedOfflineStorage = vi.mocked(offlineStorage);

describe('useOfflineSync', () => {
  let onlineStatus = true;

  beforeEach(() => {
    vi.clearAllMocks();
    onlineStatus = true;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => onlineStatus,
    });

    // Setup default mocks
    mockedOfflineStorage.isStorageAvailable.mockResolvedValue(true);
    mockedOfflineStorage.getPendingResponses.mockResolvedValue([]);
    mockedOfflineStorage.getQueueSize.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Online Status Detection', () => {
    it('should detect initial online status', () => {
      onlineStatus = true;
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);
    });

    it('should detect initial offline status', () => {
      onlineStatus = false;
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(false);
    });

    it('should update when going offline', async () => {
      onlineStatus = true;
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);

      await act(async () => {
        onlineStatus = false;
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should update when coming back online', async () => {
      onlineStatus = false;
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(false);

      await act(async () => {
        onlineStatus = true;
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('Response Queuing', () => {
    it('should queue response when offline', async () => {
      onlineStatus = false;
      mockedOfflineStorage.queueResponse.mockResolvedValue();
      mockedOfflineStorage.getQueueSize.mockResolvedValue(1);

      const { result } = renderHook(() => useOfflineSync());

      const responseData = {
        formId: 'form-123',
        data: { name: 'ישראל ישראלי', email: 'test@example.com' },
      };

      await act(async () => {
        await result.current.queueFormResponse(responseData.formId, responseData.data);
      });

      expect(mockedOfflineStorage.queueResponse).toHaveBeenCalled();
    });

    it('should return queue size', async () => {
      mockedOfflineStorage.getQueueSize.mockResolvedValue(3);

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.queueSize).toBe(3);
      });
    });

    it('should handle Hebrew data correctly when queuing', async () => {
      onlineStatus = false;
      mockedOfflineStorage.queueResponse.mockResolvedValue();

      const { result } = renderHook(() => useOfflineSync());

      const hebrewData = {
        formId: 'form-hebrew',
        data: {
          fullName: 'דוד כהן',
          address: 'רחוב הרצל 123, תל אביב',
          notes: 'הערות בעברית עם ניקוד: שָׁלוֹם',
        },
      };

      await act(async () => {
        await result.current.queueFormResponse(hebrewData.formId, hebrewData.data);
      });

      expect(mockedOfflineStorage.queueResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          formId: 'form-hebrew',
          data: hebrewData.data,
          status: 'pending',
        }),
      );
    });
  });

  describe('Synchronization', () => {
    it('should sync all pending responses when syncNow is called', async () => {
      const pendingResponses = [
        {
          id: 'resp-1',
          formId: 'form-123',
          data: { name: 'Test 1' },
          submittedAt: new Date().toISOString(),
          status: 'pending' as const,
        },
        {
          id: 'resp-2',
          formId: 'form-123',
          data: { name: 'Test 2' },
          submittedAt: new Date().toISOString(),
          status: 'pending' as const,
        },
      ];

      onlineStatus = true;
      mockedOfflineStorage.getPendingResponses.mockResolvedValue(pendingResponses);
      mockedOfflineStorage.markAsSynced.mockResolvedValue();
      mockedOfflineStorage.removeFromQueue.mockResolvedValue();

      const mockSyncFn = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useOfflineSync({ onSync: mockSyncFn }));

      // Manually trigger sync
      await act(async () => {
        await result.current.syncNow();
      });

      // Both responses should be synced
      expect(mockSyncFn).toHaveBeenCalledTimes(2);
      expect(mockedOfflineStorage.markAsSynced).toHaveBeenCalledTimes(2);
      expect(mockedOfflineStorage.removeFromQueue).toHaveBeenCalledTimes(2);
    });

    it('should update sync status during synchronization', async () => {
      const pendingResponses = [
        {
          id: 'resp-1',
          formId: 'form-123',
          data: { name: 'Test' },
          submittedAt: new Date().toISOString(),
          status: 'pending' as const,
        },
      ];

      onlineStatus = true;
      mockedOfflineStorage.getPendingResponses.mockResolvedValue(pendingResponses);
      mockedOfflineStorage.markAsSynced.mockResolvedValue();
      mockedOfflineStorage.removeFromQueue.mockResolvedValue();

      const mockSyncFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
      );

      const { result } = renderHook(() => useOfflineSync({ onSync: mockSyncFn }));

      await act(async () => {
        result.current.syncNow();
      });

      expect(result.current.isSyncing).toBe(true);

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });
    });

    it('should handle sync failures gracefully', async () => {
      const pendingResponses = [
        {
          id: 'resp-1',
          formId: 'form-123',
          data: { name: 'Test' },
          submittedAt: new Date().toISOString(),
          status: 'pending' as const,
        },
      ];

      onlineStatus = true;
      mockedOfflineStorage.getPendingResponses.mockResolvedValue(pendingResponses);

      const mockSyncFn = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOfflineSync({ onSync: mockSyncFn }));

      await act(async () => {
        result.current.syncNow();
      });

      await waitFor(() => {
        expect(result.current.syncError).toBeTruthy();
      });
    });

    it('should not sync when no onSync callback is provided', async () => {
      const pendingResponses = [
        {
          id: 'resp-1',
          formId: 'form-123',
          data: { name: 'Test' },
          submittedAt: new Date().toISOString(),
          status: 'pending' as const,
        },
      ];

      mockedOfflineStorage.getPendingResponses.mockResolvedValue(pendingResponses);

      const { result } = renderHook(() => useOfflineSync());

      // syncNow should do nothing without onSync callback
      await act(async () => {
        result.current.syncNow();
      });

      expect(mockedOfflineStorage.markAsSynced).not.toHaveBeenCalled();
    });
  });

  describe('Storage Availability', () => {
    it('should check if storage is available', async () => {
      mockedOfflineStorage.isStorageAvailable.mockResolvedValue(true);

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.isStorageAvailable).toBe(true);
      });
    });

    it('should handle unavailable storage', async () => {
      mockedOfflineStorage.isStorageAvailable.mockResolvedValue(false);

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.isStorageAvailable).toBe(false);
      });
    });
  });

  describe('Manual Sync Trigger', () => {
    it('should allow manual sync trigger', async () => {
      const pendingResponses = [
        {
          id: 'resp-1',
          formId: 'form-123',
          data: { name: 'Test' },
          submittedAt: new Date().toISOString(),
          status: 'pending' as const,
        },
      ];

      onlineStatus = true;
      mockedOfflineStorage.getPendingResponses.mockResolvedValue(pendingResponses);
      mockedOfflineStorage.markAsSynced.mockResolvedValue();
      mockedOfflineStorage.removeFromQueue.mockResolvedValue();

      const mockSyncFn = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useOfflineSync({ onSync: mockSyncFn }));

      await act(async () => {
        await result.current.syncNow();
      });

      await waitFor(() => {
        expect(mockSyncFn).toHaveBeenCalled();
      });
    });

    it('should not trigger sync when offline', async () => {
      onlineStatus = false;

      const mockSyncFn = vi.fn();

      const { result } = renderHook(() => useOfflineSync({ onSync: mockSyncFn }));

      await act(async () => {
        await result.current.syncNow();
      });

      expect(mockSyncFn).not.toHaveBeenCalled();
    });
  });

  describe('Clear Queue', () => {
    it('should allow clearing the queue', async () => {
      mockedOfflineStorage.getQueueSize.mockResolvedValue(0);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.clearQueue();
      });

      // After clearing, should call removeFromQueue for each item
      // or clearAllData if available
    });
  });

  describe('Event Listeners Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useOfflineSync());

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Retry Logic', () => {
    it('should track retry count for failed syncs', async () => {
      const pendingResponses = [
        {
          id: 'resp-1',
          formId: 'form-123',
          data: { name: 'Test' },
          submittedAt: new Date().toISOString(),
          status: 'failed' as const,
          retryCount: 2,
        },
      ];

      onlineStatus = true;
      mockedOfflineStorage.getPendingResponses.mockResolvedValue(pendingResponses);

      const mockSyncFn = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOfflineSync({ onSync: mockSyncFn }));

      await act(async () => {
        await result.current.syncNow();
      });

      // Should attempt to sync failed items with incremented retry count
      await waitFor(() => {
        expect(mockSyncFn).toHaveBeenCalled();
      });
    });
  });
});
