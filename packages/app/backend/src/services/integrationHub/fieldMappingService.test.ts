/**
 * Field Mapping Service Tests - Phase 2
 * TDD RED Phase: Write tests first, then implement
 *
 * Tests CRUD operations for field mappings:
 * - Create mapping (form-specific and template)
 * - List mappings (by connector, by form, by organization)
 * - Get single mapping
 * - Update mapping (partial updates)
 * - Delete mapping (soft delete)
 * - Preview transformation with sample data
 */

import * as fieldMappingService from './fieldMappingService';
import { query } from '../../config/database';
import * as connectorService from './connectorService';

// Test data
let testOrgId: string;
let testOrgId2: string; // For cross-tenant tests
let testConnectorId: string;
let testConnectorId2: string;
let testFormId: string;

beforeAll(async () => {
  // Create test organizations
  const org1 = await query(
    `INSERT INTO organizations (name, settings) VALUES ($1, $2) RETURNING id`,
    ['Test Org FieldMapping 1', '{}'],
  );
  testOrgId = org1[0].id;

  const org2 = await query(
    `INSERT INTO organizations (name, settings) VALUES ($1, $2) RETURNING id`,
    ['Test Org FieldMapping 2', '{}'],
  );
  testOrgId2 = org2[0].id;

  // Create test connectors
  const connector1 = await connectorService.create({
    organizationId: testOrgId,
    definitionSlug: 'priority-cloud',
    name: 'Test Priority Connector',
    config: {},
  });
  testConnectorId = connector1.id;

  const connector2 = await connectorService.create({
    organizationId: testOrgId,
    definitionSlug: 'sap-b1',
    name: 'Test SAP Connector',
    config: {},
  });
  testConnectorId2 = connector2.id;

  // Create test form
  const form = await query(
    `INSERT INTO forms (organization_id, name, description, structure)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [testOrgId, 'Test Form', 'Test form for mapping', '{}'],
  );
  testFormId = form[0].id;
});

afterAll(async () => {
  // Cleanup test data
  await query(`DELETE FROM field_mappings WHERE organization_id IN ($1, $2)`, [testOrgId, testOrgId2]);
  await query(`DELETE FROM connectors WHERE organization_id IN ($1, $2)`, [testOrgId, testOrgId2]);
  await query(`DELETE FROM forms WHERE organization_id IN ($1, $2)`, [testOrgId, testOrgId2]);
  await query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [testOrgId, testOrgId2]);
});

afterEach(async () => {
  // Clean up field_mappings after each test
  await query(`DELETE FROM field_mappings WHERE organization_id = $1`, [testOrgId]);
});

describe('Field Mapping Service - Create', () => {
  it('should create form-specific mapping', async () => {
    const mapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'customer_name',
      connectorField: 'CUSTDES',
      transforms: [{ type: 'trim' }, { type: 'uppercase' }],
      required: true,
      defaultValue: null,
    });

    expect(mapping.id).toBeDefined();
    expect(mapping.formField).toBe('customer_name');
    expect(mapping.connectorField).toBe('CUSTDES');
    expect(mapping.transforms).toHaveLength(2);
    expect(mapping.required).toBe(true);
    expect(mapping.formId).toBe(testFormId);
  });

  it('should create template mapping (form_id = NULL)', async () => {
    const mapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: null,
      formField: 'customer_email',
      connectorField: 'EMAIL',
      transforms: [{ type: 'trim' }, { type: 'lowercase' }],
      required: true,
      defaultValue: null,
    });

    expect(mapping.id).toBeDefined();
    expect(mapping.formId).toBeNull();
    expect(mapping.formField).toBe('customer_email');
  });

  it('should support Hebrew field names', async () => {
    const mapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'שם_לקוח',
      connectorField: 'CUSTDES',
      transforms: [{ type: 'trim' }],
      required: false,
      defaultValue: null,
    });

    expect(mapping.formField).toBe('שם_לקוח');
  });

  it('should allow empty transform array', async () => {
    const mapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'direct_field',
      connectorField: 'DIRECT',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    expect(mapping.transforms).toHaveLength(0);
  });

  it('should support default value', async () => {
    const mapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'status',
      connectorField: 'STATUS',
      transforms: [],
      required: false,
      defaultValue: 'pending',
    });

    expect(mapping.defaultValue).toBe('pending');
  });

  it('should reject duplicate mapping (same connector + form + field)', async () => {
    await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'duplicate_field',
      connectorField: 'FIELD1',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    await expect(
      fieldMappingService.create({
        organizationId: testOrgId,
        connectorId: testConnectorId,
        formId: testFormId,
        formField: 'duplicate_field',
        connectorField: 'FIELD2',
        transforms: [],
        required: false,
        defaultValue: null,
      }),
    ).rejects.toThrow();
  });

  it('should allow same field name for different connectors', async () => {
    await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'shared_field',
      connectorField: 'PRIORITY_FIELD',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    const mapping2 = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId2,
      formId: testFormId,
      formField: 'shared_field',
      connectorField: 'SAP_FIELD',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    expect(mapping2.connectorId).toBe(testConnectorId2);
  });

  it('should allow same field name for different forms', async () => {
    const form2 = await query(
      `INSERT INTO forms (organization_id, name, description, structure)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testOrgId, 'Form 2', 'Second form', '{}'],
    );

    await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'form_field',
      connectorField: 'FIELD1',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    const mapping2 = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: form2[0].id,
      formField: 'form_field',
      connectorField: 'FIELD1',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    expect(mapping2.formId).toBe(form2[0].id);

    // Cleanup
    await query(`DELETE FROM forms WHERE id = $1`, [form2[0].id]);
  });

  it('should validate transform array structure', async () => {
    await expect(
      fieldMappingService.create({
        organizationId: testOrgId,
        connectorId: testConnectorId,
        formId: testFormId,
        formField: 'test_field',
        connectorField: 'TEST',
        transforms: [{ type: 'unknown_transform' }],
        required: false,
        defaultValue: null,
      }),
    ).rejects.toThrow(/unknown transform/i);
  });

  it('should reject empty field names', async () => {
    await expect(
      fieldMappingService.create({
        organizationId: testOrgId,
        connectorId: testConnectorId,
        formId: testFormId,
        formField: '',
        connectorField: 'TEST',
        transforms: [],
        required: false,
        defaultValue: null,
      }),
    ).rejects.toThrow();
  });
});

