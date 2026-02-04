/**
 * Access Control Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  requireFeature,
  checkLimit,
  requireTier,
  requireFeatureWithLimit,
} from './access-control';
import {
  Feature,
  FeatureLimit,
  UserTier,
} from '../../packages/app/src/services/access-control/AccessControl';

// Mock dependencies
vi.mock('../lib/auth.js', () => ({
  getAuthContext: vi.fn(),
}));

vi.mock('../../packages/app/src/services/access-control/AccessControl.js', async () => {
  const actual = await vi.importActual<typeof import('../../packages/app/src/services/access-control/AccessControl.js')>(
    '../../packages/app/src/services/access-control/AccessControl.js'
  );
  return {
    ...actual,
    AccessControl: vi.fn().mockImplementation(() => ({
      canAccessFeature: vi.fn(),
      checkLimit: vi.fn(),
      getUserTier: vi.fn(),
    })),
  };
});

import { getAuthContext } from '../lib/auth.js';
import { AccessControl } from '../../packages/app/src/services/access-control/AccessControl.js';

describe('Access Control Middleware', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let mockNext: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock response
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      headers: {
        authorization: 'Bearer test-token',
      },
    } as Partial<VercelRequest>;

    mockRes = {
      status: statusMock,
      json: jsonMock,
    } as Partial<VercelResponse>;

    mockNext = vi.fn();
  });

  describe('requireFeature', () => {
    it('should allow access when user has feature', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock access control
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: true,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call middleware
      const middleware = requireFeature(Feature.AI_EXTRACTION);
      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(getAuthContext).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access when user does not have feature', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock access control - feature not available
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: false,
          reason: 'Requires PRO tier',
          requiredTier: UserTier.PRO,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call middleware
      const middleware = requireFeature(Feature.AI_EXTRACTION);
      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Feature not available',
          requiredTier: UserTier.PRO,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      // Mock no auth
      vi.mocked(getAuthContext).mockResolvedValue(null);

      // Call middleware
      const middleware = requireFeature(Feature.AI_EXTRACTION);
      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkLimit', () => {
    it('should allow when under limit', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock limit check - under limit
      const mockAccessControl = {
        checkLimit: vi.fn().mockResolvedValue({
          allowed: true,
          current: 5,
          limit: 10,
          percentUsed: 50,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call middleware
      const middleware = checkLimit(FeatureLimit.FORMS_COUNT, 5);
      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny when limit exceeded', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock limit check - exceeded
      const mockAccessControl = {
        checkLimit: vi.fn().mockResolvedValue({
          allowed: false,
          current: 10,
          limit: 10,
          percentUsed: 100,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call middleware
      const middleware = checkLimit(FeatureLimit.FORMS_COUNT, 10);
      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Limit exceeded',
          current: 10,
          limit: 10,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireTier', () => {
    it('should allow when user has sufficient tier', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock tier check - PRO user
      const mockAccessControl = {
        getUserTier: vi.fn().mockResolvedValue(UserTier.PRO),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call middleware - require PRO
      const middleware = requireTier(UserTier.PRO);
      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny when user has insufficient tier', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock tier check - FREE user
      const mockAccessControl = {
        getUserTier: vi.fn().mockResolvedValue(UserTier.FREE),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call middleware - require PRO
      const middleware = requireTier(UserTier.PRO);
      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient tier',
          currentTier: UserTier.FREE,
          requiredTier: UserTier.PRO,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow ENTERPRISE user for PRO endpoint', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock tier check - ENTERPRISE user
      const mockAccessControl = {
        getUserTier: vi.fn().mockResolvedValue(UserTier.ENTERPRISE),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call middleware - require PRO
      const middleware = requireTier(UserTier.PRO);
      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('requireFeatureWithLimit', () => {
    it('should check both feature and limit', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock both checks pass
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({ allowed: true }),
        checkLimit: vi.fn().mockResolvedValue({ allowed: true, current: 5, limit: 10 }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call combined middleware
      const middleware = requireFeatureWithLimit(
        Feature.AI_EXTRACTION,
        FeatureLimit.API_CALLS_PER_HOUR,
        5
      );

      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions
      expect(mockAccessControl.canAccessFeature).toHaveBeenCalledWith(Feature.AI_EXTRACTION);
      expect(mockAccessControl.checkLimit).toHaveBeenCalledWith(
        FeatureLimit.API_CALLS_PER_HOUR,
        5
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block if feature check fails', async () => {
      // Mock auth
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: 'test-user-id',
        orgId: null,
        orgRole: null,
      });

      // Mock feature check fails
      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: false,
          reason: 'Requires PRO',
        }),
        checkLimit: vi.fn().mockResolvedValue({ allowed: true }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      // Call combined middleware
      const middleware = requireFeatureWithLimit(
        Feature.AI_EXTRACTION,
        FeatureLimit.API_CALLS_PER_HOUR,
        5
      );

      await middleware(
        mockReq as VercelRequest,
        mockRes as VercelResponse,
        mockNext
      );

      // Assertions - should stop at feature check
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
