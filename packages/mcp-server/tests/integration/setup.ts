/**
 * Integration Test Setup
 *
 * Sets up a mock HTTP server that simulates the RightFlow backend API
 * for integration testing of the MCP server.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import http from 'http';

// Mock backend server configuration
export const MOCK_API_PORT = 3999;
export const MOCK_API_URL = `http://localhost:${MOCK_API_PORT}/api/v1`;
export const MOCK_API_KEY = 'test_api_key_integration_12345';

// Mock data
export const mockTemplates = [
  {
    id: 'employment-contract-1',
    name: 'Employment Contract',
    name_he: 'חוזה עבודה',
    category: 'hr',
    description: 'Standard employment contract',
    description_he: 'חוזה עבודה סטנדרטי',
    fields: [
      {
        id: 'employeeName',
        name: 'Employee Name',
        name_he: 'שם העובד',
        type: 'text',
        required: true,
      },
      {
        id: 'employeeId',
        name: 'Employee ID',
        name_he: 'תעודת זהות',
        type: 'text',
        required: true,
      },
      {
        id: 'salary',
        name: 'Salary',
        name_he: 'שכר',
        type: 'number',
        required: true,
      },
    ],
  },
  {
    id: 'tax-invoice-1',
    name: 'Tax Invoice',
    name_he: 'חשבונית מס',
    category: 'accounting',
    description: 'Israeli tax invoice',
    description_he: 'חשבונית מס ישראלית',
    fields: [],
  },
];

export const mockCategories = [
  {
    id: 'hr',
    name: 'HR & Employment',
    name_he: 'משאבי אנוש',
    description: 'Employment contracts, NDAs',
    description_he: 'חוזי עבודה, הסכמי סודיות',
    count: 5,
  },
  {
    id: 'accounting',
    name: 'Accounting & Finance',
    name_he: 'חשבונאות ופיננסים',
    description: 'Tax invoices, receipts',
    description_he: 'חשבוניות מס, קבלות',
    count: 3,
  },
];

// Mock backend server
let mockServer: http.Server | null = null;

/**
 * Create and start mock backend server
 */
export function createMockBackendServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    mockServer = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle OPTIONS (preflight)
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Check Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${MOCK_API_KEY}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // Parse URL and route
      const url = new URL(req.url || '', `http://localhost:${MOCK_API_PORT}`);
      const pathname = url.pathname;

      // Route: GET /api/v1/mcp/templates
      if (pathname === '/api/v1/mcp/templates' && req.method === 'GET') {
        const category = url.searchParams.get('category');
        const search = url.searchParams.get('search');

        let filtered = [...mockTemplates];

        if (category) {
          filtered = filtered.filter(t => t.category === category);
        }

        if (search) {
          filtered = filtered.filter(t =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.name_he.includes(search)
          );
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          templates: filtered,
          total: filtered.length,
        }));
        return;
      }

      // Route: GET /api/v1/mcp/templates/:id
      if (pathname.startsWith('/api/v1/mcp/templates/') && req.method === 'GET') {
        const templateId = pathname.split('/').pop();
        const template = mockTemplates.find(t => t.id === templateId);

        if (!template) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Template not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(template));
        return;
      }

      // Route: POST /api/v1/mcp/fill
      if (pathname === '/api/v1/mcp/fill' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { template_id, data: fieldData } = data;

            if (!template_id) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing required field: template_id' }));
              return;
            }

            if (!fieldData || typeof fieldData !== 'object' || Object.keys(fieldData).length === 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing required fields' }));
              return;
            }

            const template = mockTemplates.find(t => t.id === template_id);
            if (!template) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Template not found' }));
              return;
            }

            // Mock PDF generation success
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              pdf: 'JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovU',
              fileName: `${template_id}-filled.pdf`,
              metadata: {
                templateId: template_id,
                fieldsFilled: Object.keys(fieldData).length,
                errors: [],
                generatedAt: new Date().toISOString(),
              },
            }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }

      // Route: GET /api/v1/mcp/categories
      if (pathname === '/api/v1/mcp/categories' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          categories: mockCategories,
          total: mockCategories.length,
        }));
        return;
      }

      // 404 for unknown routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    mockServer.listen(MOCK_API_PORT, () => {
      console.log(`Mock backend server listening on port ${MOCK_API_PORT}`);
      resolve();
    });

    mockServer.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Stop mock backend server
 */
export function stopMockBackendServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!mockServer) {
      resolve();
      return;
    }

    mockServer.close((error) => {
      if (error) {
        reject(error);
      } else {
        mockServer = null;
        console.log('Mock backend server stopped');
        resolve();
      }
    });
  });
}

// Setup global test hooks
beforeAll(async () => {
  // Set environment variables for integration tests
  process.env.RIGHTFLOW_API_URL = MOCK_API_URL;
  process.env.RIGHTFLOW_API_KEY = MOCK_API_KEY;

  // Start mock backend server
  await createMockBackendServer();
});

afterAll(async () => {
  // Stop mock backend server
  await stopMockBackendServer();
});

afterEach(() => {
  // Clean up after each test if needed
});
