/**
 * Authentication utilities for API endpoints
 * Shared JWT verification logic using Clerk with Organization support
 */

import type { VercelRequest } from '@vercel/node';
import { clerkService } from '../../src/services/auth/clerk.service';
import { getDb } from '../../src/lib/db';

/**
 * Extended authentication context including organization information
 * Note: Using Clerk's default roles (free tier)
 * - 'admin': Organization administrator
 * - 'basic_member': Regular member
 */
export interface AuthContext {
  userId: string;
  orgId: string | null;
  orgRole: 'admin' | 'basic_member' | null;
}

/**
 * Get full authentication context including organization information
 * Returns AuthContext with userId, orgId, and orgRole
 */
export async function getAuthContext(req: VercelRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);

    // Verify JWT token with Clerk - get FULL session claims
    const sessionClaims = await clerkService.verifySessionToken(token);

    if (!sessionClaims) {
      return null;
    }

    const clerkUserId = sessionClaims.sub;
    const clerkOrgId = sessionClaims.org_id || null;
    const clerkOrgRole = sessionClaims.org_role || null;

    // Look up database user by Clerk ID
    const db = getDb();
    const user = await db('users')
      .where('clerk_id', clerkUserId)
      .whereNull('deleted_at')
      .first('id');

    if (!user) {
      console.error(`No database user found for Clerk ID: ${clerkUserId}`);
      return null;
    }

    // Return full auth context
    return {
      userId: user.id,
      orgId: clerkOrgId,
      orgRole: clerkOrgRole,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Simplified role-based access check for Clerk free tier
 * Clerk free tier only supports default roles (admin, basic_member)
 *
 * Access levels:
 * - 'admin': Full control (create, read, update, delete, manage members)
 * - 'member': Can create, read, update forms/responses/data sources (cannot delete or manage members)
 *
 * @param req - Vercel request object with auth headers
 * @param action - The action to check: 'read', 'write', 'delete', or 'manage'
 * @returns true if user has access, false otherwise
 */
export async function checkAccess(
  req: VercelRequest,
  action: 'read' | 'write' | 'delete' | 'manage',
): Promise<boolean> {
  const context = await getAuthContext(req);

  if (!context || !context.orgId || !context.orgRole) {
    // No org context or not authenticated
    return false;
  }

  // Admin has full access to everything
  if (context.orgRole === 'admin') {
    return true;
  }

  // Basic members can read and write, but not delete or manage
  if (context.orgRole === 'basic_member') {
    return action === 'read' || action === 'write';
  }

  return false;
}

/**
 * @deprecated Use checkAccess instead. Kept for backward compatibility.
 * This function was designed for granular permissions which require Clerk Pro.
 */
export async function checkPermission(
  req: VercelRequest,
  permission: string,
): Promise<boolean> {
  // Map old permission strings to new access levels
  if (permission.includes(':read')) {
    return checkAccess(req, 'read');
  }
  if (permission.includes(':delete')) {
    return checkAccess(req, 'delete');
  }
  if (permission.includes(':manage')) {
    return checkAccess(req, 'manage');
  }
  // Default: treat as write (create/update)
  return checkAccess(req, 'write');
}

/**
 * Verify user authentication from Clerk JWT token (Backward Compatibility)
 * Returns database userId (UUID) if valid, null otherwise
 */
export async function getUserFromAuth(req: VercelRequest): Promise<string | null> {
  const context = await getAuthContext(req);
  return context ? context.userId : null;
}
