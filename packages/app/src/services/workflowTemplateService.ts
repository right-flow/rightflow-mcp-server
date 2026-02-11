/**
 * Workflow Template Management Service
 * Handles saving, loading, and managing workflow templates
 */

import type {
  WorkflowTemplate,
  WorkflowTemplateFilter,
  WorkflowCategory,
  TemplateSortBy,
} from '@/types/workflow-template';
import type { WorkflowDefinition } from '@/types/workflow-backend-types';
import { systemWorkflowTemplates } from '@/data/system-workflow-templates';

const STORAGE_KEY = 'rightflow_workflow_templates';
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB (save 1MB for form templates)

class WorkflowTemplateService {
  /**
   * Get all workflow templates (system + user)
   */
  getAllWorkflowTemplates(filter?: WorkflowTemplateFilter): WorkflowTemplate[] {
    const systemTemplates = this.getSystemTemplates();
    const userTemplates = this.getUserTemplates();

    let templates = [...systemTemplates, ...userTemplates];

    // Apply filters
    if (filter?.category) {
      templates = templates.filter((t) => t.category === filter.category);
    }

    if (filter?.tags && filter.tags.length > 0) {
      templates = templates.filter((t) =>
        filter.tags!.some((tag) => t.tags.includes(tag))
      );
    }

    if (filter?.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      // Escape special regex characters
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'i');

      templates = templates.filter(
        (t) =>
          regex.test(t.name) ||
          regex.test(t.description) ||
          t.tags.some((tag) => regex.test(tag))
      );
    }

    if (filter?.onlySystem) {
      templates = templates.filter((t) => t.isSystem);
    }

    if (filter?.onlyUser) {
      templates = templates.filter((t) => !t.isSystem);
    }

