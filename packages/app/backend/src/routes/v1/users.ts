import express from 'express';
import { authenticateJWT } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { query } from '../../config/database';

const router = express.Router();

// Apply authentication + user sync
router.use(authenticateJWT);
router.use(syncUser);

/**
 * GET /api/v1/users/me
 * Get current user profile with role from database
 */
router.get('/me', async (req, res, next) => {
  try {
    const { id: clerkUserId, organizationId } = req.user!;

    // Get user from database (synced by middleware)
    const users = await query<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      createdAt: Date;
    }>(
      `
      SELECT id, email, name, role, created_at as "createdAt"
      FROM users
      WHERE clerk_user_id = $1
      `,
      [clerkUserId],
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'משתמש לא נמצא',
        },
      });
    }

    const user = users[0];

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/stats
 * Get user statistics (admin/manager only - for dashboard)
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    const stats = await query<{ role: string; count: string }>(
      `
      SELECT role, COUNT(*) as count
      FROM users
      WHERE organization_id = (SELECT id FROM organizations WHERE clerk_org_id = $1)
        AND deleted_at IS NULL
      GROUP BY role
      `,
      [organizationId],
    );

    const totalUsers = stats.reduce((sum, row) => sum + parseInt(row.count), 0);
    const byRole = stats.reduce(
      (acc, row) => {
        acc[row.role] = parseInt(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    res.json({
      total: totalUsers,
      byRole,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
