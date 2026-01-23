/**
 * Forms API Endpoint (Phase 1)
 * Handles form CRUD operations
 *
 * Routes:
 * - GET /api/forms - List user's forms
 * - POST /api/forms - Create new form
 * - PUT /api/forms?id=xxx - Update form
 * - DELETE /api/forms?id=xxx - Delete form
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FormsService } from '../packages/app/src/services/forms/forms.service.js';
import { getAuthContext, checkAccess } from './lib/auth.js';

const formsService = new FormsService();

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
    // Check if it's a public GET request with a slug
    const { slug } = req.query;
    const isPublicGet = req.method === 'GET' && slug && typeof slug === 'string';

    // Authenticate user if not a public GET
    let authContext = null;
    if (!isPublicGet) {
      authContext = await getAuthContext(req);

      if (!authContext) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid authentication required',
        });
      }
    }

    // Route based on HTTP method
    switch (req.method) {
      case 'GET':
        return await handleGetForms(req, res, authContext);

      case 'POST':
        return await handleCreateForm(req, res, authContext!);

      case 'PUT':
        return await handleUpdateForm(req, res, authContext!);

      case 'DELETE':
        return await handleDeleteForm(req, res, authContext!);

      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `${req.method} is not supported`,
        });
    }
  } catch (error) {
    console.error('Forms API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/forms
 * Get single form by ID or slug, or list all user forms (with org support)
 */
async function handleGetForms(
  req: VercelRequest,
  res: VercelResponse,
  authContext: { userId: string; orgId: string | null; orgRole: string | null } | null,
) {
  const { id, slug } = req.query;

  // Get single form by ID
  if (id && typeof id === 'string') {
    const form = await formsService.getFormById(id);

    if (!form) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Form not found',
      });
    }

    // Check access: personal ownership OR org membership
    if (!authContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPersonalAccess = form.user_id === authContext.userId && !form.org_id;
    const hasOrgAccess = form.org_id && form.org_id === authContext.orgId;

    if (!hasPersonalAccess && !hasOrgAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this form',
      });
    }

    return res.status(200).json({ form });
  }

  // Get single form by slug (public access - no ownership check)
  if (slug && typeof slug === 'string') {
    const form = await formsService.getFormBySlug(slug);

    if (!form) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Form not found',
      });
    }

    return res.status(200).json({ form });
  }

  // List all accessible forms (personal or org based on context)
  if (!authContext) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const forms = await formsService.getAccessibleForms(
    authContext.userId,
    authContext.orgId,
  );

  return res.status(200).json({ forms });
}

/**
 * POST /api/forms
 * Create new form (with org support and permission check)
 */
async function handleCreateForm(
  req: VercelRequest,
  res: VercelResponse,
  authContext: { userId: string; orgId: string | null; orgRole: string | null },
) {
  const { title, description, fields, stations, settings } = req.body;

  if (!title) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Form title is required',
    });
  }

  // Check access if creating in org context (admin and basic_member can write)
  if (authContext.orgId) {
    const canWrite = await checkAccess(req, 'write');
    if (!canWrite) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to create forms in this organization',
      });
    }
  }

  const result = await formsService.createForm({
    userId: authContext.userId,
    orgId: authContext.orgId,
    title,
    description,
    fields: fields || [],
    stations,
    settings,
  });

  if (!result.success) {
    return res.status(400).json({
      error: 'Failed to create form',
      message: result.error,
    });
  }

  return res.status(201).json({
    success: true,
    form: result.form,
  });
}

/**
 * PUT /api/forms?id=xxx
 * Update existing form (with org support and permission check)
 */
async function handleUpdateForm(
  req: VercelRequest,
  res: VercelResponse,
  authContext: { userId: string; orgId: string | null; orgRole: string | null },
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Form ID is required',
    });
  }

  // Get form to check access
  const form = await formsService.getFormById(id);

  if (!form) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Form not found',
    });
  }

  // Check access: personal ownership OR org membership
  const hasPersonalAccess = form.user_id === authContext.userId && !form.org_id;
  const hasOrgAccess = form.org_id && form.org_id === authContext.orgId;

  if (!hasPersonalAccess && !hasOrgAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this form',
    });
  }

  // Check access if updating org form (admin and basic_member can write)
  if (form.org_id) {
    const canWrite = await checkAccess(req, 'write');
    if (!canWrite) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update forms in this organization',
      });
    }
  }

  const { title, description, fields, stations, settings } = req.body;

  const result = await formsService.updateForm(id, authContext.userId, {
    title,
    description,
    fields,
    stations,
    settings,
  });

  if (!result.success) {
    return res.status(result.error?.includes('unauthorized') ? 403 : 400).json({
      error: 'Failed to update form',
      message: result.error,
    });
  }

  return res.status(200).json({
    success: true,
    form: result.form,
  });
}

/**
 * DELETE /api/forms?id=xxx
 * Delete form (with org support and permission check)
 */
async function handleDeleteForm(
  req: VercelRequest,
  res: VercelResponse,
  authContext: { userId: string; orgId: string | null; orgRole: string | null },
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Form ID is required',
    });
  }

  // Get form to check access
  const form = await formsService.getFormById(id);

  if (!form) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Form not found',
    });
  }

  // Check access: personal ownership OR org membership
  const hasPersonalAccess = form.user_id === authContext.userId && !form.org_id;
  const hasOrgAccess = form.org_id && form.org_id === authContext.orgId;

  if (!hasPersonalAccess && !hasOrgAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this form',
    });
  }

  // Check access if deleting org form (only admin can delete)
  if (form.org_id) {
    const canDelete = await checkAccess(req, 'delete');
    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete forms in this organization',
      });
    }
  }

  const result = await formsService.deleteForm(id, authContext.userId);

  if (!result.success) {
    return res.status(result.error?.includes('unauthorized') ? 403 : 400).json({
      error: 'Failed to delete form',
      message: result.error,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Form deleted successfully',
  });
}
