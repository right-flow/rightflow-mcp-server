// Users Routes
// Created: 2026-02-07
// Purpose: API endpoints for user management and role-based access

import express from 'express';
import { z } from 'zod';
import { authenticateJWT, requireRole } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { query } from '../../config/database';
import { validateRequest } from '../../utils/validation';
import {
  NotFoundError,
  OrganizationMismatchError,
  ValidationError,
} from '../../utils/errors';
import logger from '../../utils/logger';

const router = express.Router();

// Apply authentication + user sync to all routes
router.use(authenticateJWT);
router.use(syncUser);

// ============================================================================
// Validation Schemas
// ============================================================================

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'worker']),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'worker']).default('worker'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/users/me
 * Get current user profile with role
 * Auth: Any authenticated user
 */
router.get('/me', async (req, res, next) => {
  try {
    const { id: clerkUserId, organizationId } = req.user!;

    // Get user from database
    const result = await query(
      `
      SELECT
        u.id,
        u.clerk_user_id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        u.updated_at,
        o.id as organization_id,
        o.clerk_organization_id
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.clerk_user_id = $1
        AND o.clerk_organization_id = $2
        AND u.deleted_at IS NULL
      `,
      [clerkUserId, organizationId]
    );

    if (result.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = result[0];

    res.json({
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
    next(error);
  }
});

/**
 * GET /api/v1/users
 * Get all users in organization
 * Auth: Admin only
 */
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    const result = await query(
      `
      SELECT
        u.id,
        u.clerk_user_id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        u.updated_at,
        o.id as organization_id
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE o.clerk_organization_id = $1
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      `,
      [organizationId]
    );

    const users = result.map((user: any) => ({
      id: user.id,
      organizationId: user.organization_id,
      clerkUserId: user.clerk_user_id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    res.json(users);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/stats
 * Get user statistics for organization
 * Auth: Admin or Manager
 * NOTE: This route MUST be defined before /:id to avoid being caught by the param route
 */
router.get('/stats', requireRole('manager'), async (req, res, next) => {
  try {
    const { organizationId } = req.user!;

    const result = await query(
      `
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
        COUNT(CASE WHEN role = 'worker' THEN 1 END) as worker_count
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE o.clerk_organization_id = $1
        AND u.deleted_at IS NULL
      `,
      [organizationId]
    );

    const stats = result[0];

    res.json({
      totalUsers: parseInt(stats.total_users, 10),
      roleDistribution: {
        admin: parseInt(stats.admin_count, 10),
        manager: parseInt(stats.manager_count, 10),
        worker: parseInt(stats.worker_count, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/:id
 * Get specific user by ID
 * Auth: Admin or self
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id: clerkUserId, organizationId, role } = req.user!;
    const { id: userId } = req.params;

    const result = await query(
      `
      SELECT
        u.id,
        u.clerk_user_id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        u.updated_at,
        o.id as organization_id,
        o.clerk_organization_id
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
        AND u.deleted_at IS NULL
      `,
      [userId]
    );

    if (result.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = result[0];

    // Check authorization: admin can view anyone in org, others can only view self
    if (user.clerk_organization_id !== organizationId) {
      throw new OrganizationMismatchError('User belongs to a different organization');
    }

    if (role !== 'admin' && user.clerk_user_id !== clerkUserId) {
      throw new OrganizationMismatchError('You can only view your own profile');
    }

    res.json({
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
    next(error);
  }
});

/**
 * PATCH /api/v1/users/:id/role
 * Update user role
 * Auth: Admin only
 */
router.patch(
  '/:id/role',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      // Validate request body
      const { role: newRole } = validateRequest(updateRoleSchema, req.body);

      const { organizationId, id: currentClerkUserId } = req.user!;
      const { id: userId } = req.params;

      // Get user to update
      const userResult = await query(
        `
        SELECT u.*, o.clerk_organization_id
        FROM users u
        JOIN organizations o ON u.organization_id = o.id
        WHERE u.id = $1
          AND u.deleted_at IS NULL
        `,
        [userId]
      );

      if (userResult.length === 0) {
        throw new NotFoundError('User not found');
      }

      const targetUser = userResult[0];

      // Verify same organization
      if (targetUser.clerk_organization_id !== organizationId) {
        throw new OrganizationMismatchError('Cannot modify user from different organization');
      }

      // Prevent demoting yourself from admin
      if (targetUser.clerk_user_id === currentClerkUserId && newRole !== 'admin') {
        throw new ValidationError('Cannot demote yourself from admin role');
      }

      // Update role
      const updateResult = await query(
        `
        UPDATE users
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [newRole, userId]
      );

      const updatedUser = updateResult[0];

      logger.info('User role updated', {
        userId,
        oldRole: targetUser.role,
        newRole,
        updatedBy: currentClerkUserId,
      });

      res.json({
        id: updatedUser.id,
        organizationId: updatedUser.organization_id,
        clerkUserId: updatedUser.clerk_user_id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/invite
 * Invite user to organization (placeholder - actual invite via Clerk)
 * Auth: Admin only
 */
router.post(
  '/invite',
  requireRole('admin'),
  async (req, res, next) => {
    try {
      // Validate request body
      const { email, role } = validateRequest(inviteUserSchema, req.body);

      // In a real implementation, this would:
      // 1. Send invite via Clerk Organizations API
      // 2. Store pending invite in database
      // 3. Handle invite acceptance webhook

      logger.info('User invite requested', {
        email,
        role,
        invitedBy: req.user!.id,
      });

      // For now, return success (actual Clerk integration TBD)
      res.json({
        success: true,
        message: `Invite sent to ${email} with role ${role}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/users/:id
 * Remove user from organization (soft delete)
 * Auth: Admin only
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { organizationId, id: currentClerkUserId } = req.user!;
    const { id: userId } = req.params;

    // Get user to delete
    const userResult = await query(
      `
      SELECT u.*, o.clerk_organization_id
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
        AND u.deleted_at IS NULL
      `,
      [userId]
    );

    if (userResult.length === 0) {
      throw new NotFoundError('User not found');
    }

    const targetUser = userResult[0];

    // Verify same organization
    if (targetUser.clerk_organization_id !== organizationId) {
      throw new OrganizationMismatchError('Cannot remove user from different organization');
    }

    // Prevent removing yourself
    if (targetUser.clerk_user_id === currentClerkUserId) {
      throw new ValidationError('Cannot remove yourself from organization');
    }

    // Soft delete
    await query(
      `
      UPDATE users
      SET deleted_at = NOW()
      WHERE id = $1
      `,
      [userId]
    );

    logger.info('User removed from organization', {
      userId,
      removedBy: currentClerkUserId,
    });

    res.json({
      success: true,
      message: 'User removed from organization',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
