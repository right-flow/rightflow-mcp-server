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

    // 1. Upsert organization and get its ID
    const orgResult = await query(
      `
      INSERT INTO organizations (clerk_organization_id, name)
      VALUES ($1, $2)
      ON CONFLICT (clerk_organization_id) DO UPDATE
      SET updated_at = NOW()
      RETURNING id
    `,
      [organizationId, (name?.split(' ')[0] || 'User') + "'s Organization"],
    );

    const dbOrgId = orgResult[0]?.id;

    // 2. Check if user exists and get their current role
    const existingUser = await query<{ id: string; role: string }>(
      `SELECT id, role FROM users WHERE clerk_user_id = $1`,
      [clerkUserId],
    );

    let dbRole: string;
    let dbUserId: string;

    if (existingUser.length > 0) {
      // User exists - keep their database role, only update email/name/org
      dbRole = existingUser[0].role;
      dbUserId = existingUser[0].id;
      await query(
        `
        UPDATE users
        SET organization_id = COALESCE($2, organization_id),
            email = COALESCE($3, email),
            name = COALESCE($4, name),
            updated_at = NOW()
        WHERE clerk_user_id = $1
        `,
        [clerkUserId, dbOrgId, email, name],
      );
    } else {
      // New user - insert with Clerk role (defaults to 'worker')
      const result = await query<{ id: string }>(
        `
        INSERT INTO users (
          clerk_id,
          clerk_user_id,
          organization_id,
          email,
          name,
          role
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [clerkUserId, clerkUserId, dbOrgId, email, name, clerkRole],
      );
      dbRole = clerkRole;
      dbUserId = result[0]?.id;
    }

    // 3. Update req.user with the database role (overrides Clerk default)
    req.user.role = dbRole;

    logger.debug('User synced to database', {
      clerkUserId,
      dbUserId,
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
