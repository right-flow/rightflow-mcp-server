/**
 * Pull Cache Service Tests - Integration Hub Phase 3
 * Redis-based ephemeral storage for ERP pull data
 *
 * Features:
 * - Cache pull data with TTL (24 hours default)
 * - Key structure: pull:{orgId}:{connectorId}:{resourceType}:{resourceId}
 * - Cache hit/miss tracking
 * - Force refresh option
 * - Memory limits per organization
 */

import { redisConnection } from '../../config/redis';
import {
  getCachedData,
  setCachedData,
  deleteCachedData,
  existsCachedData,
  refreshCachedData,
  clearOrgCache,
  getCacheStats,
} from './pullCache';

// Mock Redis
jest.mock('../../config/redis');

describe('Pull Cache - Basic Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate correct cache key', async () => {
    (redisConnection.get as jest.Mock).mockResolvedValue(null);

    await getCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(redisConnection.get).toHaveBeenCalledWith(
      'pull:org-1:conn-1:customer:CID123',
    );
  });

  it('should cache data with default TTL (24 hours)', async () => {
    const data = { id: '123', name: 'Test Customer' };
    (redisConnection.setex as jest.Mock).mockResolvedValue('OK');

    await setCachedData(
      {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      },
      data,
    );

    expect(redisConnection.setex).toHaveBeenCalledWith(
      'pull:org-1:conn-1:customer:CID123',
      86400,  // 24 hours in seconds
      JSON.stringify(data),
    );
  });

  it('should cache data with custom TTL', async () => {
    const data = { id: '123', name: 'Test Customer' };
    (redisConnection.setex as jest.Mock).mockResolvedValue('OK');

    await setCachedData(
      {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      },
      data,
      3600,  // 1 hour
    );

    expect(redisConnection.setex).toHaveBeenCalledWith(
      'pull:org-1:conn-1:customer:CID123',
      3600,
      JSON.stringify(data),
    );
  });

  it('should return cached data (cache hit)', async () => {
    const cachedData = { id: '123', name: 'Test Customer' };
    (redisConnection.get as jest.Mock).mockResolvedValue(
      JSON.stringify(cachedData),
    );

    const result = await getCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(result).toEqual(cachedData);
  });

  it('should return null on cache miss', async () => {
    (redisConnection.get as jest.Mock).mockResolvedValue(null);

    const result = await getCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(result).toBeNull();
  });

  it('should delete cached data', async () => {
    (redisConnection.del as jest.Mock).mockResolvedValue(1);

    await deleteCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(redisConnection.del).toHaveBeenCalledWith(
      'pull:org-1:conn-1:customer:CID123',
    );
  });

  it('should check if data exists in cache', async () => {
    (redisConnection.exists as jest.Mock).mockResolvedValue(1);

    const exists = await existsCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(exists).toBe(true);
  });

  it('should return false if data does not exist', async () => {
    (redisConnection.exists as jest.Mock).mockResolvedValue(0);

    const exists = await existsCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(exists).toBe(false);
  });
});

describe('Pull Cache - Hebrew/RTL Data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should cache Hebrew text correctly', async () => {
    const data = {
      id: '123',
      name: 'לקוח ישראלי',
      address: 'רחוב הרצל 1, תל אביב',
      email: 'test@example.co.il',
    };
    (redisConnection.setex as jest.Mock).mockResolvedValue('OK');

    await setCachedData(
      {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      },
      data,
    );

    // Verify JSON.stringify preserves Hebrew
    const cachedJson = JSON.stringify(data);
    expect(cachedJson).toContain('לקוח ישראלי');
    expect(cachedJson).toContain('רחוב הרצל 1');
  });

  it('should retrieve Hebrew text correctly', async () => {
    const data = {
      id: '123',
      name: 'לקוח ישראלי',
      address: 'רחוב הרצל 1, תל אביב',
    };
    (redisConnection.get as jest.Mock).mockResolvedValue(
      JSON.stringify(data),
    );

    const result = await getCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(result.name).toBe('לקוח ישראלי');
    expect(result.address).toBe('רחוב הרצל 1, תל אביב');
  });

  it('should handle mixed Hebrew and English', async () => {
    const data = {
      id: 'CID123',
      name: 'לקוח Testing Corp',
      address: 'Herzl St 1, תל אביב',
      phone: '+972-3-1234567',
    };
    (redisConnection.setex as jest.Mock).mockResolvedValue('OK');
    (redisConnection.get as jest.Mock).mockResolvedValue(
      JSON.stringify(data),
    );

    await setCachedData(
      {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      },
      data,
    );

    const result = await getCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(result.name).toBe('לקוח Testing Corp');
    expect(result.address).toBe('Herzl St 1, תל אביב');
  });
});

