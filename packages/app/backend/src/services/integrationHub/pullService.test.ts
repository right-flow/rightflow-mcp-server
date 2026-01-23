/**
 * Pull Service Tests - Integration Hub Phase 3
 * Orchestrates connector + cache + transforms for ERP data pulling
 *
 * Flow:
 * 1. Receive pull request
 * 2. Load connector config (Phase 1)
 * 3. Check cache (unless forceRefresh)
 * 4. On cache miss: fetch from ERP via Outbound Gateway
 * 5. Apply field mappings (Phase 2 transforms)
 * 6. Store in cache
 * 7. Return data
 */

import { pullData, PullRequest } from './pullService';
import * as connectorService from './connectorService';
import * as pullCache from './pullCache';
import * as outboundGateway from './outboundGateway';
import * as fieldMappingService from './fieldMappingService';

// Mock dependencies
jest.mock('./connectorService');
jest.mock('./pullCache');
jest.mock('./fieldMappingService');

// Partial mock for outboundGateway - keep actual error classes, mock makeRequest
jest.mock('./outboundGateway', () => {
  const actual = jest.requireActual('./outboundGateway');
  return {
    ...actual,
    makeRequest: jest.fn(),
  };
});

describe('Pull Service - Basic Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached data (cache hit)', async () => {
    const cachedData = {
      id: 'CID123',
      name: 'Cached Customer',
      email: 'cached@example.com',
    };

    // Mock cache hit
    (pullCache.getCachedData as jest.Mock).mockResolvedValue(cachedData);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    const response = await pullData(request);

    expect(response.data).toEqual(cachedData);
    expect(response.fromCache).toBe(true);
    expect(response.metadata.connectorId).toBe('conn-1');

    // Should not call ERP
    expect(outboundGateway.makeRequest).not.toHaveBeenCalled();
  });

  it('should fetch from ERP on cache miss', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: {
        type: 'apikey',
        apiKey: 'secret-key-123',
      },
    };

    const erpData = {
      CUSTDES: 'ERP Customer',
      EMAIL: 'erp@example.com',
      PHONE: '+972-3-1234567',
    };

    // Mock cache miss
    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);

    // Mock connector loading
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);

    // Mock ERP fetch
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: erpData,
      durationMs: 150,
    });

    // Mock no field mappings
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);

    // Mock cache SET
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    const response = await pullData(request);

    expect(response.data).toEqual(erpData);
    expect(response.fromCache).toBe(false);
    expect(response.metadata.fetchedAt).toBeGreaterThan(0);

    // Verify outbound gateway was called
    expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
      'conn-1',
      'org-1',
      expect.objectContaining({
        url: 'https://erp.example.com/api/customers/CID123',
        method: 'GET',
      }),
    );

    // Verify data was cached
    expect(pullCache.setCachedData).toHaveBeenCalledWith(
      {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      },
      erpData,
      86400, // 24 hours
    );
  });

  it('should skip cache with forceRefresh=true', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: {
        type: 'apikey',
        apiKey: 'secret-key-123',
      },
    };

    const erpData = { id: 'CID123', name: 'Fresh Data' };

    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: erpData,
      durationMs: 200,
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
      forceRefresh: true,
    };

    await pullData(request);

    // Should NOT check cache
    expect(pullCache.getCachedData).not.toHaveBeenCalled();

    // Should call ERP directly
    expect(outboundGateway.makeRequest).toHaveBeenCalled();
  });
});

