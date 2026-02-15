/**
 * Metrics Endpoint
 * Exposes Prometheus metrics at GET /api/v1/metrics
 */

import { Router, Request, Response } from 'express';
import { getMetrics, updateDLQSizeMetrics } from '../../services/event-trigger/monitoring/metrics';

const router = Router();

/**
 * GET /metrics
 * Returns Prometheus-formatted metrics
 *
 * @authentication Internal only (should be restricted in production)
 * @returns {string} Prometheus text format
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Update dynamic metrics (DLQ size) - with caching to prevent slow queries
    // Note: This requires database connection - will add later when integrating
    // For now, just export static metrics

    // Export all metrics
    const metrics = await getMetrics();

    // Set Prometheus content type
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({
      error: 'Failed to export metrics',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'event-trigger-monitoring',
    timestamp: new Date().toISOString(),
  });
});

export default router;
