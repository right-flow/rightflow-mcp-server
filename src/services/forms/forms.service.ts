/**
 * Forms Service (Phase 1)
 * Handles form CRUD operations with PostgreSQL persistence
 *
 * Replaces localStorage with database storage
 */

import { getDb } from '../../lib/db';
import crypto from 'crypto';
import { UsageService } from '../billing/usage.service';
import { premiumFeaturesService } from '../premium/premium-features.service';
import { urlShortenerService } from '../url-shortener/url-shortener.service';

export interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  station?: string;  // DocsFlow support
  [key: string]: any;
}

export interface CreateFormData {
  userId: string;
  title: string;
  description?: string;
  fields: FormField[];
  stations?: string[];
  settings?: Record<string, any>;
}

export interface UpdateFormData {
  title?: string;
  description?: string;
  fields?: FormField[];
  stations?: string[];
  settings?: Record<string, any>;
}

export interface FormRecord {
  id: string;
  user_id: string;
  org_id: string | null;
  tenant_type: string;
  slug: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  fields: FormField[];
  stations: string[];
  settings: Record<string, any>;
  pdf_storage_path: string | null;
  short_url: string | null;  // Premium feature: shortened URL
  published_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}

export interface ServiceResult<T = FormRecord> {
  success: boolean;
  form?: T;
  error?: string;
}

export interface FormVersion {
  id: string;
  form_id: string;
  version_number: number;
  title: string;
  description: string | null;
  fields: FormField[];
  stations: string[];
  settings: Record<string, any>;
  published_by: string;
  published_at: Date;
  is_current: boolean;
  notes: string | null;
  created_at: Date;
}

export interface VersionResult {
  success: boolean;
  version?: FormVersion;
  versions?: FormVersion[];
  error?: string;
}

export class FormsService {
  private usageService: UsageService;

  constructor() {
    this.usageService = new UsageService();
  }

  /**
   * Create new form
   */
  async createForm(data: CreateFormData): Promise<ServiceResult> {
    try {
      // Validate required fields
      if (!data.title || data.title.trim().length === 0) {
        return {
          success: false,
          error: 'Form title is required',
        };
      }

      const db = getDb();
      const formId = crypto.randomUUID();
      const slug = await this.generateUniqueSlug(data.title);

      const formRecord = {
        id: formId,
        user_id: data.userId,
        org_id: null,
        tenant_type: 'rightflow',
        slug,
        title: data.title,
        description: data.description || null,
        status: 'draft',
        fields: JSON.stringify(data.fields),
        stations: JSON.stringify(data.stations || []),
        settings: JSON.stringify(data.settings || {}),
        pdf_storage_path: null,
        published_at: null,
        created_at: new Date(),
        updated_at: null,
        deleted_at: null,
      };

      await db('forms').insert(formRecord);

      // Track usage (increment forms count)
      await this.usageService.incrementFormsCount(data.userId);

      // Fetch the created form
      const created = await this.getFormById(formId);

      return {
        success: true,
        form: created || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create form',
      };
    }
  }