describe('Pull Service - Field Mappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply field mappings to ERP data', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: {
        type: 'apikey',
        apiKey: 'secret-key-123',
      },
    };

    const erpData = {
      CUSTDES: 'לקוח ישראלי',  // Hebrew customer name
      EMAIL: 'test@example.co.il',
      PHONE: '+972-3-1234567',
    };

    const mappings = [
      {
        id: 'map-1',
        connectorId: 'conn-1',
        formField: 'customerName',
        connectorField: 'CUSTDES',
        transforms: [{ type: 'trim' }],
      },
      {
        id: 'map-2',
        connectorId: 'conn-1',
        formField: 'email',
        connectorField: 'EMAIL',
        transforms: [{ type: 'lowercase' }],
      },
    ];

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: erpData,
      durationMs: 100,
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue(mappings);

    // Mock applyMappings to transform data
    (fieldMappingService.applyMappings as jest.Mock).mockImplementation(
      () => ({
        customerName: 'לקוח ישראלי',
        email: 'test@example.co.il',
      }),
    );

    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    const response = await pullData(request);

    expect(response.data).toEqual({
      customerName: 'לקוח ישראלי',
      email: 'test@example.co.il',
    });

    // Verify mappings were applied
    expect(fieldMappingService.applyMappings).toHaveBeenCalledWith(
      erpData,
      mappings,
    );

    // Verify transformed data was cached (not raw ERP data)
    expect(pullCache.setCachedData).toHaveBeenCalledWith(
      expect.anything(),
      {
        customerName: 'לקוח ישראלי',
        email: 'test@example.co.il',
      },
      expect.any(Number),
    );
  });

  it('should handle no field mappings (passthrough)', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'generic-rest',
      name: 'Generic API',
      config: {
        baseUrl: 'https://api.example.com',
        endpoints: {
          getResource: '/resource/{id}',
        },
      },
      credentials: null,
    };

    const rawData = { id: '123', rawField: 'value' };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: rawData,
      durationMs: 80,
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'resource',
      resourceId: '123',
    };

    const response = await pullData(request);

    // Should return raw ERP data unchanged
    expect(response.data).toEqual(rawData);
    expect(fieldMappingService.applyMappings).not.toHaveBeenCalled();
  });
});

describe('Pull Service - URL Template Substitution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should substitute {resourceId} in URL template', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
          getOrder: '/api/orders/{orderId}',
        },
      },
      credentials: null,
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: {},
      durationMs: 100,
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID456',
    };

    await pullData(request);

    expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
      'conn-1',
      'org-1',
      expect.objectContaining({
        url: 'https://erp.example.com/api/customers/CID456',
      }),
    );
  });

  it('should handle complex URL templates', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'sap-b1',
      name: 'SAP Business One',
      config: {
        baseUrl: 'https://sap.example.com',
        company: 'ACME',
        endpoints: {
          getCustomer: "/api/{company}/Customers('{customerId}')",
        },
      },
      credentials: null,
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: {},
      durationMs: 120,
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'C001',
    };

    await pullData(request);

    expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
      'conn-1',
      'org-1',
      expect.objectContaining({
        url: "https://sap.example.com/api/ACME/Customers('C001')",
      }),
    );
  });
});

describe('Pull Service - Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include Basic Auth credentials', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-onprem',
      name: 'Priority On-Premise',
      config: {
        baseUrl: 'https://erp.local',
        endpoints: {
          getCustomer: "/odata/CUSTOMERS('{customerId}')",
        },
      },
      credentials: {
        type: 'basic',
        username: 'apiuser',
        password: 'encrypted-password-123',
      },
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: {},
      durationMs: 90,
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    await pullData(request);

    expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
      'conn-1',
      'org-1',
      expect.objectContaining({
        auth: {
          type: 'basic',
          credentials: {
            username: 'apiuser',
            password: 'encrypted-password-123',
          },
        },
      }),
    );
  });

  it('should include API Key credentials', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority Cloud',
      config: {
        baseUrl: 'https://cloud.priority-software.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: {
        type: 'apikey',
        apiKey: 'sk-live-abc123',
        headerName: 'X-Priority-Key',
      },
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: {},
      durationMs: 110,
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    await pullData(request);

    expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
      'conn-1',
      'org-1',
      expect.objectContaining({
        auth: {
          type: 'apikey',
          credentials: {
            apiKey: 'sk-live-abc123',
            headerName: 'X-Priority-Key',
          },
        },
      }),
    );
  });
});

