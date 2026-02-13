import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';

/**
 * Middleware: Sync user from Clerk to database
 *
 * This middleware runs AFTER authenticateJWT.
 * It ensures the user exists in our database (upsert).
 * IMPORTANT: Does NOT overwrite existing role - allows DB-based role management
 */
export async function syncUser(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      // authenticateJWT should have set req.user
      return next();
    }

    const { id: clerkUserId, organizationId, email, name, role: clerkRole } = req.user;

    // 1. Upsert organization (if doesn't exist) and get the internal DB ID
    const orgResult = await query<{ id: string }>(
      `
      INSERT INTO organizations (clerk_org_id, name)
      VALUES ($1, $2)
      ON CONFLICT (clerk_org_id) DO UPDATE
      SET updated_at = NOW()
      RETURNING id
    `,
      [organizationId, (name?.split(' ')[0] || 'User') + "'s Organization"], // Default org name
    );

    // Get the internal organization ID (UUID)
    const dbOrganizationId = orgResult[0]?.id;

    // 2. Check if user exists and get their current role
    const existingUser = await query<{ id: string; role: string }>(
      `SELECT id, role FROM users WHERE clerk_user_id = $1`,
      [clerkUserId],
    );

    let dbRole: string;
    let dbUserId: string;

    if (existingUser.length > 0) {
      // User exists - keep their database role, only update email/name
      dbRole = existingUser[0].role;
      dbUserId = existingUser[0].id;
      await query(
        `
        UPDATE users
        SET email = $2, name = $3, updated_at = NOW()
        WHERE clerk_user_id = $1
        `,
        [clerkUserId, email, name],
      );
    } else {
      // New user - check if this is the first user in the organization
      const existingOrgUsers = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM users WHERE organization_id = $1`,
        [dbOrganizationId],
      );
      const isFirstUser = parseInt(existingOrgUsers[0]?.count || '0') === 0;

      // First user in org gets admin role, others get the Clerk role (defaults to 'worker')
      const assignedRole = isFirstUser ? 'admin' : clerkRole;

      const result = await query<{ id: string }>(
        `
        INSERT INTO users (
          clerk_user_id,
          organization_id,
          email,
          name,
          role
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )
        RETURNING id
        `,
        [clerkUserId, dbOrganizationId, email, name, assignedRole],
      );
      dbRole = assignedRole;
      dbUserId = result[0]?.id;

      if (isFirstUser) {
        logger.info('First user in organization - assigned admin role', {
          clerkUserId,
          dbOrganizationId,
          email,
        });
      }
    }

    // 3. Update req.user with the database role and internal organization ID
    req.user.role = dbRole;
    req.user.organizationId = dbOrganizationId;

    logger.debug('User synced to database', {
      clerkUserId,
      dbUserId,
      clerkOrgId: organizationId,
      dbOrgId: dbOrganizationId,
      email,
      role: dbRole,
    });

    next();
  } catch (error: any) {
    logger.error('Failed to sync user to database', {
      error: error.message,
      user: req.user,
    });
    // Don't block request if sync fails - log and continue
    next();
  }
}
