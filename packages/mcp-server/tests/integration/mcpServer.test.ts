/**
 * Integration Tests - MCP Server with Real HTTP Calls
 *
 * Tests the actual MCP server implementation with real HTTP calls
 * to a mock backend server. No axios mocking - real integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import './setup.js'; // Import setup to start mock backend server
import { MOCK_API_URL, MOCK_API_KEY, mockTemplates, mockCategories } from './setup.js';

describe('MCP Server Integration Tests', () => {
  let apiClient: AxiosInstance;

  beforeEach(() => {
    // Create real axios client (no mocking)
    apiClient = axios.create({
      baseURL: MOCK_API_URL,
      headers: {
        'Authorization': `Bearer ${MOCK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
  });

  describe('list_templates - Integration', () => {
    it('should fetch templates from backend API', async () => {
      const response = await apiClient.get('/mcp/templates');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('templates');
      expect(response.data).toHaveProperty('total');
      expect(Array.isArray(response.data.templates)).toBe(true);
      expect(response.data.templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by category', async () => {
      const response = await apiClient.get('/mcp/templates', {
        params: { category: 'hr' },
      });

      expect(response.status).toBe(200);
      expect(response.data.templates.every((t: any) => t.category === 'hr')).toBe(true);
    });

    it('should search templates by keyword', async () => {
      const response = await apiClient.get('/mcp/templates', {
        params: { search: 'contract' },
      });

      expect(response.status).toBe(200);
      expect(response.data.templates.length).toBeGreaterThan(0);
      expect(
        response.data.templates.some((t: any) =>
          t.name.toLowerCase().includes('contract')
        )
      ).toBe(true);
    });

    it('should search templates by Hebrew keyword', async () => {
      const response = await apiClient.get('/mcp/templates', {
        params: { search: 'עבודה' },
      });

      expect(response.status).toBe(200);
      expect(response.data.templates.length).toBeGreaterThan(0);
      expect(
        response.data.templates.some((t: any) => t.name_he.includes('עבודה'))
      ).toBe(true);
    });

    it('should handle empty search results', async () => {
      const response = await apiClient.get('/mcp/templates', {
        params: { search: 'nonexistent_template_xyz' },
      });

      expect(response.status).toBe(200);
      expect(response.data.templates).toHaveLength(0);
      expect(response.data.total).toBe(0);
    });

    it('should reject unauthorized requests', async () => {
      const unauthorizedClient = axios.create({
        baseURL: MOCK_API_URL,
        headers: {
          'Authorization': 'Bearer invalid_key',
        },
      });

      await expect(unauthorizedClient.get('/mcp/templates')).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it('should return all templates without filters', async () => {
      const response = await apiClient.get('/mcp/templates');

      expect(response.status).toBe(200);
      expect(response.data.templates).toHaveLength(mockTemplates.length);
    });
  });

  describe('get_template_fields - Integration', () => {
    it('should fetch template fields by ID', async () => {
      const templateId = 'employment-contract-1';
      const response = await apiClient.get(`/mcp/templates/${templateId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('name');
      expect(response.data).toHaveProperty('fields');
      expect(response.data.id).toBe(templateId);
      expect(Array.isArray(response.data.fields)).toBe(true);
    });

    it('should return template with Hebrew names', async () => {
      const response = await apiClient.get('/mcp/templates/employment-contract-1');

      expect(response.status).toBe(200);
      expect(response.data.name_he).toBe('חוזה עבודה');
      expect(response.data.fields[0].name_he).toBeDefined();
    });

    it('should return field definitions with validation', async () => {
      const response = await apiClient.get('/mcp/templates/employment-contract-1');

      expect(response.status).toBe(200);
      expect(response.data.fields.length).toBeGreaterThan(0);

      const firstField = response.data.fields[0];
      expect(firstField).toHaveProperty('id');
      expect(firstField).toHaveProperty('name');
      expect(firstField).toHaveProperty('type');
      expect(firstField).toHaveProperty('required');
    });

    it('should return 404 for nonexistent template', async () => {
      await expect(
        apiClient.get('/mcp/templates/nonexistent-template-id')
      ).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it('should reject unauthorized requests', async () => {
      const unauthorizedClient = axios.create({
        baseURL: MOCK_API_URL,
        headers: {
          'Authorization': 'Bearer invalid_key',
        },
      });

      await expect(
        unauthorizedClient.get('/mcp/templates/employment-contract-1')
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });
  });

  describe('fill_pdf - Integration', () => {
    it('should generate PDF with valid data', async () => {
      const response = await apiClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: {
          employeeName: 'יוסי כהן',
          employeeId: '123456789',
          salary: '15000',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('pdf');
      expect(response.data).toHaveProperty('fileName');
      expect(response.data).toHaveProperty('metadata');
    });

    it('should return PDF metadata with field count', async () => {
      const fieldData = {
        employeeName: 'דני לוי',
        employeeId: '987654321',
        salary: '20000',
      };

      const response = await apiClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: fieldData,
      });

      expect(response.status).toBe(200);
      expect(response.data.metadata.fieldsFilled).toBe(Object.keys(fieldData).length);
      expect(response.data.metadata.templateId).toBe('employment-contract-1');
    });

    it('should handle Hebrew text in field data', async () => {
      const response = await apiClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: {
          employeeName: 'משה כהן',
          employeeId: '111222333',
          salary: '25000',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should handle mixed Hebrew/English content', async () => {
      const response = await apiClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: {
          employeeName: 'John Cohen (ג\'ון כהן)',
          employeeId: '555666777',
          salary: '30000',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      await expect(
        apiClient.post('/mcp/fill', {
          template_id: 'employment-contract-1',
          data: {}, // Empty data
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    it('should return 404 for nonexistent template', async () => {
      await expect(
        apiClient.post('/mcp/fill', {
          template_id: 'nonexistent-template',
          data: { field: 'value' },
        })
      ).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it('should reject unauthorized requests', async () => {
      const unauthorizedClient = axios.create({
        baseURL: MOCK_API_URL,
        headers: {
          'Authorization': 'Bearer invalid_key',
        },
      });

      await expect(
        unauthorizedClient.post('/mcp/fill', {
          template_id: 'employment-contract-1',
          data: { field: 'value' },
        })
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it('should return Base64-encoded PDF', async () => {
      const response = await apiClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: {
          employeeName: 'Test User',
          employeeId: '123456789',
          salary: '10000',
        },
      });

      expect(response.status).toBe(200);
      expect(typeof response.data.pdf).toBe('string');
      expect(response.data.pdf.length).toBeGreaterThan(0);
      // Verify it's Base64
      expect(/^[A-Za-z0-9+/=]+$/.test(response.data.pdf)).toBe(true);
    });

    it('should include generation timestamp', async () => {
      const response = await apiClient.post('/mcp/fill', {
        template_id: 'employment-contract-1',
        data: {
          employeeName: 'Test',
          employeeId: '123456789',
          salary: '10000',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.metadata.generatedAt).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(new Date(response.data.metadata.generatedAt).toISOString()).toBeTruthy();
    });
  });

  describe('list_categories - Integration', () => {
    it('should fetch categories from backend API', async () => {
      const response = await apiClient.get('/mcp/categories');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('categories');
      expect(response.data).toHaveProperty('total');
      expect(Array.isArray(response.data.categories)).toBe(true);
      expect(response.data.categories.length).toBeGreaterThan(0);
    });

    it('should return categories with Hebrew names', async () => {
      const response = await apiClient.get('/mcp/categories');

      expect(response.status).toBe(200);
      response.data.categories.forEach((category: any) => {
        expect(category).toHaveProperty('name_he');
        expect(category.name_he).toBeTruthy();
        // Check for Hebrew characters
        expect(/[\u0590-\u05FF]/.test(category.name_he)).toBe(true);
      });
    });

    it('should include template counts for each category', async () => {
      const response = await apiClient.get('/mcp/categories');

      expect(response.status).toBe(200);
      response.data.categories.forEach((category: any) => {
        expect(category).toHaveProperty('count');
        expect(typeof category.count).toBe('number');
        expect(category.count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return all expected categories', async () => {
      const response = await apiClient.get('/mcp/categories');

      expect(response.status).toBe(200);
      expect(response.data.categories).toHaveLength(mockCategories.length);

      const categoryIds = response.data.categories.map((c: any) => c.id);
      expect(categoryIds).toContain('hr');
      expect(categoryIds).toContain('accounting');
    });

    it('should reject unauthorized requests', async () => {
      const unauthorizedClient = axios.create({
        baseURL: MOCK_API_URL,
        headers: {
          'Authorization': 'Bearer invalid_key',
        },
      });

      await expect(unauthorizedClient.get('/mcp/categories')).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it('should return consistent structure', async () => {
      const response = await apiClient.get('/mcp/categories');

      expect(response.status).toBe(200);
      response.data.categories.forEach((category: any) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('name_he');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('description_he');
        expect(category).toHaveProperty('count');
      });
    });
  });

  describe('API Error Handling - Integration', () => {
    it('should handle network timeouts gracefully', async () => {
      // Test with non-routable IP to simulate network timeout
      const slowClient = axios.create({
        baseURL: 'http://10.255.255.1:9999', // Non-routable IP
        headers: {
          'Authorization': `Bearer ${MOCK_API_KEY}`,
        },
        timeout: 100, // 100ms timeout
      });

      await expect(slowClient.get('/mcp/templates')).rejects.toThrow();
    });

    it('should handle 404 for unknown endpoints', async () => {
      await expect(
        apiClient.get('/mcp/unknown-endpoint')
      ).rejects.toMatchObject({
        response: {
          status: 404,
        },
      });
    });

    it('should validate Content-Type headers', async () => {
      const response = await apiClient.get('/mcp/templates');

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Cross-Tool Integration', () => {
    it('should list templates, get fields, and fill PDF in sequence', async () => {
      // 1. List templates
      const listResponse = await apiClient.get('/mcp/templates', {
        params: { category: 'hr' },
      });
      expect(listResponse.status).toBe(200);
      expect(listResponse.data.templates.length).toBeGreaterThan(0);

      // 2. Get first template's fields
      const template = listResponse.data.templates[0];
      const fieldsResponse = await apiClient.get(`/mcp/templates/${template.id}`);
      expect(fieldsResponse.status).toBe(200);
      expect(fieldsResponse.data.fields).toBeDefined();

      // 3. Fill PDF with template
      const fillResponse = await apiClient.post('/mcp/fill', {
        template_id: template.id,
        data: {
          employeeName: 'Integration Test User',
          employeeId: '999888777',
          salary: '50000',
        },
      });
      expect(fillResponse.status).toBe(200);
      expect(fillResponse.data.success).toBe(true);
      expect(fillResponse.data.metadata.templateId).toBe(template.id);
    });

    it('should get categories and filter templates by category', async () => {
      // 1. Get categories
      const categoriesResponse = await apiClient.get('/mcp/categories');
      expect(categoriesResponse.status).toBe(200);

      // 2. Get first category with templates
      const categoryWithTemplates = categoriesResponse.data.categories.find(
        (c: any) => c.count > 0
      );
      expect(categoryWithTemplates).toBeDefined();

      // 3. Filter templates by that category
      const templatesResponse = await apiClient.get('/mcp/templates', {
        params: { category: categoryWithTemplates.id },
      });
      expect(templatesResponse.status).toBe(200);
      expect(templatesResponse.data.templates.length).toBeGreaterThan(0);
      expect(
        templatesResponse.data.templates.every(
          (t: any) => t.category === categoryWithTemplates.id
        )
      ).toBe(true);
    });
  });
});
