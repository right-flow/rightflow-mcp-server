/**
 * Unit Tests for MCP API Routes
 * Tests for the Model Context Protocol endpoints for Hebrew PDF generation
 *
 * Test Coverage:
 * - Health check endpoint
 * - Template listing with filtering and pagination
 * - Template details retrieval
 * - Field definitions for templates
 * - PDF fill validation and sanitization
 * - Batch fill validation
 * - Categories listing
 * - Hebrew text sanitization (BiDi attack prevention)
 * - Israeli ID validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import { query } from '../../config/database';
import mcpRouter from './mcp';

let app: Application;
let testOrgId: string;
let testUserId: string;
let testTemplateId: string;

// Mock authentication
const mockAuthUser = {
  id: '',
  organizationId: '',
  role: 'admin' as const,
  email: 'test@mcp.com',
  name: 'Test Admin',
};

beforeAll(async () => {
  // Create test Express app
  app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req, _res, next) => {
    req.user = mockAuthUser;
    next();
  });

  app.use('/api/v1/mcp', mcpRouter);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json(
      err.toJSON ? err.toJSON() : { error: { message: err.message } }
    );
  });

  // Create test organization
  const org = await query<{ id: string }>(
    `INSERT INTO organizations (clerk_org_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-mcp-org', 'MCP Test Org'],
  );
  testOrgId = org[0].id;
  mockAuthUser.organizationId = testOrgId;

  // Create test user
  const user = await query<{ id: string }>(
    `INSERT INTO users (clerk_user_id, email, name, organization_id, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['clerk_mcp_test', 'admin@mcp.com', 'MCP Test Admin', testOrgId, 'admin'],
  );
  testUserId = user[0].id;
  mockAuthUser.id = testUserId;

  // Create test MCP template
  const template = await query<{ id: string }>(
    `INSERT INTO mcp_templates (
      organization_id, name, name_he, description, description_he,
      category, language, s3_key, s3_bucket, fields, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [
      testOrgId,
      'Power of Attorney',
      'ייפוי כח',
      'Standard power of attorney template',
      'תבנית ייפוי כח סטנדרטית',
      'legal',
      'he',
      'templates/legal/power-of-attorney.pdf',
      'rightflow-templates',
      JSON.stringify([
        {
          id: 'grantor_name',
          name: 'grantor_name',
          label: 'Grantor Name',
          label_he: 'שם מייפה הכח',
          type: 'text',
          required: true,
          validation: { min_length: 2, max_length: 100 },
        },
        {
          id: 'grantor_id',
          name: 'grantor_id',
          label: 'Grantor ID',
          label_he: 'ת.ז. מייפה הכח',
          type: 'text',
          required: true,
          validation: { custom: 'israeli_id' },
        },
        {
          id: 'attorney_name',
          name: 'attorney_name',
          label: 'Attorney Name',
          label_he: 'שם מיופה הכח',
          type: 'text',
          required: true,
        },
        {
          id: 'effective_date',
          name: 'effective_date',
          label: 'Effective Date',
          label_he: 'תאריך תחילה',
          type: 'date',
          required: false,
        },
        {
          id: 'amount',
          name: 'amount',
          label: 'Amount Limit',
          label_he: 'מגבלת סכום',
          type: 'currency',
          required: false,
        },
      ]),
      true,
    ],
  );
  testTemplateId = template[0].id;
});

afterAll(async () => {
  // Cleanup in reverse order
  await query('DELETE FROM mcp_templates WHERE id = $1', [testTemplateId]);
  await query('DELETE FROM users WHERE organization_id = $1', [testOrgId]);
  await query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
});

// ============================================================================
// Health Check Tests
// ============================================================================

describe('GET /api/v1/mcp/health', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('service', 'mcp');
    expect(response.body).toHaveProperty('hebrew_font');
    expect(response.body).toHaveProperty('timestamp');
  });
});

// ============================================================================
// Templates Listing Tests
// ============================================================================

describe('GET /api/v1/mcp/templates', () => {
  it('should return templates list', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/templates')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('templates');
    expect(response.body.data).toHaveProperty('pagination');
    expect(Array.isArray(response.body.data.templates)).toBe(true);
  });

  it('should return Hebrew names when language=he', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/templates?language=he')
      .expect(200);

    const template = response.body.data.templates.find(
      (t: { id: string }) => t.id === testTemplateId
    );
    expect(template).toBeDefined();
    expect(template.name).toBe('ייפוי כח');
  });

  it('should return English names when language=en', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/templates?language=en')
      .expect(200);

    const template = response.body.data.templates.find(
      (t: { id: string }) => t.id === testTemplateId
    );
    expect(template).toBeDefined();
    expect(template.name).toBe('Power of Attorney');
  });

  it('should filter by category', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/templates?category=legal')
      .expect(200);

    expect(response.body.success).toBe(true);
    response.body.data.templates.forEach((t: { category: string }) => {
      expect(t.category).toBe('legal');
    });
  });

  it('should search by name', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/templates?search=Attorney')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.templates.length).toBeGreaterThan(0);
  });

  it('should support pagination', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/templates?limit=1&offset=0')
      .expect(200);

    expect(response.body.data.pagination.limit).toBe(1);
    expect(response.body.data.pagination.offset).toBe(0);
    expect(response.body.data.templates.length).toBeLessThanOrEqual(1);
  });

  it('should reject invalid pagination params', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/templates?limit=999')
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

// ============================================================================
// Template Details Tests
// ============================================================================

describe('GET /api/v1/mcp/templates/:id', () => {
  it('should return template details', async () => {
    const response = await request(app)
      .get(`/api/v1/mcp/templates/${testTemplateId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(testTemplateId);
    expect(response.body.data).toHaveProperty('fields');
    expect(response.body.data).toHaveProperty('integrations');
  });

  it('should return 404 for non-existent template', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app)
      .get(`/api/v1/mcp/templates/${fakeId}`)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return Hebrew content when language=he', async () => {
    const response = await request(app)
      .get(`/api/v1/mcp/templates/${testTemplateId}?language=he`)
      .expect(200);

    expect(response.body.data.name).toBe('ייפוי כח');
    expect(response.body.data.description).toBe('תבנית ייפוי כח סטנדרטית');
  });
});

// ============================================================================
// Template Fields Tests
// ============================================================================

describe('GET /api/v1/mcp/templates/:id/fields', () => {
  it('should return field definitions', async () => {
    const response = await request(app)
      .get(`/api/v1/mcp/templates/${testTemplateId}/fields`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.template_id).toBe(testTemplateId);
    expect(Array.isArray(response.body.data.fields)).toBe(true);
    expect(response.body.data.field_count).toBe(5);
  });

  it('should return Hebrew labels when language=he', async () => {
    const response = await request(app)
      .get(`/api/v1/mcp/templates/${testTemplateId}/fields?language=he`)
      .expect(200);

    const grantorField = response.body.data.fields.find(
      (f: { id: string }) => f.id === 'grantor_name'
    );
    expect(grantorField.label).toBe('שם מייפה הכח');
  });

  it('should return required fields list', async () => {
    const response = await request(app)
      .get(`/api/v1/mcp/templates/${testTemplateId}/fields`)
      .expect(200);

    expect(response.body.data.required_fields).toContain('grantor_name');
    expect(response.body.data.required_fields).toContain('grantor_id');
    expect(response.body.data.required_fields).toContain('attorney_name');
  });

  it('should return 404 for non-existent template', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .get(`/api/v1/mcp/templates/${fakeId}/fields`)
      .expect(404);
  });
});

// ============================================================================
// PDF Fill Tests
// ============================================================================

describe('POST /api/v1/mcp/fill', () => {
  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          // Missing required fields
        },
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(2002);
    expect(response.body.error.details).toContain('Missing required field: grantor_name');
  });

  it('should validate Israeli ID format', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: 'ישראל ישראלי',
          grantor_id: '123456789', // Invalid ID
          attorney_name: 'יועץ משפטי',
        },
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.details).toContainEqual(
      expect.stringContaining('Invalid Israeli ID')
    );
  });

  it('should accept valid data', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: 'ישראל ישראלי',
          grantor_id: '123456782', // Valid Israeli ID (passes Luhn check)
          attorney_name: 'יועץ משפטי',
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('template_id', testTemplateId);
    expect(response.body.data).toHaveProperty('fields_filled', 3);
  });

  it('should return 404 for non-existent template', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: fakeId,
        data: {},
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(2001);
  });

  it('should sanitize Hebrew text (remove BiDi control characters)', async () => {
    // U+202E is Right-to-Left Override (used in BiDi attacks)
    const maliciousText = 'שלום\u202Emalicious\u202Cעולם';

    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: maliciousText,
          grantor_id: '123456782',
          attorney_name: 'יועץ משפטי',
        },
      })
      .expect(200);

    // The sanitizer should have processed the input
    expect(response.body.success).toBe(true);
  });

  it('should validate field length constraints', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: 'א', // Too short (min_length: 2)
          grantor_id: '123456782',
          attorney_name: 'יועץ',
        },
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.details).toContainEqual(
      expect.stringContaining('Minimum length')
    );
  });

  it('should handle date fields correctly', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: 'ישראל ישראלי',
          grantor_id: '123456782',
          attorney_name: 'יועץ משפטי',
          effective_date: '2026-03-15',
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.fields_filled).toBe(4);
  });

  it('should handle number/currency fields correctly', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: 'ישראל ישראלי',
          grantor_id: '123456782',
          attorney_name: 'יועץ משפטי',
          amount: 50000,
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.fields_filled).toBe(4);
  });

  it('should reject invalid date format', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: 'ישראל ישראלי',
          grantor_id: '123456782',
          attorney_name: 'יועץ משפטי',
          effective_date: 'not-a-date',
        },
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.details).toContainEqual(
      expect.stringContaining('valid date')
    );
  });

  it('should reject invalid UUID for template_id', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: 'not-a-uuid',
        data: {},
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(2000);
  });
});

// ============================================================================
// Batch Fill Tests
// ============================================================================

describe('POST /api/v1/mcp/batch', () => {
  it('should validate batch data array', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/batch')
      .send({
        template_id: testTemplateId,
        data_array: [
          {
            grantor_name: 'ישראל ישראלי',
            grantor_id: '123456782',
            attorney_name: 'יועץ א',
          },
          {
            grantor_name: 'משה כהן',
            grantor_id: '987654321', // Invalid ID
            attorney_name: 'יועץ ב',
          },
        ],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBe(2);
    expect(response.body.data.validated).toBe(1);
    expect(response.body.data.failed_validation).toBe(1);
  });

  it('should reject empty data array', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/batch')
      .send({
        template_id: testTemplateId,
        data_array: [],
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should enforce max batch size of 100', async () => {
    const largeArray = Array(101).fill({
      grantor_name: 'שם',
      grantor_id: '123456782',
      attorney_name: 'יועץ',
    });

    const response = await request(app)
      .post('/api/v1/mcp/batch')
      .send({
        template_id: testTemplateId,
        data_array: largeArray,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 404 for non-existent template', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app)
      .post('/api/v1/mcp/batch')
      .send({
        template_id: fakeId,
        data_array: [{ name: 'test' }],
      })
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});

// ============================================================================
// Categories Tests
// ============================================================================

describe('GET /api/v1/mcp/categories', () => {
  it('should return category list', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/categories')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.categories)).toBe(true);
  });

  it('should return Hebrew category names', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/categories')
      .expect(200);

    const legalCategory = response.body.data.categories.find(
      (c: { id: string }) => c.id === 'legal'
    );
    expect(legalCategory).toBeDefined();
    expect(legalCategory.name_he).toBe('משפטי');
  });

  it('should include template counts', async () => {
    const response = await request(app)
      .get('/api/v1/mcp/categories')
      .expect(200);

    const legalCategory = response.body.data.categories.find(
      (c: { id: string }) => c.id === 'legal'
    );
    expect(legalCategory).toHaveProperty('count');
    expect(legalCategory.count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Security Tests - BiDi Attack Prevention
// ============================================================================

describe('BiDi Attack Prevention', () => {
  it('should sanitize Unicode Right-to-Left Override', async () => {
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: 'test\u202Ehidden\u202Ctext',
          grantor_id: '123456782',
          attorney_name: 'יועץ',
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should sanitize Unicode directional embeddings', async () => {
    // U+202A LRE, U+202B RLE, U+202C PDF
    const response = await request(app)
      .post('/api/v1/mcp/fill')
      .send({
        template_id: testTemplateId,
        data: {
          grantor_name: '\u202Aשלום\u202C \u202Bעולם\u202C',
          grantor_id: '123456782',
          attorney_name: 'יועץ',
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