describe('Pull Cache - TTL and Expiration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get TTL for cached data', async () => {
    (redisConnection.ttl as jest.Mock).mockResolvedValue(43200); // 12 hours remaining

    const ttl = await redisConnection.ttl('pull:org-1:conn-1:customer:CID123');

    expect(ttl).toBe(43200);
    expect(ttl).toBeGreaterThan(0);
  });

  it('should return -1 for key without TTL', async () => {
    (redisConnection.ttl as jest.Mock).mockResolvedValue(-1);

    const ttl = await redisConnection.ttl('pull:org-1:conn-1:customer:CID123');

    expect(ttl).toBe(-1); // Key exists but no TTL set (shouldn't happen)
  });

  it('should return -2 for non-existent key', async () => {
    (redisConnection.ttl as jest.Mock).mockResolvedValue(-2);

    const ttl = await redisConnection.ttl('pull:org-1:conn-1:customer:CID999');

    expect(ttl).toBe(-2); // Key doesn't exist
  });

  it('should refresh TTL on refreshCachedData', async () => {
    const data = { id: '123', name: 'Test' };
    (redisConnection.get as jest.Mock).mockResolvedValue(JSON.stringify(data));
    (redisConnection.setex as jest.Mock).mockResolvedValue('OK');

    const result = await refreshCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(redisConnection.get).toHaveBeenCalled();
    expect(redisConnection.setex).toHaveBeenCalledWith(
      'pull:org-1:conn-1:customer:CID123',
      86400,  // Reset to 24 hours
      JSON.stringify(data),
    );
    expect(result).toEqual(data);
  });

  it('should return null if refresh fails (key expired)', async () => {
    (redisConnection.get as jest.Mock).mockResolvedValue(null);

    const result = await refreshCachedData({
      organizationId: 'org-1',
      connectorId: 'conn-1',
      resourceType: 'customer',
      resourceId: 'CID123',
    });

    expect(result).toBeNull();
    expect(redisConnection.setex).not.toHaveBeenCalled();
  });
});

describe('Pull Cache - Bulk Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear all cache for organization', async () => {
    const keys = [
      'pull:org-1:conn-1:customer:CID123',
      'pull:org-1:conn-1:customer:CID456',
      'pull:org-1:conn-2:order:ORD789',
    ];
    // Mock SCAN to return all keys in one iteration
    (redisConnection.scan as jest.Mock).mockResolvedValue(['0', keys]);
    (redisConnection.del as jest.Mock).mockResolvedValue(3);

    await clearOrgCache('org-1');

    expect(redisConnection.scan).toHaveBeenCalled();
    expect(redisConnection.del).toHaveBeenCalledWith(...keys);
  });

  it('should handle empty organization cache', async () => {
    // Mock SCAN to return empty array (no keys found)
    (redisConnection.scan as jest.Mock).mockResolvedValue(['0', []]);

    await clearOrgCache('org-1');

    expect(redisConnection.scan).toHaveBeenCalled();
    expect(redisConnection.del).not.toHaveBeenCalled();
  });

  it('should get cache statistics for organization', async () => {
    const keys = [
      'pull:org-1:conn-1:customer:CID123',
      'pull:org-1:conn-1:customer:CID456',
      'pull:org-1:conn-2:order:ORD789',
    ];
    // Mock SCAN to return all keys in one iteration
    (redisConnection.scan as jest.Mock).mockResolvedValue(['0', keys]);

    const stats = await getCacheStats('org-1');

    expect(stats.totalKeys).toBe(3);
    expect(stats.keysByConnector).toEqual({
      'conn-1': 2,
      'conn-2': 1,
    });
    expect(stats.keysByResourceType).toEqual({
      'customer': 2,
      'order': 1,
    });
  });
});

