/**
 * Connector Definitions Tests - Integration Hub Phase 5
 * Validates 5 Israeli ERP connector definitions from database
 *
 * Test Categories:
 * 1. Connector definition existence and basic schema
 * 2. Priority Cloud connector validation
 * 3. Priority On-Premise connector validation
 * 4. SAP Business One connector validation
 * 5. Hashavshevet connector validation
 * 6. Generic REST connector validation
 * 7. Hebrew text support validation
 */

import { query } from '../../config/database';

// ============================================================================
// Test Data
// ============================================================================

interface ConnectorDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  vendor: string | null;
  logoUrl: string | null;
  authSchema: any;
  endpoints: any;
  configSchema: any;
  capabilities: string[];
  supportsHebrew: boolean;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getDefinitionBySlug(slug: string): Promise<ConnectorDefinition | null> {
  const rows = await query(
    `SELECT
      id, slug, name, description, category, vendor, logo_url as "logoUrl",
      auth_schema as "authSchema",
      endpoints,
      config_schema as "configSchema",
      capabilities,
      supports_hebrew as "supportsHebrew",
      is_enabled as "isEnabled",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM connector_definitions
    WHERE slug = $1`,
    [slug]
  );

  return rows.length > 0 ? rows[0] : null;
}

async function getAllDefinitions(): Promise<ConnectorDefinition[]> {
  return await query(
    `SELECT
      id, slug, name, description, category, vendor, logo_url as "logoUrl",
      auth_schema as "authSchema",
      endpoints,
      config_schema as "configSchema",
      capabilities,
      supports_hebrew as "supportsHebrew",
      is_enabled as "isEnabled",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM connector_definitions
    ORDER BY slug`
  );
}

// ============================================================================
// Category 1: Basic Connector Definition Tests
// ============================================================================

describe('Connector Definitions - Existence and Schema', () => {
  it('should have at least 5 connector definitions', async () => {
    const definitions = await getAllDefinitions();
    expect(definitions.length).toBeGreaterThanOrEqual(5);
  });

  it('should have all required Israeli ERP connectors', async () => {
    const requiredSlugs = [
      'priority-cloud',
      'priority-onpremise',
      'sap-b1',
      'hashavshevet',
      'generic-rest'
    ];

    for (const slug of requiredSlugs) {
      const definition = await getDefinitionBySlug(slug);
      expect(definition).not.toBeNull();
      expect(definition!.slug).toBe(slug);
    }
  });

  it('should have unique slugs (no duplicates)', async () => {
    const rows = await query(
      `SELECT slug, COUNT(*) as count
       FROM connector_definitions
       GROUP BY slug
       HAVING COUNT(*) > 1`
    );

    expect(rows.length).toBe(0); // No duplicates
  });

  it('should have valid categories', async () => {
    const definitions = await getAllDefinitions();
    const validCategories = ['erp', 'crm', 'accounting', 'custom'];

    definitions.forEach((def) => {
      expect(validCategories).toContain(def.category);
    });
  });

  it('should have enabled flag set correctly', async () => {
    const definitions = await getAllDefinitions();

    // All Phase 5 connectors should be enabled
    const phase5Slugs = ['priority-cloud', 'priority-onpremise', 'sap-b1', 'hashavshevet', 'generic-rest'];
    const phase5Defs = definitions.filter((def) => phase5Slugs.includes(def.slug));

    phase5Defs.forEach((def) => {
      expect(def.isEnabled).toBe(true);
    });
  });
});

// ============================================================================
// Category 2: Priority Cloud Connector Tests
// ============================================================================

