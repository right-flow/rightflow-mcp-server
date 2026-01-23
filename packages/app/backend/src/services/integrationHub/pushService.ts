/**
 * Push Service - Integration Hub Phase 4
 * Orchestrates Form → ERP push operations
 *
 * Flow:
 * 1. Load connector configuration (Phase 1)
 * 2. Load field mappings (Phase 2)
 * 3. Apply reverse field mappings (Form → ERP format)
 * 4. Call Outbound Gateway (Phase 3)
 * 5. Return result with ERP record ID
 *
 * Features:
 * - Reverse field mapping (direction: 'push')
 * - Multi-tenant security
 * - Performance tracking
 * - Error propagation (OutboundGatewayError, TimeoutError, RateLimitError, CircuitBreakerError)
 */

import * as connectorService from './connectorService';
import * as fieldMappingService from './fieldMappingService';
import * as outboundGateway from './outboundGateway';
import * as credentialService from './credentialService';
import logger from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface PushRequest {
  organizationId: string;
  connectorId: string;
  formId: string;
  submissionId: string;
  data: Record<string, any>;
  endpoint: {
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    headers?: Record<string, string>;
  };
}

export interface PushResponse {
  success: boolean;
  erpRecordId?: string;
  statusCode: number;
  durationMs: number;
  result?: any;
}

// ============================================================================
// Main Push Function
// ============================================================================

/**
 * Push form data to ERP system
 *
 * @param request - Push request with form data and endpoint
 * @returns Push response with ERP record ID
 * @throws OutboundGatewayError - ERP API errors
 * @throws TimeoutError - Request timeout
 * @throws RateLimitError - Rate limit exceeded
 * @throws CircuitBreakerError - Circuit breaker open
 */
export async function pushData(request: PushRequest): Promise<PushResponse> {
  const startTime = Date.now();

  try {
    logger.info('Push request started', {
      organizationId: request.organizationId,
      connectorId: request.connectorId,
      formId: request.formId,
      submissionId: request.submissionId,
      endpoint: request.endpoint,
    });

    // 1. Load connector configuration
    const connector = await connectorService.getById(
      request.connectorId,
      request.organizationId,
    );

    if (!connector) {
      throw new Error('Connector not found');
    }

    // 2. Verify connector belongs to organization (security)
    if (connector.organizationId !== request.organizationId) {
      throw new Error('Unauthorized: Connector does not belong to organization');
    }

    // 3. Check if connector is enabled
    if (!connector.isEnabled) {
      throw new Error('Connector is disabled');
    }

    // 4. Verify connector has baseUrl
    if (!connector.config.baseUrl) {
      throw new Error('Connector baseUrl not configured');
    }

    // 4a. Load credentials
    const credentials = await credentialService.getCredentials(request.connectorId);

    // 5. Load field mappings
    const fieldMappings = await fieldMappingService.list({
      organizationId: request.organizationId,
      connectorId: request.connectorId,
      formId: request.formId,
    });

    // 6. Verify field mappings belong to organization (security)
    const invalidMapping = fieldMappings.find(
      (mapping) => mapping.organizationId !== request.organizationId,
    );
    if (invalidMapping) {
      throw new Error('Unauthorized: Field mapping does not belong to organization');
    }

    // 7. Apply reverse field mappings (Form → ERP format)
    const transformedData = await fieldMappingService.applyMappings(
      request.data,
      fieldMappings,
      'push', // CRITICAL: Reverse direction
    );

    // 8. Build full URL
    const baseUrl = connector.config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    const path = request.endpoint.path.startsWith('/')
      ? request.endpoint.path
      : `/${request.endpoint.path}`;
    const fullUrl = `${baseUrl}${path}`;

    // 9. Build auth config from credentials
    let auth: any = undefined;
    if (credentials) {
      if (credentials.type === 'basic') {
        auth = {
          type: 'basic',
          credentials: {
            username: (credentials as any).username,
            password: (credentials as any).password,
          },
        };
      } else if (credentials.type === 'apikey') {
        auth = {
          type: 'apikey',
          credentials: {
            apiKey: (credentials as any).apiKey,
            headerName: (credentials as any).headerName || 'X-API-Key',
          },
        };
      }
    }

    // 10. Build outbound request
    const outboundRequest: outboundGateway.OutboundRequest = {
      url: fullUrl,
      method: request.endpoint.method,
      headers: request.endpoint.headers || {},
      body: transformedData,
      auth,
    };

    // 10. Call Outbound Gateway (Phase 3)
    const erpResponse = await outboundGateway.makeRequest(
      request.connectorId,
      request.organizationId,
      outboundRequest,
    );

    const durationMs = Date.now() - startTime;

    logger.info('Push request completed', {
      organizationId: request.organizationId,
      connectorId: request.connectorId,
      submissionId: request.submissionId,
      statusCode: erpResponse.status,
      durationMs,
    });

    // 11. Extract ERP record ID from response (if available)
    const erpRecordId = extractRecordId(erpResponse.data);

    return {
      success: true,
      erpRecordId,
      statusCode: erpResponse.status,
      durationMs,
      result: erpResponse.data,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error('Push request failed', {
      organizationId: request.organizationId,
      connectorId: request.connectorId,
      submissionId: request.submissionId,
      error: error.message,
      durationMs,
    });

    // Propagate specific error types from Outbound Gateway
    if (
      error instanceof outboundGateway.OutboundGatewayError ||
      error instanceof outboundGateway.TimeoutError ||
      error instanceof outboundGateway.RateLimitError ||
      error instanceof outboundGateway.CircuitBreakerError
    ) {
      throw error;
    }

    // Re-throw other errors
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract record ID from ERP response data
 * Tries common field names: recordId, id, orderId, customerId, etc.
 */
function extractRecordId(data: any): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  // Try common field names
  const idFields = ['recordId', 'id', 'orderId', 'customerId', 'ORDNAME', 'CUSTNAME'];

  for (const field of idFields) {
    if (data[field]) {
      return String(data[field]);
    }
  }

  return undefined;
}