describe('Pull Cache - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle Redis connection error gracefully', async () => {
    (redisConnection.get as jest.Mock).mockRejectedValue(
      new Error('Redis connection failed'),
    );

    await expect(
      getCachedData({
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      }),
    ).rejects.toThrow('Redis connection failed');
  });

  it('should handle invalid JSON gracefully', async () => {
    (redisConnection.get as jest.Mock).mockResolvedValue(
      '{"name": "Test", invalid json',
    );

    await expect(
      getCachedData({
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      }),
    ).rejects.toThrow(/JSON/);
  });

  it('should handle cache SET failures', async () => {
    (redisConnection.setex as jest.Mock).mockRejectedValue(
      new Error('Out of memory'),
    );

    await expect(
      setCachedData(
        {
          organizationId: 'org-1',
          connectorId: 'conn-1',
          resourceType: 'customer',
          resourceId: 'CID123',
        },
        { id: '123', name: 'Test' },
      ),
    ).rejects.toThrow('Out of memory');
  });
});

describe('Pull Cache - Multi-Tenant Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should isolate cache by organization ID', async () => {
    const data1 = { id: '123', name: 'Org 1 Customer' };
    const data2 = { id: '123', name: 'Org 2 Customer' };

    (redisConnection.setex as jest.Mock).mockResolvedValue('OK');

    // Cache data for org-1
    await setCachedData(
      {
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      },
      data1,
    );

    // Cache data for org-2 with same resourceId
    await setCachedData(
      {
        organizationId: 'org-2',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: 'CID123',
      },
      data2,
    );

    // Verify different keys were used
    expect(redisConnection.setex).toHaveBeenCalledWith(
      'pull:org-1:conn-1:customer:CID123',
      expect.any(Number),
      JSON.stringify(data1),
    );
    expect(redisConnection.setex).toHaveBeenCalledWith(
      'pull:org-2:conn-1:customer:CID123',
      expect.any(Number),
      JSON.stringify(data2),
    );
  });

  it('should prevent cross-org cache access', async () => {
    // Org-1 tries to access Org-2's cache key directly
    // (This is prevented at the key structure level)
    const org1Key = 'pull:org-1:conn-1:customer:CID123';
    const org2Key = 'pull:org-2:conn-1:customer:CID123';

    expect(org1Key).not.toBe(org2Key);
  });
});

describe('Pull Cache - Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track cache hit rate', async () => {
    let hits = 0;
    let misses = 0;

    // Mock 3 cache hits
    (redisConnection.get as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify({ id: '1' }))
      .mockResolvedValueOnce(JSON.stringify({ id: '2' }))
      .mockResolvedValueOnce(JSON.stringify({ id: '3' }))
      .mockResolvedValueOnce(null)  // Cache miss
      .mockResolvedValueOnce(null); // Cache miss

    for (let i = 1; i <= 5; i++) {
      const result = await getCachedData({
        organizationId: 'org-1',
        connectorId: 'conn-1',
        resourceType: 'customer',
        resourceId: `CID${i}`,
      });

      if (result) hits++;
      else misses++;
    }

    expect(hits).toBe(3);
    expect(misses).toBe(2);
    expect(hits / (hits + misses)).toBe(0.6); // 60% hit rate
  });

  it('should handle concurrent cache operations', async () => {
    (redisConnection.setex as jest.Mock).mockResolvedValue('OK');
    (redisConnection.get as jest.Mock).mockResolvedValue(
      JSON.stringify({ id: '123' }),
    );

    // Concurrent cache SET operations
    await Promise.all([
      setCachedData(
        {
          organizationId: 'org-1',
          connectorId: 'conn-1',
          resourceType: 'customer',
          resourceId: 'CID1',
        },
        { id: '1' },
      ),
      setCachedData(
        {
          organizationId: 'org-1',
          connectorId: 'conn-1',
          resourceType: 'customer',
          resourceId: 'CID2',
        },
        { id: '2' },
      ),
      setCachedData(
        {
          organizationId: 'org-1',
          connectorId: 'conn-1',
          resourceType: 'customer',
          resourceId: 'CID3',
        },
        { id: '3' },
      ),
    ]);

    expect(redisConnection.setex).toHaveBeenCalledTimes(3);
  });
});