describe('Priority Cloud Connector', () => {
  let priorityCloud: ConnectorDefinition | null;

  beforeAll(async () => {
    priorityCloud = await getDefinitionBySlug('priority-cloud');
  });

  it('should exist with correct basic properties', () => {
    expect(priorityCloud).not.toBeNull();
    expect(priorityCloud!.name).toBe('Priority Cloud');
    expect(priorityCloud!.category).toBe('erp');
    expect(priorityCloud!.vendor).toBe('Priority Software');
    expect(priorityCloud!.supportsHebrew).toBe(true);
    expect(priorityCloud!.isEnabled).toBe(true);
  });

  it('should have Basic Auth schema', () => {
    expect(priorityCloud!.authSchema).toBeDefined();
    expect(priorityCloud!.authSchema.type).toBe('basic');
    expect(priorityCloud!.authSchema.fields).toHaveLength(2);

    const usernameField = priorityCloud!.authSchema.fields.find((f: any) => f.key === 'username');
    expect(usernameField).toBeDefined();
    expect(usernameField.required).toBe(true);

    const passwordField = priorityCloud!.authSchema.fields.find((f: any) => f.key === 'password');
    expect(passwordField).toBeDefined();
    expect(passwordField.type).toBe('password');
    expect(passwordField.required).toBe(true);
  });

  it('should have all CRUD customer endpoints', () => {
    expect(priorityCloud!.endpoints).toBeDefined();
    expect(priorityCloud!.endpoints.getCustomer).toBeDefined();
    expect(priorityCloud!.endpoints.listCustomers).toBeDefined();
    expect(priorityCloud!.endpoints.createCustomer).toBeDefined();
    expect(priorityCloud!.endpoints.updateCustomer).toBeDefined();
    expect(priorityCloud!.endpoints.deleteCustomer).toBeDefined();

    // Verify endpoint structure
    expect(priorityCloud!.endpoints.getCustomer.path).toBe('/customers/{customerId}');
    expect(priorityCloud!.endpoints.getCustomer.method).toBe('GET');
    expect(priorityCloud!.endpoints.createCustomer.method).toBe('POST');
  });

  it('should have order endpoints', () => {
    expect(priorityCloud!.endpoints.getOrder).toBeDefined();
    expect(priorityCloud!.endpoints.listOrders).toBeDefined();
    expect(priorityCloud!.endpoints.createOrder).toBeDefined();
  });

  it('should have item and invoice endpoints', () => {
    expect(priorityCloud!.endpoints.getItem).toBeDefined();
    expect(priorityCloud!.endpoints.listItems).toBeDefined();
    expect(priorityCloud!.endpoints.getInvoice).toBeDefined();
    expect(priorityCloud!.endpoints.createInvoice).toBeDefined();
  });

  it('should have valid config schema', () => {
    expect(priorityCloud!.configSchema).toBeDefined();
    expect(priorityCloud!.configSchema.baseUrl).toBeDefined();
    expect(priorityCloud!.configSchema.baseUrl.type).toBe('url');
    expect(priorityCloud!.configSchema.baseUrl.required).toBe(true);

    expect(priorityCloud!.configSchema.timeout).toBeDefined();
    expect(priorityCloud!.configSchema.timeout.default).toBe(15000);
  });

  it('should have correct capabilities', () => {
    expect(priorityCloud!.capabilities).toContain('customers');
    expect(priorityCloud!.capabilities).toContain('orders');
    expect(priorityCloud!.capabilities).toContain('items');
    expect(priorityCloud!.capabilities).toContain('invoices');
  });
});

// ============================================================================
// Category 3: Priority On-Premise Connector Tests
// ============================================================================

describe('Priority On-Premise Connector', () => {
  let priorityOnPremise: ConnectorDefinition | null;

  beforeAll(async () => {
    priorityOnPremise = await getDefinitionBySlug('priority-onpremise');
  });

  it('should exist with correct basic properties', () => {
    expect(priorityOnPremise).not.toBeNull();
    expect(priorityOnPremise!.name).toBe('Priority On-Premise');
    expect(priorityOnPremise!.category).toBe('erp');
    expect(priorityOnPremise!.vendor).toBe('Priority Software');
    expect(priorityOnPremise!.supportsHebrew).toBe(true);
  });

  it('should have Basic Auth schema (same as Cloud)', () => {
    expect(priorityOnPremise!.authSchema.type).toBe('basic');
    expect(priorityOnPremise!.authSchema.fields).toHaveLength(2);
  });

  it('should use OData syntax in endpoints', () => {
    expect(priorityOnPremise!.endpoints.getCustomer).toBeDefined();
    // OData uses ('id') syntax
    expect(priorityOnPremise!.endpoints.getCustomer.path).toContain("('");
    expect(priorityOnPremise!.endpoints.getCustomer.path).toBe("/CUSTOMERS('{customerId}')");
    expect(priorityOnPremise!.endpoints.getCustomer.odataVersion).toBe('4.0');
  });

  it('should use PATCH for updates (OData standard)', () => {
    expect(priorityOnPremise!.endpoints.updateCustomer).toBeDefined();
    expect(priorityOnPremise!.endpoints.updateCustomer.method).toBe('PATCH');
  });

  it('should have company field in config schema', () => {
    expect(priorityOnPremise!.configSchema.company).toBeDefined();
    expect(priorityOnPremise!.configSchema.company.required).toBe(true);
    expect(priorityOnPremise!.configSchema.company.type).toBe('text');
  });

  it('should have SSL verification option', () => {
    expect(priorityOnPremise!.configSchema.verifySsl).toBeDefined();
    expect(priorityOnPremise!.configSchema.verifySsl.type).toBe('boolean');
    expect(priorityOnPremise!.configSchema.verifySsl.default).toBe(true);
  });

  it('should have OData-specific capabilities', () => {
    expect(priorityOnPremise!.capabilities).toContain('customers');
    expect(priorityOnPremise!.capabilities).toContain('orders');
  });
});