describe('Field Mapping Service - Read', () => {
  let mapping1Id: string;

  beforeEach(async () => {
    // Create test mappings
    const m1 = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'customer_name',
      connectorField: 'CUSTDES',
      transforms: [{ type: 'trim' }],
      required: true,
      defaultValue: null,
    });
    mapping1Id = m1.id;

    await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'customer_email',
      connectorField: 'EMAIL',
      transforms: [],
      required: false,
      defaultValue: null,
    });
  });

  it('should get mapping by ID', async () => {
    const mapping = await fieldMappingService.getByIdForOrg(mapping1Id, testOrgId);

    expect(mapping.id).toBe(mapping1Id);
    expect(mapping.formField).toBe('customer_name');
    expect(mapping.connectorField).toBe('CUSTDES');
  });

  it('should reject cross-tenant access (CRITICAL SECURITY)', async () => {
    await expect(
      fieldMappingService.getByIdForOrg(mapping1Id, testOrgId2),
    ).rejects.toThrow(/organization mismatch/i);
  });

  it('should throw error for non-existent mapping', async () => {
    await expect(
      fieldMappingService.getByIdForOrg('00000000-0000-0000-0000-000000000000', testOrgId),
    ).rejects.toThrow(/not found/i);
  });

  it('should list mappings for connector and form', async () => {
    const mappings = await fieldMappingService.list({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
    });

    expect(mappings).toHaveLength(2);
    expect(mappings.some(m => m.formField === 'customer_name')).toBe(true);
    expect(mappings.some(m => m.formField === 'customer_email')).toBe(true);
  });

  it('should list mappings for connector only (all forms)', async () => {
    const mappings = await fieldMappingService.list({
      organizationId: testOrgId,
      connectorId: testConnectorId,
    });

    expect(mappings.length).toBeGreaterThanOrEqual(2);
  });

  it('should list template mappings (formId = NULL)', async () => {
    await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: null,
      formField: 'template_field',
      connectorField: 'TEMPLATE',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    const mappings = await fieldMappingService.list({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: null,
    });

    expect(mappings.some(m => m.formField === 'template_field')).toBe(true);
    expect(mappings.every(m => m.formId === null)).toBe(true);
  });

  it('should not include soft-deleted mappings in list', async () => {
    await fieldMappingService.softDelete(mapping1Id, testOrgId);

    const mappings = await fieldMappingService.list({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
    });

    expect(mappings.some(m => m.id === mapping1Id)).toBe(false);
  });

  it('should return empty array when no mappings found', async () => {
    const mappings = await fieldMappingService.list({
      organizationId: testOrgId,
      connectorId: testConnectorId2,
      formId: testFormId,
    });

    expect(mappings).toHaveLength(0);
  });
});

