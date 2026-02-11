import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthenticationError, InvalidTokenError } from '../utils/errors';
import logger from '../utils/logger';

// Extract Clerk domain from publishable key
// Key format: pk_test_BASE64ENCODED or pk_live_BASE64ENCODED
function getClerkDomain(): string {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error('CLERK_PUBLISHABLE_KEY is not set');
  }

  // Extract the base64 encoded part (after pk_test_ or pk_live_)
  const parts = publishableKey.split('_');
  if (parts.length < 3) {
    throw new Error('Invalid CLERK_PUBLISHABLE_KEY format');
  }

  // The third part is base64 encoded domain
  const encodedDomain = parts.slice(2).join('_');
  // Decode base64 and remove trailing $ if present
  const decoded = Buffer.from(encodedDomain, 'base64').toString('utf-8');
  return decoded.replace(/\$$/, '');
}

// Clerk's public key endpoint (for JWT signature verification)
const clerkDomain = getClerkDomain();
const client = jwksClient({
  jwksUri: `https://${clerkDomain}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

// Get Clerk's public key for signature verification
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        role: string;
        email: string;
        name: string;
      };
      id?: string;
    }
  }
}

// Middleware: Authenticate JWT
export async function authenticateJWT(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('נא להתחבר מחדש');
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // 2. Verify JWT signature and expiration
    const decoded: any = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        },
      );
    });

    // 3. Extract user info from JWT claims
    const userId = decoded.sub; // Clerk user ID
    const organizationId = decoded.org_id || decoded.org_slug;
    const role = decoded.metadata?.role || 'worker';
    const email = decoded.email;
    const name = decoded.name;

    // Debug: Log token contents to help troubleshoot
    logger.debug('JWT decoded', {
      userId,
      organizationId,
      hasOrgId: !!decoded.org_id,
      hasOrgSlug: !!decoded.org_slug,
      tokenKeys: Object.keys(decoded),
    });

    if (!userId) {
      throw new InvalidTokenError('אסימון לא תקין - חסר מזהה משתמש');
    }

    // For now, use a default organization if none is provided
    // TODO: Implement proper organization selection in frontend
    const finalOrgId = organizationId || 'default-org';

    // 4. Attach user info to request object
    req.user = {
      id: userId,
      organizationId: finalOrgId,
      role,
      email,
      name,
    };

    // 5. Continue to next middleware/route handler
    next();
  } catch (error: any) {
    logger.error('JWT validation failed', { error: error.message });

    if (error instanceof AuthenticationError || error instanceof InvalidTokenError) {
      return next(error);
    }

    // JWT library errors
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('אסימון פג תוקף, נא להתחבר מחדש'));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new InvalidTokenError('אסימון לא תקין'));
    }

    return next(new AuthenticationError());
  }
}

// Middleware: Require minimum role
export function requireRole(minRole: 'admin' | 'manager' | 'worker') {
  const roleHierarchy: Record<string, number> = {
    admin: 3,
    manager: 2,
    worker: 1,
  };

  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || roleHierarchy[userRole] < roleHierarchy[minRole]) {
      return next(
        new InvalidTokenError(
          `נדרשת הרשאת ${minRole} - יש לך הרשאת ${userRole || 'none'}`,
        ),
      );
    }

    next();
  };
}
