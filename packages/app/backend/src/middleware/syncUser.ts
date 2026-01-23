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

    // 1. Upsert organization (if doesn't exist)
    await query(
      `
      INSERT INTO organizations (clerk_organization_id, name)
      VALUES ($1, $2)
      ON CONFLICT (clerk_organization_id) DO UPDATE
      SET updated_at = NOW()
      RETURNING id
    `,
      [organizationId, (name?.split(' ')[0] || 'User') + "'s Organization"], // Default org name
    );

    // 2. Upsert user
    const result = await query(
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
        (SELECT id FROM organizations WHERE clerk_organization_id = $2),
        $3,
        $4,
        $5
      )
      ON CONFLICT (clerk_user_id) DO UPDATE
      SET
        email = $3,
        name = $4,
        role = $5,
        updated_at = NOW()
      RETURNING id
    `,
      [clerkUserId, organizationId, email, name, role],
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