// ============================================================================
// Category 4: SAP Business One Connector Tests
// ============================================================================

describe('SAP Business One Connector', () => {
  let sapB1: ConnectorDefinition | null;

  beforeAll(async () => {
    sapB1 = await getDefinitionBySlug('sap-b1');
  });

  it('should exist with correct basic properties', () => {
    expect(sapB1).not.toBeNull();
    expect(sapB1!.name).toBe('SAP Business One');
    expect(sapB1!.category).toBe('erp');
    expect(sapB1!.vendor).toBe('SAP');
    expect(sapB1!.supportsHebrew).toBe(false); // SAP B1 does not have native Hebrew support like Priority
  });

  it('should have session-based auth schema', () => {
    expect(sapB1!.authSchema.type).toBe('session');
    expect(sapB1!.authSchema.sessionEndpoint).toBe('/Login');
    expect(sapB1!.authSchema.sessionHeader).toBe('B1S-SessionId');
    expect(sapB1!.authSchema.sessionCookie).toBe('B1SESSION');
  });

  it('should have companyDB field in auth schema', () => {
    const companyDBField = sapB1!.authSchema.fields.find((f: any) => f.key === 'companyDB');
    expect(companyDBField).toBeDefined();
    expect(companyDBField.required).toBe(true);
  });

  it('should have login and logout endpoints', () => {
    expect(sapB1!.endpoints.login).toBeDefined();
    expect(sapB1!.endpoints.login.method).toBe('POST');
    expect(sapB1!.endpoints.login.returns).toBe('B1SESSION');

    expect(sapB1!.endpoints.logout).toBeDefined();
    expect(sapB1!.endpoints.logout.method).toBe('POST');
  });

  it('should have BusinessPartner endpoints', () => {
    expect(sapB1!.endpoints.getBusinessPartner).toBeDefined();
    expect(sapB1!.endpoints.listBusinessPartners).toBeDefined();
    expect(sapB1!.endpoints.createBusinessPartner).toBeDefined();
    expect(sapB1!.endpoints.updateBusinessPartner).toBeDefined();

    // All should require auth
    expect(sapB1!.endpoints.getBusinessPartner.requiresAuth).toBe(true);
  });

  it('should have config schema with session timeout', () => {
    expect(sapB1!.configSchema.sessionTimeout).toBeDefined();
    expect(sapB1!.configSchema.sessionTimeout.default).toBe(30);
  });

  it('should have business-partners capability', () => {
    expect(sapB1!.capabilities).toContain('business-partners');
    expect(sapB1!.capabilities).toContain('orders');
    expect(sapB1!.capabilities).toContain('items');
  });
});

// ============================================================================
// Category 5: Hashavshevet Connector Tests
// ============================================================================

