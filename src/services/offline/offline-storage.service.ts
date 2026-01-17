/**
 * Offline Storage Service
 * Manages IndexedDB for offline form data and response queue
 */

const DB_NAME = 'rightflow-offline';
const DB_VERSION = 1;
const STORES = {
  FORMS: 'forms',
  RESPONSES: 'responses',
  SYNC_QUEUE: 'syncQueue',
} as const;

/**
 * Cached form data for offline access
 */
export interface OfflineFormData {
  formId: string;
  slug: string;
  name: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    label?: string;
    options?: string[];
    required?: boolean;
  }>;
  cachedAt: string;
  expiresAt?: string;
}

/**
 * Response data queued for sync
 */
export interface OfflineResponse {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  submittedAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  errorMessage?: string;
  retryCount?: number;
}

/**
 * Generic sync queue item
 */
export interface SyncQueueItem {
  id: string;
  type: 'response' | 'form';
  data: unknown;
  createdAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

/**
 * Storage estimate result
 */
export interface StorageEstimate {
  usage: number;
  quota: number;
  percentUsed: number;
}

/**
 * Service for managing offline storage using IndexedDB
 */
export class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize and open the IndexedDB database
   */
  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create forms store
        if (!db.objectStoreNames.contains(STORES.FORMS)) {
          const formsStore = db.createObjectStore(STORES.FORMS, { keyPath: 'slug' });
          formsStore.createIndex('formId', 'formId', { unique: false });
          formsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Create responses store
        if (!db.objectStoreNames.contains(STORES.RESPONSES)) {
          const responsesStore = db.createObjectStore(STORES.RESPONSES, { keyPath: 'id' });
          responsesStore.createIndex('formId', 'formId', { unique: false });
          responsesStore.createIndex('status', 'status', { unique: false });
          responsesStore.createIndex('submittedAt', 'submittedAt', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Save form data for offline access
   */
  async saveFormData(formData: OfflineFormData): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.FORMS, 'readwrite');
      const store = transaction.objectStore(STORES.FORMS);
      const request = store.put(formData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save form data'));
    });
  }

  /**
   * Get cached form data by slug
   */
  async getFormData(slug: string): Promise<OfflineFormData | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.FORMS, 'readonly');
      const store = transaction.objectStore(STORES.FORMS);
      const request = store.get(slug);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get form data'));
    });
  }

  /**
   * Queue a response for later sync
   */
  async queueResponse(response: OfflineResponse): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.RESPONSES, 'readwrite');
      const store = transaction.objectStore(STORES.RESPONSES);
      const request = store.put(response);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to queue response'));
    });
  }

  /**
   * Get all pending responses
   */
  async getPendingResponses(): Promise<OfflineResponse[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.RESPONSES, 'readonly');
      const store = transaction.objectStore(STORES.RESPONSES);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result as OfflineResponse[];
        const pending = all.filter((r) => r.status === 'pending' || r.status === 'failed');
        resolve(pending);
      };
      request.onerror = () => reject(new Error('Failed to get pending responses'));
    });
  }

  /**
   * Mark a response as synced
   */
  async markAsSynced(responseId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.RESPONSES, 'readwrite');
      const store = transaction.objectStore(STORES.RESPONSES);
      const getRequest = store.get(responseId);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const updated = { ...getRequest.result, status: 'synced' };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(new Error('Failed to mark as synced'));
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(new Error('Failed to find response'));
    });
  }

  /**
   * Remove a response from the queue
   */
  async removeFromQueue(responseId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.RESPONSES, 'readwrite');
      const store = transaction.objectStore(STORES.RESPONSES);
      const request = store.delete(responseId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove from queue'));
    });
  }

  /**
   * Get the number of pending items in the queue
   */
  async getQueueSize(): Promise<number> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.RESPONSES, 'readonly');
      const store = transaction.objectStore(STORES.RESPONSES);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result as OfflineResponse[];
        const pending = all.filter((r) => r.status === 'pending' || r.status === 'failed');
        resolve(pending.length);
      };
      request.onerror = () => reject(new Error('Failed to get queue size'));
    });
  }

  /**
   * Clear all cached data
   */
  async clearAllData(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.FORMS, STORES.RESPONSES, STORES.SYNC_QUEUE],
        'readwrite'
      );

      let completed = 0;
      const total = 3;

      const onComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      transaction.objectStore(STORES.FORMS).clear().onsuccess = onComplete;
      transaction.objectStore(STORES.RESPONSES).clear().onsuccess = onComplete;
      transaction.objectStore(STORES.SYNC_QUEUE).clear().onsuccess = onComplete;

      transaction.onerror = () => reject(new Error('Failed to clear data'));
    });
  }

  /**
   * Check if IndexedDB is available
   */
  async isStorageAvailable(): Promise<boolean> {
    try {
      if (!('indexedDB' in window)) {
        return false;
      }
      await this.openDB();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<StorageEstimate> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    }
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPromise = null;
    }
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorageService();
