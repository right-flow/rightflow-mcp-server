/**
 * Sync Manager
 * Orchestrates synchronization of offline data with backend
 *
 * Features:
 * - Automatic sync every 30 seconds when online
 * - Sync on network reconnection
 * - Retry with exponential backoff
 * - Queue-based system
 */

import { db } from '@/db/indexedDB';
import type { FormSubmission } from '@/db/schema';
import { apiClient, type ApiError } from '@/api/client';

/**
 * Sync event types
 */
export type SyncEvent =
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'sync-progress'
  | 'item-synced'
  | 'item-failed';

/**
 * Sync event listener
 */
export type SyncEventListener = (event: SyncEvent, data?: any) => void;

/**
 * Sync statistics
 */
export interface SyncStats {
  totalItems: number;
  syncedItems: number;
  failedItems: number;
  pendingItems: number;
  lastSyncTime?: Date;
  isSyncing: boolean;
}

/**
 * Sync Manager Configuration
 */
interface SyncConfig {
  /** Sync interval in milliseconds (default: 30 seconds) */
  syncInterval?: number;
  /** Maximum retry attempts (default: 5) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000ms) */
  initialRetryDelay?: number;
  /** Enable automatic sync (default: true) */
  autoSync?: boolean;
}

/**
 * Sync Manager Class
 */
class SyncManager {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Map<SyncEvent, SyncEventListener[]> = new Map();
  private config: Required<SyncConfig>;
  private lastSyncTime?: Date;

  constructor(config: SyncConfig = {}) {
    this.config = {
      syncInterval: config.syncInterval || 30000, // 30 seconds
      maxRetries: config.maxRetries || 5,
      initialRetryDelay: config.initialRetryDelay || 1000, // 1 second
      autoSync: config.autoSync ?? true,
    };
  }

  /**
   * Initialize sync manager
   * Sets up event listeners and starts periodic sync
   */
  async init(): Promise<void> {
    // Initialize database
    await db.init();

    if (!this.config.autoSync) {
      return;
    }

    // Sync on app start
    await this.sync();

    // Periodic sync when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, this.config.syncInterval);

    // Sync when coming back online
    window.addEventListener('online', () => {
      console.log('📡 Network connection restored, syncing...');
      this.sync();
    });

    console.log('✅ Sync Manager initialized');
  }

  /**
   * Main sync function
   * Orchestrates all sync operations
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏸️  Sync already in progress, skipping...');
      return;
    }

    if (!navigator.onLine) {
      console.log('📡 Offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.emit('sync-started');

    try {
      // 1. Sync submissions
      await this.syncSubmissions();

      // 2. Sync assets (photos, signatures)
      await this.syncAssets();

      // 3. Process sync queue (general operations)
      await this.processQueue();

      // 4. Clean up successful queue items
      await db.clearSuccessfulQueue();

      this.lastSyncTime = new Date();
      this.emit('sync-completed', { timestamp: this.lastSyncTime });

      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.emit('sync-failed', { error });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync form submissions
   */
  private async syncSubmissions(): Promise<void> {
    const pending = await db.getSubmissionsByStatus('local');

    if (pending.length === 0) {
      return;
    }

    console.log(`📤 Syncing ${pending.length} submissions...`);

    for (const submission of pending) {
      try {
        // Update status to syncing
        submission.syncStatus = 'syncing';
        await db.saveSubmission(submission);

        // Upload to backend
        await apiClient.post('/submissions', submission);

        // Mark as synced
        submission.syncStatus = 'synced';
        submission.metadata.submittedAt = new Date();
        await db.saveSubmission(submission);

        this.emit('item-synced', { type: 'submission', id: submission.id });
        console.log(`✅ Synced submission ${submission.id}`);
      } catch (error) {
        // Mark as failed
        submission.syncStatus = 'failed';
        submission.syncError = (error as ApiError).message || 'Unknown error';
        submission.syncRetries++;
        await db.saveSubmission(submission);

        this.emit('item-failed', {
          type: 'submission',
          id: submission.id,
          error: submission.syncError,
        });

        console.error(`❌ Failed to sync submission ${submission.id}:`, error);

        // Retry logic with exponential backoff
        if (submission.syncRetries < this.config.maxRetries) {
          await this.scheduleRetry(submission);
        }
      }
    }
  }

