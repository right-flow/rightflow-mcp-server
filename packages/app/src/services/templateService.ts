/**
 * Template Management Service
 * Handles saving, loading, and managing form templates
 */

import { FormDefinition } from '../components/forms/FormBuilder';

export interface FormTemplate extends FormDefinition {
  id: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
  thumbnail?: string;
  isDefault?: boolean;
  usageCount?: number;
}

const STORAGE_KEY = 'rightflow_form_templates';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for localStorage

class TemplateService {
  /**
   * Get all templates from localStorage
   */
  getAllTemplates(): FormTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const templates = JSON.parse(stored);
      return templates.sort((a: FormTemplate, b: FormTemplate) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  /**
   * Get a single template by ID
   */
  getTemplate(id: string): FormTemplate | null {
    const templates = this.getAllTemplates();
    return templates.find(t => t.id === id) || null;
  }

  /**
   * Save a new template
   */
  saveTemplate(template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>): FormTemplate {
    const templates = this.getAllTemplates();

    const newTemplate: FormTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    };

    // Check storage size
    const newTemplates = [...templates, newTemplate];
    const storageSize = new Blob([JSON.stringify(newTemplates)]).size;

    if (storageSize > MAX_STORAGE_SIZE) {
      throw new Error('Storage limit exceeded. Please delete some templates.');
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
      return newTemplate;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete some templates.');
      }
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  updateTemplate(id: string, updates: Partial<FormTemplate>): FormTemplate | null {
    const templates = this.getAllTemplates();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) return null;

    const updatedTemplate = {
      ...templates[index],
      ...updates,
      id: templates[index].id, // Preserve ID
      createdAt: templates[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    templates[index] = updatedTemplate;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      return null;
    }
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean {
    const templates = this.getAllTemplates();
    const filtered = templates.filter(t => t.id !== id);

    if (filtered.length === templates.length) return false;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  /**
   * Duplicate a template
   */
  duplicateTemplate(id: string, newName?: string): FormTemplate | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    const { id: _, createdAt, updatedAt, usageCount, ...templateData } = template;

    return this.saveTemplate({
      ...templateData,
      name: newName || `${template.name} (Copy)`,
    });
  }

  /**
   * Export template as JSON
   */
  exportTemplate(id: string): string | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    const { id: _, createdAt, updatedAt, usageCount, ...exportData } = template;
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export all templates
   */
  exportAllTemplates(): string {
    const templates = this.getAllTemplates();
    return JSON.stringify(templates, null, 2);
  }

  /**
   * Import template from JSON
   */
  importTemplate(jsonString: string): FormTemplate {
    try {
      const data = JSON.parse(jsonString);

      // Validate required fields
      if (!data.name || !data.fields || !Array.isArray(data.fields)) {
        throw new Error('Invalid template format');
      }

      // Remove any existing ID to create a new one
      const { id, createdAt, updatedAt, ...templateData } = data;

      return this.saveTemplate(templateData);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  /**
   * Import multiple templates
   */
  importTemplates(jsonString: string): FormTemplate[] {
    try {
      const data = JSON.parse(jsonString);
      const templates = Array.isArray(data) ? data : [data];

      return templates.map(template => {
        const { id, createdAt, updatedAt, ...templateData } = template;
        return this.saveTemplate(templateData);
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  /**
   * Search templates
   */
  searchTemplates(query: string, category?: string, tags?: string[]): FormTemplate[] {
    let templates = this.getAllTemplates();

    // Filter by category
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      templates = templates.filter(t =>
        t.tags && tags.some(tag => t.tags?.includes(tag))
      );
    }

    // Search by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery) ||
        t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    return templates;
  }

  /**
   * Get template categories
   */
  getCategories(): string[] {
    const templates = this.getAllTemplates();
    const categories = new Set<string>();

    templates.forEach(t => {
      if (t.category) categories.add(t.category);
    });

    return Array.from(categories).sort();
  }

  /**
   * Get all tags
   */
  getAllTags(): string[] {
    const templates = this.getAllTemplates();
    const tags = new Set<string>();

    templates.forEach(t => {
      t.tags?.forEach(tag => tags.add(tag));
    });

    return Array.from(tags).sort();
  }

  /**
   * Track template usage
   */
  trackUsage(id: string): void {
    const template = this.getTemplate(id);
    if (template) {
      this.updateTemplate(id, {
        usageCount: (template.usageCount || 0) + 1
      });
    }
  }

  /**
   * Get most used templates
   */
  getMostUsedTemplates(limit: number = 5): FormTemplate[] {
    const templates = this.getAllTemplates();
    return templates
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }

  /**
   * Clear all templates
   */
  clearAllTemplates(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get storage info
   */
  getStorageInfo(): { used: number; limit: number; percentage: number } {
    const templates = this.getAllTemplates();
    const used = new Blob([JSON.stringify(templates)]).size;

    return {
      used,
      limit: MAX_STORAGE_SIZE,
      percentage: (used / MAX_STORAGE_SIZE) * 100,
    };
  }
}

// Export singleton instance
export const templateService = new TemplateService();