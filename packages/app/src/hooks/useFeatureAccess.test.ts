/**
 * useFeatureAccess Hook Tests (TDD)
 * Red phase - these tests will fail until we implement the hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeatureAccess } from './useFeatureAccess';
import { Feature, UserTier } from '@/services/access-control/AccessControl';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(),
}));

// Mock AccessControl
vi.mock('@/services/access-control/AccessControl', async () => {
  const actual = await vi.importActual<typeof import('@/services/access-control/AccessControl')>(
    '@/services/access-control/AccessControl'
  );
  return {
    ...actual,
    AccessControl: vi.fn(),
  };
});

import { useUser } from '@clerk/clerk-react';
import { AccessControl } from '@/services/access-control/AccessControl';

describe('useFeatureAccess Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Tier Detection', () => {
    it('should return FREE tier for user without metadata', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: {},
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      expect(result.current.userTier).toBe(UserTier.FREE);
      expect(result.current.isPro).toBe(false);
      expect(result.current.isEnterprise).toBe(false);
    });

    it('should return PRO tier when set in metadata', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: {
            tier: UserTier.PRO,
          },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      expect(result.current.userTier).toBe(UserTier.PRO);
      expect(result.current.isPro).toBe(true);
      expect(result.current.isEnterprise).toBe(false);
    });

    it('should return ENTERPRISE tier when set in metadata', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: {
            tier: UserTier.ENTERPRISE,
          },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      expect(result.current.userTier).toBe(UserTier.ENTERPRISE);
      expect(result.current.isPro).toBe(true);
      expect(result.current.isEnterprise).toBe(true);
    });
  });

  describe('canAccess Function', () => {
    it('should check feature access and return result', async () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: { tier: UserTier.FREE },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: false,
          reason: 'Requires PRO tier',
          requiredTier: UserTier.PRO,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      const { result } = renderHook(() => useFeatureAccess());

      const accessResult = await result.current.canAccess(Feature.AI_EXTRACTION);

      expect(accessResult.allowed).toBe(false);
      expect(accessResult.reason).toBe('Requires PRO tier');
      expect(accessResult.requiredTier).toBe(UserTier.PRO);
    });

    it('should allow PRO user to access AI extraction', async () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: { tier: UserTier.PRO },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const mockAccessControl = {
        canAccessFeature: vi.fn().mockResolvedValue({
          allowed: true,
        }),
      };
      vi.mocked(AccessControl).mockImplementation(() => mockAccessControl as any);

      const { result } = renderHook(() => useFeatureAccess());

      const accessResult = await result.current.canAccess(Feature.AI_EXTRACTION);

      expect(accessResult.allowed).toBe(true);
    });

    it('should return not authenticated when no user', async () => {
      vi.mocked(useUser).mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      const accessResult = await result.current.canAccess(Feature.AI_EXTRACTION);

      expect(accessResult.allowed).toBe(false);
      expect(accessResult.reason).toBe('Not authenticated');
    });
  });

  describe('Helper Properties', () => {
    it('should set isPro to true for PRO tier', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: { tier: UserTier.PRO },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      expect(result.current.isPro).toBe(true);
    });

    it('should set isPro to true for ENTERPRISE tier', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: { tier: UserTier.ENTERPRISE },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      expect(result.current.isPro).toBe(true);
    });

    it('should set isPro to false for FREE tier', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: { tier: UserTier.FREE },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      expect(result.current.isPro).toBe(false);
    });

    it('should set isEnterprise to true only for ENTERPRISE tier', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: { tier: UserTier.ENTERPRISE },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      expect(result.current.isEnterprise).toBe(true);
    });

    it('should set isEnterprise to false for PRO tier', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: { tier: UserTier.PRO },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result } = renderHook(() => useFeatureAccess());

      expect(result.current.isEnterprise).toBe(false);
    });
  });

  describe('Memoization', () => {
    it('should not recreate AccessControl on re-render with same user', () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'test-user',
          publicMetadata: { tier: UserTier.PRO },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result, rerender } = renderHook(() => useFeatureAccess());

      const firstAccessControl = result.current;
      rerender();
      const secondAccessControl = result.current;

      // Should be the same instance
      expect(firstAccessControl).toBe(secondAccessControl);
    });

    it('should recreate AccessControl when user changes', () => {
      // First user - setup BEFORE render
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'user-1',
          publicMetadata: { tier: UserTier.FREE },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { result, rerender } = renderHook(() => useFeatureAccess());

      const firstTier = result.current.userTier;

      // Change user
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'user-2',
          publicMetadata: { tier: UserTier.PRO },
        },
        isLoaded: true,
        isSignedIn: true,
      } as any);

      rerender();

      const secondTier = result.current.userTier;

      expect(firstTier).not.toBe(secondTier);
    });
  });
});
