/**
 * Push Service Tests - Integration Hub Phase 4
 * Test coverage for Form → ERP push operations
 *
 * Test Categories:
 * 1. Basic push orchestration (happy path)
 * 2. Connector loading and validation
 * 3. Reverse field mapping application
 * 4. Outbound Gateway integration
 * 5. Error handling (ERP errors, network, timeouts)
 * 6. Multi-tenant security
 * 7. Performance tracking
 * 8. Edge cases from Phase4-Edge-Cases.md
 */

import { pushData, PushRequest, PushResponse } from './pushService';
import * as connectorService from './connectorService';
import * as fieldMappingService from './fieldMappingService';
import * as outboundGateway from './outboundGateway';
import * as credentialService from './credentialService';

// Partial mock - keep actual error classes
jest.mock('./connectorService');
jest.mock('./fieldMappingService');
jest.mock('./credentialService');
jest.mock('./outboundGateway', () => {
  const actual = jest.requireActual('./outboundGateway');
  return {
    ...actual,
    makeRequest: jest.fn(),
  };
});

describe('Push Service', () => {
  // ============================================================================
  // Setup & Teardown
  // ============================================================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const mockConnector = {
    id: 'conn-1',
    organizationId: 'org-1',
    definitionId: 'def-1',
    name: 'Test Priority Connector',
    isEnabled: true,
    config: {
      baseUrl: 'https://priority.example.com',
      company: 'TEST_CO',
    },
    rateLimitRequests: null,
    rateLimitWindowSeconds: null,
    timeoutMs: null,
    healthStatus: 'healthy',
    lastHealthCheckAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCredentials = {
    type: 'basic' as const,
    username: 'test_user',
    password: 'test_pass',
  };

  const mockFieldMappings = [
    {
      id: 'map-1',
      organizationId: 'org-1',
      formId: 'form-1',
      connectorId: 'conn-1',
      formField: 'customer_name',
      connectorField: 'CUSTDES',
      transforms: [{ type: 'trim' as const }, { type: 'uppercase' as const }],
      isRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'map-2',
      organizationId: 'org-1',
      formId: 'form-1',
      connectorId: 'conn-1',
      formField: 'customer_email',
      connectorField: 'EMAIL',
      transforms: [{ type: 'trim' as const }],
      isRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockFormData = {
    customer_name: '  john doe  ',
    customer_email: ' john@example.com ',
    extra_field: 'not mapped',
  };

  const mockTransformedData = {
    CUSTDES: 'JOHN DOE',
    EMAIL: 'john@example.com',
  };

  const mockERPResponse = {
    status: 201,
    statusText: 'Created',
    headers: {},
    data: {
      recordId: 'CUST12345',
      status: 'created',
    },
    durationMs: 234,
  };

  // ============================================================================
  // Category 1: Basic Push Orchestration (Happy Path)
  // ============================================================================

  describe('pushData - Happy Path', () => {
    it('should successfully push data to ERP with field mapping', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/odata/Priority/TEST_CO/CUSTOMERS',
        },
      };

      // Act
      const result: PushResponse = await pushData(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.erpRecordId).toBe('CUST12345');
      expect(result.statusCode).toBe(201);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);

      // Verify connector loaded
      expect(connectorService.getById).toHaveBeenCalledWith('conn-1', 'org-1');

      // Verify field mappings loaded
      expect(fieldMappingService.list).toHaveBeenCalledWith({
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
      });

      // Verify reverse mapping applied (direction: 'push')
      expect(fieldMappingService.applyMappings).toHaveBeenCalledWith(
        mockFormData,
        mockFieldMappings,
        'push',
      );

      // Verify outbound request made
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          url: 'https://priority.example.com/odata/Priority/TEST_CO/CUSTOMERS',
          method: 'POST',
          body: mockTransformedData,
          auth: {
            type: 'basic',
            credentials: {
              username: 'test_user',
              password: 'test_pass',
            },
          },
        }),
      );
    });

    it('should handle PUT endpoint for updates', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue({
        ...mockERPResponse,
        status: 200,
        data: { recordId: 'CUST12345', status: 'updated' },
      });

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'PUT',
          path: '/odata/Priority/TEST_CO/CUSTOMERS(\'CUST12345\')',
        },
      };

      // Act
      const result = await pushData(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          method: 'PUT',
        }),
      );
    });

    it('should track performance metrics', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      const result = await pushData(request);

      // Assert
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });
  });

  // ============================================================================
  // Category 2: Connector Loading and Validation
  // ============================================================================

  describe('pushData - Connector Validation', () => {
    it('should reject request if connector not found', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(null);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'invalid-id',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Connector not found');
    });

    it('should reject request if connector belongs to different organization (security)', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue({
        ...mockConnector,
        organizationId: 'org-2', // Different org!
      });

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Unauthorized');
    });

    it('should reject request if connector is disabled', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue({
        ...mockConnector,
        isEnabled: false,
      });

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Connector is disabled');
    });

    it('should reject request if connector has no baseUrl', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue({
        ...mockConnector,
        config: {
          company: 'TEST_CO',
          // Missing baseUrl!
        },
      });

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Connector baseUrl not configured');
    });
  });

  // ============================================================================
  // Category 3: Reverse Field Mapping
  // ============================================================================

  describe('pushData - Reverse Field Mapping', () => {
    it('should apply reverse field mappings (direction: push)', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      await pushData(request);

      // Assert
      expect(fieldMappingService.applyMappings).toHaveBeenCalledWith(
        mockFormData,
        mockFieldMappings,
        'push', // CRITICAL: Reverse direction
      );
    });

    it('should handle empty field mappings (pass-through mode)', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue([]);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockFormData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      const result = await pushData(request);

      // Assert
      expect(result.success).toBe(true);
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          body: mockFormData, // No transformation applied
        }),
      );
    });

    it('should handle null values in form data (EC-MAP001)', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue({
        CUSTDES: null, // Null after transformation
        EMAIL: 'john@example.com',
      });
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: {
          customer_name: null,
          customer_email: 'john@example.com',
        },
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      const result = await pushData(request);

      // Assert
      expect(result.success).toBe(true);
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          body: expect.objectContaining({
            CUSTDES: null,
          }),
        }),
      );
    });

    it('should handle Hebrew text in form data (EC-MAP006)', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue({
        CUSTDES: 'שלום',
      });
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: {
          customer_name: 'שלום',
        },
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      const result = await pushData(request);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Category 4: Outbound Gateway Integration
  // ============================================================================

  describe('pushData - Outbound Gateway', () => {
    it('should build correct URL from baseUrl + endpoint path', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/api/v1/customers',
        },
      };

      // Act
      await pushData(request);

      // Assert
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          url: 'https://priority.example.com/api/v1/customers',
        }),
      );
    });

    it('should pass basic auth credentials to gateway', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      await pushData(request);

      // Assert
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          auth: {
            type: 'basic',
            credentials: {
              username: 'test_user',
              password: 'test_pass',
            },
          },
        }),
      );
    });

    it('should pass API key auth credentials to gateway', async () => {
      // Arrange
      const apiKeyCredentials = {
        type: 'apikey' as const,
        apiKey: 'test-api-key-123',
        headerName: 'X-API-Key',
      };

      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(apiKeyCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      await pushData(request);

      // Assert
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          auth: {
            type: 'apikey',
            credentials: {
              apiKey: 'test-api-key-123',
              headerName: 'X-API-Key',
            },
          },
        }),
      );
    });

    it('should pass custom headers to gateway', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
          headers: {
            'X-Custom-Header': 'custom-value',
            'Content-Type': 'application/json',
          },
        },
      };

      // Act
      await pushData(request);

      // Assert
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          headers: {
            'X-Custom-Header': 'custom-value',
            'Content-Type': 'application/json',
          },
        }),
      );
    });
  });

  // ============================================================================
  // Category 5: Error Handling
  // ============================================================================

  describe('pushData - Error Handling', () => {
    it('should propagate OutboundGatewayError from ERP failure', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockRejectedValue(
        new outboundGateway.OutboundGatewayError(
          'HTTP 400: Bad Request',
          400,
          'conn-1',
          123,
          { error: 'Invalid customer ID' },
        ),
      );

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('HTTP 400: Bad Request');
      await expect(pushData(request)).rejects.toMatchObject({
        name: 'OutboundGatewayError',
        statusCode: 400,
      });
    });

    it('should propagate TimeoutError from ERP timeout', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockRejectedValue(
        new outboundGateway.TimeoutError(
          'Request timeout after 10000ms',
          10000,
          'conn-1',
        ),
      );

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Request timeout');
      await expect(pushData(request)).rejects.toMatchObject({
        name: 'TimeoutError',
        statusCode: 408,
      });
    });

    it('should propagate RateLimitError from ERP rate limit', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockRejectedValue(
        new outboundGateway.RateLimitError(
          'Rate limit exceeded for connector conn-1',
          'conn-1',
          100,
        ),
      );

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Rate limit exceeded');
      await expect(pushData(request)).rejects.toMatchObject({
        name: 'RateLimitError',
        statusCode: 429,
      });
    });

    it('should propagate CircuitBreakerError when circuit open', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockRejectedValue(
        new outboundGateway.CircuitBreakerError(
          'Circuit breaker open for connector conn-1',
          'conn-1',
          { state: 'OPEN', failures: 5 },
        ),
      );

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Circuit breaker open');
      await expect(pushData(request)).rejects.toMatchObject({
        name: 'CircuitBreakerError',
        statusCode: 503,
      });
    });

    it('should handle field mapping service errors', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockImplementation(() => {
        throw new Error('Transform error: Invalid value');
      });

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Transform error');
    });
  });

  // ============================================================================
  // Category 6: Multi-Tenant Security
  // ============================================================================

  describe('pushData - Multi-Tenant Security', () => {
    it('should reject cross-tenant access (EC-SEC001)', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue({
        ...mockConnector,
        organizationId: 'org-2', // Different organization!
      });

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Unauthorized');
    });

    it('should verify field mappings belong to same organization', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue([
        {
          ...mockFieldMappings[0],
          organizationId: 'org-2', // Mismatched org!
        },
      ]);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act & Assert
      await expect(pushData(request)).rejects.toThrow('Unauthorized');
    });
  });

  // ============================================================================
  // Category 7: Edge Cases from Phase4-Edge-Cases.md
  // ============================================================================

  describe('pushData - Edge Cases', () => {
    it('should handle empty form data', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue({});
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: {},
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      const result = await pushData(request);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle very large form data payload', async () => {
      // Arrange
      const largeData = {
        field1: 'x'.repeat(10000),
        field2: 'y'.repeat(10000),
      };

      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(largeData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: largeData,
        endpoint: {
          method: 'POST',
          path: '/customers',
        },
      };

      // Act
      const result = await pushData(request);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle special characters in endpoint path', async () => {
      // Arrange
      (connectorService.getById as jest.Mock).mockResolvedValue(mockConnector);
      (credentialService.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      (fieldMappingService.list as jest.Mock).mockResolvedValue(mockFieldMappings);
      (fieldMappingService.applyMappings as jest.Mock).mockReturnValue(mockTransformedData);
      (outboundGateway.makeRequest as jest.Mock).mockResolvedValue(mockERPResponse);

      const request: PushRequest = {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        formId: 'form-1',
        submissionId: 'sub-1',
        data: mockFormData,
        endpoint: {
          method: 'POST',
          path: '/customers?filter=name eq \'John Doe\'',
        },
      };

      // Act
      const result = await pushData(request);

      // Assert
      expect(result.success).toBe(true);
      expect(outboundGateway.makeRequest).toHaveBeenCalledWith(
        'conn-1',
        'org-1',
        expect.objectContaining({
          url: expect.stringContaining('filter=name'),
        }),
      );
    });
  });
});
