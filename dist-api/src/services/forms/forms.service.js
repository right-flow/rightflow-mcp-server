/**
 * Forms Service (Phase 1)
 * Handles form CRUD operations with PostgreSQL persistence
 *
 * Replaces localStorage with database storage
 */
import { getDb } from '../../lib/db';
import crypto from 'crypto';
import { UsageService } from '../billing/usage.service';
export class FormsService {
    usageService;
    constructor() {
        this.usageService = new UsageService();
    }
    /**
     * Create new form
     */
    async createForm(data) {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create form',
            };
        }
    }
    /**
     * Get form by ID
     */
    async getFormById(formId) {
        try {
            const db = getDb();
            const form = await db('forms')
                .where({ id: formId })
                .whereNull('deleted_at')
                .first();
            if (!form)
                return null;
            return this.parseFormRecord(form);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get form by slug (for public access)
     */
    async getFormBySlug(slug) {
        try {
            const db = getDb();
            const form = await db('forms')
                .where({ slug })
                .whereNull('deleted_at')
                .first();
            if (!form)
                return null;
            return this.parseFormRecord(form);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get all forms for a user
     */
    async getUserForms(userId) {
        try {
            const db = getDb();
            const forms = await db('forms')
                .where({ user_id: userId })
                .whereNull('deleted_at')
                .orderBy('created_at', 'desc');
            return forms.map(form => this.parseFormRecord(form));
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Update form
     */
    async updateForm(formId, userId, data) {
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
            const updateData = {
                updated_at: new Date(),
            };
            if (data.title !== undefined)
                updateData.title = data.title;
            if (data.description !== undefined)
                updateData.description = data.description;
            if (data.fields !== undefined)
                updateData.fields = JSON.stringify(data.fields);
            if (data.stations !== undefined)
                updateData.stations = JSON.stringify(data.stations);
            if (data.settings !== undefined)
                updateData.settings = JSON.stringify(data.settings);
            await db('forms').where({ id: formId }).update(updateData);
            // Fetch updated form
            const updated = await this.getFormById(formId);
            return {
                success: true,
                form: updated || undefined,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update form',
            };
        }
    }
    /**
     * Delete form (soft delete)
     */
    async deleteForm(formId, userId) {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete form',
            };
        }
    }
    /**
     * Publish form
     */
    async publishForm(formId, userId) {
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
                status: 'published',
                published_at: new Date(),
                updated_at: new Date(),
            });
            const published = await this.getFormById(formId);
            return {
                success: true,
                form: published || undefined,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to publish form',
            };
        }
    }
    /**
     * Unpublish form
     */
    async unpublishForm(formId, userId) {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unpublish form',
            };
        }
    }
    /**
     * Generate unique slug from title
     */
    async generateUniqueSlug(title) {
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
        throw new Error(`Failed to generate unique slug after ${MAX_RETRIES} attempts. ` +
            `This is highly unlikely and may indicate a database issue.`);
    }
    /**
     * Parse form record from database
     * Converts JSON strings back to objects
     */
    parseFormRecord(dbForm) {
        const parseJsonSafely = (value, defaultValue, fieldName) => {
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value);
                }
                catch (error) {
                    console.warn(`Failed to parse ${fieldName} for form ${dbForm.id}: ${error instanceof Error ? error.message : 'Unknown error'}. Using default value.`);
                    return defaultValue;
                }
            }
            return value;
        };
        return {
            ...dbForm,
            fields: parseJsonSafely(dbForm.fields, [], 'fields'),
            stations: parseJsonSafely(dbForm.stations, [], 'stations'),
            settings: parseJsonSafely(dbForm.settings, {}, 'settings'),
        };
    }
}
// Export singleton instance
export const formsService = new FormsService();
//# sourceMappingURL=forms.service.js.map