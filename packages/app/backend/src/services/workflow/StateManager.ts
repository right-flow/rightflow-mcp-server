/**
 * StateManager Service
 * Manages workflow instance state in Redis
 */

import { Redis } from 'ioredis';
import { WorkflowContext, WorkflowNode } from './types';

export class StateManager {
  private redis: Redis;
  private keyPrefix = 'workflow:state:';
  private ttl = 86400; // 24 hours in seconds

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Save workflow state to Redis
   */
  async saveState(
    instanceId: string,
    context: WorkflowContext
  ): Promise<void> {
    const key = this.getKey(instanceId);

    // Serialize context to JSON
    const serialized = JSON.stringify(context, this.jsonReplacer);

    // Save with TTL
    await this.redis.setex(key, this.ttl, serialized);

    console.log(`[StateManager] State saved for instance ${instanceId}`);
  }

  /**
   * Get workflow state from Redis
   */
  async getState(instanceId: string): Promise<WorkflowContext | null> {
    const key = this.getKey(instanceId);

    const serialized = await this.redis.get(key);

    if (!serialized) {
      console.log(`[StateManager] No state found for instance ${instanceId}`);
      return null;
    }

    try {
      const context = JSON.parse(serialized, this.jsonReviver);
      console.log(`[StateManager] State loaded for instance ${instanceId}`);
      return context;
    } catch (error) {
      console.error(`[StateManager] Error parsing state for instance ${instanceId}:`, error);
      return null;
    }
  }

  /**
   * Update specific fields in state
   */
  async updateState(
    instanceId: string,
    updates: Partial<WorkflowContext>
  ): Promise<void> {
    const current = await this.getState(instanceId);

    if (!current) {
      throw new Error(`No state found for instance ${instanceId}`);
    }

    // Merge updates
    const updated: WorkflowContext = {
      ...current,
      ...updates,
      formData: {
        ...current.formData,
        ...(updates.formData || {})
      },
      variables: {
        ...current.variables,
        ...(updates.variables || {})
      }
    };

    await this.saveState(instanceId, updated);
  }

  /**
   * Clear workflow state from Redis
   */
  async clearState(instanceId: string): Promise<void> {
    const key = this.getKey(instanceId);

    await this.redis.del(key);

    console.log(`[StateManager] State cleared for instance ${instanceId}`);
  }

