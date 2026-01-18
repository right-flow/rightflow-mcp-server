/**
 * Data Sources API Endpoint
 * Handles CRUD operations for dynamic dropdown data sources
 *
 * Routes:
 * - GET /api/data-sources - List user's data sources
 * - GET /api/data-sources?id=xxx - Get single data source
 * - POST /api/data-sources - Create new data source
 * - PUT /api/data-sources?id=xxx - Update data source
 * - DELETE /api/data-sources?id=xxx - Delete data source (soft delete)
 * - GET /api/data-sources/options?id=xxx - Get options from a data source
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DataSourcesService, type DataSourceType } from '../src/services/data-sources/data-sources.service';
import { getAuthContext, checkAccess } from './lib/auth';

const dataSourcesService = new DataSourcesService();

/**
 * Main API handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Authenticate user
    const authContext = await getAuthContext(req);

    if (!authContext) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication required',
      });
    }

    // Route based on HTTP method
    switch (req.method) {
      case 'GET':
        return await handleGetDataSources(req, res, authContext);

      case 'POST':
        return await handleCreateDataSource(req, res, authContext);

      case 'PUT':
        return await handleUpdateDataSource(req, res, authContext);

      case 'DELETE':
        return await handleDeleteDataSource(req, res, authContext);

      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `${req.method} is not supported`,
        });
    }
  } catch (error) {
    console.error('Data Sources API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/data-sources
 * Get single data source by ID, get options, or list all user data sources
 * Supports both personal and organization contexts
 */
async function handleGetDataSources(
  req: VercelRequest,
  res: VercelResponse,
  authContext: { userId: string; orgId: string | null; orgRole: string | null },
) {
  const { id, action, source_type } = req.query;

  // Get options from a data source
  if (action === 'options' && id && typeof id === 'string') {
    try {
      const options = await dataSourcesService.getOptions(id, authContext.userId, authContext.orgId);
      return res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({
          error: 'Not found',
          message,
        });
      }

      if (message.includes('not active')) {
        return res.status(400).json({
          error: 'Bad request',
          message,
        });
      }

      throw error;
    }
  }

  // Get single data source by ID
  if (id && typeof id === 'string') {
    const dataSource = await dataSourcesService.findById(id, authContext.userId, authContext.orgId);

    if (!dataSource) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Data source not found or access denied',
      });
    }

    return res.status(200).json({
      success: true,
      data: dataSource,
    });
  }

  // List all data sources for user (with optional filtering)
  const filters: any = {};

  if (source_type && typeof source_type === 'string') {
    filters.source_type = source_type;
  }

  const dataSources = await dataSourcesService.findAll(authContext.userId, filters, authContext.orgId);

  return res.status(200).json({
    success: true,
    data: dataSources,
    count: dataSources.length,
  });
}

/**
 * POST /api/data-sources
 * Create new data source
 * Supports both personal and organization contexts with permission checks
 */
async function handleCreateDataSource(
  req: VercelRequest,
  res: VercelResponse,
  authContext: { userId: string; orgId: string | null; orgRole: string | null },
) {
  const { name, description, source_type, config, cache_ttl, is_active } = req.body;

  // Validation
  if (!name || typeof name !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'name is required and must be a string',
    });
  }

  if (!source_type || typeof source_type !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'source_type is required and must be a string',
    });
  }

  // Validate source_type is valid
  const validSourceTypes: DataSourceType[] = ['static', 'csv_import', 'json_import', 'table', 'custom_query'];
  if (!validSourceTypes.includes(source_type as DataSourceType)) {
    return res.status(400).json({
      error: 'Bad request',
      message: `source_type must be one of: ${validSourceTypes.join(', ')}`,
    });
  }

  if (!config || typeof config !== 'object') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'config is required and must be an object',
    });
  }

  // Check access if creating in org context (admin and basic_member can write)
  if (authContext.orgId) {
    const canWrite = await checkAccess(req, 'write');
    if (!canWrite) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to create data sources in this organization',
      });
    }
  }

  try {
    const dataSource = await dataSourcesService.create({
      user_id: authContext.userId,
      org_id: authContext.orgId,
      name,
      description,
      source_type: source_type as DataSourceType,
      config,
      cache_ttl,
      is_active,
    });

    return res.status(201).json({
      success: true,
      data: dataSource,
      message: 'Data source created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Handle validation errors
    if (
      message.includes('required') ||
      message.includes('invalid') ||
      message.includes('exceed')
    ) {
      return res.status(400).json({
        error: 'Validation error',
        message,
      });
    }

    throw error;
  }
}

/**
 * PUT /api/data-sources?id=xxx
 * Update existing data source
 * Supports both personal and organization contexts with permission checks
 */
async function handleUpdateDataSource(
  req: VercelRequest,
  res: VercelResponse,
  authContext: { userId: string; orgId: string | null; orgRole: string | null },
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'id query parameter is required',
    });
  }

  const { name, description, config, cache_ttl, is_active } = req.body;

  // Get data source to check access and org
  const existing = await dataSourcesService.findById(id, authContext.userId, authContext.orgId);

  if (!existing) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this data source',
    });
  }

  // Check access if updating org data source (admin and basic_member can write)
  if (existing.org_id) {
    const canWrite = await checkAccess(req, 'write');
    if (!canWrite) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update data sources in this organization',
      });
    }
  }

  try {
    const dataSource = await dataSourcesService.update(id, authContext.userId, {
      name,
      description,
      config,
      cache_ttl,
      is_active,
    }, authContext.orgId);

    return res.status(200).json({
      success: true,
      data: dataSource,
      message: 'Data source updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({
        error: 'Not found',
        message,
      });
    }

    if (message.includes('invalid') || message.includes('exceed')) {
      return res.status(400).json({
        error: 'Validation error',
        message,
      });
    }

    throw error;
  }
}

/**
 * DELETE /api/data-sources?id=xxx
 * Soft delete data source
 * Supports both personal and organization contexts with permission checks
 */
async function handleDeleteDataSource(
  req: VercelRequest,
  res: VercelResponse,
  authContext: { userId: string; orgId: string | null; orgRole: string | null },
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'id query parameter is required',
    });
  }

  // Get data source to check access and org
  const existing = await dataSourcesService.findById(id, authContext.userId, authContext.orgId);

  if (!existing) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this data source',
    });
  }

  // Check access if deleting org data source (only admin can delete)
  if (existing.org_id) {
    const canDelete = await checkAccess(req, 'delete');
    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete data sources in this organization',
      });
    }
  }

  try {
    await dataSourcesService.delete(id, authContext.userId, authContext.orgId);

    return res.status(200).json({
      success: true,
      message: 'Data source deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({
        error: 'Not found',
        message,
      });
    }

    throw error;
  }
}