    return templates;
  }

  /**
   * Get single template by ID
   */
  getWorkflowTemplate(id: string): WorkflowTemplate | null {
    const all = this.getAllWorkflowTemplates();
    return all.find((t) => t.id === id) || null;
  }

  /**
   * Save new user template
   */
  saveWorkflowTemplate(
    template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): string {
    const userTemplates = this.getUserTemplates();

    const newTemplate: WorkflowTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSystem: false, // User templates are never system
      usageCount: template.usageCount || 0,
    };

    userTemplates.push(newTemplate);

    // Validate size
    const serialized = JSON.stringify(userTemplates);
    if (serialized.length > MAX_STORAGE_SIZE) {
      throw new Error(
        `Workflow templates exceed storage limit (${
          MAX_STORAGE_SIZE / 1024 / 1024
        }MB). Please delete old templates.`
      );
    }

    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      return newTemplate.id;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete old templates.');
      }
      throw error;
    }
  }

  /**
   * Update existing user template
   */
  updateWorkflowTemplate(
    id: string,
    updates: Partial<WorkflowTemplate>
  ): void {
    const userTemplates = this.getUserTemplates();
    const index = userTemplates.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new Error(`Template ${id} not found`);
    }

    // Prevent updating system templates
    if (userTemplates[index].isSystem) {
      throw new Error('Cannot modify system templates');
    }

    userTemplates[index] = {
      ...userTemplates[index],
      ...updates,
      id: userTemplates[index].id, // Preserve ID
      isSystem: false, // Always false for user templates
      createdAt: userTemplates[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userTemplates));
  }

  /**
   * Delete user template
   */
  deleteWorkflowTemplate(id: string): void {
    const userTemplates = this.getUserTemplates();
    const template = userTemplates.find((t) => t.id === id);

    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    // Prevent deleting system templates
    if (template.isSystem) {
      throw new Error('Cannot delete system templates');
    }

    const filtered = userTemplates.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Duplicate workflow (create new instance from template)
   * Returns workflow definition with regenerated IDs
   */
  duplicateWorkflow(templateId: string): WorkflowDefinition {
    const template = this.getWorkflowTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Increment usage count (skip for system templates stored in code)
    if (!template.isSystem) {
      this.updateWorkflowTemplate(templateId, {
        usageCount: template.usageCount + 1,
      });
    }

    // Return deep copy with new IDs
    return this.regenerateWorkflowIds(template.definition);
  }

  /**
   * Export template as JSON file
   */
  exportTemplate(id: string): string {
    const template = this.getWorkflowTemplate(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }
    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON
   */
  importTemplate(json: string): string {
    // Parse JSON with error handling
    let template: unknown;
    try {
      template = JSON.parse(json);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON format: ${error.message}`);
      }
      throw new Error('Failed to parse template JSON');
    }

    // Validate template is an object
    if (!template || typeof template !== 'object') {
      throw new Error('Invalid template format: template must be a JSON object');
    }

    const templateObj = template as Record<string, unknown>;

    // Validate required fields
    if (typeof templateObj.name !== 'string' || !templateObj.name.trim()) {
      throw new Error('Invalid template format: name must be a non-empty string');
    }

    if (!templateObj.definition) {
      throw new Error('Invalid template format: definition is required');
    }

    if (typeof templateObj.category !== 'string' || !templateObj.category) {
      throw new Error('Invalid template format: category is required');
    }

    if (!Array.isArray(templateObj.tags)) {
      throw new Error('Invalid template format: tags must be an array');
    }

    // Sanitize text fields to prevent XSS
    const sanitizedName = this.sanitizeHtml(templateObj.name);
    const sanitizedDescription = this.sanitizeHtml(
      typeof templateObj.description === 'string' ? templateObj.description : ''
    );

    // Prevent prototype pollution by not spreading template directly
    // Only copy safe fields
    return this.saveWorkflowTemplate({
      name: sanitizedName,
      description: sanitizedDescription,
      category: templateObj.category as WorkflowCategory,
      definition: templateObj.definition as WorkflowDefinition,
      tags: Array.isArray(templateObj.tags)
        ? (templateObj.tags as string[]).map((tag) =>
            typeof tag === 'string' ? this.sanitizeHtml(tag) : ''
          )
        : [],
      isSystem: false,
      isShared: false,
      createdBy: 'imported',
      usageCount: 0,
    });
  }

  /**
   * Sort templates
   */
  sortTemplates(
    templates: WorkflowTemplate[],
    sortBy: TemplateSortBy
  ): WorkflowTemplate[] {
    const sorted = [...templates];

    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'usage-desc':
        return sorted.sort((a, b) => b.usageCount - a.usageCount);
      case 'usage-asc':
        return sorted.sort((a, b) => a.usageCount - b.usageCount);
      case 'date-desc':
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'date-asc':
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      default:
        return sorted;
    }
  }

  /**
   * Get storage info
   */
  getStorageInfo(): { used: number; limit: number; percentage: number } {
    const userTemplates = this.getUserTemplates();
    const used = new Blob([JSON.stringify(userTemplates)]).size;

    return {
      used,
      limit: MAX_STORAGE_SIZE,
      percentage: (used / MAX_STORAGE_SIZE) * 100,
    };
  }

  /**
   * Get categories with counts
   */
  getCategoriesWithCounts(): Record<WorkflowCategory, number> {
    const templates = this.getAllWorkflowTemplates();
    const counts: Record<string, number> = {
      approval: 0,
      'data-collection': 0,
      automation: 0,
      conditional: 0,
      integration: 0,
      notification: 0,
      custom: 0,
    };

    templates.forEach((t) => {
      counts[t.category]++;
    });

    return counts as Record<WorkflowCategory, number>;
  }

  /**
   * Get all unique tags
   */
  getAllTags(): string[] {
    const templates = this.getAllWorkflowTemplates();
    const tags = new Set<string>();

    templates.forEach((t) => {
      t.tags.forEach((tag) => tags.add(tag));
    });

    return Array.from(tags).sort();
  }

  // ========== Private Methods ==========

  /**
   * Get system templates (bundled with app)
   */
  private getSystemTemplates(): WorkflowTemplate[] {
    return systemWorkflowTemplates;
  }

  /**
   * Get user templates from localStorage
   */
  private getUserTemplates(): WorkflowTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse workflow templates:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  /**
   * Regenerate all IDs in workflow definition (for duplication)
   */
  private regenerateWorkflowIds(
    definition: WorkflowDefinition
  ): WorkflowDefinition {
    const idMap = new Map<string, string>();

    // Generate new IDs for nodes
    const newNodes = definition.nodes.map((node) => {
      const newId = crypto.randomUUID();
      idMap.set(node.id, newId);
      return { ...node, id: newId };
    });

    // Update connection IDs
    const newConnections = definition.connections.map((conn) => ({
      ...conn,
      id: crypto.randomUUID(),
      source: idMap.get(conn.source) || conn.source,
      target: idMap.get(conn.target) || conn.target,
    }));

    return {
      ...definition,
      id: crypto.randomUUID(),
      nodes: newNodes,
      connections: newConnections,
    };
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  private sanitizeHtml(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
}

// Export singleton instance
export const workflowTemplateService = new WorkflowTemplateService();
