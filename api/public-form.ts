/**
 * Public Form API Endpoint
 * Allows public access to published forms (no authentication required)
 *
 * Routes:
 * - GET /api/public-form?slug=xxx - Get published form with current version
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FormsService } from '../packages/app/src/services/forms/forms.service.js';

const formsService = new FormsService();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: `${req.method} is not supported`,
    });
  }

  try {
    const { slug } = req.query;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Form slug is required',
      });
    }

    // Get form by slug
    const form = await formsService.getFormBySlug(slug);

    if (!form) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Form not found',
      });
    }

    // Only allow access to published forms
    if (form.status !== 'published') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This form is not published',
      });
    }

    // Get current published version
    try {
      const versionResult = await formsService.getCurrentVersion(form.id);

      if (versionResult && versionResult.fields) {
        // Use fields from current version
        form.fields = versionResult.fields;
        console.log(`✓ Loaded current version ${versionResult.version_number} for form ${form.slug}`);
      }
    } catch (versionError) {
      // If version loading fails, use form fields as fallback
      console.warn('Failed to load current version, using form fields:', versionError);
    }

    return res.status(200).json({
      form,
    });
  } catch (error) {
    console.error('Public form API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
