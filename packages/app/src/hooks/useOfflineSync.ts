/**
 * useOfflineSync Hook
 * Manages offline form submissions and synchronization
 * Supports Hebrew content and handles network state changes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  offlineStorage,
  type OfflineResponse,
} from '@/services/offline/offline-storage.service';

/**
 * Sync callback result
 */
interface SyncResult {
  success: boolean;
  error?: string;
}

/**
 * Props for the useOfflineSync hook
 */
interface UseOfflineSyncProps {
  /** Callback to perform actual sync (e.g., API call) */
  onSync?: (response: OfflineResponse) => Promise<SyncResult>;
  /** Auto-sync when coming back online */
  autoSync?: boolean;
}

/**
 * Return type for the useOfflineSync hook
 */
interface UseOfflineSyncResult {
  /** Current online status */
  isOnline: boolean;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of items in the queue */
  queueSize: number;
  /** Last sync error message */
  syncError: string | null;
  /** Whether IndexedDB storage is available */
  isStorageAvailable: boolean;
  /** Queue a form response for later sync */
  queueFormResponse: (formId: string, data: Record<string, unknown>) => Promise<void>;
  /** Manually trigger sync */
  syncNow: () => Promise<void>;
  /** Clear all queued items */
  clearQueue: () => Promise<void>;
}

/**
 * Generate unique ID for queued response
 */
function generateResponseId(): string {
  return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for managing offline form submissions and synchronization
 *
 * @param props - Configuration options
 * @returns Offline sync state and functions
 *
 * @example
 * ```tsx
 * const {
 *   isOnline,
 *   isSyncing,
 *   queueSize,
 *   queueFormResponse,
 *   syncNow
 * } = useOfflineSync({
 *   onSync: async (response) => {
 *     await api.submitForm(response.formId, response.data);
 *     return { success: true };
 *   }
 * });
 *
 * // Queue a response when offline
 * await queueFormResponse('form-123', { name: 'ישראל', email: 'test@example.com' });
 * ```
 */
export function useOfflineSync({
  onSync,
  autoSync = true,
}: UseOfflineSyncProps = {}): UseOfflineSyncResult {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isStorageAvailable, setIsStorageAvailable] = useState<boolean>(true);

  // Track if sync is already in progress to prevent duplicate syncs
  const syncInProgress = useRef<boolean>(false);

  // Check storage availability on mount
  useEffect(() => {
    const checkStorage = async () => {
      try {
        const available = await offlineStorage.isStorageAvailable();
        setIsStorageAvailable(available);
      } catch {
        setIsStorageAvailable(false);
      }
    };

    checkStorage();
  }, []);

  // Update queue size
  const updateQueueSize = useCallback(async () => {
    try {
      const size = await offlineStorage.getQueueSize();
      setQueueSize(size);
    } catch {
      // Ignore errors when updating queue size
    }
  }, []);

  // Update queue size on mount and periodically
  useEffect(() => {
    updateQueueSize();

    // Update queue size every 5 seconds if there are pending items
    const interval = setInterval(() => {
      if (queueSize > 0) {
        updateQueueSize();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [updateQueueSize, queueSize]);

  // Sync pending responses
  const syncPendingResponses = useCallback(async () => {
    if (!onSync || syncInProgress.current || !isOnline) {
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const pendingResponses = await offlineStorage.getPendingResponses();

      for (const response of pendingResponses) {
        try {
          const result = await onSync(response);

          if (result.success) {
            await offlineStorage.markAsSynced(response.id);
            await offlineStorage.removeFromQueue(response.id);
          } else {
            // Update retry count on failure
            const updatedResponse: OfflineResponse = {
              ...response,
              status: 'failed',
              retryCount: (response.retryCount || 0) + 1,
              errorMessage: result.error,
            };
            await offlineStorage.queueResponse(updatedResponse);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sync failed';
          setSyncError(errorMessage);

          // Update response with error
          const updatedResponse: OfflineResponse = {
            ...response,
            status: 'failed',
            retryCount: (response.retryCount || 0) + 1,
            errorMessage,
          };
          await offlineStorage.queueResponse(updatedResponse);
        }
      }

      await updateQueueSize();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncError(errorMessage);
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [onSync, isOnline, updateQueueSize]);

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true);

    if (autoSync) {
      // Small delay before syncing to ensure connection is stable
      setTimeout(() => {
        syncPendingResponses();
      }, 1000);
    }
  }, [autoSync, syncPendingResponses]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  // Set up network event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Queue a form response
  const queueFormResponse = useCallback(
    async (formId: string, data: Record<string, unknown>): Promise<void> => {
      const response: OfflineResponse = {
        id: generateResponseId(),
        formId,
        data,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        retryCount: 0,
      };

      await offlineStorage.queueResponse(response);
      await updateQueueSize();
    },
    [updateQueueSize],
  );

  // Manually trigger sync
  const syncNow = useCallback(async (): Promise<void> => {
    if (!isOnline) {
      return;
    }

    await syncPendingResponses();
  }, [isOnline, syncPendingResponses]);

  // Clear all queued items
  const clearQueue = useCallback(async (): Promise<void> => {
    try {
      const pendingResponses = await offlineStorage.getPendingResponses();

      for (const response of pendingResponses) {
        await offlineStorage.removeFromQueue(response.id);
      }

      await updateQueueSize();
    } catch {
      // Ignore errors when clearing queue
    }
  }, [updateQueueSize]);

  return {
    isOnline,
    isSyncing,
    queueSize,
    syncError,
    isStorageAvailable,
    queueFormResponse,
    syncNow,
    clearQueue,
  };
}
