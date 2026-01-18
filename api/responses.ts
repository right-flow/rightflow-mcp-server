/**
 * Responses API Endpoint (Phase 3)
 * Handles form response submissions and retrieval
 *
 * Routes:
 * - GET /api/responses?formId=xxx - Get responses for a form
 * - GET /api/responses?id=xxx - Get single response by ID
 * - GET /api/responses?formId=xxx&export=csv|json - Export responses
 * - POST /api/responses - Submit a response
 * - DELETE /api/responses?id=xxx - Delete a response
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ResponsesService } from '../src/services/responses/responses.service';
import { FormsService } from '../src/services/forms/forms.service';
import { getAuthContext, checkAccess } from './lib/auth';

const responsesService = new ResponsesService();
const formsService = new FormsService();

/**
 * Verify user has access to the form (personal ownership OR org membership)
 */
async function verifyFormAccess(
  formId: string,
  authContext: { userId: string; orgId: string | null; orgRole: string | null },
): Promise<{ hasAccess: boolean; form: any }> {
  const form = await formsService.getFormById(formId);

  if (!form) {
    return { hasAccess: false, form: null };
  }

  // Check access: personal ownership OR org membership
  const hasPersonalAccess = form.user_id === authContext.userId && !form.org_id;
  const hasOrgAccess = form.org_id && form.org_id === authContext.orgId;

  return {
    hasAccess: hasPersonalAccess || hasOrgAccess,
    form,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetResponses(req, res);

      case 'POST':
        return await handleSubmitResponse(req, res);

      case 'DELETE':
        return await handleDeleteResponse(req, res);

      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `${req.method} is not supported`,
        });
    }
  } catch (error) {
    console.error('Responses API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/responses?formId=xxx
 * GET /api/responses?id=xxx
 * GET /api/responses?formId=xxx&export=csv|json
 */
async function handleGetResponses(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { formId, id, export: exportFormat } = req.query;

  // Get single response by ID
  if (id && typeof id === 'string') {
    try {
      const response = await responsesService.getResponse(id);
      return res.status(200).json(response);
    } catch (error) {
      return res.status(404).json({
        error: 'Not found',
        message: error instanceof Error ? error.message : 'Response not found',
      });
    }
  }

  // Get responses for a form (requires auth and ownership)
  if (!formId || typeof formId !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'formId or id is required',
    });
  }

  // Authenticate user for form responses
  const authContext = await getAuthContext(req);
  if (!authContext) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required',
    });
  }

  // Verify access
  const { hasAccess, form } = await verifyFormAccess(formId, authContext);
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this form',
    });
  }

  // Check access if org form (admin and basic_member can read)
  if (form.org_id) {
    const canRead = await checkAccess(req, 'read');
    if (!canRead) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view responses in this organization',
      });
    }
  }

  // Handle export formats
  if (exportFormat === 'csv' || exportFormat === 'json') {
    try {
      const format = exportFormat as 'csv' | 'json';
      const exported = await responsesService.exportResponses(formId, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="responses-${formId}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="responses-${formId}.json"`);
      }

      return res.status(200).send(exported);
    } catch (error) {
      return res.status(400).json({
        error: 'Export failed',
        message: error instanceof Error ? error.message : 'Failed to export responses',
      });
    }
  }

  // Get responses
  const responses = await responsesService.getFormResponses(formId);

  return res.status(200).json({
    responses,
    count: responses.length,
  });
}

/**
 * POST /api/responses
 * Submit a form response (public endpoint, no auth required)
 */
async function handleSubmitResponse(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { formId, data } = req.body;

  if (!formId || !data) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'formId and data are required',
    });
  }

  // Get submitter info
  const submitterIp = req.headers['x-forwarded-for'] as string ||
                      req.headers['x-real-ip'] as string ||
                      'unknown';
  const submitterUserAgent = req.headers['user-agent'] || 'unknown';

  try {
    const response = await responsesService.submitResponse({
      formId,
      data,
      submitterIp,
      submitterUserAgent,
    });

    return res.status(201).json({
      success: true,
      response,
      message: 'Response submitted successfully',
    });
  } catch (error) {
    return res.status(400).json({
      error: 'Failed to submit response',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * DELETE /api/responses?id=xxx
 * Delete a response (requires authentication and ownership)
 */
async function handleDeleteResponse(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Response ID is required',
    });
  }

  // Authenticate user
  const authContext = await getAuthContext(req);
  if (!authContext) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required',
    });
  }

  try {
    // Get response to check ownership
    const response = await responsesService.getResponse(id);

    // Verify access to the form
    const { hasAccess, form } = await verifyFormAccess(response.formId, authContext);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this response',
      });
    }

    // Check access if org form (only admin can delete)
    if (form.org_id) {
      const canDelete = await checkAccess(req, 'delete');
      if (!canDelete) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to delete responses in this organization',
        });
      }
    }

    await responsesService.deleteResponse(id);

    return res.status(200).json({
      success: true,
      message: 'Response deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Response not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to delete response',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
