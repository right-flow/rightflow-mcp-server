/**
 * Pull Cache Service - Integration Hub Phase 3
 * Redis-based ephemeral storage for ERP pull data
 *
 * Features:
 * - 24-hour TTL for all cached data
 * - Key structure: pull:{orgId}:{connectorId}:{resourceType}:{resourceId}
 * - Multi-tenant isolation
 * - Cache statistics and monitoring
 */

import { redisConnection } from '../../config/redis';
import logger from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface CacheKey {
  organizationId: string;
  connectorId: string;
  resourceType: string;  // customer, order, product, etc.
  resourceId: string;
}

export interface CacheStats {
  totalKeys: number;
  keysByConnector: Record<string, number>;
  keysByResourceType: Record<string, number>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TTL = 86400; // 24 hours in seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate cache key from components
 */
function generateCacheKey(key: CacheKey): string {
  const { organizationId, connectorId, resourceType, resourceId } = key;
  return `pull:${organizationId}:${connectorId}:${resourceType}:${resourceId}`;
}

/**
 * Scan Redis keys matching pattern (non-blocking alternative to KEYS)
 * Uses SCAN command to iterate through keys without blocking Redis
 */
async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  try {
    do {
      // SCAN cursor MATCH pattern COUNT 100
      const result = await redisConnection.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0]; // New cursor position
      const batch = result[1]; // Array of keys

      keys.push(...batch);
    } while (cursor !== '0'); // cursor = '0' means iteration complete

    return keys;
  } catch (error: any) {
    logger.error('Failed to scan Redis keys', {
      pattern,
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get cached data
 * Returns null on cache miss
 */
export async function getCachedData(key: CacheKey): Promise<any | null> {
  try {
    const cacheKey = generateCacheKey(key);
    const data = await redisConnection.get(cacheKey);

    if (!data) {
      logger.debug('Cache miss', {
        cacheKey,
        organizationId: key.organizationId,
        connectorId: key.connectorId,
      });
      return null;
    }

    logger.debug('Cache hit', {
      cacheKey,
      organizationId: key.organizationId,
      connectorId: key.connectorId,
    });

    return JSON.parse(data);
  } catch (error: any) {
    logger.error('Failed to get cached data', {
      key,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Set cached data with TTL
 * Default TTL: 24 hours (86400 seconds)
 */
export async function setCachedData(
  key: CacheKey,
  data: any,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(key);
    const serialized = JSON.stringify(data);

    await redisConnection.setex(cacheKey, ttlSeconds, serialized);

    logger.debug('Data cached', {
      cacheKey,
      organizationId: key.organizationId,
      connectorId: key.connectorId,
      ttlSeconds,
      dataSize: serialized.length,
    });
  } catch (error: any) {
    logger.error('Failed to cache data', {
      key,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Delete cached data
 */
export async function deleteCachedData(key: CacheKey): Promise<void> {
  try {
    const cacheKey = generateCacheKey(key);
    await redisConnection.del(cacheKey);

    logger.debug('Cache entry deleted', {
      cacheKey,
      organizationId: key.organizationId,
    });
  } catch (error: any) {
    logger.error('Failed to delete cached data', {
      key,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Check if data exists in cache
 */
export async function existsCachedData(key: CacheKey): Promise<boolean> {
  try {
    const cacheKey = generateCacheKey(key);
    const exists = await redisConnection.exists(cacheKey);
    return exists === 1;
  } catch (error: any) {
    logger.error('Failed to check cache existence', {
      key,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Refresh cached data TTL (reset to 24 hours)
 * Returns the data if it exists, null otherwise
 */
export async function refreshCachedData(
  key: CacheKey,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<any | null> {
  try {
    const cacheKey = generateCacheKey(key);

    // Get current data
    const data = await redisConnection.get(cacheKey);

    if (!data) {
      logger.debug('Cannot refresh - cache entry expired', { cacheKey });
      return null;
    }

    // Reset TTL
    await redisConnection.setex(cacheKey, ttlSeconds, data);

    logger.debug('Cache TTL refreshed', {
      cacheKey,
      organizationId: key.organizationId,
      newTTL: ttlSeconds,
    });

    return JSON.parse(data);
  } catch (error: any) {
    logger.error('Failed to refresh cache', {
      key,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Clear all cached data for an organization
 * Uses SCAN instead of KEYS to avoid blocking Redis
 */
export async function clearOrgCache(organizationId: string): Promise<void> {
  try {
    const pattern = `pull:${organizationId}:*`;
    const keys = await scanKeys(pattern); // Non-blocking SCAN

    if (keys.length === 0) {
      logger.debug('No cache entries to clear', { organizationId });
      return;
    }

    // Delete in batches to avoid blocking with large arrays
    const batchSize = 1000;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await redisConnection.del(...batch);
    }

    logger.info('Organization cache cleared', {
      organizationId,
      keysDeleted: keys.length,
    });
  } catch (error: any) {
    logger.error('Failed to clear organization cache', {
      organizationId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get cache statistics for an organization
 * Uses SCAN instead of KEYS to avoid blocking Redis
 */
export async function getCacheStats(organizationId: string): Promise<CacheStats> {
  try {
    const pattern = `pull:${organizationId}:*`;
    const keys = await scanKeys(pattern); // Non-blocking SCAN

    const keysByConnector: Record<string, number> = {};
    const keysByResourceType: Record<string, number> = {};

    for (const key of keys) {
      // Parse key: pull:{orgId}:{connectorId}:{resourceType}:{resourceId}
      const parts = key.split(':');
      if (parts.length >= 5) {
        const connectorId = parts[2];
        const resourceType = parts[3];

        keysByConnector[connectorId] = (keysByConnector[connectorId] || 0) + 1;
        keysByResourceType[resourceType] = (keysByResourceType[resourceType] || 0) + 1;
      }
    }

    return {
      totalKeys: keys.length,
      keysByConnector,
      keysByResourceType,
    };
  } catch (error: any) {
    logger.error('Failed to get cache stats', {
      organizationId,
      error: error.message,
    });
    throw error;
  }
}
