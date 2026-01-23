/**
 * IndexedDB Wrapper
 * Provides a type-safe API for interacting with IndexedDB
 * Uses idb library for better DX
 */

import { openDB, IDBPDatabase } from 'idb';
import type {
  RightFlowDB,
  FormTemplate,
  FormSubmission,
  SyncQueueItem,
  Asset,
} from './schema';

// Re-export constants
export const DATABASE_NAME = 'rightflow-db';
export const DATABASE_VERSION = 1;

/**
 * Database class - Singleton wrapper for IndexedDB operations
 */
class Database {
  private db: IDBPDatabase<RightFlowDB> | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   * Creates all object stores and indexes
   */
  async init(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.db) {
      return Promise.resolve();
    }

    this.initPromise = this._performInit();
    return this.initPromise;
  }

  private async _performInit(): Promise<void> {
    try {
      this.db = await openDB<RightFlowDB>(DATABASE_NAME, DATABASE_VERSION, {
        upgrade(db, oldVersion, newVersion) {
          console.log(`Upgrading database from ${oldVersion} to ${newVersion}`);

          // Create forms store
          if (!db.objectStoreNames.contains('forms')) {
            const formsStore = db.createObjectStore('forms', { keyPath: 'id' });
            formsStore.createIndex('by-name', 'name');
            formsStore.createIndex('by-updated', 'updatedAt');
            formsStore.createIndex('by-sync-status', 'syncStatus');
            formsStore.createIndex('by-user', 'userId');
          }

          // Create submissions store
          if (!db.objectStoreNames.contains('submissions')) {
            const submissionsStore = db.createObjectStore('submissions', { keyPath: 'id' });
            submissionsStore.createIndex('by-form', 'formId');
            submissionsStore.createIndex('by-completed', 'metadata.completedAt');
            submissionsStore.createIndex('by-sync-status', 'syncStatus');
            submissionsStore.createIndex('by-user', 'metadata.userId');
          }

          // Create queue store
          if (!db.objectStoreNames.contains('queue')) {
            const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
            queueStore.createIndex('by-status', 'status');
            queueStore.createIndex('by-created', 'createdAt');
            queueStore.createIndex('by-entity', 'entity');
          }

          // Create assets store
          if (!db.objectStoreNames.contains('assets')) {
            const assetsStore = db.createObjectStore('assets', { keyPath: 'id' });
            assetsStore.createIndex('by-type', 'type');
            assetsStore.createIndex('by-sync-status', 'syncStatus');
            assetsStore.createIndex('by-submission', 'submissionId');
          }
        },
        blocked() {
          console.warn('Database upgrade blocked by another tab');
        },
        blocking() {
          console.warn('Database blocking an upgrade in another tab');
        },
        terminated() {
          console.error('Database connection terminated unexpectedly');
        },
      });

      console.log('✅ IndexedDB initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDB:', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Ensures database is initialized before operations
   */
  private async ensureDB(): Promise<IDBPDatabase<RightFlowDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database initialization failed');
    }
    return this.db;
  }

  // ==================== FORM CRUD ====================

  async saveForm(form: FormTemplate): Promise<void> {
    const db = await this.ensureDB();
    await db.put('forms', form);
  }

  async getForm(id: string): Promise<FormTemplate | undefined> {
    const db = await this.ensureDB();
    return db.get('forms', id);
  }

  async getAllForms(): Promise<FormTemplate[]> {
    const db = await this.ensureDB();
    return db.getAll('forms');
  }

  async getFormsByUser(userId: string): Promise<FormTemplate[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('forms', 'by-user', userId);
  }

  async deleteForm(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('forms', id);
  }

  async searchFormsByName(query: string): Promise<FormTemplate[]> {
    const db = await this.ensureDB();
    const allForms = await db.getAll('forms');
    return allForms.filter(form =>
      form.name.toLowerCase().includes(query.toLowerCase()),
    );
  }

  // ==================== SUBMISSION CRUD ====================

  async saveSubmission(submission: FormSubmission): Promise<void> {
    const db = await this.ensureDB();
    await db.put('submissions', submission);
  }

  async getSubmission(id: string): Promise<FormSubmission | undefined> {
    const db = await this.ensureDB();
    return db.get('submissions', id);
  }

  async getAllSubmissions(): Promise<FormSubmission[]> {
    const db = await this.ensureDB();
    return db.getAll('submissions');
  }

  async getSubmissionsByForm(formId: string): Promise<FormSubmission[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('submissions', 'by-form', formId);
  }

  async getSubmissionsByStatus(status: FormSubmission['syncStatus']): Promise<FormSubmission[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('submissions', 'by-sync-status', status);
  }

  async getSubmissionsByUser(userId: string): Promise<FormSubmission[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('submissions', 'by-user', userId);
  }

  async deleteSubmission(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('submissions', id);
  }

  // ==================== QUEUE OPERATIONS ====================

  async addToQueue(item: SyncQueueItem): Promise<void> {
    const db = await this.ensureDB();
    await db.put('queue', item);
  }

  async getQueueItem(id: string): Promise<SyncQueueItem | undefined> {
    const db = await this.ensureDB();
    return db.get('queue', id);
  }

  async getPendingQueue(): Promise<SyncQueueItem[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('queue', 'by-status', 'pending');
  }

  async getFailedQueue(): Promise<SyncQueueItem[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('queue', 'by-status', 'failed');
  }

  async updateQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await this.ensureDB();
    await db.put('queue', item);
  }

  async deleteQueueItem(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('queue', id);
  }

  async clearSuccessfulQueue(): Promise<void> {
    const db = await this.ensureDB();
    const successful = await db.getAllFromIndex('queue', 'by-status', 'success');
    for (const item of successful) {
      await db.delete('queue', item.id);
    }
  }

  // ==================== ASSET OPERATIONS ====================

  async saveAsset(asset: Asset): Promise<void> {
    const db = await this.ensureDB();
    await db.put('assets', asset);
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const db = await this.ensureDB();
    return db.get('assets', id);
  }

  async getAllAssets(): Promise<Asset[]> {
    const db = await this.ensureDB();
    return db.getAll('assets');
  }

  async getAssetsByType(type: Asset['type']): Promise<Asset[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('assets', 'by-type', type);
  }

  async getUnsyncedAssets(): Promise<Asset[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('assets', 'by-sync-status', 'local');
  }

  async getAssetsBySubmission(submissionId: string): Promise<Asset[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('assets', 'by-submission', submissionId);
  }

  async deleteAsset(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('assets', id);
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    formsCount: number;
    submissionsCount: number;
    queueCount: number;
    assetsCount: number;
    estimatedSize: number;
  }> {
    const db = await this.ensureDB();

    const [forms, submissions, queue, assets] = await Promise.all([
      db.getAll('forms'),
      db.getAll('submissions'),
      db.getAll('queue'),
      db.getAll('assets'),
    ]);

    // Estimate size (rough calculation)
    const estimatedSize = assets.reduce((sum, asset) => sum + asset.size, 0);

    return {
      formsCount: forms.length,
      submissionsCount: submissions.length,
      queueCount: queue.length,
      assetsCount: assets.length,
      estimatedSize,
    };
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    await Promise.all([
      db.clear('forms'),
      db.clear('submissions'),
      db.clear('queue'),
      db.clear('assets'),
    ]);

    console.log('✅ All data cleared from IndexedDB');
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const db = new Database();

// Export types for convenience
export type { FormTemplate, FormSubmission, SyncQueueItem, Asset };