  /**
   * Sync assets (photos, signatures, PDFs)
   */
  private async syncAssets(): Promise<void> {
    const unsynced = await db.getUnsyncedAssets();

    if (unsynced.length === 0) {
      return;
    }

    console.log(`📤 Syncing ${unsynced.length} assets...`);

    for (const asset of unsynced) {
      try {
        // Prepare FormData for file upload
        const formData = new FormData();
        formData.append('file', asset.blob, `${asset.id}.${this.getExtension(asset.mimeType)}`);
        formData.append('type', asset.type);
        if (asset.submissionId) {
          formData.append('submissionId', asset.submissionId);
        }

        // Upload binary data
        const response = await apiClient.post<{ url: string }>('/assets', formData);

        // Update asset with remote URL
        asset.syncStatus = 'synced';
        asset.url = response.data.url;
        await db.saveAsset(asset);

        this.emit('item-synced', { type: 'asset', id: asset.id });
        console.log(`✅ Synced asset ${asset.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync asset ${asset.id}:`, error);
        this.emit('item-failed', {
          type: 'asset',
          id: asset.id,
          error: (error as ApiError).message,
        });
      }
    }
  }

  /**
   * Process sync queue (general operations)
   */
  private async processQueue(): Promise<void> {
    const queue = await db.getPendingQueue();

    if (queue.length === 0) {
      return;
    }

    console.log(`📤 Processing ${queue.length} queue items...`);

    for (const item of queue) {
      try {
        item.status = 'processing';
        item.lastAttempt = new Date();
        await db.updateQueueItem(item);

        // Execute action based on type
        switch (item.type) {
          case 'create':
            await apiClient.post(`/${item.entity}s`, item.payload);
            break;
          case 'update':
            await apiClient.put(`/${item.entity}s/${item.entityId}`, item.payload);
            break;
          case 'delete':
            await apiClient.delete(`/${item.entity}s/${item.entityId}`);
            break;
        }

        // Mark as success
        item.status = 'success';
        await db.updateQueueItem(item);

        console.log(`✅ Processed queue item ${item.id}`);
      } catch (error) {
        // Mark as failed and increment attempts
        item.status = 'failed';
        item.attempts++;
        item.error = (error as ApiError).message || 'Unknown error';
        await db.updateQueueItem(item);

        console.error(`❌ Failed queue item ${item.id}:`, error);

        // Retry with exponential backoff
        if (item.attempts < this.config.maxRetries) {
          const delay = this.config.initialRetryDelay * Math.pow(2, item.attempts);
          console.log(`🔄 Retrying in ${delay}ms (attempt ${item.attempts + 1}/${this.config.maxRetries})`);

          setTimeout(() => {
            item.status = 'pending';
            db.updateQueueItem(item);
          }, delay);
        } else {
          console.error(`❌ Max retries reached for queue item ${item.id}`);
        }
      }
    }
  }

  /**
   * Schedule retry for failed submission
   */
  private async scheduleRetry(submission: FormSubmission): Promise<void> {
    const delay = this.config.initialRetryDelay * Math.pow(2, submission.syncRetries);

    console.log(`🔄 Scheduling retry for submission ${submission.id} in ${delay}ms`);

    setTimeout(async () => {
      submission.syncStatus = 'local'; // Reset to local for next sync attempt
      await db.saveSubmission(submission);
    }, delay);
  }

  /**
   * Get file extension from MIME type
   */
  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    return map[mimeType] || 'bin';
  }

  /**
   * Get sync statistics
   */
  async getStats(): Promise<SyncStats> {
    const [submissions, assets, queue] = await Promise.all([
      db.getAllSubmissions(),
      db.getAllAssets(),
      db.getPendingQueue(),
    ]);

    const totalItems = submissions.length + assets.length;
    const syncedItems = submissions.filter(s => s.syncStatus === 'synced').length +
                        assets.filter(a => a.syncStatus === 'synced').length;
    const failedItems = submissions.filter(s => s.syncStatus === 'failed').length;
    const pendingItems = submissions.filter(s => s.syncStatus === 'local').length +
                         assets.filter(a => a.syncStatus === 'local').length +
                         queue.length;

    return {
      totalItems,
      syncedItems,
      failedItems,
      pendingItems,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Add event listener
   */
  on(event: SyncEvent, listener: SyncEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: SyncEvent, listener: SyncEventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: SyncEvent, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(event, data));
    }
  }

  /**
   * Manually trigger sync
   */
  async syncNow(): Promise<void> {
    return this.sync();
  }

  /**
   * Pause automatic sync
   */
  pause(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('⏸️  Sync Manager paused');
  }

  /**
   * Resume automatic sync
   */
  resume(): void {
    if (this.syncInterval) {
      return; // Already running
    }

    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, this.config.syncInterval);

    console.log('▶️  Sync Manager resumed');
  }

  /**
   * Destroy sync manager
   * Cleans up intervals and event listeners
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners.clear();
    console.log('🛑 Sync Manager destroyed');
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Re-export config type only (SyncStats already exported above)
export type { SyncConfig };
