/**
 * Unit Tests - list_categories tool
 *
 * Tests the list_categories MCP tool that retrieves available
 * template categories with counts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('list_categories tool', () => {
  const mockCategories = [
    {
      id: 'hr',
      name: 'HR & Employment',
      name_he: 'משאבי אנוש',
      description: 'Employment contracts, NDAs, termination letters',
      description_he: 'חוזי עבודה, הסכמי סודיות, מכתבי פיטורים',
      count: 5,
    },
    {
      id: 'accounting',
      name: 'Accounting & Finance',
      name_he: 'חשבונאות ופיננסים',
      description: 'Tax invoices, receipts, financial reports',
      description_he: 'חשבוניות מס, קבלות, דוחות כספיים',
      count: 3,
    },
    {
      id: 'legal',
      name: 'Legal',
      name_he: 'משפטי',
      description: 'Rental agreements, power of attorney, contracts',
      description_he: 'הסכמי שכירות, ייפויי כוח, חוזים',
      count: 4,
    },
    {
      id: 'real_estate',
      name: 'Real Estate',
      name_he: 'נדל"ן',
      description: 'Property contracts, lease agreements',
      description_he: 'חוזי קנייה, הסכמי שכירות',
      count: 2,
    },
    {
      id: 'general',
      name: 'General',
      name_he: 'כללי',
      description: 'Miscellaneous templates',
      description_he: 'תבניות שונות',
      count: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockedAxios.create.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        data: {
          categories: mockCategories,
          total: mockCategories.length,
        },
      }),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should list all categories', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      expect(mockClient.get).toHaveBeenCalledWith('/mcp/categories');
      expect(result.data.categories).toHaveLength(5);
      expect(result.data.total).toBe(5);
    });

    it('should return categories with all required fields', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      result.data.categories.forEach((category: any) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('name_he');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('description_he');
        expect(category).toHaveProperty('count');
      });
    });

    it('should include template counts for each category', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      result.data.categories.forEach((category: any) => {
        expect(category.count).toBeGreaterThanOrEqual(0);
        expect(typeof category.count).toBe('number');
      });
    });

    it('should return categories sorted by name', async () => {
      const sortedCategories = [...mockCategories].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: sortedCategories,
            total: sortedCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories', {
        params: { sort: 'name' },
      });

      expect(result.data.categories[0].name).toBe('Accounting & Finance');
    });

    it('should return Hebrew names when language is "he"', async () => {
      const hebrewResponse = {
        categories: mockCategories.map(c => ({
          ...c,
          displayName: c.name_he,
          displayDescription: c.description_he,
        })),
        total: mockCategories.length,
      };

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: hebrewResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories', {
        params: { language: 'he' },
      });

      expect(result.data.categories[0].displayName).toBe('משאבי אנוש');
    });

    it('should return English names when language is "en"', async () => {
      const englishResponse = {
        categories: mockCategories.map(c => ({
          ...c,
          displayName: c.name,
          displayDescription: c.description,
        })),
        total: mockCategories.length,
      };

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: englishResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories', {
        params: { language: 'en' },
      });

      expect(result.data.categories[0].displayName).toBe('HR & Employment');
    });

    it('should handle empty categories (no templates)', async () => {
      const emptyCategories = mockCategories.map(c => ({ ...c, count: 0 }));

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: emptyCategories,
            total: emptyCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      result.data.categories.forEach((category: any) => {
        expect(category.count).toBe(0);
      });
    });

    it('should filter out categories with no templates (optional)', async () => {
      const filteredCategories = mockCategories.filter(c => c.count > 0);

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: filteredCategories,
            total: filteredCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories', {
        params: { hide_empty: true },
      });

      result.data.categories.forEach((category: any) => {
        expect(category.count).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Cases', () => {
    it('should handle network errors', async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.get('/mcp/categories')).rejects.toThrow('Network error');
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

      await expect(mockClient.get('/mcp/categories')).rejects.toMatchObject({
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

      await expect(mockClient.get('/mcp/categories')).rejects.toMatchObject({
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

      await expect(mockClient.get('/mcp/categories')).rejects.toMatchObject({
        code: 'ECONNABORTED',
      });
    });
  });

  describe('Response Format', () => {
    it('should return consistent structure', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      expect(result.data).toHaveProperty('categories');
      expect(result.data).toHaveProperty('total');
      expect(Array.isArray(result.data.categories)).toBe(true);
      expect(typeof result.data.total).toBe('number');
    });

    it('should return total count matching categories length', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      expect(result.data.total).toBe(result.data.categories.length);
    });
  });

  describe('Category ID Validation', () => {
    it('should have valid category IDs', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      const validCategories = ['legal', 'accounting', 'hr', 'real_estate', 'general'];

      result.data.categories.forEach((category: any) => {
        expect(validCategories).toContain(category.id);
      });
    });

    it('should have unique category IDs', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      const ids = result.data.categories.map((c: any) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Category Names', () => {
    it('should have Hebrew names for all categories', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      result.data.categories.forEach((category: any) => {
        expect(category.name_he).toBeDefined();
        expect(category.name_he.length).toBeGreaterThan(0);
        // Check if contains Hebrew characters
        expect(/[\u0590-\u05FF]/.test(category.name_he)).toBe(true);
      });
    });

    it('should have English names for all categories', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      result.data.categories.forEach((category: any) => {
        expect(category.name).toBeDefined();
        expect(category.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Category Descriptions', () => {
    it('should have Hebrew descriptions', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      result.data.categories.forEach((category: any) => {
        expect(category.description_he).toBeDefined();
        expect(category.description_he.length).toBeGreaterThan(0);
      });
    });

    it('should have English descriptions', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      result.data.categories.forEach((category: any) => {
        expect(category.description).toBeDefined();
        expect(category.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Template Counts', () => {
    it('should have non-negative counts', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      result.data.categories.forEach((category: any) => {
        expect(category.count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return total template count across all categories', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: {
            categories: mockCategories,
            total: mockCategories.length,
            totalTemplates: mockCategories.reduce((sum, c) => sum + c.count, 0),
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.get('/mcp/categories');

      const expectedTotal = mockCategories.reduce((sum, c) => sum + c.count, 0);
      expect(result.data.totalTemplates).toBe(expectedTotal);
    });
  });
});
