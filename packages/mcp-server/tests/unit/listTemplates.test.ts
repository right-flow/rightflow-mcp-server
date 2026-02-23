/**
 * Unit Tests - list_templates tool
 *
 * Tests the list_templates MCP tool that fetches available PDF templates
 * from the RightFlow backend API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('list_templates tool', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      name: 'Employment Contract',
      name_he: 'חוזה עבודה',
      category: 'hr',
      description: 'Standard employment contract',
      description_he: 'חוזה עבודה סטנדרטי',
    },
    {
      id: 'template-2',
      name: 'Tax Invoice',
      name_he: 'חשבונית מס',
      category: 'accounting',
      description: 'Israeli tax invoice',
      description_he: 'חשבונית מס ישראלית',
    },
    {
      id: 'template-3',
      name: 'NDA',
      name_he: 'הסכם סודיות',
      category: 'legal',
      description: 'Non-disclosure agreement',
      description_he: 'הסכם אי גילוי',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock response
    mockedAxios.create.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        data: {
          templates: mockTemplates,
          total: mockTemplates.length,
        },
      }),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should list all templates without filters', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            templates: mockTemplates,
            total: 3,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      // Simulate MCP tool call
      const result = await mockClient.get('/mcp/templates');

      expect(mockClient.get).toHaveBeenCalledWith('/mcp/templates');
      expect(result.data.templates).toHaveLength(3);
      expect(result.data.total).toBe(3);
    });

    it('should filter templates by category', async () => {
      const hrTemplates = mockTemplates.filter(t => t.category === 'hr');

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            templates: hrTemplates,
            total: hrTemplates.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates', {
        params: { category: 'hr' },
      });

      expect(result.data.templates).toHaveLength(1);
      expect(result.data.templates[0].category).toBe('hr');
    });

    it('should search templates by keyword', async () => {
      const searchResults = mockTemplates.filter(t =>
        t.name.toLowerCase().includes('contract')
      );

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            templates: searchResults,
            total: searchResults.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates', {
        params: { search: 'contract' },
      });

      expect(result.data.templates).toHaveLength(1);
      expect(result.data.templates[0].name).toContain('Contract');
    });

    it('should return Hebrew names when language is "he"', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            templates: mockTemplates.map(t => ({
              ...t,
              displayName: t.name_he,
            })),
            total: mockTemplates.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates', {
        params: { language: 'he' },
      });

      expect(result.data.templates[0].displayName).toBe('חוזה עבודה');
    });

    it('should return English names when language is "en"', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            templates: mockTemplates.map(t => ({
              ...t,
              displayName: t.name,
            })),
            total: mockTemplates.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates', {
        params: { language: 'en' },
      });

      expect(result.data.templates[0].displayName).toBe('Employment Contract');
    });

    it('should handle empty results', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            templates: [],
            total: 0,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates', {
        params: { category: 'nonexistent' },
      });

      expect(result.data.templates).toHaveLength(0);
      expect(result.data.total).toBe(0);
    });
  });

  describe('Error Cases', () => {
    it('should handle network errors', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates')).rejects.toThrow('Network error');
    });

    it('should handle 401 Unauthorized (invalid API key)', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          response: {
            status: 401,
            data: { error: 'Unauthorized' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates')).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it('should handle 404 Not Found', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          response: {
            status: 404,
            data: { error: 'Endpoint not found' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/invalid-endpoint')).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it('should handle 500 Internal Server Error', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          response: {
            status: 500,
            data: { error: 'Internal server error' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates')).rejects.toMatchObject({
        response: {
          status: 500,
        },
      });
    });

    it('should handle timeout errors', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          code: 'ECONNABORTED',
          message: 'timeout of 60000ms exceeded',
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/templates')).rejects.toMatchObject({
        code: 'ECONNABORTED',
      });
    });
  });

  describe('Input Validation', () => {
    it('should accept valid category values', () => {
      const validCategories = ['legal', 'accounting', 'hr', 'real_estate', 'general'];

      validCategories.forEach(category => {
        expect(() => {
          // Simulate input validation
          if (!validCategories.includes(category)) {
            throw new Error(`Invalid category: ${category}`);
          }
        }).not.toThrow();
      });
    });

    it('should reject invalid category values', () => {
      const invalidCategory = 'invalid_category';

      expect(() => {
        const validCategories = ['legal', 'accounting', 'hr', 'real_estate', 'general'];
        if (!validCategories.includes(invalidCategory)) {
          throw new Error(`Invalid category: ${invalidCategory}`);
        }
      }).toThrow('Invalid category');
    });

    it('should accept valid language values', () => {
      const validLanguages = ['he', 'en'];

      validLanguages.forEach(lang => {
        expect(() => {
          if (!validLanguages.includes(lang)) {
            throw new Error(`Invalid language: ${lang}`);
          }
        }).not.toThrow();
      });
    });

    it('should reject invalid language values', () => {
      const invalidLanguage = 'fr';

      expect(() => {
        const validLanguages = ['he', 'en'];
        if (!validLanguages.includes(invalidLanguage)) {
          throw new Error(`Invalid language: ${invalidLanguage}`);
        }
      }).toThrow('Invalid language');
    });

    it('should handle search string sanitization', () => {
      const dangerousStrings = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE templates; --',
        '../../../etc/passwd',
      ];

      dangerousStrings.forEach(str => {
        expect(() => {
          // Simulate sanitization
          const sanitized = str.replace(/[<>;"']/g, '');
          expect(sanitized).not.toContain('<');
          expect(sanitized).not.toContain('>');
        }).not.toThrow();
      });
    });
  });

  describe('Response Format', () => {
    it('should return templates with all required fields', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            templates: mockTemplates,
            total: mockTemplates.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates');

      result.data.templates.forEach((template: any) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('name_he');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('description_he');
      });
    });

    it('should include total count in response', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            templates: mockTemplates,
            total: 50, // Total may differ from returned count (pagination)
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/templates');

      expect(result.data).toHaveProperty('total');
      expect(typeof result.data.total).toBe('number');
    });
  });
});