describe('Hashavshevet Connector', () => {
  let hashavshevet: ConnectorDefinition | null;

  beforeAll(async () => {
    hashavshevet = await getDefinitionBySlug('hashavshevet');
  });

  it('should exist with correct basic properties', () => {
    expect(hashavshevet).not.toBeNull();
    expect(hashavshevet!.name).toBe('חשבשבת (Hashavshevet)');
    expect(hashavshevet!.category).toBe('accounting');
    expect(hashavshevet!.vendor).toBe('Hashavshevet');
    expect(hashavshevet!.supportsHebrew).toBe(true);
  });

  it('should have API Key auth schema', () => {
    expect(hashavshevet!.authSchema.type).toBe('apikey');
    expect(hashavshevet!.authSchema.headerName).toBe('X-API-Key');

    const apiKeyField = hashavshevet!.authSchema.fields.find((f: any) => f.key === 'apiKey');
    expect(apiKeyField).toBeDefined();
    expect(apiKeyField.required).toBe(true);
    expect(apiKeyField.type).toBe('password');
  });

  it('should have customer endpoints', () => {
    expect(hashavshevet!.endpoints.getCustomer).toBeDefined();
    expect(hashavshevet!.endpoints.listCustomers).toBeDefined();
    expect(hashavshevet!.endpoints.createCustomer).toBeDefined();
    expect(hashavshevet!.endpoints.updateCustomer).toBeDefined();
  });

  it('should have invoice and document endpoints', () => {
    expect(hashavshevet!.endpoints.getInvoice).toBeDefined();
    expect(hashavshevet!.endpoints.listInvoices).toBeDefined();
    expect(hashavshevet!.endpoints.createInvoice).toBeDefined();
    expect(hashavshevet!.endpoints.getDocument).toBeDefined();
    expect(hashavshevet!.endpoints.listDocuments).toBeDefined();
  });

  it('should have language option in config schema', () => {
    expect(hashavshevet!.configSchema.language).toBeDefined();
    expect(hashavshevet!.configSchema.language.type).toBe('select');
    expect(hashavshevet!.configSchema.language.default).toBe('he');
    expect(hashavshevet!.configSchema.language.options).toHaveLength(2);
  });

  it('should have accounting capability', () => {
    expect(hashavshevet!.capabilities).toContain('customers');
    expect(hashavshevet!.capabilities).toContain('invoices');
    expect(hashavshevet!.capabilities).toContain('documents');
    expect(hashavshevet!.capabilities).toContain('accounting');
  });
});

// ============================================================================
// Category 6: Generic REST Connector Tests
// ============================================================================

describe('Generic REST Connector', () => {
  let genericRest: ConnectorDefinition | null;

  beforeAll(async () => {
    genericRest = await getDefinitionBySlug('generic-rest');
  });

  it('should exist with correct basic properties', () => {
    expect(genericRest).not.toBeNull();
    expect(genericRest!.name).toBe('Generic REST API');
    expect(genericRest!.category).toBe('custom');
    expect(genericRest!.vendor).toBeNull(); // No specific vendor
    expect(genericRest!.supportsHebrew).toBe(false); // Generic, no specific language support
  });

  it('should have flexible auth schema', () => {
    expect(genericRest!.authSchema.type).toBe('flexible');
    expect(genericRest!.authSchema.supportedTypes).toContain('basic');
    expect(genericRest!.authSchema.supportedTypes).toContain('apikey');
    expect(genericRest!.authSchema.supportedTypes).toContain('bearer');
    expect(genericRest!.authSchema.supportedTypes).toContain('none');
  });

  it('should have flexible custom endpoints', () => {
    expect(genericRest!.endpoints.customGet).toBeDefined();
    expect(genericRest!.endpoints.customPost).toBeDefined();
    expect(genericRest!.endpoints.customPut).toBeDefined();
    expect(genericRest!.endpoints.customPatch).toBeDefined();
    expect(genericRest!.endpoints.customDelete).toBeDefined();

    // All should use path placeholder
    expect(genericRest!.endpoints.customGet.path).toBe('/{path}');
    expect(genericRest!.endpoints.customGet.flexible).toBe(true);
  });

  it('should have authType selector in config schema', () => {
    expect(genericRest!.configSchema.authType).toBeDefined();
    expect(genericRest!.configSchema.authType.type).toBe('select');
    expect(genericRest!.configSchema.authType.options).toHaveLength(4); // none, basic, apikey, bearer
  });

  it('should support custom headers', () => {
    expect(genericRest!.configSchema.customHeaders).toBeDefined();
    expect(genericRest!.configSchema.customHeaders.type).toBe('json');
  });

  it('should have generic capabilities', () => {
    expect(genericRest!.capabilities).toContain('custom');
    expect(genericRest!.capabilities).toContain('rest');
    expect(genericRest!.capabilities).toContain('flexible');
  });
});

// ============================================================================
// Category 7: Hebrew Text Support Tests
// ============================================================================

