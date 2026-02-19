/**
 * MCP API Key Authentication Middleware
 *
 * Validates MCP API keys and ensures the organization is active.
 * API keys are used by the MCP server (Model Context Protocol) for Claude Code/Cowork integration.
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { AuthenticationError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Authenticate MCP API Key
 *
 * Validates the API key and checks:
 * 1. API key exists and is not revoked
 * 2. Organization exists and is active (not deleted)
 * 3. Organization status is not 'disabled' (if status field exists)
 *
 * Usage:
 *   router.use(authenticateMcpApiKey);
 *
 * Expected header:
 *   Authorization: Bearer rfk_<api_key>
 */
export async function authenticateMcpApiKey(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    // 1. Extract API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid Authorization header');
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "

    // 2. Validate API key format (rfk_ + 64 hex chars)
    if (!apiKey.startsWith('rfk_') || apiKey.length !== 68) {
      throw new AuthenticationError('Invalid API key format');
    }

    // 3. Get key prefix for database lookup
    const keyPrefix = apiKey.substring(0, 8); // "rfk_" + first 4 chars

    // 4. Find API key in database
    const keys = await query(
      `
      SELECT
        k.id,
        k.organization_id,
        k.key_hash,
        k.permissions,
        k.environment,
        k.revoked_at,
        o.deleted_at as org_deleted_at,
        o.name as org_name
      FROM mcp_api_keys k
      INNER JOIN organizations o ON k.organization_id = o.id
      WHERE k.key_prefix = $1
      LIMIT 1
      `,
      [keyPrefix],
    );

    if (!keys || keys.length === 0) {
      logger.warn('MCP API key not found', { keyPrefix });
      throw new AuthenticationError('Invalid API key');
    }

    const keyRecord = keys[0];

    // 5. Check if API key is revoked
    if (keyRecord.revoked_at) {
      logger.warn('MCP API key is revoked', {
        keyId: keyRecord.id,
        keyPrefix,
        revokedAt: keyRecord.revoked_at,
      });
      throw new AuthenticationError('API key has been revoked');
    }

    // 6. Verify API key hash
    const isValid = await bcrypt.compare(apiKey, keyRecord.key_hash);
    if (!isValid) {
      logger.warn('MCP API key hash mismatch', { keyPrefix });
      throw new AuthenticationError('Invalid API key');
    }

    // 7. ✅ CRITICAL: Check if organization is deleted (soft delete)
    if (keyRecord.org_deleted_at) {
      logger.warn('MCP API key organization is deleted', {
        keyId: keyRecord.id,
        orgId: keyRecord.organization_id,
        orgName: keyRecord.org_name,
        deletedAt: keyRecord.org_deleted_at,
      });
      throw new AuthenticationError('Organization is no longer active');
    }

    // 8. ✅ OPTIONAL: Check organization status (if status column exists)
    // Query organization status with COALESCE fallback for missing column
    // Note: As of Jan 2026, the status column doesn't exist but can be added later.
    // COALESCE will default to 'active' if the column is missing or NULL.
    try {
      const orgStatus = await query(
        `
        SELECT
          id,
          name,
          COALESCE(status, 'active') as status
        FROM organizations
        WHERE id = $1
        LIMIT 1
        `,
        [keyRecord.organization_id],
      );

      if (orgStatus && orgStatus.length > 0) {
        const status = orgStatus[0].status.toLowerCase();
        if (status === 'disabled' || status === 'suspended' || status === 'inactive') {
          logger.warn('MCP API key organization is disabled', {
            keyId: keyRecord.id,
            orgId: keyRecord.organization_id,
            orgName: keyRecord.org_name,
            status,
          });
          throw new AuthenticationError('Organization is disabled');
        }
      }
    } catch (statusCheckError: any) {
      // If status column doesn't exist (likely in older schemas), skip the check
      // The deleted_at check above (step 7) is the critical one
      if (statusCheckError.message?.includes('column') || statusCheckError.code === 'ERRCODE_UNDEFINED_COLUMN') {
        logger.debug('Organization status column not found, skipping status check', {
          keyId: keyRecord.id,
          orgId: keyRecord.organization_id,
        });
      } else {
        // Re-throw any other errors (connection issues, etc.)
        throw statusCheckError;
      }
    }

    // 9. Update last_used_at timestamp (non-blocking)
    query(
      `
      UPDATE mcp_api_keys
      SET last_used_at = NOW()
      WHERE id = $1
      `,
      [keyRecord.id],
    ).catch((error) => {
      logger.error('Failed to update API key last_used_at', {
        keyId: keyRecord.id,
        error: error.message,
      });
    });

    // 10. Attach API key info to request object
    req.user = {
      id: keyRecord.organization_id, // Use org ID as user ID for MCP
      organizationId: keyRecord.organization_id,
      role: 'api_key', // Special role for API key auth
      mcpApiKey: {
        id: keyRecord.id,
        keyPrefix,
        permissions: keyRecord.permissions,
        environment: keyRecord.environment,
      },
    };

    logger.debug('MCP API key authenticated', {
      keyId: keyRecord.id,
      orgId: keyRecord.organization_id,
      environment: keyRecord.environment,
    });

    // 11. Continue to next middleware/route handler
    next();
  } catch (error: any) {
    logger.error('MCP API key authentication failed', {
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof AuthenticationError) {
      return next(error);
    }

    return next(new AuthenticationError('Authentication failed'));
  }
}

/**
 * Check MCP API key permission
 *
 * Validates that the authenticated API key has the required permission.
 *
 * Usage:
 *   router.post('/fill', requireMcpPermission('fill'), handler);
 *
 * @param permission - The permission to check (fill, batch, audit, templates.read, templates.write)
 */
export function requireMcpPermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const mcpApiKey = req.user?.mcpApiKey;

    if (!mcpApiKey) {
      return next(new AuthenticationError('Not authenticated with MCP API key'));
    }

    const permissions = mcpApiKey.permissions || {};

    // Check nested permissions (e.g., "templates.read")
    if (permission.includes('.')) {
      const [category, action] = permission.split('.');
      if (!permissions[category] || !permissions[category][action]) {
        logger.warn('MCP API key missing permission', {
          keyId: mcpApiKey.id,
          permission,
          availablePermissions: permissions,
        });
        return next(
          new AuthenticationError(
            `API key does not have ${permission} permission`,
          ),
        );
      }
    } else {
      // Check top-level permissions
      if (!permissions[permission]) {
        logger.warn('MCP API key missing permission', {
          keyId: mcpApiKey.id,
          permission,
          availablePermissions: permissions,
        });
        return next(
          new AuthenticationError(
            `API key does not have ${permission} permission`,
          ),
        );
      }
    }

    next();
  };
}
