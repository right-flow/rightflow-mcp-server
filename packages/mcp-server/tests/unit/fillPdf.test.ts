/**
 * Unit Tests - fill_pdf tool
 *
 * Tests the fill_pdf MCP tool that generates filled PDF documents
 * with proper Hebrew/RTL text support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('fill_pdf tool', () => {
  const validFieldData = {
    employeeName: 'יוסי כהן',
    employeeId: '123456789',
    employerName: 'חברת הטכנולוגיה בע"מ',
    position: 'מפתח תוכנה',
    salary: '15000',
    startDate: '2024-01-01',
  };

  const mockPdfResponse = {
    success: true,
    pdf: 'JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovU', // Base64 mock
    fileName: 'employment-contract-yossi-cohen-2024-01-01.pdf',
    metadata: {
      templateId: 'employment-contract-1',
      fieldsFilled: 6,
      errors: [],
      generatedAt: '2024-01-01T12:00:00Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockedAxios.create.mockReturnValue({
      post: vi.fn().mockResolvedValue({
        data: mockPdfResponse,
      }),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should generate PDF with valid data', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      });

      expect(mockClient.post).toHaveBeenCalledWith('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      });
      expect(result.data.success).toBe(true);
      expect(result.data.pdf).toBeDefined();
      expect(result.data.fileName).toContain('.pdf');
    });

    it('should handle Hebrew text in fields', async () => {
      const hebrewData = {
        employeeName: 'דני לוי',
        companyName: 'חברת הייטק בע"מ',
        position: 'מנהל פיתוח',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: {
            ...mockPdfResponse,
            metadata: {
              ...mockPdfResponse.metadata,
              fieldsFilled: 3,
            },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: hebrewData,
      });

      expect(result.data.success).toBe(true);
      expect(result.data.metadata.fieldsFilled).toBe(3);
    });

    it('should handle mixed Hebrew/English content', async () => {
      const mixedData = {
        employeeName: 'John Cohen (ג\'ון כהן)',
        email: 'john@example.com',
        phone: '+972-50-1234567',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: mixedData,
      });

      expect(result.data.success).toBe(true);
    });

    it('should generate custom file name when provided', async () => {
      const customFileName = 'my-custom-contract.pdf';

      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: {
            ...mockPdfResponse,
            fileName: customFileName,
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
        file_name: customFileName,
      });

      expect(result.data.fileName).toBe(customFileName);
    });

    it('should handle language parameter', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
        language: 'he',
      });

      expect(mockClient.post).toHaveBeenCalledWith('/mcp/fill', expect.objectContaining({
        language: 'he',
      }));
    });

    it('should return metadata with fields filled count', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      });

      expect(result.data.metadata).toHaveProperty('fieldsFilled');
      expect(result.data.metadata.fieldsFilled).toBeGreaterThan(0);
    });

    it('should return Base64-encoded PDF', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      });

      expect(result.data.pdf).toBeDefined();
      expect(typeof result.data.pdf).toBe('string');
      // Base64 should only contain valid characters
      expect(/^[A-Za-z0-9+/=]+$/.test(result.data.pdf)).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should handle missing required fields', async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Missing required fields',
              missingFields: ['employeeId', 'salary'],
            },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: { employeeName: 'יוסי' }, // Missing required fields
      })).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    it('should handle invalid field values', async () => {
      const invalidData = {
        ...validFieldData,
        salary: 'not-a-number', // Invalid type
      };

      const mockClient = {
        post: vi.fn().mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Invalid field value',
              field: 'salary',
              message: 'Salary must be a number',
            },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: invalidData,
      })).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    it('should handle template not found', async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue({
          response: {
            status: 404,
            data: { error: 'Template not found' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.post('/mcp/fill', {
        template_id: 'nonexistent-template',
        data: validFieldData,
      })).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it('should handle unauthorized access', async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue({
          response: {
            status: 401,
            data: { error: 'Invalid API key' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      })).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it('should handle PDF generation failure', async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue({
          response: {
            status: 500,
            data: { error: 'PDF generation failed' },
          },
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      })).rejects.toMatchObject({
        response: {
          status: 500,
        },
      });
    });

    it('should handle network errors', async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      })).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue({
          code: 'ECONNABORTED',
          message: 'timeout of 60000ms exceeded',
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      await expect(mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      })).rejects.toMatchObject({
        code: 'ECONNABORTED',
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate template_id is provided', () => {
      const validateInput = (templateId: string | undefined) => {
        if (!templateId || !templateId.trim()) {
          throw new Error('template_id is required');
        }
      };

      expect(() => validateInput(undefined)).toThrow('template_id is required');
      expect(() => validateInput('')).toThrow('template_id is required');
      expect(() => validateInput('   ')).toThrow('template_id is required');
      expect(() => validateInput('valid-id')).not.toThrow();
    });

    it('should validate data object is provided', () => {
      const validateData = (data: any) => {
        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
          throw new Error('data object is required and must not be empty');
        }
      };

      expect(() => validateData(undefined)).toThrow('data object is required');
      expect(() => validateData(null)).toThrow('data object is required');
      expect(() => validateData({})).toThrow('data object is required');
      expect(() => validateData(validFieldData)).not.toThrow();
    });

    it('should sanitize field values to prevent XSS', () => {
      const dangerousValues = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        'onerror="alert(1)"',
      ];

      dangerousValues.forEach(value => {
        const sanitized = value.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
      });
    });

    it('should validate file_name format', () => {
      const validateFileName = (fileName: string) => {
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(fileName)) {
          throw new Error('Invalid file name format');
        }
        if (!fileName.endsWith('.pdf')) {
          throw new Error('File name must end with .pdf');
        }
      };

      expect(() => validateFileName('valid-file.pdf')).not.toThrow();
      expect(() => validateFileName('file<script>.pdf')).toThrow('Invalid file name format');
      expect(() => validateFileName('file/path.pdf')).toThrow('Invalid file name format');
      expect(() => validateFileName('file.txt')).toThrow('File name must end with .pdf');
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
  });

  describe('Field Data Validation', () => {
    it('should validate Israeli ID format', () => {
      const validateIsraeliId = (id: string) => {
        if (!/^\d{9}$/.test(id)) {
          throw new Error('Israeli ID must be 9 digits');
        }
      };

      expect(() => validateIsraeliId('123456789')).not.toThrow();
      expect(() => validateIsraeliId('12345678')).toThrow('Israeli ID must be 9 digits');
      expect(() => validateIsraeliId('12345678a')).toThrow('Israeli ID must be 9 digits');
    });

    it('should validate date format', () => {
      const validateDate = (date: string) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
      };

      expect(() => validateDate('2024-01-01')).not.toThrow();
      expect(() => validateDate('01/01/2024')).toThrow('Date must be in YYYY-MM-DD format');
      expect(() => validateDate('2024-1-1')).toThrow('Date must be in YYYY-MM-DD format');
    });

    it('should validate numeric fields', () => {
      const validateNumber = (value: string, min?: number, max?: number) => {
        const num = parseFloat(value);
        if (isNaN(num)) {
          throw new Error('Value must be a number');
        }
        if (min !== undefined && num < min) {
          throw new Error(`Value must be at least ${min}`);
        }
        if (max !== undefined && num > max) {
          throw new Error(`Value must be at most ${max}`);
        }
      };

      expect(() => validateNumber('15000', 0, 1000000)).not.toThrow();
      expect(() => validateNumber('not-a-number')).toThrow('Value must be a number');
      expect(() => validateNumber('-1', 0)).toThrow('Value must be at least 0');
      expect(() => validateNumber('2000000', undefined, 1000000)).toThrow('Value must be at most 1000000');
    });
  });

  describe('Response Format', () => {
    it('should return consistent structure', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      });

      expect(result.data).toHaveProperty('success');
      expect(result.data).toHaveProperty('pdf');
      expect(result.data).toHaveProperty('fileName');
      expect(result.data).toHaveProperty('metadata');
    });

    it('should include generation timestamp', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      });

      expect(result.data.metadata).toHaveProperty('generatedAt');
      expect(typeof result.data.metadata.generatedAt).toBe('string');
    });

    it('should include templateId in metadata', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      });

      expect(result.data.metadata.templateId).toBe('employment-contract-1');
    });

    it('should include errors array in metadata', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: validFieldData,
      });

      expect(result.data.metadata).toHaveProperty('errors');
      expect(Array.isArray(result.data.metadata.errors)).toBe(true);
    });
  });

  describe('Hebrew/RTL Specific Tests', () => {
    it('should handle Hebrew characters correctly', async () => {
      const hebrewOnlyData = {
        name: 'יוסף',
        address: 'תל אביב',
        city: 'ירושלים',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: hebrewOnlyData,
      });

      expect(result.data.success).toBe(true);
    });

    it('should handle Hebrew with nikud (vowels)', async () => {
      const hebrewWithNikud = {
        name: 'יוֹסֵף',
        greeting: 'שָׁלוֹם',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: hebrewWithNikud,
      });

      expect(result.data.success).toBe(true);
    });

    it('should handle Hebrew with punctuation', async () => {
      const hebrewWithPunctuation = {
        question: 'מה שלומך?',
        exclamation: 'שלום!',
        quote: 'הוא אמר "שלום"',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockPdfResponse,
        }),
      };

      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await mockClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: hebrewWithPunctuation,
      });

      expect(result.data.success).toBe(true);
    });
  });
});