describe('Pull Service - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if connector not found', async () => {
    (connectorService.getById as jest.Mock).mockResolvedValue(null);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'non-existent',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    await expect(pullData(request)).rejects.toThrow(/connector.*not found/i);
  });

  it('should throw error on organization mismatch', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-B',  // Different org!
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {},
    };

    (connectorService.getById as jest.Mock).mockResolvedValue(connector);

    const request: PullRequest = {
      organizationId: 'org-A',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    await expect(pullData(request)).rejects.toThrow(/organization mismatch/i);
  });

  it('should propagate Outbound Gateway errors', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: null,
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockRejectedValue(
      new outboundGateway.TimeoutError('Request timeout after 10000ms', 10000, 'conn-1'),
    );
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    await expect(pullData(request)).rejects.toThrow(outboundGateway.TimeoutError);
  });

  it('should handle circuit breaker open', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: null,
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockRejectedValue(
      new outboundGateway.CircuitBreakerError('Circuit breaker open for connector conn-1', 'conn-1'),
    );
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    await expect(pullData(request)).rejects.toThrow(outboundGateway.CircuitBreakerError);
  });

  it('should handle rate limit exceeded', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: null,
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockRejectedValue(
      new outboundGateway.RateLimitError('Rate limit exceeded for connector conn-1', 'conn-1', 100),
    );
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    await expect(pullData(request)).rejects.toThrow(outboundGateway.RateLimitError);
  });
});

describe('Pull Service - Performance Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track duration for cache hit', async () => {
    (pullCache.getCachedData as jest.Mock).mockResolvedValue({ id: '123' });

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    const startTime = Date.now();
    const response = await pullData(request);
    const duration = Date.now() - startTime;

    // Duration should be >= 0 (mocks can complete in < 1ms, resulting in 0)
    expect(response.durationMs).toBeGreaterThanOrEqual(0);
    expect(response.durationMs).toBeLessThanOrEqual(duration + 10); // Small tolerance
    expect(response.metadata.cachedAt).toBeGreaterThan(0);
  });

  it('should track duration for ERP fetch', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: null,
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: {},
      durationMs: 350,  // Simulate 350ms ERP request
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    const response = await pullData(request);

    // Duration tracks total pull operation time (not just ERP request)
    // Mocks complete instantly, so duration will be close to 0
    expect(response.durationMs).toBeGreaterThanOrEqual(0);
    expect(response.fromCache).toBe(false);
    expect(response.metadata.fetchedAt).toBeGreaterThan(0);
  });
});

describe('Pull Service - Hebrew/RTL Data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle Hebrew text from ERP', async () => {
    const connector = {
      id: 'conn-1',
      organizationId: 'org-1',
      definitionSlug: 'priority-cloud',
      name: 'Priority ERP',
      config: {
        baseUrl: 'https://erp.example.com',
        endpoints: {
          getCustomer: '/api/customers/{customerId}',
        },
      },
      credentials: null,
    };

    const hebrewData = {
      CUSTDES: 'חברת הייטק בע"מ',
      ADDRESS: 'רחוב הרצל 15, תל אביב',
      PHONE: '03-1234567',
      EMAIL: 'info@example.co.il',
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(null);
    (connectorService.getById as jest.Mock).mockResolvedValue(connector);
    (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      data: hebrewData,
      durationMs: 120,
    });
    (fieldMappingService.getByConnector as jest.Mock).mockResolvedValue([]);
    (pullCache.setCachedData as jest.Mock).mockResolvedValue(undefined);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    const response = await pullData(request);

    expect(response.data.CUSTDES).toBe('חברת הייטק בע"מ');
    expect(response.data.ADDRESS).toBe('רחוב הרצל 15, תל אביב');

    // Verify Hebrew text was cached correctly
    expect(pullCache.setCachedData).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        CUSTDES: 'חברת הייטק בע"מ',
        ADDRESS: 'רחוב הרצל 15, תל אביב',
      }),
      expect.any(Number),
    );
  });

  it('should handle RTL marks in cached data', async () => {
    const cachedDataWithRTL = {
      name: '\u202Bלקוח ישראלי\u202C',  // With RTL marks
      address: '\u202Bרחוב הרצל 1\u202C',
    };

    (pullCache.getCachedData as jest.Mock).mockResolvedValue(cachedDataWithRTL);

    const request: PullRequest = {
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    };

    const response = await pullData(request);

    expect(response.data.name).toContain('לקוח ישראלי');
    expect(response.data.address).toContain('רחוב הרצל 1');
  });
});