describe('Field Mapping Service - Update', () => {
  let mappingId: string;

  beforeEach(async () => {
    const mapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'updatable_field',
      connectorField: 'ORIGINAL',
      transforms: [{ type: 'trim' }],
      required: false,
      defaultValue: null,
    });
    mappingId = mapping.id;
  });

  it('should update connector field', async () => {
    const updated = await fieldMappingService.update(mappingId, testOrgId, {
      connectorField: 'UPDATED',
    });

    expect(updated.connectorField).toBe('UPDATED');
    expect(updated.formField).toBe('updatable_field'); // Unchanged
  });

  it('should update transforms', async () => {
    const updated = await fieldMappingService.update(mappingId, testOrgId, {
      transforms: [{ type: 'trim' }, { type: 'uppercase' }, { type: 'truncate', params: { maxLength: 50 } }],
    });

    expect(updated.transforms).toHaveLength(3);
    expect(updated.transforms[1].type).toBe('uppercase');
  });

  it('should update required flag', async () => {
    const updated = await fieldMappingService.update(mappingId, testOrgId, {
      required: true,
    });

    expect(updated.required).toBe(true);
  });

  it('should update default value', async () => {
    const updated = await fieldMappingService.update(mappingId, testOrgId, {
      defaultValue: 'new_default',
    });

    expect(updated.defaultValue).toBe('new_default');
  });

  it('should support partial updates (only changed fields)', async () => {
    const updated = await fieldMappingService.update(mappingId, testOrgId, {
      required: true,
    });

    expect(updated.required).toBe(true);
    expect(updated.connectorField).toBe('ORIGINAL'); // Unchanged
    expect(updated.transforms).toHaveLength(1); // Unchanged
  });

  it('should reject cross-tenant update (CRITICAL SECURITY)', async () => {
    await expect(
      fieldMappingService.update(mappingId, testOrgId2, {
        connectorField: 'HACKED',
      }),
    ).rejects.toThrow(/organization mismatch/i);
  });

  it('should validate transforms on update', async () => {
    await expect(
      fieldMappingService.update(mappingId, testOrgId, {
        transforms: [{ type: 'invalid_transform' }],
      }),
    ).rejects.toThrow(/unknown transform/i);
  });

  it('should update updated_at timestamp', async () => {
    const original = await fieldMappingService.getByIdForOrg(mappingId, testOrgId);

    // Wait 10ms to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updated = await fieldMappingService.update(mappingId, testOrgId, {
      required: true,
    });

    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(original.updatedAt).getTime());
  });
});

describe('Field Mapping Service - Delete', () => {
  let mappingId: string;

  beforeEach(async () => {
    const mapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'deletable_field',
      connectorField: 'DELETE_ME',
      transforms: [],
      required: false,
      defaultValue: null,
    });
    mappingId = mapping.id;
  });

  it('should soft delete mapping', async () => {
    await fieldMappingService.softDelete(mappingId, testOrgId);

    // Should not appear in list
    const mappings = await fieldMappingService.list({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
    });

    expect(mappings.some(m => m.id === mappingId)).toBe(false);

    // Should not be retrievable by ID
    await expect(
      fieldMappingService.getByIdForOrg(mappingId, testOrgId),
    ).rejects.toThrow(/not found/i);
  });

  it('should allow creating new mapping with same field name after delete', async () => {
    await fieldMappingService.softDelete(mappingId, testOrgId);

    const newMapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'deletable_field',
      connectorField: 'RECREATED',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    expect(newMapping.id).not.toBe(mappingId);
    expect(newMapping.formField).toBe('deletable_field');
  });

  it('should reject cross-tenant delete (CRITICAL SECURITY)', async () => {
    await expect(
      fieldMappingService.softDelete(mappingId, testOrgId2),
    ).rejects.toThrow(/organization mismatch/i);
  });

  it('should throw error when deleting non-existent mapping', async () => {
    await expect(
      fieldMappingService.softDelete('00000000-0000-0000-0000-000000000000', testOrgId),
    ).rejects.toThrow(/not found/i);
  });
});

