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
import { FormsService } from '../src/services/forms/forms.service';
const formsService = new FormsService();
/**
 * Verify user authentication from Clerk
 * TODO: Implement proper JWT verification with Clerk
 */
async function getUserFromAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    try {
        // TODO: Implement proper JWT verification with Clerk SDK
        // const token = authHeader.substring(7);
        // const clerkClient = clerkService.getClerkClient();
        // const session = await clerkClient.sessions.verifySession(token);
        // return session.userId;
        // TEMPORARY: Use x-user-id header for authentication
        // This is insecure and should be replaced with proper JWT verification
        const userId = req.headers['x-user-id'];
        if (!userId || userId.trim() === '') {
            return null;
        }
        return userId;
    }
    catch (error) {
        console.error('Auth error:', error);
        return null;
    }
}
/**
 * Main API handler
 */
export default async function handler(req, res) {
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
                return await handleGetForms(req, res, userId);
            case 'POST':
                return await handleCreateForm(req, res, userId);
            case 'PUT':
                return await handleUpdateForm(req, res, userId);
            case 'DELETE':
                return await handleDeleteForm(req, res, userId);
            default:
                return res.status(405).json({
                    error: 'Method not allowed',
                    message: `${req.method} is not supported`,
                });
        }
    }
    catch (error) {
        console.error('Forms API error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
/**
 * GET /api/forms
 * Get single form by ID or slug, or list all user forms
 */
async function handleGetForms(req, res, userId) {
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
        // Check ownership
        if (form.user_id !== userId) {
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
    // List all user forms
    const forms = await formsService.getUserForms(userId);
    return res.status(200).json({ forms });
}
/**
 * POST /api/forms
 * Create new form
 */
async function handleCreateForm(req, res, userId) {
    const { title, description, fields, stations, settings } = req.body;
    if (!title) {
        return res.status(400).json({
            error: 'Bad request',
            message: 'Form title is required',
        });
    }
    const result = await formsService.createForm({
        userId,
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
 * Update existing form
 */
async function handleUpdateForm(req, res, userId) {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({
            error: 'Bad request',
            message: 'Form ID is required',
        });
    }
    const { title, description, fields, stations, settings } = req.body;
    const result = await formsService.updateForm(id, userId, {
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
 * Delete form
 */
async function handleDeleteForm(req, res, userId) {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({
            error: 'Bad request',
            message: 'Form ID is required',
        });
    }
    const result = await formsService.deleteForm(id, userId);
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
//# sourceMappingURL=forms.js.map