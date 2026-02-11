import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';

/**
 * Middleware: Sync user from Clerk to database
 *
 * This middleware runs AFTER authenticateJWT.
 * It ensures the user exists in our database (upsert).
 */
export async function syncUser(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      // authenticateJWT should have set req.user
      return next();
    }

    const { id: clerkUserId, organizationId, email, name, role } = req.user;

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

    // 2. Upsert user using clerk_user_id as the unique constraint
    // Note: clerk_id is a legacy column that mirrors clerk_user_id
    const result = await query(
      `
      INSERT INTO users (
        clerk_id,
        clerk_user_id,
        organization_id,
        email,
        name,
        role
      )
      VALUES ($1, $1, $2, $3, $4, $5)
      ON CONFLICT (clerk_user_id) DO UPDATE
      SET
        organization_id = COALESCE($2, users.organization_id),
        email = COALESCE($3, users.email),
        name = COALESCE($4, users.name),
        role = COALESCE($5, users.role),
        updated_at = NOW()
      RETURNING id
    `,
      [clerkUserId, dbOrgId, email, name, role],
    );

    logger.debug('User synced to database', {
      clerkUserId,
      dbUserId: result[0]?.id,
      email,
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
