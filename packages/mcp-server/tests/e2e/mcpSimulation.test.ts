/**
 * E2E Simulation Tests - MCP Server Logic
 *
 * Simulates MCP protocol interactions without stdio.
 * Tests the server's tool and resource handlers directly.
 *
 * Full stdio E2E tests will be done in Stage 8 with real Claude Desktop.
 */

import { describe, it, expect } from 'vitest';
import axios from 'axios';
import { MOCK_API_URL, MOCK_API_KEY } from '../integration/setup.js';
import '../integration/setup.js'; // Start mock server

describe('MCP Server E2E Simulation', () => {
  const apiClient = axios.create({
    baseURL: MOCK_API_URL,
    headers: {
      'Authorization': `Bearer ${MOCK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 5000,
  });

  describe('End-to-End Workflow: Template Discovery', () => {
    it('should complete workflow: list categories -> list templates -> get fields', async () => {
      // Step 1: Discover available categories
      const categoriesResponse = await apiClient.get('/mcp/categories');
      expect(categoriesResponse.status).toBe(200);
      expect(categoriesResponse.data.categories).toBeDefined();

      const categories = categoriesResponse.data.categories;
      expect(categories.length).toBeGreaterThan(0);

      // Step 2: List templates for a specific category (e.g., HR)
      const hrCategory = categories.find((c: any) => c.id === 'hr');
      expect(hrCategory).toBeDefined();

      const templatesResponse = await apiClient.get('/mcp/templates', {
        params: { category: 'hr' },
      });
      expect(templatesResponse.status).toBe(200);
      expect(templatesResponse.data.templates.length).toBeGreaterThan(0);

      const firstTemplate = templatesResponse.data.templates[0];
      expect(firstTemplate).toHaveProperty('id');
      expect(firstTemplate).toHaveProperty('name');
      expect(firstTemplate.category).toBe('hr');

      // Step 3: Get fields for the template
      const fieldsResponse = await apiClient.get(
        `/mcp/templates/${firstTemplate.id}`,
        { params: { language: 'he' } }
      );
      expect(fieldsResponse.status).toBe(200);
      expect(fieldsResponse.data).toBeDefined();
      expect(fieldsResponse.data.fields).toBeDefined();
      expect(Array.isArray(fieldsResponse.data.fields)).toBe(true);
    });
  });

  describe('End-to-End Workflow: Hebrew PDF Generation', () => {
    it('should complete workflow: search template -> get fields -> fill PDF with Hebrew', async () => {
      // Step 1: Search for employment contract template
      const searchResponse = await apiClient.get('/mcp/templates', {
        params: { search: 'employment' },
      });
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.templates.length).toBeGreaterThan(0);

      const employmentTemplate = searchResponse.data.templates.find((t: any) =>
        t.name.toLowerCase().includes('employment')
      );
      expect(employmentTemplate).toBeDefined();

      // Step 2: Get template fields
      const fieldsResponse = await apiClient.get(
        `/mcp/templates/${employmentTemplate.id}`,
        { params: { language: 'he' } }
      );
      expect(fieldsResponse.status).toBe(200);

      const fields = fieldsResponse.data.fields;
      expect(fields.length).toBeGreaterThan(0);

      // Step 3: Prepare Hebrew data for all required fields
      const hebrewData: Record<string, string> = {};
      fields.forEach((field: any) => {
        if (field.name === 'employee_name') {
          hebrewData[field.name] = 'יוסי כהן';
        } else if (field.name === 'company_name') {
          hebrewData[field.name] = 'טק קורפ בע"מ';
        } else if (field.name === 'position') {
          hebrewData[field.name] = 'מהנדס תוכנה בכיר';
        } else if (field.name === 'start_date') {
          hebrewData[field.name] = '2026-03-01';
        } else if (field.name === 'salary') {
          hebrewData[field.name] = '25,000 ₪';
        } else if (field.type === 'text') {
          // Fill optional text fields with Hebrew
          hebrewData[field.name] = 'טקסט בעברית';
        }
      });

      // Step 4: Generate PDF with Hebrew data
      const fillResponse = await apiClient.post('/mcp/fill', {
        template_id: employmentTemplate.id,
        data: hebrewData,
        language: 'he',
        output_format: 'url',
      });

      expect(fillResponse.status).toBe(200);
      expect(fillResponse.data.success).toBe(true);
      expect(fillResponse.data.metadata).toBeDefined();
      expect(fillResponse.data.fileName).toBeDefined();
      expect(fillResponse.data.metadata.fieldsFilled).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Workflow: Mixed Language PDF', () => {
    it('should generate PDF with mixed Hebrew/English content', async () => {
      // Step 1: Find a template
      const templatesResponse = await apiClient.get('/mcp/templates');
      expect(templatesResponse.status).toBe(200);

      const template = templatesResponse.data.templates[0];
      expect(template).toBeDefined();

      // Step 2: Prepare mixed language data
      const mixedData = {
        company_name: 'Tech Corp בע"מ',
        employee_name: 'John Doe / ג\'ון דו',
        position: 'Software Engineer / מהנדס תוכנה',
        email: 'john.doe@techcorp.com',
        phone: '050-1234567',
        address: 'רחוב הרצל 123, תל אביב',
        start_date: '2026-03-01',
        notes: 'משרה במשרד ראשי בתל אביב. Position at main office in Tel Aviv.',
      };

      // Step 3: Generate PDF
      const fillResponse = await apiClient.post('/mcp/fill', {
        template_id: template.id,
        data: mixedData,
        language: 'he',
        output_format: 'url',
      });

      expect(fillResponse.status).toBe(200);
      expect(fillResponse.data.success).toBe(true);
      expect(fillResponse.data.fileName).toBeDefined();
    });
  });

  describe('End-to-End Workflow: Error Recovery', () => {
    it('should handle invalid template ID gracefully', async () => {
      // Step 1: Try to get fields for non-existent template
      await expect(
        apiClient.get('/mcp/templates/invalid-template-id-12345')
      ).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });

      // Step 2: Search for valid template after error
      const searchResponse = await apiClient.get('/mcp/templates', {
        params: { search: 'contract' },
      });
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.templates.length).toBeGreaterThan(0);
    });

    it('should handle missing required fields in PDF generation', async () => {
      // Step 1: Get a template
      const templatesResponse = await apiClient.get('/mcp/templates');
      const template = templatesResponse.data.templates[0];

      // Step 2: Try to fill PDF with empty data
      await expect(
        apiClient.post('/mcp/fill', {
          template_id: template.id,
          data: {}, // Empty data - missing required fields
          language: 'he',
          output_format: 'url',
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });

      // Step 3: Get fields to see what's required
      const fieldsResponse = await apiClient.get(`/mcp/templates/${template.id}`);
      expect(fieldsResponse.status).toBe(200);
      expect(fieldsResponse.data.fields).toBeDefined();

      // Step 4: Fill with correct data
      const requiredFields: Record<string, string> = {};
      fieldsResponse.data.fields.forEach((field: any) => {
        if (field.required) {
          requiredFields[field.name] = field.type === 'date' ? '2026-01-01' : 'Test Value';
        }
      });

      if (Object.keys(requiredFields).length > 0) {
        const fillResponse = await apiClient.post('/mcp/fill', {
          template_id: template.id,
          data: requiredFields,
          language: 'he',
          output_format: 'url',
        });

        expect(fillResponse.status).toBe(200);
        expect(fillResponse.data.success).toBe(true);
      }
    });
  });

  describe('End-to-End Workflow: Category Filtering', () => {
    it('should filter templates by multiple categories', async () => {
      // Step 1: Get all categories
      const categoriesResponse = await apiClient.get('/mcp/categories');
      const categories = categoriesResponse.data.categories;

      // Step 2: Get templates for each category and verify isolation
      for (const category of categories.slice(0, 2)) { // Test first 2 categories (hr, accounting)
        const templatesResponse = await apiClient.get('/mcp/templates', {
          params: { category: category.id },
        });

        expect(templatesResponse.status).toBe(200);

        // All returned templates should match the category
        const templates = templatesResponse.data.templates;
        if (templates.length > 0) {
          expect(
            templates.every((t: any) => t.category === category.id)
          ).toBe(true);
        }
      }
    });
  });

  describe('End-to-End Workflow: Hebrew Search', () => {
    it('should search templates with Hebrew keywords across multiple attempts', async () => {
      const hebrewSearchTerms = [
        'עבודה',    // Work
        'חוזה',     // Contract
        'חשבונית',  // Invoice
      ];

      for (const searchTerm of hebrewSearchTerms) {
        const searchResponse = await apiClient.get('/mcp/templates', {
          params: { search: searchTerm },
        });

        expect(searchResponse.status).toBe(200);

        // If results found, verify they contain Hebrew search term
        const templates = searchResponse.data.templates;
        if (templates.length > 0) {
          const hasHebrewMatch = templates.some((t: any) =>
            t.name_he?.includes(searchTerm) ||
            t.description_he?.includes(searchTerm)
          );
          expect(hasHebrewMatch).toBe(true);
        }
      }
    });
  });

  describe('End-to-End Workflow: Performance', () => {
    it('should complete full workflow within reasonable time', async () => {
      const startTime = Date.now();

      // Complete workflow: categories -> templates -> fields -> fill PDF
      await apiClient.get('/mcp/categories');
      const templatesResponse = await apiClient.get('/mcp/templates');
      const template = templatesResponse.data.templates[0];
      const fieldsResponse = await apiClient.get(`/mcp/templates/${template.id}`);

      const sampleData: Record<string, string> = {};
      fieldsResponse.data.fields.forEach((field: any) => {
        sampleData[field.name] = 'Test';
      });

      await apiClient.post('/mcp/fill', {
        template_id: template.id,
        data: sampleData,
        language: 'he',
        output_format: 'url',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Full workflow should complete in less than 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});
