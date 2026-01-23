/**
 * IndexedDB Schema Definitions
 * Defines TypeScript interfaces for all database stores
 */

/**
 * Form Template - Reusable form structure
 */
export interface FormTemplate {
  id: string; // UUID
  name: string; // "חוזה שירות"
  version: number; // 1, 2, 3...
  fields: FieldDefinition[]; // Array of field definitions
  pdfTemplate?: ArrayBuffer; // Original PDF (optional)
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  organizationId?: string; // Clerk organization ID (optional)
  userId: string; // Creator ID
}

/**
 * Field Definition (used in FormTemplate)
 */
export interface FieldDefinition {
  id: string;
  type: 'text' | 'checkbox' | 'signature' | 'radio' | 'dropdown' | 'date' | 'camera' | 'gps';
  name: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  defaultValue?: string;
  options?: string[]; // For dropdown/radio
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * Form Submission - Filled form data
 */
export interface FormSubmission {
  id: string; // UUID
  formId: string; // Reference to FormTemplate
  formVersion: number; // Which version of template was used
  data: Record<string, any>; // Field ID → value mapping
  photos: string[]; // Array of photo asset IDs
  signature?: string; // Signature asset ID (optional)
  location?: GeolocationData; // GPS coordinates (optional)
  metadata: SubmissionMetadata;
  syncStatus: 'local' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  syncRetries: number;
}

/**
 * Submission Metadata - Comprehensive tracking
 */
export interface SubmissionMetadata {
  // User & Organization
  userId?: string; // Optional to allow PII stripping
  organizationId?: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  submittedAt?: Date;
  totalSeconds?: number; // Total time spent
  activeSeconds?: number; // Time actively filling
  idleSeconds?: number; // Time idle
  pauseCount?: number; // Number of pauses

  // Device Information
  deviceId?: string; // Optional to allow PII stripping
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  userAgent?: string;
  isPWA?: boolean; // Running as installed PWA

  // Screen & Display
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  pixelRatio?: number;

  // Capabilities
  touchSupported?: boolean;
  language?: string;
  timezone?: string;

  // Network
  isOnline?: boolean;
  connectionType?: string;
  connectionSpeed?: string;

  // Location (for GDPR compliance tracking)
  ipAddress?: string;
  locationCaptured?: boolean; // Whether user granted location permission
}

/**
 * Geolocation Data
 */
export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

/**
 * Sync Queue Item - Pending offline operations
 */
export interface SyncQueueItem {
  id: string; // UUID
  type: 'create' | 'update' | 'delete';
  entity: 'form' | 'submission' | 'asset';
  entityId: string;
  payload: any; // The data to sync
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'failed' | 'success';
}

/**
 * Asset - Binary data (photos, signatures, PDFs)
 */
export interface Asset {
  id: string; // UUID
  type: 'photo' | 'signature' | 'pdf';
  blob: Blob; // Binary data
  mimeType: string; // "image/jpeg", "image/png", etc.
  size: number; // Bytes
  createdAt: Date;
  syncStatus: 'local' | 'synced';
  url?: string; // Remote URL after sync (optional)
  submissionId?: string; // Reference to submission (optional)
}

/**
 * Database Schema for IndexedDB
 */
export interface RightFlowDB {
  forms: {
    key: string;
    value: FormTemplate;
    indexes: {
      'by-name': string;
      'by-updated': Date;
      'by-sync-status': string;
      'by-user': string;
    };
  };
  submissions: {
    key: string;
    value: FormSubmission;
    indexes: {
      'by-form': string;
      'by-completed': Date;
      'by-sync-status': string;
      'by-user': string;
    };
  };
  queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-created': Date;
      'by-entity': string;
    };
  };
  assets: {
    key: string;
    value: Asset;
    indexes: {
      'by-type': string;
      'by-sync-status': string;
      'by-submission': string;
    };
  };
}

/**
 * Database version
 */
export const DB_NAME = 'rightflow-db';
export const DB_VERSION = 1;
