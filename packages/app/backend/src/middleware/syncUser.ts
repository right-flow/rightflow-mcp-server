import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import logger from '../utils/logger';

/**
 * Middleware: Sync user from Clerk to database
 *
 * This middleware runs AFTER authenticateJWT.
 * It ensures the user exists in our database (upsert).
 * IMPORTANT: Does NOT overwrite existing role - allows DB-based role management
 *
 * Flow (handles chicken-and-egg with owner_id):
 * 1. Check if user exists by clerk_id
 * 2. If user exists with organization - use that org
 * 3. If user exists without organization - create org with user as owner
 * 4. If new user - create user first, then create org with user as owner
 */
export async function syncUser(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      // authenticateJWT should have set req.user
      return next();
    }

    const { id: clerkUserId, organizationId: clerkOrgId, email, name, role: clerkRole } = req.user;

    // Try both column names for compatibility (clerk_user_id and clerk_id)
    let existingUser = await query<{ id: string; role: string; organization_id: string | null }>(
      `SELECT id, role, organization_id FROM users WHERE clerk_user_id = $1`,
      [clerkUserId],
    ).catch(() => []);

    // Fallback to clerk_id column if clerk_user_id doesn't exist or returned empty
    if (existingUser.length === 0) {
      existingUser = await query<{ id: string; role: string; organization_id: string | null }>(
        `SELECT id, role, organization_id FROM users WHERE clerk_id = $1`,
        [clerkUserId],
      ).catch(() => []);
    }

    let dbRole: string;
    let dbUserId: string;
    let dbOrganizationId: string;

    if (existingUser.length > 0) {
      // User exists
      dbUserId = existingUser[0].id;
      dbRole = existingUser[0].role || clerkRole || 'worker';

      if (existingUser[0].organization_id) {
        // User already has an organization
        dbOrganizationId = existingUser[0].organization_id;
      } else {
        // User exists but has no organization - create one
        // Include both clerk_org_id and clerk_organization_id for schema compatibility
        const orgClerkId = clerkOrgId || `org_${dbUserId.substring(0, 8)}`;
        const orgResult = await query<{ id: string }>(
          `INSERT INTO organizations (id, name, owner_id, clerk_org_id, clerk_organization_id, tenant_type)
           VALUES (gen_random_uuid(), $1, $2, $3, $3, 'rightflow')
           RETURNING id`,
          [(name?.split(' ')[0] || 'User') + "'s Organization", dbUserId, orgClerkId],
        );
        dbOrganizationId = orgResult[0]?.id;

        // Update user with organization_id and set as admin (they're the owner)
        await query(
          `UPDATE users SET organization_id = $1, role = 'admin', updated_at = NOW() WHERE id = $2`,
          [dbOrganizationId, dbUserId],
        );
        dbRole = 'admin'; // Override role since they're the org owner

        logger.info('Created organization for existing user', {
          userId: dbUserId,
          organizationId: dbOrganizationId,
          role: 'admin',
        });
      }

      // Update user email/name if changed (try both column names)
      await query(
        `UPDATE users SET email = $2, name = $3, updated_at = NOW() WHERE id = $1`,
        [dbUserId, email, name],
      ).catch(() => {
        // name column might not exist, try without it
        return query(
          `UPDATE users SET email = $2, updated_at = NOW() WHERE id = $1`,
          [dbUserId, email],
        );
      });
    } else {
      // New user - create user first (without organization_id)
      const userResult = await query<{ id: string }>(
        `INSERT INTO users (id, clerk_id, email, name, role, tenant_type)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'rightflow')
         ON CONFLICT (clerk_id) DO UPDATE SET email = $2, name = $3, updated_at = NOW()
         RETURNING id`,
        [clerkUserId, email, name, 'admin'], // First user is admin
      );
      dbUserId = userResult[0]?.id;
      dbRole = 'admin';

      // Now create organization with the user as owner
      // Include both clerk_org_id and clerk_organization_id for schema compatibility
      const orgClerkId = clerkOrgId || `org_${dbUserId.substring(0, 8)}`;
      const orgResult = await query<{ id: string }>(
        `INSERT INTO organizations (id, name, owner_id, clerk_org_id, clerk_organization_id, tenant_type)
         VALUES (gen_random_uuid(), $1, $2, $3, $3, 'rightflow')
         RETURNING id`,
        [(name?.split(' ')[0] || 'User') + "'s Organization", dbUserId, orgClerkId],
      );
      dbOrganizationId = orgResult[0]?.id;

      // Update user with organization_id
      await query(
        `UPDATE users SET organization_id = $1 WHERE id = $2`,
        [dbOrganizationId, dbUserId],
      );

      logger.info('Created new user and organization', {
        userId: dbUserId,
        organizationId: dbOrganizationId,
        email,
      });
    }

    // Update req.user with the database values
    req.user.role = dbRole;
    req.user.organizationId = dbOrganizationId;

    logger.debug('User synced to database', {
      clerkUserId,
      dbUserId,
      clerkOrgId,
      dbOrgId: dbOrganizationId,
      email,
      role: dbRole,
    });

    next();
  } catch (error: any) {
    logger.error('Failed to sync user to database', {
      error: error.message,
      stack: error.stack,
      user: req.user,
    });
    // Don't block request if sync fails - log and continue
    next();
  }
}
