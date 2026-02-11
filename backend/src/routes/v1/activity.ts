import express from 'express';
import { authenticateJWT } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { query } from '../../config/database';

const router = express.Router();

// Apply authentication + user sync
router.use(authenticateJWT);
router.use(syncUser);

/**
 * GET /api/v1/activity/recent
 * Get recent activity for the organization (submissions, form updates, etc.)
 * Returns raw data - frontend handles i18n formatting
 */
router.get('/recent', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // Get recent submissions with form and user info
    const recentActivity = await query<{
      id: string;
      type: string;
      formName: string;
      userName: string | null;
      status: string;
      createdAt: Date;
    }>(
      `
      SELECT
        s.id,
        'submission' as type,
        f.name as "formName",
        u.name as "userName",
        s.status,
        s.created_at as "createdAt"
      FROM submissions s
      JOIN forms f ON s.form_id = f.id
      LEFT JOIN users u ON s.submitted_by_id = u.id
      WHERE s.organization_id = $1
        AND s.deleted_at IS NULL
      ORDER BY s.created_at DESC
      LIMIT $2
    `,
      [organizationId, limit],
    );

    // Return raw data - let frontend handle all i18n formatting
    const activities = recentActivity.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      formName: item.formName,
      userName: item.userName,
      createdAt: item.createdAt,
    }));

    res.json(activities);
  } catch (error) {
    next(error);
  }
});

export default router;
