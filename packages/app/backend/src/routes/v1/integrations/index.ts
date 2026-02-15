/**
 * Integrations API Routes
 * Provides CRM/ERP integration management
 *
 * Endpoints:
 * - GET    /api/v1/integrations           - List integrations
 * - POST   /api/v1/integrations           - Create integration
 * - GET    /api/v1/integrations/:id       - Get integration details
 * - PUT    /api/v1/integrations/:id       - Update integration
 * - DELETE /api/v1/integrations/:id       - Delete integration
 * - POST   /api/v1/integrations/:id/test  - Test integration connection
 * - GET    /api/v1/integrations/:id/health - Get integration health
 * - GET    /api/v1/integrations/:id/schema - Get CRM/ERP schema
 * - POST   /api/v1/integrations/:id/refresh - Refresh OAuth tokens
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../../config/database';
import { authenticateJWT } from '../../../middleware/auth';
import { syncUser } from '../../../middleware/syncUser';

const router = Router();

// Apply authentication (skip in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(authenticateJWT);
  router.use(syncUser);
}

// Integration types
type IntegrationType = 'crm' | 'erp' | 'calendar' | 'messaging';
type IntegrationStatus = 'active' | 'inactive' | 'error';
type HealthStatus = 'healthy' | 'degraded' | 'error';

interface Integration {
  id: string;
  organization_id: string;
  type: IntegrationType;
  provider: string;
  name: string;
  config: Record<string, any>;
  status: IntegrationStatus;
  health_status: HealthStatus;
  last_sync_at?: string;
  last_error_at?: string;
  last_error_message?: string;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/v1/integrations
 * List all integrations for organization
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, provider, status } = req.query;
    const organizationId = req.user!.organizationId;

    let sql = `
      SELECT
        id,
        organization_id,
        type,
        provider,
        name,
        status,
        health_status,
        last_sync_at,
        success_count,
        failure_count,
        created_at
      FROM integrations
      WHERE organization_id = $1
    `;

    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (provider) {
      sql += ` AND provider = $${paramIndex}`;
      params.push(provider);
      paramIndex++;
    }

    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += ' ORDER BY created_at DESC';

    const integrations = await query<Integration>(sql, params);

    res.json({
      integrations: integrations.map((i) => ({
        id: i.id,
        type: i.type,
        provider: i.provider,
        name: i.name,
        status: i.status,
        healthStatus: i.health_status,
        lastSyncAt: i.last_sync_at,
        stats: {
          successCount: i.success_count || 0,
          failureCount: i.failure_count || 0,
        },
        createdAt: i.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/integrations
 * Create a new integration
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user!.organizationId;
    const { type, provider, name, config, oauthCode } = req.body;

    // Validation
    if (!type || !['crm', 'erp', 'calendar', 'messaging'].includes(type)) {
      return res.status(400).json({
        error: { message: 'type is required and must be one of: crm, erp, calendar, messaging' }
      });
    }

    if (!provider) {
      return res.status(400).json({
        error: { message: 'provider is required' }
      });
    }

    if (!name) {
      return res.status(400).json({
        error: { message: 'name is required' }
      });
    }

    // For OAuth providers, handle the code exchange
    let finalConfig = config || {};
    if (oauthCode) {
      // In a real implementation, we would exchange the code for tokens here
      // For now, just store the code
      finalConfig = { ...finalConfig, oauthCode };
    }

    const result = await query<Integration>(
      `INSERT INTO integrations (
        organization_id,
        type,
        provider,
        name,
        config,
        status,
        health_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, type, provider, name, status, created_at`,
      [
        organizationId,
        type,
        provider,
        name,
        JSON.stringify(finalConfig),
        'active',
        'healthy',
      ]
    );

    res.status(201).json({
      id: result[0].id,
      type: result[0].type,
      provider: result[0].provider,
      name: result[0].name,
      status: 'active',
      createdAt: result[0].created_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/integrations/:id
 * Get integration details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const integrations = await query<Integration>(
      `SELECT * FROM integrations WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (integrations.length === 0) {
      return res.status(404).json({ error: { message: 'Integration not found' } });
    }

    const integration = integrations[0];

    // Mask sensitive config fields
    const maskedConfig = { ...integration.config };
    const sensitiveFields = ['apiKey', 'apiSecret', 'password', 'token', 'accessToken', 'refreshToken'];
    for (const field of sensitiveFields) {
      if (maskedConfig[field]) {
        maskedConfig[field] = '********';
      }
    }

    res.json({
      id: integration.id,
      type: integration.type,
      provider: integration.provider,
      name: integration.name,
      status: integration.status,
      healthStatus: integration.health_status,
      config: maskedConfig,
      lastSyncAt: integration.last_sync_at,
      lastErrorAt: integration.last_error_at,
      lastErrorMessage: integration.last_error_message,
      stats: {
        successCount: integration.success_count || 0,
        failureCount: integration.failure_count || 0,
      },
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/integrations/:id
 * Update integration
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;
    const { name, config, status } = req.body;

    // Verify exists
    const existing = await query(
      'SELECT id FROM integrations WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Integration not found' } });
    }

    // Build update
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (config !== undefined) {
      updates.push(`config = $${paramIndex}`);
      params.push(JSON.stringify(config));
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: { message: 'No fields to update' } });
    }

    params.push(id);
    params.push(organizationId);

    const sql = `
      UPDATE integrations
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await query<Integration>(sql, params);

    res.json({
      id: result[0].id,
      type: result[0].type,
      provider: result[0].provider,
      name: result[0].name,
      status: result[0].status,
      updatedAt: result[0].updated_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/integrations/:id
 * Delete integration
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Check if integration has active triggers
    const activeTriggers = await query(
      `SELECT COUNT(*) as count FROM trigger_actions
       WHERE config->>'integrationId' = $1`,
      [id]
    );

    if (parseInt(activeTriggers[0]?.count || '0') > 0) {
      return res.status(409).json({
        error: { message: 'Cannot delete integration with active triggers' }
      });
    }

    const result = await query(
      'DELETE FROM integrations WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: { message: 'Integration not found' } });
    }

    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/integrations/:id/test
 * Test integration connection
 */
