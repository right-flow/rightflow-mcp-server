/**
 * Authentication utilities for API endpoints
 * Shared JWT verification logic using Clerk
 */

import type { VercelRequest } from '@vercel/node';
import { clerkService } from '../../src/services/auth/clerk.service';
import { getDb } from '../../src/lib/db';

/**
 * Verify user authentication from Clerk JWT token
 * Returns database userId (UUID) if valid, null otherwise
 */
export async function getUserFromAuth(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);

    // Verify JWT token with Clerk - returns Clerk user ID
    const clerkUserId = await clerkService.verifySessionToken(token);

    if (!clerkUserId) {
      return null;
    }

    // Look up database user by Clerk ID
    const db = getDb();
    const user = await db('users')
      .where('clerk_id', clerkUserId)
      .first('id');

    if (!user) {
      console.error(`No database user found for Clerk ID: ${clerkUserId}`);
      return null;
    }

    // Return database user UUID
    return user.id;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}