describe('Field Mapping Service - Preview Transform', () => {
  let mappingId: string;

  beforeEach(async () => {
    const mapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'customer_name',
      connectorField: 'CUSTDES',
      transforms: [
        { type: 'trim' },
        { type: 'uppercase' },
        { type: 'truncate', params: { maxLength: 50 } },
      ],
      required: false,
      defaultValue: null,
    });
    mappingId = mapping.id;
  });

  it('should preview transformation with sample data', async () => {
    const result = await fieldMappingService.previewTransform(
      mappingId,
      testOrgId,
      '  john doe  ',
    );

    expect(result.output).toBe('JOHN DOE');
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].transform).toBe('trim');
    expect(result.steps[1].transform).toBe('uppercase');
    expect(result.steps[2].transform).toBe('truncate');
  });

  it('should preview with Hebrew text', async () => {
    const hebrewMapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'hebrew_field',
      connectorField: 'HEBREW',
      transforms: [
        { type: 'trim' },
        { type: 'strip_nikud' },
      ],
      required: false,
      defaultValue: null,
    });

    const result = await fieldMappingService.previewTransform(
      hebrewMapping.id,
      testOrgId,
      '  שָׁלוֹם  ',
    );

    expect(result.output).toBe('שלום');
    expect(result.steps).toHaveLength(2);
  });

  it('should preview with empty transform array', async () => {
    const directMapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'direct_field',
      connectorField: 'DIRECT',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    const result = await fieldMappingService.previewTransform(
      directMapping.id,
      testOrgId,
      'unchanged',
    );

    expect(result.output).toBe('unchanged');
    expect(result.steps).toHaveLength(0);
  });

  it('should reject cross-tenant preview (CRITICAL SECURITY)', async () => {
    await expect(
      fieldMappingService.previewTransform(mappingId, testOrgId2, 'test'),
    ).rejects.toThrow(/organization mismatch/i);
  });

  it('should show error details if transform fails', async () => {
    const invalidMapping = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'number_field',
      connectorField: 'NUMBER',
      transforms: [{ type: 'to_number' }],
      required: false,
      defaultValue: null,
    });

    await expect(
      fieldMappingService.previewTransform(invalidMapping.id, testOrgId, 'not-a-number'),
    ).rejects.toThrow();
  });
});

describe('Field Mapping Service - Multi-Tenant Isolation', () => {
  it('should isolate mappings by organization', async () => {
    // Create connector for org2
    const connector2 = await connectorService.create({
      organizationId: testOrgId2,
      definitionSlug: 'priority-cloud',
      name: 'Org2 Connector',
      config: {},
    });

    // Create form for org2
    const form2 = await query(
      `INSERT INTO forms (organization_id, name, description, structure)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testOrgId2, 'Org2 Form', 'Form for org 2', '{}'],
    );

    // Create mapping for org1
    const mapping1 = await fieldMappingService.create({
      organizationId: testOrgId,
      connectorId: testConnectorId,
      formId: testFormId,
      formField: 'org1_field',
      connectorField: 'ORG1',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    // Create mapping for org2
    const mapping2 = await fieldMappingService.create({
      organizationId: testOrgId2,
      connectorId: connector2.id,
      formId: form2[0].id,
      formField: 'org2_field',
      connectorField: 'ORG2',
      transforms: [],
      required: false,
      defaultValue: null,
    });

    // Org1 should not see org2's mapping
    await expect(
      fieldMappingService.getByIdForOrg(mapping2.id, testOrgId),
    ).rejects.toThrow(/organization mismatch/i);

    // Org2 should not see org1's mapping
    await expect(
      fieldMappingService.getByIdForOrg(mapping1.id, testOrgId2),
    ).rejects.toThrow(/organization mismatch/i);

    // List should only show own org's mappings
    const org1Mappings = await fieldMappingService.list({
      organizationId: testOrgId,
      connectorId: testConnectorId,
    });

    expect(org1Mappings.every(m => m.organizationId === testOrgId)).toBe(true);

    // Cleanup
    await query(`DELETE FROM field_mappings WHERE organization_id = $1`, [testOrgId2]);
    await query(`DELETE FROM forms WHERE id = $1`, [form2[0].id]);
    await query(`DELETE FROM connectors WHERE id = $1`, [connector2.id]);
  });
});
