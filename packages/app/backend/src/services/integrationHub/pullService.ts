/**
 * Pull Service - Integration Hub Phase 3
 * Orchestrates connector + cache + transforms for ERP data pulling
 *
 * Flow:
 * 1. Receive pull request
 * 2. Load connector config
 * 3. Check cache (unless forceRefresh)
 * 4. On cache miss: fetch from ERP via Outbound Gateway
 * 5. Apply field mappings (transforms)
 * 6. Store in cache
 * 7. Return data
 */

import * as connectorService from './connectorService';
import * as pullCache from './pullCache';
import * as outboundGateway from './outboundGateway';
import * as fieldMappingService from './fieldMappingService';
import logger from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface PullRequest {
  organizationId: string;
  connectorId: string;
  resourceType: string;  // customer, order, product, etc.
  resourceId: string;
  forceRefresh?: boolean;  // Skip cache
}

export interface PullResponse {
  data: any;
  fromCache: boolean;
  durationMs: number;
  metadata: {
    connectorId: string;
    resourceType: string;
    resourceId: string;
    fetchedAt?: number;
    cachedAt?: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build URL from connector config and resource info
 * Supports template substitution: {customerId}, {orderId}, {company}, etc.
 */
function buildUrl(
  connector: any,
  resourceType: string,
  resourceId: string,
): string {
  const { config } = connector;
  const { baseUrl, endpoints, company } = config;

  // Get endpoint template for this resource type
  const endpointKey = `get${resourceType.charAt(0).toUpperCase()}${resourceType.slice(1)}`;
  let endpoint = endpoints[endpointKey] || endpoints.getResource || `/${resourceType}/{id}`;

  // Substitute placeholders
  endpoint = endpoint
    .replace('{customerId}', resourceId)
    .replace('{orderId}', resourceId)
    .replace('{productId}', resourceId)
    .replace('{id}', resourceId)
    .replace('{resourceId}', resourceId)
    .replace('{company}', company || '');

  return `${baseUrl}${endpoint}`;
}

/**
 * Build authentication config from connector credentials
 */
function buildAuthConfig(connector: any): any {
  const { credentials } = connector;

  if (!credentials) {
    return undefined;
  }

  if (credentials.type === 'basic') {
    return {
      type: 'basic',
      credentials: {
        username: credentials.username,
        password: credentials.password,
      },
    };
  }

  if (credentials.type === 'apikey') {
    return {
      type: 'apikey',
      credentials: {
        apiKey: credentials.apiKey,
        headerName: credentials.headerName || 'X-API-Key',
      },
    };
  }

  return undefined;
}

// ============================================================================
// Main Pull Function
// ============================================================================

/**
 * Pull data from ERP system
 * Uses cache if available, otherwise fetches from ERP
 */
export async function pullData(request: PullRequest): Promise<PullResponse> {
  const { organizationId, connectorId, resourceType, resourceId, forceRefresh } = request;
  const startTime = Date.now();

  try {
    // 1. Check cache (unless forceRefresh)
    if (!forceRefresh) {
      const cachedData = await pullCache.getCachedData({
        organizationId,
        connectorId,
        resourceType,
        resourceId,
      });

      if (cachedData) {
        logger.info('Pull request - cache hit', {
          organizationId,
          connectorId,
          resourceType,
          resourceId,
        });

        return {
          data: cachedData,
          fromCache: true,
          durationMs: Date.now() - startTime,
          metadata: {
            connectorId,
            resourceType,
            resourceId,
            cachedAt: Date.now(),
          },
        };
      }
    }

    // 2. Load connector config
    const connector = await connectorService.getById(connectorId, organizationId);

    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    // 3. Verify organization match (security)
    if (connector.organizationId !== organizationId) {
      throw new Error(
        `Organization mismatch: connector belongs to ${connector.organizationId}, ` +
        `requested by ${organizationId}`,
      );
    }

    // 4. Build URL and auth config
    const url = buildUrl(connector, resourceType, resourceId);
    const auth = buildAuthConfig(connector);

    logger.info('Pull request - fetching from ERP', {
      organizationId,
      connectorId,
      resourceType,
      resourceId,
      url: url.replace(/apikey=[^&]+/gi, 'apikey=***'), // Sanitize logs
    });

    // 5. Fetch from ERP via Outbound Gateway
    const erpResponse = await outboundGateway.makeRequest(
      connectorId,
      organizationId,
      {
        url,
        method: 'GET',
        auth,
      },
    );

    let data = erpResponse.data;

    // 6. Apply field mappings (if any)
    const mappings = await fieldMappingService.getByConnector(connectorId);

    if (mappings && mappings.length > 0) {
      logger.debug('Applying field mappings', {
        connectorId,
        mappingCount: mappings.length,
      });

      data = await fieldMappingService.applyMappings(data, mappings);
    }

    // 7. Store in cache (24 hours)
    await pullCache.setCachedData(
      {
        organizationId,
        connectorId,
        resourceType,
        resourceId,
      },
      data,
      86400,  // 24 hours
    );

    logger.info('Pull request - completed', {
      organizationId,
      connectorId,
      resourceType,
      resourceId,
      fromCache: false,
      durationMs: Date.now() - startTime,
    });

    return {
      data,
      fromCache: false,
      durationMs: Date.now() - startTime,
      metadata: {
        connectorId,
        resourceType,
        resourceId,
        fetchedAt: Date.now(),
      },
    };
  } catch (error: any) {
    logger.error('Pull request failed', {
      organizationId,
      connectorId,
      resourceType,
      resourceId,
      error: error.message,
      durationMs: Date.now() - startTime,
    });

    throw error;
  }
}
