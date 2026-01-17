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
import { DataSourcesService } from '../src/services/data-sources/data-sources.service';
import { getUserFromAuth } from './lib/auth';

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
    const userId = await getUserFromAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication required',
      });
    }

    // Route based on HTTP method
    switch (req.method) {
      case 'GET':
        return await handleGetDataSources(req, res, userId);

      case 'POST':
        return await handleCreateDataSource(req, res, userId);

      case 'PUT':
        return await handleUpdateDataSource(req, res, userId);

      case 'DELETE':
        return await handleDeleteDataSource(req, res, userId);

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
 */
async function handleGetDataSources(
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
) {
  const { id, action, source_type } = req.query;

  // Get options from a data source
  if (action === 'options' && id && typeof id === 'string') {
    try {
      const options = await dataSourcesService.getOptions(id, userId);
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
    const dataSource = await dataSourcesService.findById(id, userId);

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

  const dataSources = await dataSourcesService.findAll(userId, filters);

  return res.status(200).json({
    success: true,
    data: dataSources,
    count: dataSources.length,
  });
}

/**
 * POST /api/data-sources
 * Create new data source
 */
async function handleCreateDataSource(
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
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

  if (!config || typeof config !== 'object') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'config is required and must be an object',
    });
  }

  try {
    const dataSource = await dataSourcesService.create({
      user_id: userId,
      name,
      description,
      source_type,
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
 */
async function handleUpdateDataSource(
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'id query parameter is required',
    });
  }

  const { name, description, config, cache_ttl, is_active } = req.body;

  try {
    const dataSource = await dataSourcesService.update(id, userId, {
      name,
      description,
      config,
      cache_ttl,
      is_active,
    });

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
 */
async function handleDeleteDataSource(
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'id query parameter is required',
    });
  }

  try {
    await dataSourcesService.delete(id, userId);

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
