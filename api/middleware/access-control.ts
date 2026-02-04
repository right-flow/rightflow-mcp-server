/**
 * Access Control Middleware
 * Protects API endpoints with tier-based access control
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthContext } from '../lib/auth.js';
import {
  AccessControl,
  Feature,
  FeatureLimit,
  UserTier,
} from '../../packages/app/src/services/access-control/AccessControl.js';

/**
 * Middleware to require a specific feature access
 * Returns 403 if user doesn't have access to the feature
 *
 * @param feature - The feature to check access for
 * @returns Middleware function
 *
 * @example
 * // Protect AI extraction endpoint
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   await requireFeature(Feature.AI_EXTRACTION)(req, res, async () => {
 *     // AI extraction logic here
 *   });
 * }
 */
export function requireFeature(feature: Feature) {
  return async (
    req: VercelRequest,
    res: VercelResponse,
    next: () => Promise<void> | void
  ) => {
    // Get auth context
    const auth = await getAuthContext(req);
    if (!auth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check feature access
    const accessControl = new AccessControl(auth.userId);
    const result = await accessControl.canAccessFeature(feature);

    if (!result.allowed) {
      return res.status(403).json({
        error: 'Feature not available',
        message: result.reason || 'This feature requires a higher tier',
        requiredTier: result.requiredTier,
        upgradePath: result.upgradePath,
        feature,
      });
    }

    // Feature access granted, continue
    return next();
  };
}

/**
 * Middleware to check usage limit
 * Returns 429 if user has exceeded the limit
 *
 * @param limit - The limit to check
 * @param currentCount - Current usage count
 * @returns Middleware function
 *
 * @example
 * // Protect forms endpoint with count limit
 * const userFormsCount = await db('forms')
 *   .where({ user_id: auth.userId })
 *   .count('* as count')
 *   .first();
 *
 * await checkLimit(FeatureLimit.FORMS_COUNT, userFormsCount?.count || 0)(req, res, async () => {
 *   // Form creation logic here
 * });
 */
export function checkLimit(limit: FeatureLimit, currentCount: number) {
  return async (
    req: VercelRequest,
    res: VercelResponse,
    next: () => Promise<void> | void
  ) => {
    // Get auth context
    const auth = await getAuthContext(req);
    if (!auth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check limit
    const accessControl = new AccessControl(auth.userId);
    const result = await accessControl.checkLimit(limit, currentCount);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Limit exceeded',
        message: `You have reached your ${limit} limit`,
        current: result.current,
        limit: result.limit,
        percentUsed: result.percentUsed,
        resetDate: result.resetDate,
      });
    }

    // Limit check passed, continue
    return next();
  };
}

/**
 * Middleware to require minimum tier
 * Returns 403 if user doesn't have the required tier
 *
 * @param minTier - Minimum tier required
 * @returns Middleware function
 *
 * @example
 * // Require PRO tier for endpoint
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   await requireTier(UserTier.PRO)(req, res, async () => {
 *     // PRO-only logic here
 *   });
 * }
 */
export function requireTier(minTier: UserTier) {
  return async (
    req: VercelRequest,
    res: VercelResponse,
    next: () => Promise<void> | void
  ) => {
    // Get auth context
    const auth = await getAuthContext(req);
    if (!auth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Get user tier
    const accessControl = new AccessControl(auth.userId);
    const userTier = await accessControl.getUserTier();

    // Check if tier is sufficient
    const tierHierarchy = [
      UserTier.GUEST,
      UserTier.FREE,
      UserTier.PRO,
      UserTier.ENTERPRISE,
    ];

    const userTierIndex = tierHierarchy.indexOf(userTier);
    const minTierIndex = tierHierarchy.indexOf(minTier);

    if (userTierIndex < minTierIndex) {
      return res.status(403).json({
        error: 'Insufficient tier',
        message: `This endpoint requires ${minTier} tier or higher`,
        currentTier: userTier,
        requiredTier: minTier,
      });
    }

    // Tier requirement met, continue
    return next();
  };
}

/**
 * Combined middleware for feature + limit checking
 * Useful when you want to check both feature access and usage limits
 *
 * @param feature - Feature to check
 * @param limit - Limit to check
 * @param currentCount - Current usage count
 * @returns Middleware function
 *
 * @example
 * // Check both AI extraction feature and API rate limit
 * await requireFeatureWithLimit(
 *   Feature.AI_EXTRACTION,
 *   FeatureLimit.API_CALLS_PER_HOUR,
 *   currentApiCalls
 * )(req, res, async () => {
 *   // Protected logic here
 * });
 */
export function requireFeatureWithLimit(
  feature: Feature,
  limit: FeatureLimit,
  currentCount: number
) {
  return async (
    req: VercelRequest,
    res: VercelResponse,
    next: () => Promise<void> | void
  ) => {
    // First check feature access
    await requireFeature(feature)(req, res, async () => {
      // Then check limit
      await checkLimit(limit, currentCount)(req, res, next);
    });
  };
}
