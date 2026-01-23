/**
 * Sync Status Bar Component
 * Enhanced version of OfflineIndicator that uses the new Sync Manager
 */

import { useSyncManager } from '@/hooks/useSyncManager';
import { OfflineIndicator } from './OfflineIndicator';

/**
 * Sync Status Bar - Wrapper around OfflineIndicator with Sync Manager integration
 */
export function SyncStatusBar() {
  const {
    isOnline,
    isSyncing,
    queueSize,
    lastSyncTime,
    syncError,
    syncNow,
  } = useSyncManager();

  return (
    <OfflineIndicator
      isOnline={isOnline}
      isSyncing={isSyncing}
      queueSize={queueSize}
      syncError={syncError}
      lastSyncTime={lastSyncTime?.toISOString()}
      onSyncClick={syncNow}
    />
  );
}
