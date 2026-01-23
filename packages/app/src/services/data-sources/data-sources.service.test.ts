import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataSourcesService } from './data-sources.service';
import db from '@/lib/db';

/**
 * DataSourcesService Test Suite
 * Following TDD principles - tests written before implementation
 *
 * Test coverage:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Multi-tenant isolation (security critical)
 * - CSV import validation and parsing
 * - JSON import validation and parsing
 * - Static options handling
 * - Error handling and validation
 */

describe('DataSourcesService', () => {
  let service: DataSourcesService;
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const otherUserId = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    service = new DataSourcesService();

    // Clean up test data before each test
    await db('data_sources').where('user_id', testUserId).del();
    await db('data_sources').where('user_id', otherUserId).del();

    // Create test users if they don't exist (needed for foreign key constraints)
    const existingUser1 = await db('users').where('id', testUserId).first();
    if (!existingUser1) {
      await db('users').insert({
        id: testUserId,
        clerk_id: `test_clerk_${testUserId}`,
        email: 'test1@example.com',
        tenant_type: 'rightflow',
        created_at: new Date(),
      });
    }

    const existingUser2 = await db('users').where('id', otherUserId).first();
    if (!existingUser2) {
      await db('users').insert({
        id: otherUserId,
        clerk_id: `test_clerk_${otherUserId}`,
        email: 'test2@example.com',
        tenant_type: 'rightflow',
        created_at: new Date(),
      });
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    await db('data_sources').where('user_id', testUserId).del();
    await db('data_sources').where('user_id', otherUserId).del();
  });

  describe('create', () => {
    it('should create a new static data source', async () => {
      const dataSource = await service.create({
        user_id: testUserId,
        name: 'Test Static Source',
        description: 'A test static data source',
        source_type: 'static',
        config: {
          options: [
            { label: 'Option 1', value: 'opt1' },
            { label: 'Option 2', value: 'opt2' },
          ],
        },
        cache_ttl: 3600,
      });

      expect(dataSource).toBeDefined();
      expect(dataSource.id).toBeDefined();
      expect(dataSource.user_id).toBe(testUserId);
      expect(dataSource.name).toBe('Test Static Source');
      expect(dataSource.source_type).toBe('static');
      expect(dataSource.config).toEqual({
        options: [
          { label: 'Option 1', value: 'opt1' },
          { label: 'Option 2', value: 'opt2' },
        ],
      });
      expect(dataSource.is_active).toBe(true);
      expect(dataSource.created_at).toBeDefined();
    });

    it('should create a CSV import data source', async () => {
      const dataSource = await service.create({
        user_id: testUserId,
        name: 'Customer List CSV',
        source_type: 'csv_import',
        config: {
          file_path: '/uploads/customers.csv',
          file_size: 2048,
          row_count: 50,
        },
      });

      expect(dataSource.source_type).toBe('csv_import');
      expect(dataSource.config.file_path).toBe('/uploads/customers.csv');
      expect(dataSource.config.row_count).toBe(50);
    });

    it('should create a JSON import data source', async () => {
      const dataSource = await service.create({
        user_id: testUserId,
        name: 'Products JSON',
        source_type: 'json_import',
        config: {
          file_path: '/uploads/products.json',
          file_size: 4096,
          item_count: 100,
        },
      });

      expect(dataSource.source_type).toBe('json_import');
      expect(dataSource.config.file_path).toBe('/uploads/products.json');
      expect(dataSource.config.item_count).toBe(100);
    });

    it('should reject invalid source_type', async () => {
      await expect(
        service.create({
          user_id: testUserId,
          name: 'Invalid Source',
          source_type: 'invalid_type' as any,
          config: {},
        }),
      ).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      await expect(
        service.create({
          user_id: testUserId,
          name: '',
          source_type: 'static',
          config: {},
        }),
      ).rejects.toThrow(/name is required/i);
    });
  });

  describe('findById', () => {
    it('should retrieve a data source by ID', async () => {
      const created = await service.create({
        user_id: testUserId,
        name: 'Test Source',
        source_type: 'static',
        config: { options: [] },
      });

      const found = await service.findById(created.id, testUserId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test Source');
    });

    it('should enforce multi-tenant isolation', async () => {
      const created = await service.create({
        user_id: testUserId,
        name: 'User 1 Source',
        source_type: 'static',
        config: { options: [] },
      });

      // Other user should NOT be able to access this data source
      const found = await service.findById(created.id, otherUserId);

      expect(found).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const found = await service.findById(
        '00000000-0000-0000-0000-999999999999',
        testUserId,
      );

      expect(found).toBeNull();
    });

    it('should not return soft-deleted data sources', async () => {
      const created = await service.create({
        user_id: testUserId,
        name: 'To be deleted',
        source_type: 'static',
        config: { options: [] },
      });

      await service.delete(created.id, testUserId);

      const found = await service.findById(created.id, testUserId);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all active data sources for a user', async () => {
      await service.create({
        user_id: testUserId,
        name: 'Source 1',
        source_type: 'static',
        config: { options: [] },
      });

      await service.create({
        user_id: testUserId,
        name: 'Source 2',
        source_type: 'csv_import',
        config: { file_path: '/test.csv', row_count: 10 },
      });

      // Create source for other user (should not appear)
      await service.create({
        user_id: otherUserId,
        name: 'Other User Source',
        source_type: 'static',
        config: { options: [] },
      });

      const sources = await service.findAll(testUserId);

      expect(sources).toHaveLength(2);
      expect(sources[0].user_id).toBe(testUserId);
      expect(sources[1].user_id).toBe(testUserId);
    });

    it('should filter by source_type', async () => {
      await service.create({
        user_id: testUserId,
        name: 'Static Source',
        source_type: 'static',
        config: { options: [] },
      });

      await service.create({
        user_id: testUserId,
        name: 'CSV Source',
        source_type: 'csv_import',
        config: { file_path: '/test.csv', row_count: 10 },
      });

      const csvSources = await service.findAll(testUserId, { source_type: 'csv_import' });

      expect(csvSources).toHaveLength(1);
      expect(csvSources[0].source_type).toBe('csv_import');
    });

    it('should not return soft-deleted sources', async () => {
      const source1 = await service.create({
        user_id: testUserId,
        name: 'Active Source',
        source_type: 'static',
        config: { options: [] },
      });

      const source2 = await service.create({
        user_id: testUserId,
        name: 'Deleted Source',
        source_type: 'static',
        config: { options: [] },
      });

      await service.delete(source2.id, testUserId);

      const sources = await service.findAll(testUserId);

      expect(sources).toHaveLength(1);
      expect(sources[0].id).toBe(source1.id);
    });
  });

  describe('update', () => {
    it('should update a data source', async () => {
      const created = await service.create({
        user_id: testUserId,
        name: 'Original Name',
        source_type: 'static',
        config: { options: [] },
      });

      const updated = await service.update(created.id, testUserId, {
        name: 'Updated Name',
        description: 'New description',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New description');
      expect(updated.updated_at).toBeDefined();
    });

    it('should enforce multi-tenant isolation on update', async () => {
      const created = await service.create({
        user_id: testUserId,
        name: 'User 1 Source',
        source_type: 'static',
        config: { options: [] },
      });

      // Other user should NOT be able to update
      await expect(
        service.update(created.id, otherUserId, {
          name: 'Hacked Name',
        }),
      ).rejects.toThrow(/not found/i);
    });

    it('should not allow changing user_id', async () => {
      const created = await service.create({
        user_id: testUserId,
        name: 'Test Source',
        source_type: 'static',
        config: { options: [] },
      });

      const updated = await service.update(created.id, testUserId, {
        user_id: otherUserId, // Attempt to change ownership
      } as any);

      // user_id should remain unchanged
      expect(updated.user_id).toBe(testUserId);
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft-delete a data source', async () => {
      const created = await service.create({
        user_id: testUserId,
        name: 'To be deleted',
        source_type: 'static',
        config: { options: [] },
      });

      await service.delete(created.id, testUserId);

      // Should not appear in findById
      const found = await service.findById(created.id, testUserId);
      expect(found).toBeNull();

      // But should exist in database with deleted_at timestamp
      const rawRecord = await db('data_sources')
        .where('id', created.id)
        .first();

      expect(rawRecord).toBeDefined();
      expect(rawRecord.deleted_at).not.toBeNull();
    });

    it('should enforce multi-tenant isolation on delete', async () => {
      const created = await service.create({
        user_id: testUserId,
        name: 'User 1 Source',
        source_type: 'static',
        config: { options: [] },
      });

      // Other user should NOT be able to delete
      await expect(service.delete(created.id, otherUserId)).rejects.toThrow(
        /not found/i,
      );

      // Source should still exist for original user
      const found = await service.findById(created.id, testUserId);
      expect(found).not.toBeNull();
    });
  });

  describe('CSV import parsing', () => {
    it('should parse valid CSV data', async () => {
      const csvContent = `label,value
חברת ABC,abc-001
חברת XYZ,xyz-002
חברה 123 בע"מ,comp-123`;

      const parsed = await service.parseCSV(csvContent);

      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual({ label: 'חברת ABC', value: 'abc-001' });
      expect(parsed[1]).toEqual({ label: 'חברת XYZ', value: 'xyz-002' });
      expect(parsed[2]).toEqual({ label: 'חברה 123 בע"מ', value: 'comp-123' });
    });

    it('should reject CSV without proper headers', async () => {
      const csvContent = `name,id
Company A,001`;

      await expect(service.parseCSV(csvContent)).rejects.toThrow(
        /invalid csv.*headers/i,
      );
    });

    it('should reject CSV with more than 10,000 rows', async () => {
      const header = 'label,value\n';
      const rows = Array.from({ length: 10001 }, (_, i) => `Item ${i},val-${i}`).join(
        '\n',
      );
      const csvContent = header + rows;

      await expect(service.parseCSV(csvContent)).rejects.toThrow(
        /exceeds.*10,?000.*rows/i,
      );
    });

    it('should skip rows with empty label or value', async () => {
      const csvContent = `label,value
Valid Item,val-001
,val-002
Empty Value,
Another Valid,val-003`;

      const parsed = await service.parseCSV(csvContent);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].label).toBe('Valid Item');
      expect(parsed[1].label).toBe('Another Valid');
    });

    it('should handle CSV with quoted values containing commas', async () => {
      const csvContent = `label,value
"Smith, John",emp-001
"Doe, Jane",emp-002`;

      const parsed = await service.parseCSV(csvContent);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].label).toBe('Smith, John');
      expect(parsed[1].label).toBe('Doe, Jane');
    });
  });

  describe('JSON import parsing', () => {
    it('should parse valid JSON data', async () => {
      const jsonContent = JSON.stringify([
        { label: 'חברת ABC', value: 'abc-001' },
        { label: 'חברת XYZ', value: 'xyz-002' },
      ]);

      const parsed = await service.parseJSON(jsonContent);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ label: 'חברת ABC', value: 'abc-001' });
      expect(parsed[1]).toEqual({ label: 'חברת XYZ', value: 'xyz-002' });
    });

    it('should reject invalid JSON syntax', async () => {
      const jsonContent = '{ invalid json }';

      await expect(service.parseJSON(jsonContent)).rejects.toThrow(/invalid json/i);
    });

    it('should reject JSON that is not an array', async () => {
      const jsonContent = JSON.stringify({
        label: 'Single Item',
        value: 'item-001',
      });

      await expect(service.parseJSON(jsonContent)).rejects.toThrow(
        /must be an array/i,
      );
    });

    it('should reject JSON with more than 10,000 items', async () => {
      const items = Array.from({ length: 10001 }, (_, i) => ({
        label: `Item ${i}`,
        value: `val-${i}`,
      }));
      const jsonContent = JSON.stringify(items);

      await expect(service.parseJSON(jsonContent)).rejects.toThrow(
        /exceeds.*10,?000.*items/i,
      );
    });

    it('should extract only label and value from objects with extra fields', async () => {
      const jsonContent = JSON.stringify([
        {
          label: 'חברת ABC',
          value: 'abc-001',
          createdDate: '2025-01-01',
          industry: 'Technology',
        },
        {
          label: 'חברת XYZ',
          value: 'xyz-002',
          salesRep: 'John Doe',
        },
      ]);

      const parsed = await service.parseJSON(jsonContent);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ label: 'חברת ABC', value: 'abc-001' });
      expect(parsed[1]).toEqual({ label: 'חברת XYZ', value: 'xyz-002' });
      expect(parsed[0]).not.toHaveProperty('createdDate');
      expect(parsed[1]).not.toHaveProperty('salesRep');
    });

    it('should skip items missing label or value', async () => {
      const jsonContent = JSON.stringify([
        { label: 'Valid Item', value: 'val-001' },
        { label: 'Missing Value' },
        { value: 'val-003' },
        { label: 'Another Valid', value: 'val-004' },
      ]);

      const parsed = await service.parseJSON(jsonContent);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].label).toBe('Valid Item');
      expect(parsed[1].label).toBe('Another Valid');
    });
  });

  describe('getOptions', () => {
    it('should return options for static data source', async () => {
      const dataSource = await service.create({
        user_id: testUserId,
        name: 'Static Source',
        source_type: 'static',
        config: {
          options: [
            { label: 'Option 1', value: 'opt1' },
            { label: 'Option 2', value: 'opt2' },
          ],
        },
      });

      const options = await service.getOptions(dataSource.id, testUserId);

      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ label: 'Option 1', value: 'opt1' });
      expect(options[1]).toEqual({ label: 'Option 2', value: 'opt2' });
    });

    it('should enforce multi-tenant isolation when fetching options', async () => {
      const dataSource = await service.create({
        user_id: testUserId,
        name: 'User 1 Source',
        source_type: 'static',
        config: {
          options: [{ label: 'Secret Option', value: 'secret' }],
        },
      });

      // Other user should NOT be able to fetch options
      await expect(service.getOptions(dataSource.id, otherUserId)).rejects.toThrow(
        /not found/i,
      );
    });

    it('should throw error for inactive data source', async () => {
      const dataSource = await service.create({
        user_id: testUserId,
        name: 'Inactive Source',
        source_type: 'static',
        config: { options: [{ label: 'Test', value: 'test' }] },
      });

      await service.update(dataSource.id, testUserId, { is_active: false });

      await expect(service.getOptions(dataSource.id, testUserId)).rejects.toThrow(
        /not active/i,
      );
    });
  });
});