  /**
   * Get form by ID
   */
  async getFormById(formId: string): Promise<FormRecord | null> {
    try {
      const db = getDb();
      const form = await db('forms')
        .where({ id: formId })
        .whereNull('deleted_at')
        .first();

      if (!form) return null;

      return this.parseFormRecord(form);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get form by slug (for public access)
   */
  async getFormBySlug(slug: string): Promise<FormRecord | null> {
    try {
      const db = getDb();
      const form = await db('forms')
        .where({ slug })
        .whereNull('deleted_at')
        .first();

      if (!form) return null;

      return this.parseFormRecord(form);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all forms for a user
   */
  async getUserForms(userId: string): Promise<FormRecord[]> {
    try {
      const db = getDb();
      const forms = await db('forms')
        .where({ user_id: userId })
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc');

      return forms.map(form => this.parseFormRecord(form));
    } catch (error) {
      return [];
    }
  }

  /**
   * Update form
   */
  async updateForm(
    formId: string,
    userId: string,
    data: UpdateFormData,
  ): Promise<ServiceResult> {
    try {
      const db = getDb();

      // Check ownership
      const existing = await db('forms')
        .where({ id: formId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!existing) {
        return {
          success: false,
          error: 'Form not found or unauthorized',
        };
      }

      // Build update object
      const updateData: any = {
        updated_at: new Date(),
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.fields !== undefined) updateData.fields = JSON.stringify(data.fields);
      if (data.stations !== undefined) updateData.stations = JSON.stringify(data.stations);
      if (data.settings !== undefined) updateData.settings = JSON.stringify(data.settings);

      await db('forms').where({ id: formId }).update(updateData);

      // Fetch updated form
      const updated = await this.getFormById(formId);

      return {
        success: true,
        form: updated || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update form',
      };
    }
  }

  /**
   * Delete form (soft delete)
   */
  async deleteForm(formId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      const db = getDb();

      // Check ownership
      const existing = await db('forms')
        .where({ id: formId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!existing) {
        return {
          success: false,
          error: 'Form not found or unauthorized',
        };
      }

      // Soft delete
      await db('forms')
        .where({ id: formId })
        .update({ deleted_at: new Date() });

      // Track usage (decrement forms count)
      await this.usageService.decrementFormsCount(userId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete form',
      };
    }
  }

  /**
   * Publish form (creates a new version)
   */
  async publishForm(formId: string, userId: string, notes?: string): Promise<ServiceResult> {
    try {
      const db = getDb();

      // Check ownership
      const existing = await db('forms')
        .where({ id: formId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!existing) {
        return {
          success: false,
          error: 'Form not found or unauthorized',
        };
      }

      // Parse the form data
      const form = this.parseFormRecord(existing);

      // Create new version
      const versionResult = await this.createVersion({
        formId,
        userId,
        title: form.title,
        description: form.description || undefined,
        fields: form.fields,
        stations: form.stations,
        settings: form.settings,
        notes,
      });

      if (!versionResult.success) {
        return {
          success: false,
          error: versionResult.error || 'Failed to create version',
        };
      }

      // Check if user has premium access for URL shortening
      const canShorten = await premiumFeaturesService.canUseUrlShortening(userId);
      let shortUrl: string | null = null;

      if (canShorten.allowed) {
        console.log(`[Publish] User has premium access, creating short URL for form ${form.slug}`);
        const shortenResult = await urlShortenerService.shortenFormUrl(form.slug);

        if (shortenResult.success && shortenResult.shortUrl) {
          shortUrl = shortenResult.shortUrl;
          console.log(`[Publish] Short URL created: ${shortUrl}`);
        } else {
          console.warn(`[Publish] Failed to create short URL: ${shortenResult.error}`);
          // Don't fail the publish if shortening fails
        }
      } else {
        console.log(`[Publish] User does not have premium access, skipping short URL creation`);
      }

      // Update form status and short URL
      await db('forms')
        .where({ id: formId })
        .update({
          status: 'published',
          short_url: shortUrl,
          published_at: new Date(),
          updated_at: new Date(),
        });

      const published = await this.getFormById(formId);

      return {
        success: true,
        form: published || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish form',
      };
    }
  }

  /**
   * Unpublish form
   */
  async unpublishForm(formId: string, userId: string): Promise<ServiceResult> {
    try {
      const db = getDb();

      // Check ownership
      const existing = await db('forms')
        .where({ id: formId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!existing) {
        return {
          success: false,
          error: 'Form not found or unauthorized',
        };
      }

      await db('forms')
        .where({ id: formId })
        .update({
          status: 'draft',
          updated_at: new Date(),
        });

      const unpublished = await this.getFormById(formId);

      return {
        success: true,
        form: unpublished || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpublish form',
      };
    }
  }

  /**
   * Generate unique slug from title
   */
  private async generateUniqueSlug(title: string): Promise<string> {
    const db = getDb();
    const MAX_RETRIES = 10;

    // Convert to lowercase and replace spaces/special chars with dashes
    let baseSlug = title
      .toLowerCase()
      .trim()
      // Remove Hebrew and other non-ASCII characters
      .replace(/[^\x00-\x7F]/g, '')
      // Replace spaces and underscores with dashes
      .replace(/[\s_]+/g, '-')
      // Remove special characters
      .replace(/[^a-z0-9-]/g, '')
      // Remove multiple consecutive dashes
      .replace(/-+/g, '-')
      // Remove leading/trailing dashes
      .replace(/^-+|-+$/g, '');

    // If slug is empty after sanitization, use a random string
    if (!baseSlug) {
      baseSlug = 'form-' + crypto.randomBytes(4).toString('hex');
    }

    let slug = baseSlug;
    let attempt = 0;

    // Retry loop to ensure uniqueness
    while (attempt < MAX_RETRIES) {
      // Check if slug exists
      const existing = await db('forms').where({ slug }).first();

      if (!existing) {
        // Slug is unique, return it
        return slug;
      }

      // Collision detected, generate new slug with random suffix
      attempt++;
      const suffix = crypto.randomBytes(3).toString('hex');
      slug = `${baseSlug}-${suffix}`;
    }

    // If we exhausted all retries, throw an error
    throw new Error(
      `Failed to generate unique slug after ${MAX_RETRIES} attempts. ` +
      `This is highly unlikely and may indicate a database issue.`,
    );
  }

  /**
   * Parse form record from database
   * Converts JSON strings back to objects
   */
  private parseFormRecord(dbForm: any): FormRecord {
    const parseJsonSafely = <T>(value: any, defaultValue: T, fieldName: string): T => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch (error) {
          console.warn(
            `Failed to parse ${fieldName} for form ${dbForm.id}: ${error instanceof Error ? error.message : 'Unknown error'}. Using default value.`,
          );
          return defaultValue;
        }
      }
      return value;
    };

    return {
      ...dbForm,
      fields: parseJsonSafely<FormField[]>(dbForm.fields, [], 'fields'),
      stations: parseJsonSafely<string[]>(dbForm.stations, [], 'stations'),
      settings: parseJsonSafely<Record<string, any>>(dbForm.settings, {}, 'settings'),
    };
  }

  // ============================================================================
  // VERSION MANAGEMENT METHODS
  // ============================================================================

  /**
   * Create a new version snapshot
   */
  async createVersion(data: {
    formId: string;
    userId: string;
    title: string;
    description?: string;
    fields: FormField[];
    stations: string[];
    settings: Record<string, any>;
    notes?: string;
  }): Promise<VersionResult> {
    try {
      const db = getDb();

      // Get next version number
      const latestVersion = await db('form_versions')
        .where({ form_id: data.formId })
        .orderBy('version_number', 'desc')
        .first();

      const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

      // Set all previous versions to not current
      await db('form_versions')
        .where({ form_id: data.formId })
        .update({ is_current: false });

      // Create new version
      const versionId = crypto.randomUUID();
      const versionRecord = {
        id: versionId,
        form_id: data.formId,
        version_number: versionNumber,
        title: data.title,
        description: data.description || null,
        fields: JSON.stringify(data.fields),
        stations: JSON.stringify(data.stations),
        settings: JSON.stringify(data.settings),
        published_by: data.userId,
        published_at: new Date(),
        is_current: true,
        notes: data.notes || null,
        created_at: new Date(),
      };

      await db('form_versions').insert(versionRecord);

      const version = await this.getVersion(data.formId, versionNumber);

      return {
        success: true,
        version: version || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create version',
      };
    }
  }

  /**
   * Get specific version
   */
  async getVersion(formId: string, versionNumber: number): Promise<FormVersion | null> {
    try {
      const db = getDb();
      const version = await db('form_versions')
        .where({ form_id: formId, version_number: versionNumber })
        .first();

      if (!version) return null;

      return this.parseVersionRecord(version);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current published version
   */
  async getCurrentVersion(formId: string): Promise<FormVersion | null> {
    try {
      const db = getDb();
      const version = await db('form_versions')
        .where({ form_id: formId, is_current: true })
        .first();

      if (!version) return null;

      return this.parseVersionRecord(version);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get version history for a form
   */
  async getVersionHistory(formId: string): Promise<VersionResult> {
    try {
      const db = getDb();
      const versions = await db('form_versions')
        .where({ form_id: formId })
        .orderBy('version_number', 'desc');

      const parsed = versions.map(v => this.parseVersionRecord(v));

      return {
        success: true,
        versions: parsed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version history',
      };
    }
  }

  /**
   * Restore a specific version
   * Creates a new version with the content from an old version
   */
  async restoreVersion(
    formId: string,
    versionNumber: number,
    userId: string,
    notes?: string,
  ): Promise<ServiceResult> {
    try {
      const db = getDb();

      // Check ownership
      const form = await db('forms')
        .where({ id: formId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!form) {
        return {
          success: false,
          error: 'Form not found or unauthorized',
        };
      }

      // Get the version to restore
      const oldVersion = await this.getVersion(formId, versionNumber);
      if (!oldVersion) {
        return {
          success: false,
          error: `Version ${versionNumber} not found`,
        };
      }

      // Update the form with old version's content
      await db('forms')
        .where({ id: formId })
        .update({
          title: oldVersion.title,
          description: oldVersion.description,
          fields: JSON.stringify(oldVersion.fields),
          stations: JSON.stringify(oldVersion.stations),
          settings: JSON.stringify(oldVersion.settings),
          updated_at: new Date(),
        });

      // Create new version with restored content
      const versionResult = await this.createVersion({
        formId,
        userId,
        title: oldVersion.title,
        description: oldVersion.description || undefined,
        fields: oldVersion.fields,
        stations: oldVersion.stations,
        settings: oldVersion.settings,
        notes: notes || `Restored from version ${versionNumber}`,
      });

      if (!versionResult.success) {
        return {
          success: false,
          error: versionResult.error || 'Failed to create restored version',
        };
      }

      const updated = await this.getFormById(formId);

      return {
        success: true,
        form: updated || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore version',
      };
    }
  }

  /**
   * Parse version record from database
   */
  private parseVersionRecord(dbVersion: any): FormVersion {
    const parseJsonSafely = <T>(value: any, defaultValue: T): T => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return defaultValue;
        }
      }
      return value;
    };

    return {
      ...dbVersion,
      fields: parseJsonSafely<FormField[]>(dbVersion.fields, []),
      stations: parseJsonSafely<string[]>(dbVersion.stations, []),
      settings: parseJsonSafely<Record<string, any>>(dbVersion.settings, {}),
    };
  }
}

// Export singleton instance
export const formsService = new FormsService();
