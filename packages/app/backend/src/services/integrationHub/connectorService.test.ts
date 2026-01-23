/**
 * Tests for Connector Service (Integration Hub)
 * Following TDD methodology - tests written BEFORE implementation
 *
 * Test Coverage:
 * - Create connector with valid configuration
 * - Cross-tenant security (critical edge case)
 * - Duplicate name prevention
 * - Soft delete filtering
 * - Hebrew text support
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { query } from '../../config/database';
import * as connectorService from './connectorService';

// Test database setup
let testOrgId: string;
let testOrgId2: string; // For cross-tenant tests

beforeAll(async () => {
  // Create test organizations
  const org1 = await query(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-org-1', 'Test Organization 1'],
  );
  testOrgId = org1[0].id;

  const org2 = await query(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-org-2', 'Test Organization 2'],
  );
  testOrgId2 = org2[0].id;
});

afterAll(async () => {
  // Cleanup test data
  await query('DELETE FROM organizations WHERE clerk_organization_id LIKE $1', ['test-org-%']);
});

beforeEach(async () => {
  // Clean connectors before each test
  await query('DELETE FROM connectors WHERE organization_id = $1 OR organization_id = $2', [testOrgId, testOrgId2]);
});

describe('ConnectorService', () => {
  describe('create', () => {
    it('should create connector with valid configuration', async () => {
      const connectorData = {
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Production Priority',
        config: {
          baseUrl: 'https://priority.example.com',
          company: 'DEMO',
          environment: 'production',
        },
      };

      const result = await connectorService.create(connectorData);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Production Priority');
      expect(result.organizationId).toBe(testOrgId);
      expect(result.config.baseUrl).toBe('https://priority.example.com');
      expect(result.isEnabled).toBe(true);
      expect(result.healthStatus).toBe('unknown');
    });

    it('should reject duplicate connector name in same org', async () => {
      const connectorData = {
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Priority Production',
        config: {},
      };

      // Create first connector
      await connectorService.create(connectorData);

      // Attempt to create duplicate - should fail
      await expect(
        connectorService.create(connectorData),
      ).rejects.toThrow('Connector name already exists');
    });

    it('should allow same connector name in different orgs', async () => {
      const connectorData = {
        definitionSlug: 'priority-cloud',
        name: 'Priority Production',
        config: {},
      };

      // Create in org 1
      const connector1 = await connectorService.create({
        ...connectorData,
        organizationId: testOrgId,
      });

      // Create same name in org 2 - should succeed
      const connector2 = await connectorService.create({
        ...connectorData,
        organizationId: testOrgId2,
      });

      expect(connector1.name).toBe(connector2.name);
      expect(connector1.organizationId).not.toBe(connector2.organizationId);
    });

    it('should reject non-existent connector definition', async () => {
      const connectorData = {
        organizationId: testOrgId,
        definitionSlug: 'non-existent-erp',
        name: 'Test',
        config: {},
      };

      await expect(
        connectorService.create(connectorData),
      ).rejects.toThrow('Invalid connector definition');
    });

    it('should support pure Hebrew connector names', async () => {
      const connectorData = {
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'חיבור פריוריטי ייצור',
        config: {},
      };

      const result = await connectorService.create(connectorData);

      expect(result.name).toBe('חיבור פריוריטי ייצור');

      // Verify database storage
      const stored = await query('SELECT name FROM connectors WHERE id = $1', [result.id]);
      expect(stored[0].name).toBe('חיבור פריוריטי ייצור');
    });

    it('should preserve Hebrew nikud in connector names', async () => {
      const hebrewWithNikud = 'פְּרִיוֹרִיטִי';

      const connectorData = {
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: hebrewWithNikud,
        config: {},
      };

      const result = await connectorService.create(connectorData);

      expect(result.name).toBe(hebrewWithNikud);
    });

    it('should support Hebrew in JSONB config field', async () => {
      const hebrewConfig = {
        baseUrl: 'https://example.com',
        company: 'חברת דוגמה',
        environment: 'ייצור',
      };

      const connectorData = {
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Test',
        config: hebrewConfig,
      };

      const result = await connectorService.create(connectorData);

      expect(result.config.company).toBe('חברת דוגמה');
      expect(result.config.environment).toBe('ייצור');
    });

    it('should reject connector name longer than 255 characters', async () => {
      const longName = 'A'.repeat(300);

      const connectorData = {
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: longName,
        config: {},
      };

      await expect(
        connectorService.create(connectorData),
      ).rejects.toThrow('Name must be 255 characters or less');
    });
  });

  describe('getByIdForOrg', () => {
    it('should get connector by ID for same organization', async () => {
      // Create connector
      const created = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Test Connector',
        config: {},
      });

      // Get by ID
      const retrieved = await connectorService.getByIdForOrg(created.id, testOrgId);

      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test Connector');
    });

    it('should reject cross-tenant connector access (CRITICAL SECURITY)', async () => {
      // Create connector for org 1
      const connector = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Org1 Connector',
        config: {},
      });

      // Attempt to access from org 2 - should fail
      await expect(
        connectorService.getByIdForOrg(connector.id, testOrgId2),
      ).rejects.toThrow('OrganizationMismatchError');
    });

    it('should not return soft-deleted connectors', async () => {
      // Create and delete connector
      const created = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'To Delete',
        config: {},
      });

      await connectorService.softDelete(created.id, testOrgId);

      // Attempt to get deleted connector
      await expect(
        connectorService.getByIdForOrg(created.id, testOrgId),
      ).rejects.toThrow('NotFoundError');
    });
  });

  describe('listForOrg', () => {
    it('should list connectors for organization', async () => {
      // Create 3 connectors
      await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Connector 1',
        config: {},
      });

      await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'sap-b1',
        name: 'Connector 2',
        config: {},
      });

      await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'generic-rest',
        name: 'Connector 3',
        config: {},
      });

      const result = await connectorService.listForOrg(testOrgId);

      expect(result).toHaveLength(3);
    });

    it('should not list connectors from other organizations', async () => {
      // Create connector for org 1
      await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Org1 Connector',
        config: {},
      });

      // Create connector for org 2
      await connectorService.create({
        organizationId: testOrgId2,
        definitionSlug: 'priority-cloud',
        name: 'Org2 Connector',
        config: {},
      });

      // List for org 1
      const org1Connectors = await connectorService.listForOrg(testOrgId);

      expect(org1Connectors).toHaveLength(1);
      expect(org1Connectors[0].name).toBe('Org1 Connector');
    });

    it('should not list soft-deleted connectors', async () => {
      // Create 2 connectors
      await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Active',
        config: {},
      });

      const connector2 = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'sap-b1',
        name: 'Deleted',
        config: {},
      });

      // Delete second connector
      await connectorService.softDelete(connector2.id, testOrgId);

      // List should only return active
      const result = await connectorService.listForOrg(testOrgId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active');
    });
  });

  describe('update', () => {
    it('should update connector configuration', async () => {
      const created = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Original Name',
        config: { baseUrl: 'https://original.com' },
      });

      const updated = await connectorService.update(created.id, testOrgId, {
        name: 'Updated Name',
        config: { baseUrl: 'https://updated.com', company: 'NEW' },
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.config.baseUrl).toBe('https://updated.com');
      expect(updated.config.company).toBe('NEW');
    });

    it('should prevent cross-tenant connector update (CRITICAL SECURITY)', async () => {
      // Create connector for org 1
      const connector = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Org1 Connector',
        config: {},
      });

      // Attempt to update from org 2 - should fail
      await expect(
        connectorService.update(connector.id, testOrgId2, { name: 'Hacked' }),
      ).rejects.toThrow('OrganizationMismatchError');

      // Verify connector unchanged
      const unchanged = await connectorService.getByIdForOrg(connector.id, testOrgId);
      expect(unchanged.name).toBe('Org1 Connector');
    });

    it('should not allow updating to duplicate name', async () => {
      await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Connector A',
        config: {},
      });

      const connectorB = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'sap-b1',
        name: 'Connector B',
        config: {},
      });

      // Try to rename B to A (duplicate)
      await expect(
        connectorService.update(connectorB.id, testOrgId, { name: 'Connector A' }),
      ).rejects.toThrow('Connector name already exists');
    });
  });

  describe('softDelete', () => {
    it('should soft delete connector', async () => {
      const created = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'To Delete',
        config: {},
      });

      await connectorService.softDelete(created.id, testOrgId);

      // Verify deleted_at is set
      const result = await query(
        'SELECT deleted_at FROM connectors WHERE id = $1',
        [created.id],
      );

      expect(result[0].deleted_at).not.toBeNull();
    });

    it('should prevent cross-tenant connector deletion (CRITICAL SECURITY)', async () => {
      const connector = await connectorService.create({
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Protected',
        config: {},
      });

      // Attempt to delete from org 2 - should fail
      await expect(
        connectorService.softDelete(connector.id, testOrgId2),
      ).rejects.toThrow('OrganizationMismatchError');

      // Verify connector still exists
      const unchanged = await connectorService.getByIdForOrg(connector.id, testOrgId);
      expect(unchanged).not.toBeNull();
    });

    it('should allow same connector name after soft delete', async () => {
      const connectorData = {
        organizationId: testOrgId,
        definitionSlug: 'priority-cloud',
        name: 'Reusable Name',
        config: {},
      };

      // Create, delete, create again with same name
      const connector1 = await connectorService.create(connectorData);
      await connectorService.softDelete(connector1.id, testOrgId);

      // Should succeed
      const connector2 = await connectorService.create(connectorData);

      expect(connector2.name).toBe('Reusable Name');
      expect(connector2.id).not.toBe(connector1.id);
    });
  });
});
