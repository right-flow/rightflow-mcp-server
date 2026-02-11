import type { WorkflowDefinition } from './workflow-backend-types';
import type { Language } from '@/store/appStore';

/**
 * Workflow template category for organization and filtering.
 */
export type WorkflowCategory =
  | 'approval'        // Multi-level approval workflows
  | 'data-collection' // Form-based data gathering
  | 'automation'      // Automated actions (email, PDF, webhook)
  | 'conditional'     // Complex branching logic
  | 'integration'     // External system integrations
  | 'notification'    // WhatsApp, Email, SMS notifications
  | 'custom';         // User-defined

/**
 * Workflow template - reusable workflow definition with metadata.
 * Templates can be system-provided or user-created.
 */
export interface WorkflowTemplate {
  /** Unique identifier */
  id: string;

  /** Template name (user-friendly) */
  name: string;

  /** Detailed description of what the workflow does */
  description: string;

  /** Category for filtering and organization */
  category: WorkflowCategory;

  /** Tags for search and discovery */
  tags: string[];

  /** Optional preview image (Base64 PNG) */
  thumbnail?: string;

  /** Complete workflow definition */
  definition: WorkflowDefinition;

  /** True if system-provided, false if user-created */
  isSystem: boolean;

  /** True if shared with team (future: requires auth) */
  isShared: boolean;

  /** User ID who created the template */
  createdBy: string;

  /** ISO 8601 timestamp */
  createdAt: string;

  /** ISO 8601 timestamp */
  updatedAt: string;

  /** Number of times template has been used */
  usageCount: number;

  /** Optional metadata */
  metadata?: {
    /** Estimated execution time in seconds */
    estimatedExecutionTime?: number;

    /** Field names required by workflow */
    requiredFields?: string[];

    /** Languages supported */
    supportedLanguages?: Language[];
  };
}

/**
 * Filter options for template search and filtering.
 */
export interface WorkflowTemplateFilter {
  /** Filter by category */
  category?: WorkflowCategory;

  /** Filter by tags (OR logic - match any tag) */
  tags?: string[];

  /** Search query (matches name, description, tags) */
  searchQuery?: string;

  /** Only show system templates */
  onlySystem?: boolean;

  /** Only show user-created templates */
  onlyUser?: boolean;
}

/**
 * Sort options for template gallery.
 */
export type TemplateSortBy =
  | 'name-asc'
  | 'name-desc'
  | 'usage-desc'
  | 'usage-asc'
  | 'date-desc'
  | 'date-asc';
