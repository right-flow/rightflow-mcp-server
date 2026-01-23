import Redis from 'ioredis';
import { config } from './env';
import logger from '../utils/logger';

// Create Redis connection for BullMQ
export const redisConnection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ recommendation
  enableReadyCheck: false,
});

// Redis event listeners
redisConnection.on('connect', () => {
  logger.info('✅ Redis connected');
});

redisConnection.on('error', (err) => {
  logger.error('❌ Redis connection error', { error: err.message });
});

redisConnection.on('close', () => {
  logger.warn('⚠️  Redis connection closed');
});

// Health check
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redisConnection.ping();
    return true;
  } catch (error: any) {
    logger.error('Redis health check failed', { error: error.message });
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  await redisConnection.quit();
  logger.info('Redis connection closed');
}
