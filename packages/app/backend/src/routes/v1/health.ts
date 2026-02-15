/**
 * Health API Routes
 * Provides system health monitoring endpoints
 *
 * Endpoints:
 * - GET /api/v1/health              - Overall system health
 * - GET /api/v1/health/eventbus     - EventBus health check
 * - GET /api/v1/health/integrations - Integration health summary
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { getRedisClient } from '../../config/redis';

const router = Router();

/**
 * GET /api/v1/health
 * Overall system health check
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const components: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {
      database: 'unhealthy',
      redis: 'unhealthy',
      eventbus: 'unhealthy',
      integrations: 'healthy',
    };

    // Check database
    try {
      await query('SELECT 1');
      components.database = 'healthy';
    } catch (error) {
      components.database = 'unhealthy';
    }

    // Check Redis
    try {
      const redis = getRedisClient();
      if (redis) {
        const pong = await redis.ping();
        components.redis = pong === 'PONG' ? 'healthy' : 'degraded';
      } else {
        components.redis = 'degraded';
      }
    } catch (error) {
      components.redis = 'unhealthy';
    }

    // EventBus health depends on Redis
    components.eventbus = components.redis === 'healthy' ? 'healthy' : 'degraded';

    // Check integrations health
    try {
      const unhealthyIntegrations = await query(
        `SELECT COUNT(*) as count FROM integrations WHERE health_status = 'error'`
      );
      const count = parseInt(unhealthyIntegrations[0]?.count || '0');
      components.integrations = count === 0 ? 'healthy' : count > 3 ? 'unhealthy' : 'degraded';
    } catch (error) {
      // Table might not exist yet, that's OK
      components.integrations = 'healthy';
    }

    // Determine overall status
    const statuses = Object.values(components);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (statuses.every(s => s === 'healthy')) {
      overallStatus = 'healthy';
    } else if (statuses.some(s => s === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    res.json({
      status: overallStatus,
      components,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/health/eventbus
 * EventBus specific health check
 */
router.get('/eventbus', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let redisConnected = false;
    let redisLatency = -1;

    // Check Redis connection and latency
    try {
      const redis = getRedisClient();
      if (redis) {
        const start = Date.now();
        const pong = await redis.ping();
        redisLatency = Date.now() - start;
        redisConnected = pong === 'PONG';
      }
    } catch (error) {
      redisConnected = false;
    }

    // Get pending poll events count
    let pendingEvents = 0;
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM events WHERE processing_mode = 'poll' AND retry_at <= NOW()`
      );
      pendingEvents = parseInt(result[0]?.count || '0');
    } catch (error) {
      // Table might not exist
    }

    // Determine circuit breaker state based on Redis connectivity
    const circuitState = redisConnected ? 'closed' : 'open';
    const fallbackMode = redisConnected ? 'redis' : 'polling';

    const status = redisConnected ? 'healthy' : pendingEvents > 100 ? 'unhealthy' : 'degraded';

    res.json({
      status,
      redis: {
        connected: redisConnected,
        latency_ms: redisLatency,
      },
      fallback: {
        mode: fallbackMode,
        pending_events: pendingEvents,
      },
      circuit_breaker: {
        state: circuitState,
        failures: redisConnected ? 0 : 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/health/integrations
 * Integration health summary
 */
router.get('/integrations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get integration counts by health status
    let integrations: any[] = [];
    let total = 0;
    let healthy = 0;
    let degraded = 0;
    let errorCount = 0;

    try {
      const stats = await query(
        `SELECT
          health_status,
          COUNT(*) as count
         FROM integrations
         GROUP BY health_status`
      );

      for (const stat of stats) {
        const count = parseInt(stat.count);
        total += count;
        switch (stat.health_status) {
          case 'healthy':
            healthy = count;
            break;
          case 'degraded':
            degraded = count;
            break;
          case 'error':
            errorCount = count;
            break;
        }
      }

      // Get individual integration statuses
      integrations = await query(
        `SELECT
          id,
          name,
          health_status as status,
          last_health_check as "lastChecked"
         FROM integrations
         ORDER BY health_status DESC, name ASC
         LIMIT 50`
      );
    } catch (error) {
      // Table might not exist yet
    }

    res.json({
      total,
      healthy,
      degraded,
      error: errorCount,
      integrations,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