describe('Hebrew Text Support', () => {
  it('should properly encode Hebrew characters in connector names', async () => {
    const hashavshevet = await getDefinitionBySlug('hashavshevet');
    expect(hashavshevet).not.toBeNull();
    expect(hashavshevet!.name).toContain('חשבשבת');
    // Hebrew characters should not be escaped
    expect(hashavshevet!.name).not.toContain('\\u');
  });

  it('should have Hebrew labels in Hashavshevet config schema', async () => {
    const hashavshevet = await getDefinitionBySlug('hashavshevet');
    expect(hashavshevet!.authSchema.fields[0].label).toContain('מפתח API');
    expect(hashavshevet!.authSchema.fields[1].label).toContain('מזהה חברה');
  });

  it('should have Hebrew descriptions in Hashavshevet endpoints', async () => {
    const hashavshevet = await getDefinitionBySlug('hashavshevet');
    expect(hashavshevet!.endpoints.getCustomer.description).toContain('קבלת לקוח');
    expect(hashavshevet!.endpoints.createInvoice.description).toContain('יצירת חשבונית');
  });

  it('should properly handle mixed Hebrew/English text', async () => {
    const hashavshevet = await getDefinitionBySlug('hashavshevet');
    // Name contains both Hebrew and English in parentheses
    expect(hashavshevet!.name).toMatch(/חשבשבת.*Hashavshevet/);
  });

  it('should have supportsHebrew flag set for Israeli systems', async () => {
    const priorityCloud = await getDefinitionBySlug('priority-cloud');
    const priorityOnPremise = await getDefinitionBySlug('priority-onpremise');
    const hashavshevet = await getDefinitionBySlug('hashavshevet');

    expect(priorityCloud!.supportsHebrew).toBe(true);
    expect(priorityOnPremise!.supportsHebrew).toBe(true);
    expect(hashavshevet!.supportsHebrew).toBe(true);
  });

  it('should have supportsHebrew flag false for non-Israeli systems', async () => {
    const sapB1 = await getDefinitionBySlug('sap-b1');
    const genericRest = await getDefinitionBySlug('generic-rest');

    expect(sapB1!.supportsHebrew).toBe(false);
    expect(genericRest!.supportsHebrew).toBe(false);
  });

  it('should be able to query connectors by Hebrew support', async () => {
    const hebrewConnectors = await query(
      `SELECT slug FROM connector_definitions WHERE supports_hebrew = true`
    );

    expect(hebrewConnectors.length).toBeGreaterThanOrEqual(3);
    const slugs = hebrewConnectors.map((row: any) => row.slug);
    expect(slugs).toContain('priority-cloud');
    expect(slugs).toContain('priority-onpremise');
    expect(slugs).toContain('hashavshevet');
  });
});

// ============================================================================
// Category 8: Edge Case Tests
// ============================================================================

describe('Edge Cases and Data Validation', () => {
  it('should not allow duplicate slugs', async () => {
    const duplicates = await query(
      `SELECT slug, COUNT(*) as count
       FROM connector_definitions
       GROUP BY slug
       HAVING COUNT(*) > 1`
    );

    expect(duplicates).toHaveLength(0);
  });

  it('should have valid JSONB in all auth_schema fields', async () => {
    const definitions = await getAllDefinitions();

    definitions.forEach((def) => {
      expect(def.authSchema).toBeDefined();
      expect(typeof def.authSchema).toBe('object');
      expect(def.authSchema.type).toBeDefined();
    });
  });

  it('should have valid JSONB in all endpoints fields', async () => {
    const definitions = await getAllDefinitions();

    definitions.forEach((def) => {
      expect(def.endpoints).toBeDefined();
      expect(typeof def.endpoints).toBe('object');
      expect(Object.keys(def.endpoints).length).toBeGreaterThan(0);
    });
  });

  it('should have valid JSONB in all config_schema fields', async () => {
    const definitions = await getAllDefinitions();

    definitions.forEach((def) => {
      expect(def.configSchema).toBeDefined();
      expect(typeof def.configSchema).toBe('object');
      expect(def.configSchema.baseUrl).toBeDefined();
    });
  });

  it('should have non-empty capabilities arrays', async () => {
    const definitions = await getAllDefinitions();

    definitions.forEach((def) => {
      expect(def.capabilities).toBeDefined();
      expect(Array.isArray(def.capabilities)).toBe(true);
      expect(def.capabilities.length).toBeGreaterThan(0);
    });
  });

  it('should have created_at and updated_at timestamps', async () => {
    const definitions = await getAllDefinitions();

    definitions.forEach((def) => {
      expect(def.createdAt).toBeInstanceOf(Date);
      expect(def.updatedAt).toBeInstanceOf(Date);
    });
  });
});
