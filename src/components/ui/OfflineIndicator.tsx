/**
 * OfflineIndicator Component
 * Displays network status and sync queue information
 * Supports Hebrew RTL and Dark/Light mode
 */

import { Wifi, WifiOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation, useDirection } from '@/i18n';
import { cn } from '@/utils/cn';

interface OfflineIndicatorProps {
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of items waiting to be synced */
  queueSize: number;
  /** Last sync error message */
  syncError?: string;
  /** Last successful sync time (ISO string) */
  lastSyncTime?: string;
  /** Callback when sync button is clicked */
  onSyncClick?: () => void;
  /** Show in compact mode (icon only) */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Format relative time for display
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * OfflineIndicator displays the current network status and sync queue
 *
 * @example
 * ```tsx
 * <OfflineIndicator
 *   isOnline={true}
 *   isSyncing={false}
 *   queueSize={3}
 *   onSyncClick={() => syncNow()}
 * />
 * ```
 */
export function OfflineIndicator({
  isOnline,
  isSyncing,
  queueSize,
  syncError,
  lastSyncTime,
  onSyncClick,
  compact = false,
  className,
}: OfflineIndicatorProps) {
  const t = useTranslation();
  const direction = useDirection();

  // Determine status for styling
  const status = !isOnline ? 'offline' : isSyncing ? 'syncing' : 'online';
  const hasQueuedItems = queueSize > 0;

  // Get status icon
  const StatusIcon = !isOnline ? WifiOff : isSyncing ? RefreshCw : Wifi;

  // Get status text
  const statusText = !isOnline ? t.offline : isSyncing ? t.syncing : t.online;

  // Compact mode - just show icon
  if (compact) {
    return (
      <div
        dir={direction}
        className={cn(
          'compact inline-flex items-center justify-center',
          'w-8 h-8 rounded-full',
          status === 'offline' && 'bg-destructive/10 text-destructive',
          status === 'syncing' && 'bg-warning/10 text-warning',
          status === 'online' && !hasQueuedItems && 'bg-success/10 text-success',
          status === 'online' && hasQueuedItems && 'bg-warning/10 text-warning',
          className
        )}
        data-status={status}
        role="status"
        aria-live="polite"
        aria-label={statusText}
      >
        <StatusIcon
          className={cn(
            'w-4 h-4',
            isSyncing && 'animate-spin'
          )}
        />
        {hasQueuedItems && (
          <span className="absolute -top-1 -right-1 w-4 h-4 text-xs bg-warning text-warning-foreground rounded-full flex items-center justify-center">
            {queueSize}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      dir={direction}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border',
        status === 'offline' && 'border-destructive/50 bg-destructive/5',
        status === 'syncing' && 'border-warning/50 bg-warning/5',
        status === 'online' && !hasQueuedItems && 'border-success/50 bg-success/5',
        status === 'online' && hasQueuedItems && 'border-warning/50 bg-warning/5',
        className
      )}
      data-status={status}
      role="status"
      aria-live="polite"
    >
      {/* Status Icon */}
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full',
          status === 'offline' && 'bg-destructive/10 text-destructive',
          status === 'syncing' && 'bg-warning/10 text-warning',
          status === 'online' && !hasQueuedItems && 'bg-success/10 text-success',
          status === 'online' && hasQueuedItems && 'bg-warning/10 text-warning'
        )}
      >
        <StatusIcon
          className={cn(
            'w-4 h-4',
            isSyncing && 'animate-spin'
          )}
        />
      </div>

      {/* Status Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              status === 'offline' && 'text-destructive',
              status === 'syncing' && 'text-warning',
              status === 'online' && 'text-success'
            )}
          >
            {statusText}
          </span>

          {/* Queue badge */}
          {hasQueuedItems && !isSyncing && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-warning/20 text-warning">
              {queueSize} {t.pendingItems}
            </span>
          )}

          {/* Success check when online with no queue */}
          {isOnline && !hasQueuedItems && !isSyncing && (
            <Check className="w-3 h-3 text-success" />
          )}
        </div>

        {/* Last sync time */}
        {lastSyncTime && isOnline && !isSyncing && (
          <p className="text-xs text-muted-foreground truncate">
            {t.lastSynced}: {formatRelativeTime(lastSyncTime)}
          </p>
        )}

        {/* Error message */}
        {syncError && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            <span className="truncate">{syncError}</span>
          </div>
        )}
      </div>

      {/* Sync Button */}
      {hasQueuedItems && onSyncClick && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncClick}
          disabled={!isOnline || isSyncing}
          className="shrink-0"
          aria-label={t.syncNow}
        >
          <RefreshCw
            className={cn(
              'w-3 h-3 ml-1',
              isSyncing && 'animate-spin'
            )}
          />
          {t.syncNow}
        </Button>
      )}
    </div>
  );
}
