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

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/users/stats
 * Get user statistics (admin/manager only - for dashboard)
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'נדרש שיוך לארגון',
        },
      });
    }

    const stats = await query<{ role: string; count: string }>(
      `
      SELECT role, COUNT(*) as count
      FROM users
      WHERE organization_id = $1
        AND deleted_at IS NULL
      GROUP BY role
      `,
      [organizationId],
    );

    const totalUsers = stats.reduce((sum, row) => sum + parseInt(row.count), 0);
    const roleDistribution = stats.reduce(
      (acc, row) => {
        acc[row.role as 'admin' | 'manager' | 'worker'] = parseInt(row.count);
        return acc;
      },
      { admin: 0, manager: 0, worker: 0 } as { admin: number; manager: number; worker: number },
    );

    return res.json({
      totalUsers,
      roleDistribution,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/users/invite
 * Invite a new user to the organization (admin only)
 */
router.post('/invite', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { email, role } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'נדרש שיוך לארגון',
        },
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'worker'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ROLE',
          message: 'תפקיד לא תקין',
        },
      });
    }

    // Check if email already exists in organization
    const existing = await query<{ id: string }>(
      `
      SELECT id FROM users
      WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL
      `,
      [email, organizationId],
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'משתמש עם אימייל זה כבר קיים בארגון',
        },
      });
    }

    // For now, create a placeholder user that will be updated when they sign up via Clerk
    // In a full implementation, this would send an invitation email via Clerk
    const newUsers = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `
      INSERT INTO users (organization_id, clerk_user_id, email, name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role, created_at, updated_at
      `,
      [organizationId, `pending_${Date.now()}_${email}`, email, email.split('@')[0], role],
    );

    return res.status(201).json({
      success: true,
      message: 'הזמנה נשלחה בהצלחה',
      user: {
        id: newUsers[0].id,
        email: newUsers[0].email,
        name: newUsers[0].name,
        role: newUsers[0].role,
        organizationId,
        createdAt: newUsers[0].created_at,
        updatedAt: newUsers[0].updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/users
 * Get all users in the organization (admin only)
 */
router.get('/', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'נדרש שיוך לארגון',
        },
      });
    }

    const users = await query<{
      id: string;
      organization_id: string;
      clerk_user_id: string;
      email: string;
      name: string;
      role: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `
      SELECT id, organization_id, clerk_user_id, email, name, role, created_at, updated_at
      FROM users
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      `,
      [organizationId],
    );

    const userProfiles = users.map((user) => ({
      id: user.id,
      organizationId: user.organization_id,
      clerkUserId: user.clerk_user_id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    return res.json(userProfiles);
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/users/:id/role
 * Update user role (admin only)
 */
router.patch('/:id/role', async (req, res, next) => {
  try {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { role } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'נדרש שיוך לארגון',
        },
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'worker'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ROLE',
          message: 'תפקיד לא תקין',
        },
      });
    }

    const updated = await query<{
      id: string;
      organization_id: string;
      clerk_user_id: string;
      email: string;
      name: string;
      role: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `
      UPDATE users
      SET role = $1, updated_at = NOW()
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      RETURNING id, organization_id, clerk_user_id, email, name, role, created_at, updated_at
      `,
      [role, id, organizationId],
    );

    if (updated.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'משתמש לא נמצא',
        },
      });
    }

    const user = updated[0];
    return res.json({
      id: user.id,
      organizationId: user.organization_id,
      clerkUserId: user.clerk_user_id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/v1/users/:id
 * Remove user from organization (admin only)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { organizationId, id: currentUserId } = req.user!;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ORGANIZATION',
          message: 'נדרש שיוך לארגון',
        },
      });
    }

    // Prevent self-deletion
    const userToDelete = await query<{ clerk_user_id: string }>(
      `SELECT clerk_user_id FROM users WHERE id = $1 AND organization_id = $2`,
      [id, organizationId],
    );

    if (userToDelete.length > 0 && userToDelete[0].clerk_user_id === currentUserId) {
      return res.status(400).json({
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'לא ניתן למחוק את עצמך',
        },
      });
    }

    // Soft delete
    const deleted = await query<{ id: string }>(
      `
      UPDATE users
      SET deleted_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING id
      `,
      [id, organizationId],
    );

    if (deleted.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'משתמש לא נמצא',
        },
      });
    }

    return res.json({
      success: true,
      message: 'משתמש הוסר בהצלחה',
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
