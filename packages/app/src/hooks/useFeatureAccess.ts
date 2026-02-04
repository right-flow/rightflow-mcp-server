/**
 * useFeatureAccess Hook
 * Provides access to feature permissions and user tier information
 */

import { useUser } from '@clerk/clerk-react';
import { AccessControl, Feature, UserTier } from '@/services/access-control/AccessControl';
import { useMemo, useCallback } from 'react';

export function useFeatureAccess() {
  const { user } = useUser();

  const accessControl = useMemo(() => {
    if (!user) return null;
    return new AccessControl(user.id);
  }, [user?.id]);

  const canAccess = useCallback(
    async (feature: Feature) => {
      if (!accessControl) {
        return { allowed: false, reason: 'Not authenticated' };
      }
      return accessControl.canAccessFeature(feature);
    },
    [accessControl]
  );

  const userTier = (user?.publicMetadata?.tier as UserTier) || UserTier.FREE;

  const isPro = userTier === UserTier.PRO || userTier === UserTier.ENTERPRISE;
  const isEnterprise = userTier === UserTier.ENTERPRISE;

  return useMemo(
    () => ({
      canAccess,
      userTier,
      isPro,
      isEnterprise,
    }),
    [canAccess, userTier, isPro, isEnterprise]
  );
}