router.post('/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const integrations = await query<Integration>(
      `SELECT * FROM integrations WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (integrations.length === 0) {
      return res.status(404).json({ error: { message: 'Integration not found' } });
    }

    const integration = integrations[0];
    const startTime = Date.now();

    // Simulate connection test based on provider
    // In real implementation, this would make actual API calls
    let success = true;
    let error: string | undefined;

    try {
      // Simulated test - in production, call actual provider API
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if config has required fields
      const config = integration.config || {};
      if (integration.type === 'crm' && !config.apiKey && !config.oauthCode) {
        success = false;
        error = 'Missing API key or OAuth credentials';
      }
    } catch (e: any) {
      success = false;
      error = e.message;
    }

    const latency = Date.now() - startTime;

    // Update health status based on test result
    await query(
      `UPDATE integrations
       SET health_status = $1,
           last_error_message = $2,
           last_error_at = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [
        success ? 'healthy' : 'error',
        error || null,
        success ? null : new Date(),
        id,
      ]
    );

    res.json({
      success,
      latency,
      error,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/integrations/:id/health
 * Get integration health status
 */
router.get('/:id/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const integrations = await query<Integration>(
      `SELECT * FROM integrations WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (integrations.length === 0) {
      return res.status(404).json({ error: { message: 'Integration not found' } });
    }

    const integration = integrations[0];

    // Calculate issues and recommendations
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (integration.health_status === 'error') {
      issues.push(integration.last_error_message || 'Unknown error');
      recommendations.push('Check API credentials and connectivity');
    }

    if (integration.failure_count > 10) {
      issues.push('High failure rate detected');
      recommendations.push('Review integration configuration');
    }

    const daysSinceLastSync = integration.last_sync_at
      ? Math.floor((Date.now() - new Date(integration.last_sync_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastSync && daysSinceLastSync > 7) {
      issues.push('No sync in over 7 days');
      recommendations.push('Consider triggering a manual sync');
    }

    res.json({
      status: integration.health_status,
      lastCheckedAt: integration.updated_at,
      issues,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/integrations/:id/schema
 * Get CRM/ERP schema (fields, entities)
 */
router.get('/:id/schema', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const integrations = await query<Integration>(
      `SELECT * FROM integrations WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (integrations.length === 0) {
      return res.status(404).json({ error: { message: 'Integration not found' } });
    }

    const integration = integrations[0];

    // Return mock schema based on provider
    // In production, this would fetch actual schema from the CRM/ERP
    const schemas: Record<string, any> = {
      salesforce: {
        entities: [
          {
            name: 'Lead',
            fields: [
              { name: 'FirstName', type: 'string', required: false },
              { name: 'LastName', type: 'string', required: true },
              { name: 'Email', type: 'email', required: false },
              { name: 'Company', type: 'string', required: false },
              { name: 'Status', type: 'picklist', required: false, picklist: ['New', 'Working', 'Qualified'] },
            ],
          },
          {
            name: 'Contact',
            fields: [
              { name: 'FirstName', type: 'string', required: false },
              { name: 'LastName', type: 'string', required: true },
              { name: 'Email', type: 'email', required: false },
              { name: 'Phone', type: 'phone', required: false },
            ],
          },
        ],
      },
      hubspot: {
        entities: [
          {
            name: 'Contact',
            fields: [
              { name: 'firstname', type: 'string', required: false },
              { name: 'lastname', type: 'string', required: true },
              { name: 'email', type: 'email', required: true },
              { name: 'phone', type: 'phone', required: false },
            ],
          },
          {
            name: 'Deal',
            fields: [
              { name: 'dealname', type: 'string', required: true },
              { name: 'amount', type: 'number', required: false },
              { name: 'dealstage', type: 'picklist', required: true, picklist: ['appointment', 'qualified', 'closed'] },
            ],
          },
        ],
      },
    };

    const schema = schemas[integration.provider] || {
      entities: [
        {
          name: 'Contact',
          fields: [
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'email', required: false },
          ],
        },
      ],
    };

    res.json({
      ...schema,
      cachedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/integrations/:id/refresh
 * Refresh OAuth tokens
 */
router.post('/:id/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const integrations = await query<Integration>(
      `SELECT * FROM integrations WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (integrations.length === 0) {
      return res.status(404).json({ error: { message: 'Integration not found' } });
    }

    const integration = integrations[0];
    const config = integration.config || {};

    // Check if this is an OAuth integration
    if (!config.refreshToken && !config.oauthCode) {
      return res.status(400).json({
        error: { message: 'This integration does not use OAuth' }
      });
    }

    // In production, this would call the OAuth provider to refresh tokens
    // For now, simulate a successful refresh
    const newExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

    await query(
      `UPDATE integrations
       SET config = config || $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ tokenExpiresAt: newExpiresAt.toISOString() }), id]
    );

    res.json({
      success: true,
      expiresAt: newExpiresAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
