/**
 * Data Sources File Upload API
 * Handles CSV/JSON file uploads for dynamic dropdown data sources
 *
 * Routes:
 * - POST /api/data-sources-upload - Upload CSV or JSON file and create data source
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DataSourcesService } from '../src/services/data-sources/data-sources.service';
import { StorageService } from '../src/services/storage/storage.service';
import { getUserFromAuth } from './lib/auth';

const dataSourcesService = new DataSourcesService();
const storageService = new StorageService();

// File size limits (in bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.csv', '.json'];

/**
 * Main API handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST is supported',
    });
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

    return await handleFileUpload(req, res, userId);
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle file upload from JSON body with base64-encoded content
 */
async function handleFileUpload(
  req: VercelRequest,
  res: VercelResponse,
  userId: string,
) {
  // Validate content type - we expect JSON with base64-encoded file content
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('application/json')) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Content-Type must be application/json',
    });
  }

  try {
    // Handle the file as a base64 string in the JSON body
    // For production multipart/form-data support, use a library like 'formidable' or 'busboy'
    const { fileName, fileContent, name, description } = req.body;

    // Validation
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'fileName is required',
      });
    }

    if (!fileContent || typeof fileContent !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'fileContent is required (base64 encoded)',
      });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'name is required for the data source',
      });
    }

    // Check file extension
    const fileExt = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
      });
    }

    // Decode base64 content
    let buffer: Buffer;
    try {
      buffer = Buffer.from(fileContent, 'base64');
    } catch (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid base64 encoding',
      });
    }

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: 'Validation error',
        message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Determine source type
    const sourceType = fileExt === '.csv' ? 'csv_import' : 'json_import';

    // Parse and validate content
    const content = buffer.toString('utf-8');
    let options;
    let rowCount = 0;

    try {
      if (sourceType === 'csv_import') {
        options = await dataSourcesService.parseCSV(content);
        rowCount = options.length;
      } else {
        options = await dataSourcesService.parseJSON(content);
        rowCount = options.length;
      }
    } catch (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error instanceof Error ? error.message : 'Failed to parse file',
      });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `data-sources/${userId}/${timestamp}_${sanitizedFileName}`;

    // Upload file to storage
    const uploadResult = await storageService.uploadFile(buffer, storagePath, {
      contentType: fileExt === '.csv' ? 'text/csv' : 'application/json',
      metadata: {
        userId,
        sourceType,
        originalFileName: fileName,
      },
    });

    if (!uploadResult.success) {
      return res.status(500).json({
        error: 'Upload failed',
        message: uploadResult.error || 'Failed to upload file',
      });
    }

    // Create data source record
    const dataSource = await dataSourcesService.create({
      user_id: userId,
      name,
      description,
      source_type: sourceType,
      config: {
        file_path: uploadResult.path,
        file_url: uploadResult.url,
        file_size: buffer.length,
        row_count: rowCount,
        item_count: rowCount,
        original_file_name: fileName,
        options, // Store parsed options for fast access
      },
      cache_ttl: 3600, // 1 hour default
    });

    return res.status(201).json({
      success: true,
      data: dataSource,
      message: `File uploaded successfully. ${rowCount} items imported.`,
      stats: {
        fileName,
        fileSize: buffer.length,
        itemCount: rowCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('exceeds')) {
      return res.status(400).json({
        error: 'Validation error',
        message,
      });
    }

    throw error;
  }
}
