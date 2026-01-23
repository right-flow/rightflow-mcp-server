/**
 * useSyncManager Hook
 * React hook for interacting with the Sync Manager
 */

import { useState, useEffect } from 'react';
import { syncManager, type SyncStats } from '@/sync/syncManager';

export interface UseSyncManagerReturn {
  /** Current sync statistics */
  stats: SyncStats;
  /** Whether currently online */
  isOnline: boolean;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of pending items */
  queueSize: number;
  /** Last sync time */
  lastSyncTime?: Date;
  /** Last sync error */
  syncError?: string;
  /** Manually trigger sync */
  syncNow: () => Promise<void>;
  /** Refresh statistics */
  refreshStats: () => Promise<void>;
}

/**
 * Hook to use Sync Manager in React components
 */
export function useSyncManager(): UseSyncManagerReturn {
  const [stats, setStats] = useState<SyncStats>({
    totalItems: 0,
    syncedItems: 0,
    failedItems: 0,
    pendingItems: 0,
    isSyncing: false,
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncError, setSyncError] = useState<string>();

  /**
   * Refresh statistics from Sync Manager
   */
  const refreshStats = async () => {
    try {
      const newStats = await syncManager.getStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to get sync stats:', error);
    }
  };

  /**
   * Manually trigger sync
   */
  const syncNow = async () => {
    try {
      setSyncError(undefined);
      await syncManager.syncNow();
      await refreshStats();
    } catch (error) {
      setSyncError((error as Error).message);
    }
  };

  useEffect(() => {
    // Initial stats load
    refreshStats();

    // Listen to sync events
    const handleSyncStarted = () => {
      refreshStats();
    };

    const handleSyncCompleted = () => {
      setSyncError(undefined);
      refreshStats();
    };

    const handleSyncFailed = (_event: any, data: any) => {
      setSyncError(data?.error?.message || 'Sync failed');
      refreshStats();
    };

    const handleItemSynced = () => {
      refreshStats();
    };

    syncManager.on('sync-started', handleSyncStarted);
    syncManager.on('sync-completed', handleSyncCompleted);
    syncManager.on('sync-failed', handleSyncFailed);
    syncManager.on('item-synced', handleItemSynced);

    // Listen to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Refresh stats every 5 seconds
    const interval = setInterval(refreshStats, 5000);

    return () => {
      syncManager.off('sync-started', handleSyncStarted);
      syncManager.off('sync-completed', handleSyncCompleted);
      syncManager.off('sync-failed', handleSyncFailed);
      syncManager.off('item-synced', handleItemSynced);

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      clearInterval(interval);
    };
  }, []);

  return {
    stats,
    isOnline,
    isSyncing: stats.isSyncing,
    queueSize: stats.pendingItems,
    lastSyncTime: stats.lastSyncTime,
    syncError,
    syncNow,
    refreshStats,
  };
}
