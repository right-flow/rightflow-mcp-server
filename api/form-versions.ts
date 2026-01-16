/**
 * Form Versions API Endpoint
 * Handles version management for published forms
 *
 * Routes:
 * - GET /api/form-versions?formId=xxx - Get version history
 * - GET /api/form-versions?formId=xxx&version=N - Get specific version
 * - POST /api/form-versions?formId=xxx&action=restore&version=N - Restore version
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FormsService } from '../src/services/forms/forms.service';
import { getUserFromAuth } from './lib/auth';

const formsService = new FormsService();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    const { formId, version, action } = req.query;

    if (!formId || typeof formId !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Form ID is required',
      });
    }

    // GET - Version history or specific version
    if (req.method === 'GET') {
      if (version && typeof version === 'string') {
        // Get specific version
        const versionNumber = parseInt(version, 10);
        if (isNaN(versionNumber)) {
          return res.status(400).json({
            error: 'Bad request',
            message: 'Invalid version number',
          });
        }

        const versionData = await formsService.getVersion(formId, versionNumber);

        if (!versionData) {
          return res.status(404).json({
            error: 'Not found',
            message: 'Version not found',
          });
        }

        return res.status(200).json({ version: versionData });
      }

      // Get version history
      const result = await formsService.getVersionHistory(formId);

      if (!result.success) {
        return res.status(400).json({
          error: 'Failed to get version history',
          message: result.error,
        });
      }

      return res.status(200).json({
        versions: result.versions || [],
      });
    }

    // POST - Restore version
    if (req.method === 'POST') {
      if (action !== 'restore') {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Invalid action. Use "restore"',
        });
      }

      if (!version || typeof version !== 'string') {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Version number is required for restore',
        });
      }

      const versionNumber = parseInt(version, 10);
      if (isNaN(versionNumber)) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Invalid version number',
        });
      }

      const { notes } = req.body;

      const result = await formsService.restoreVersion(
        formId,
        versionNumber,
        userId,
        notes,
      );

      if (!result.success) {
        return res.status(400).json({
          error: 'Failed to restore version',
          message: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        form: result.form,
        message: `Version ${versionNumber} restored successfully`,
      });
    }

    return res.status(405).json({
      error: 'Method not allowed',
      message: `${req.method} is not supported`,
    });
  } catch (error) {
    console.error('Form versions API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
