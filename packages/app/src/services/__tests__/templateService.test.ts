/**
 * Unit tests for Template Service
 */

import { templateService, FormTemplate } from '../templateService';
import { FormDefinition } from '../../components/forms/FormBuilder';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('TemplateService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('getAllTemplates', () => {
    it('should return empty array when no templates exist', () => {
      const templates = templateService.getAllTemplates();
      expect(templates).toEqual([]);
    });

    it('should return templates sorted by updated date', () => {
      const mockTemplates: FormTemplate[] = [
        {
          id: '1',
          name: 'Template 1',
          fields: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: '2',
          name: 'Template 2',
          fields: [],
          createdAt: '2024-01-02',
          updatedAt: '2024-01-03',
        },
      ];

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify(mockTemplates));

      const templates = templateService.getAllTemplates();
      expect(templates[0].id).toBe('2');
      expect(templates[1].id).toBe('1');
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem('rightflow_form_templates', 'invalid json');

      const templates = templateService.getAllTemplates();
      expect(templates).toEqual([]);
    });
  });

  describe('getTemplate', () => {
    it('should return null when template not found', () => {
      const template = templateService.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should return template when found', () => {
      const mockTemplate: FormTemplate = {
        id: 'test-id',
        name: 'Test Template',
        fields: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify([mockTemplate]));

      const template = templateService.getTemplate('test-id');
      expect(template).toEqual(mockTemplate);
    });
  });

  describe('saveTemplate', () => {
    it('should save new template with generated ID and timestamps', () => {
      const templateData: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'New Template',
        description: 'Test description',
        fields: [
          {
            id: 'field1',
            type: 'text',
            label: 'Test Field',
            name: 'test_field',
            required: false,
          },
        ],
      };

      const saved = templateService.saveTemplate(templateData);

      expect(saved.id).toMatch(/^template_\d+_[a-z0-9]+$/);
      expect(saved.name).toBe('New Template');
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
      expect(saved.usageCount).toBe(0);

      const templates = templateService.getAllTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0]).toEqual(saved);
    });

    it('should throw error when storage limit exceeded', () => {
      // Create a large template that exceeds 5MB
      const largeTemplate: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Large Template',
        description: 'x'.repeat(6 * 1024 * 1024), // 6MB of data
        fields: [],
      };

      expect(() => templateService.saveTemplate(largeTemplate)).toThrow(
        'Storage limit exceeded'
      );
    });
  });

  describe('updateTemplate', () => {
    it('should return null when template not found', () => {
      const updated = templateService.updateTemplate('non-existent', { name: 'Updated' });
      expect(updated).toBeNull();
    });

    it('should update template and preserve ID and creation date', () => {
      const original: FormTemplate = {
        id: 'test-id',
        name: 'Original',
        fields: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify([original]));

      const updated = templateService.updateTemplate('test-id', {
        name: 'Updated Name',
        description: 'New description',
      });

      expect(updated).not.toBeNull();
      expect(updated!.id).toBe('test-id');
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.description).toBe('New description');
      expect(updated!.createdAt).toBe('2024-01-01');
      expect(updated!.updatedAt).not.toBe('2024-01-01');
    });
  });

  describe('deleteTemplate', () => {
    it('should return false when template not found', () => {
      const result = templateService.deleteTemplate('non-existent');
      expect(result).toBe(false);
    });

    it('should delete template and return true', () => {
      const template: FormTemplate = {
        id: 'test-id',
        name: 'Test',
        fields: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify([template]));

      const result = templateService.deleteTemplate('test-id');
      expect(result).toBe(true);

      const templates = templateService.getAllTemplates();
      expect(templates).toHaveLength(0);
    });
  });

  describe('duplicateTemplate', () => {
    it('should return null when template not found', () => {
      const result = templateService.duplicateTemplate('non-existent');
      expect(result).toBeNull();
    });

    it('should duplicate template with new ID and name', () => {
      const original: FormTemplate = {
        id: 'original-id',
        name: 'Original Template',
        description: 'Test',
        fields: [{ id: 'f1', type: 'text', label: 'Field', name: 'field', required: false }],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        usageCount: 10,
      };

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify([original]));

      const duplicate = templateService.duplicateTemplate('original-id');

      expect(duplicate).not.toBeNull();
      expect(duplicate!.id).not.toBe('original-id');
      expect(duplicate!.name).toBe('Original Template (Copy)');
      expect(duplicate!.fields).toEqual(original.fields);
      expect(duplicate!.usageCount).toBe(0);

      const templates = templateService.getAllTemplates();
      expect(templates).toHaveLength(2);
    });

    it('should duplicate template with custom name', () => {
      const original: FormTemplate = {
        id: 'original-id',
        name: 'Original',
        fields: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify([original]));

      const duplicate = templateService.duplicateTemplate('original-id', 'Custom Name');

      expect(duplicate!.name).toBe('Custom Name');
    });
  });

  describe('searchTemplates', () => {
    beforeEach(() => {
      const templates: FormTemplate[] = [
        {
          id: '1',
          name: 'Registration Form',
          description: 'User registration',
          category: 'auth',
          tags: ['user', 'signup'],
          fields: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: '2',
          name: 'Contact Form',
          description: 'Contact us form',
          category: 'contact',
          tags: ['email', 'support'],
          fields: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: '3',
          name: 'Survey Form',
          description: 'Customer feedback',
          category: 'feedback',
          tags: ['survey', 'feedback'],
          fields: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify(templates));
    });

    it('should search by name', () => {
      const results = templateService.searchTemplates('registration');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Registration Form');
    });

    it('should search by description', () => {
      const results = templateService.searchTemplates('feedback');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Survey Form');
    });

    it('should filter by category', () => {
      const results = templateService.searchTemplates('', 'auth');
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('auth');
    });

    it('should filter by tags', () => {
      const results = templateService.searchTemplates('', '', ['email']);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Contact Form');
    });

    it('should combine search and filters', () => {
      const results = templateService.searchTemplates('form', 'contact', ['email']);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Contact Form');
    });
  });

  describe('importTemplate', () => {
    it('should import valid template JSON', () => {
      const templateData = {
        name: 'Imported Template',
        description: 'Test import',
        fields: [{ id: 'f1', type: 'text', label: 'Field', name: 'field', required: false }],
      };

      const imported = templateService.importTemplate(JSON.stringify(templateData));

      expect(imported.name).toBe('Imported Template');
      expect(imported.id).toBeDefined();
      expect(imported.createdAt).toBeDefined();

      const templates = templateService.getAllTemplates();
      expect(templates).toHaveLength(1);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => templateService.importTemplate('invalid json')).toThrow(
        'Invalid JSON format'
      );
    });

    it('should throw error for invalid template format', () => {
      expect(() => templateService.importTemplate('{"invalid": "template"}')).toThrow(
        'Invalid template format'
      );
    });
  });

  describe('trackUsage', () => {
    it('should increment usage count', () => {
      const template: FormTemplate = {
        id: 'test-id',
        name: 'Test',
        fields: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        usageCount: 5,
      };

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify([template]));

      templateService.trackUsage('test-id');

      const updated = templateService.getTemplate('test-id');
      expect(updated!.usageCount).toBe(6);
    });

    it('should handle missing template gracefully', () => {
      expect(() => templateService.trackUsage('non-existent')).not.toThrow();
    });
  });

  describe('getMostUsedTemplates', () => {
    it('should return templates sorted by usage count', () => {
      const templates: FormTemplate[] = [
        { id: '1', name: 'T1', fields: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', usageCount: 5 },
        { id: '2', name: 'T2', fields: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', usageCount: 10 },
        { id: '3', name: 'T3', fields: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', usageCount: 3 },
      ];

      localStorageMock.setItem('rightflow_form_templates', JSON.stringify(templates));

      const mostUsed = templateService.getMostUsedTemplates(2);
      expect(mostUsed).toHaveLength(2);
      expect(mostUsed[0].usageCount).toBe(10);
      expect(mostUsed[1].usageCount).toBe(5);
    });
  });
});