  /**
   * Check if state exists
   */
  async hasState(instanceId: string): Promise<boolean> {
    const key = this.getKey(instanceId);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Extend TTL for active instance
   */
  async extendTTL(instanceId: string, seconds?: number): Promise<void> {
    const key = this.getKey(instanceId);
    const ttl = seconds || this.ttl;

    await this.redis.expire(key, ttl);

    console.log(`[StateManager] TTL extended for instance ${instanceId} to ${ttl} seconds`);
  }

  /**
   * Get remaining TTL
   */
  async getTTL(instanceId: string): Promise<number> {
    const key = this.getKey(instanceId);
    const ttl = await this.redis.ttl(key);
    return ttl;
  }

  /**
   * Save checkpoint (for rollback support)
   */
  async saveCheckpoint(
    instanceId: string,
    nodeId: string,
    context: WorkflowContext
  ): Promise<void> {
    const checkpointKey = `${this.keyPrefix}checkpoint:${instanceId}:${nodeId}`;

    const serialized = JSON.stringify({
      nodeId,
      context,
      timestamp: Date.now()
    });

    // Save checkpoint with shorter TTL (1 hour)
    await this.redis.setex(checkpointKey, 3600, serialized);

    console.log(`[StateManager] Checkpoint saved for instance ${instanceId} at node ${nodeId}`);
  }

  /**
   * Load checkpoint
   */
  async loadCheckpoint(
    instanceId: string,
    nodeId: string
  ): Promise<{ context: WorkflowContext; timestamp: number } | null> {
    const checkpointKey = `${this.keyPrefix}checkpoint:${instanceId}:${nodeId}`;

    const serialized = await this.redis.get(checkpointKey);

    if (!serialized) {
      return null;
    }

    try {
      const checkpoint = JSON.parse(serialized);
      return {
        context: checkpoint.context,
        timestamp: checkpoint.timestamp
      };
    } catch (error) {
      console.error(`[StateManager] Error loading checkpoint:`, error);
      return null;
    }
  }

  /**
   * List all checkpoints for an instance
   */
  async listCheckpoints(instanceId: string): Promise<string[]> {
    const pattern = `${this.keyPrefix}checkpoint:${instanceId}:*`;
    const keys = await this.redis.keys(pattern);

    // Extract node IDs from keys
    return keys.map(key => {
      const parts = key.split(':');
      return parts[parts.length - 1];
    });
  }

  /**
   * Clear all checkpoints for an instance
   */
  async clearCheckpoints(instanceId: string): Promise<void> {
    const pattern = `${this.keyPrefix}checkpoint:${instanceId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      console.log(`[StateManager] Cleared ${keys.length} checkpoints for instance ${instanceId}`);
    }
  }

  /**
   * Lock an instance for exclusive access
   */
  async acquireLock(
    instanceId: string,
    lockId: string,
    ttlSeconds: number = 30
  ): Promise<boolean> {
    const lockKey = `${this.keyPrefix}lock:${instanceId}`;

    // Set lock only if it doesn't exist (NX) with expiry (EX)
    const result = await this.redis.set(
      lockKey,
      lockId,
      'NX',
      'EX',
      ttlSeconds
    );

    return result === 'OK';
  }

  /**
   * Release lock
   */
  async releaseLock(instanceId: string, lockId: string): Promise<boolean> {
    const lockKey = `${this.keyPrefix}lock:${instanceId}`;

    // Only delete if we own the lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, lockId);

    return result === 1;
  }

  /**
   * Check if instance is locked
   */
  async isLocked(instanceId: string): Promise<boolean> {
    const lockKey = `${this.keyPrefix}lock:${instanceId}`;
    const exists = await this.redis.exists(lockKey);
    return exists === 1;
  }

  /**
   * Store instance metadata
   */
  async setMetadata(
    instanceId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const metaKey = `${this.keyPrefix}meta:${instanceId}`;

    await this.redis.hset(metaKey, metadata);
    await this.redis.expire(metaKey, this.ttl);
  }

  /**
   * Get instance metadata
   */
  async getMetadata(instanceId: string): Promise<Record<string, any>> {
    const metaKey = `${this.keyPrefix}meta:${instanceId}`;
    return await this.redis.hgetall(metaKey);
  }

  /**
   * Track instance in a sorted set (for monitoring)
   */
  async trackInstance(
    instanceId: string,
    workflowId: string,
    status: string
  ): Promise<void> {
    const trackingKey = `${this.keyPrefix}tracking:${workflowId}`;

    // Add to sorted set with timestamp as score
    await this.redis.zadd(trackingKey, Date.now(), `${instanceId}:${status}`);

    // Expire old entries (keep last 1000)
    await this.redis.zremrangebyrank(trackingKey, 0, -1001);
  }

  /**
   * Get tracked instances for a workflow
   */
  async getTrackedInstances(
    workflowId: string,
    limit: number = 100
  ): Promise<Array<{ instanceId: string; status: string; timestamp: number }>> {
    const trackingKey = `${this.keyPrefix}tracking:${workflowId}`;

    // Get recent instances with scores
    const results = await this.redis.zrevrange(
      trackingKey,
      0,
      limit - 1,
      'WITHSCORES'
    );

    const instances = [];
    for (let i = 0; i < results.length; i += 2) {
      const [instanceId, status] = results[i].split(':');
      const timestamp = parseInt(results[i + 1]);
      instances.push({ instanceId, status, timestamp });
    }

    return instances;
  }

  /**
   * Publish state change event
   */
  async publishStateChange(
    instanceId: string,
    event: string,
    data?: any
  ): Promise<void> {
    const channel = `workflow:events:${instanceId}`;

    await this.redis.publish(
      channel,
      JSON.stringify({
        event,
        instanceId,
        timestamp: Date.now(),
        data
      })
    );
  }

  /**
   * Subscribe to state changes
   */
  async subscribeToStateChanges(
    instanceId: string,
    callback: (event: any) => void
  ): Promise<() => void> {
    const subscriber = this.redis.duplicate();
    const channel = `workflow:events:${instanceId}`;

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const event = JSON.parse(message);
          callback(event);
        } catch (error) {
          console.error('[StateManager] Error parsing event:', error);
        }
      }
    });

    await subscriber.subscribe(channel);

    // Return unsubscribe function
    return () => {
      subscriber.unsubscribe(channel);
      subscriber.disconnect();
    };
  }

  /**
   * Get statistics for monitoring
   */
  async getStats(): Promise<{
    activeInstances: number;
    totalKeys: number;
    memoryUsage: number;
  }> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redis.keys(pattern);

    const info = await this.redis.info('memory');
    const memoryMatch = info.match(/used_memory:(\d+)/);
    const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

    return {
      activeInstances: keys.filter(k => k.includes(':state:')).length,
      totalKeys: keys.length,
      memoryUsage
    };
  }

  /**
   * Cleanup expired states (maintenance task)
   */
  async cleanup(): Promise<number> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redis.keys(pattern);

    let cleaned = 0;

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) {
        // Key has no TTL, set one
        await this.redis.expire(key, this.ttl);
        cleaned++;
      }
    }

    console.log(`[StateManager] Cleanup: Added TTL to ${cleaned} keys`);
    return cleaned;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Get Redis key for instance
   */
  private getKey(instanceId: string): string {
    return `${this.keyPrefix}${instanceId}`;
  }

  /**
   * JSON replacer for serialization (handles Dates, etc.)
   */
  private jsonReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value) };
    }
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) };
    }
    return value;
  }

  /**
   * JSON reviver for deserialization
   */
  private jsonReviver(key: string, value: any): any {
    if (value && value.__type === 'Date') {
      return new Date(value.value);
    }
    if (value && value.__type === 'Set') {
      return new Set(value.value);
    }
    if (value && value.__type === 'Map') {
      return new Map(value.value);
    }
    return value;
  }
}