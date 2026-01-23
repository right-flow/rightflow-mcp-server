/**
 * Forms Publish API Endpoint (Phase 1)
 * Handles form publishing/unpublishing
 *
 * Routes:
 * - POST /api/forms-publish?id=xxx&action=publish
 * - POST /api/forms-publish?id=xxx&action=unpublish
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FormsService } from '../src/services/forms/forms.service.js';
import { getUserFromAuth } from './lib/auth';

const formsService = new FormsService();

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

    const { id, action } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Form ID is required',
      });
    }

    if (action === 'publish') {
      const result = await formsService.publishForm(id, userId);

      if (!result.success) {
        return res.status(400).json({
          error: 'Failed to publish form',
          message: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        form: result.form,
        message: 'Form published successfully',
      });
    }

    if (action === 'unpublish') {
      const result = await formsService.unpublishForm(id, userId);

      if (!result.success) {
        return res.status(400).json({
          error: 'Failed to unpublish form',
          message: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        form: result.form,
        message: 'Form unpublished successfully',
      });
    }

    return res.status(400).json({
      error: 'Bad request',
      message: 'Invalid action. Use "publish" or "unpublish"',
    });
  } catch (error) {
    console.error('Publish API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
