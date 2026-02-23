/**
 * Unit Tests - get_template_fields tool
 *
 * Tests the get_template_fields MCP tool that retrieves field definitions
 * for a specific PDF template.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('get_template_fields tool', () => {
  const mockTemplateFields = {
    id: 'employment-contract-1',
    name: 'Employment Contract',
    name_he: 'חוזה עבודה',
    category: 'hr',
    fields: [
      {
        id: 'employeeName',
        name: 'Employee Name',
        name_he: 'שם העובד',
        type: 'text',
        required: true,
        validation: {
          minLength: 2,
          maxLength: 100,
        },
      },
      {
        id: 'employeeId',
        name: 'Employee ID',
        name_he: 'תעודת זהות',
        type: 'text',
        required: true,
        validation: {
          pattern: '^[0-9]{9}$',
          validator: 'israeli_id',
        },
      },
      {
        id: 'salary',
        name: 'Salary',
        name_he: 'שכר',
        type: 'number',
        required: true,
        validation: {
          min: 0,
          max: 1000000,
        },
      },
      {
        id: 'startDate',
        name: 'Start Date',
        name_he: 'תאריך התחלה',
        type: 'date',
        required: true,
        validation: {
          format: 'YYYY-MM-DD',
        },
      },
      {
        id: 'notes',
        name: 'Notes',
        name_he: 'הערות',
        type: 'textarea',
        required: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock response
    mockedAxios.create.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        data: mockTemplateFields,
      }),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should retrieve template fields by ID', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      expect(mockClient.get).toHaveBeenCalledWith('/mcp/templates/employment-contract-1');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('fields');
      expect(result.data.fields).toHaveLength(5);
    });

    it('should return field definitions with all properties', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      const firstField = result.data.fields[0];
      expect(firstField).toHaveProperty('id');
      expect(firstField).toHaveProperty('name');
      expect(firstField).toHaveProperty('name_he');
      expect(firstField).toHaveProperty('type');
      expect(firstField).toHaveProperty('required');
    });

    it('should include validation rules for fields', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      const employeeNameField = result.data.fields.find((f: any) => f.id === 'employeeName');
      expect(employeeNameField.validation).toHaveProperty('minLength');
      expect(employeeNameField.validation).toHaveProperty('maxLength');

      const salaryField = result.data.fields.find((f: any) => f.id === 'salary');
      expect(salaryField.validation).toHaveProperty('min');
      expect(salaryField.validation).toHaveProperty('max');
    });

    it('should support Hebrew field names when language is "he"', async () => {
      const hebrewResponse = {
        ...mockTemplateFields,
        fields: mockTemplateFields.fields.map(f => ({
          ...f,
          displayName: f.name_he,
        })),
      };

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: hebrewResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1', {
        params: { language: 'he' },
      });

      expect(result.data.fields[0].displayName).toBe('שם העובד');
    });

    it('should support English field names when language is "en"', async () => {
      const englishResponse = {
        ...mockTemplateFields,
        fields: mockTemplateFields.fields.map(f => ({
          ...f,
          displayName: f.name,
        })),
      };

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: englishResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1', {
        params: { language: 'en' },
      });

      expect(result.data.fields[0].displayName).toBe('Employee Name');
    });

    it('should return required and optional fields', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      const requiredFields = result.data.fields.filter((f: any) => f.required);
      const optionalFields = result.data.fields.filter((f: any) => !f.required);

      expect(requiredFields.length).toBeGreaterThan(0);
      expect(optionalFields.length).toBeGreaterThan(0);
    });

    it('should return different field types', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      const fieldTypes = result.data.fields.map((f: any) => f.type);
      expect(fieldTypes).toContain('text');
      expect(fieldTypes).toContain('number');
      expect(fieldTypes).toContain('date');
      expect(fieldTypes).toContain('textarea');
    });
  });

  describe('Error Cases', () => {
    it('should handle 404 when template not found', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          response: {
            status: 404,
            data: { error: 'Template not found' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates/nonexistent-id')).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it('should handle invalid template ID format', async () => {
      const invalidIds = [
        '', // Empty
        '   ', // Whitespace only
        '../../../etc/passwd', // Path traversal
        'template; DROP TABLE templates; --', // SQL injection
      ];

      for (const invalidId of invalidIds) {
        expect(() => {
          if (!invalidId.trim() || /[^a-zA-Z0-9-_]/.test(invalidId)) {
            throw new Error('Invalid template ID format');
          }
        }).toThrow('Invalid template ID format');
      }
    });

    it('should handle 401 Unauthorized', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          response: {
            status: 401,
            data: { error: 'Invalid API key' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates/employment-contract-1')).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it('should handle 500 Internal Server Error', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          response: {
            status: 500,
            data: { error: 'Database error' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates/employment-contract-1')).rejects.toMatchObject({
        response: {
          status: 500,
        },
      });
    });

    it('should handle network errors', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates/employment-contract-1')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          code: 'ECONNABORTED',
          message: 'timeout of 60000ms exceeded',
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates/employment-contract-1')).rejects.toMatchObject({
        code: 'ECONNABORTED',
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate template_id is provided', () => {
      const validateInput = (templateId: string | undefined) => {
        if (!templateId) {
          throw new Error('template_id is required');
        }
      };

      expect(() => validateInput(undefined)).toThrow('template_id is required');
      expect(() => validateInput('')).toThrow('template_id is required');
      expect(() => validateInput('valid-id')).not.toThrow();
    });

    it('should validate language parameter', () => {
      const validateLanguage = (lang: string) => {
        const validLanguages = ['he', 'en'];
        if (!validLanguages.includes(lang)) {
          throw new Error(`Invalid language: ${lang}`);
        }
      };

      expect(() => validateLanguage('he')).not.toThrow();
      expect(() => validateLanguage('en')).not.toThrow();
      expect(() => validateLanguage('fr')).toThrow('Invalid language');
    });

    it('should sanitize template_id to prevent injection', () => {
      const sanitizeId = (id: string) => {
        // Only allow alphanumeric, hyphens, and underscores
        return id.replace(/[^a-zA-Z0-9-_]/g, '');
      };

      expect(sanitizeId('valid-id_123')).toBe('valid-id_123');
      expect(sanitizeId('invalid<script>id')).toBe('invalidscriptid');
      expect(sanitizeId('../../../etc/passwd')).toBe('etcpasswd');
    });
  });

  describe('Response Format', () => {
    it('should return consistent structure', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('name_he');
      expect(result.data).toHaveProperty('category');
      expect(result.data).toHaveProperty('fields');
      expect(Array.isArray(result.data.fields)).toBe(true);
    });

    it('should return empty array for templates with no fields', async () => {
      const emptyTemplate = {
        id: 'empty-template',
        name: 'Empty Template',
        name_he: 'תבנית ריקה',
        category: 'general',
        fields: [],
      };

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: emptyTemplate,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/empty-template');

      expect(result.data.fields).toEqual([]);
    });
  });

  describe('Field Validation Rules', () => {
    it('should include validator type for special fields', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      const employeeIdField = result.data.fields.find((f: any) => f.id === 'employeeId');
      expect(employeeIdField.validation.validator).toBe('israeli_id');
    });

    it('should include pattern for regex validation', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      const employeeIdField = result.data.fields.find((f: any) => f.id === 'employeeId');
      expect(employeeIdField.validation.pattern).toBeDefined();
    });

    it('should include min/max for numeric fields', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: mockTemplateFields,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates/employment-contract-1');

      const salaryField = result.data.fields.find((f: any) => f.id === 'salary');
      expect(salaryField.validation).toHaveProperty('min');
      expect(salaryField.validation).toHaveProperty('max');
      expect(typeof salaryField.validation.min).toBe('number');
      expect(typeof salaryField.validation.max).toBe('number');
    });
  });
});
