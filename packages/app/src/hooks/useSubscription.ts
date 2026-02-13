// useSubscription Hook
// Created: 2026-02-13
// Purpose: Global access to subscription data with White Label feature check

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { billingApi } from '../api/billingApi';
import { Subscription, PlanName } from '../api/types';

interface UseSubscriptionResult {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;

  // Computed properties
  planName: PlanName | null;
  hasWhiteLabel: boolean;
  hasCustomBranding: boolean;
  isEnterprise: boolean;
  isExpanded: boolean;
  isPaidPlan: boolean;

  // Actions
  refresh: () => Promise<void>;
}

// Cache to avoid multiple API calls
let subscriptionCache: { data: Subscription | null; timestamp: number; orgId: string } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for accessing subscription data globally
 * Includes White Label feature check for EXPANDED and ENTERPRISE plans
 */
export function useSubscription(): UseSubscriptionResult {
  const { orgId } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use demo orgId if not authenticated (for development)
  const effectiveOrgId = orgId || 'org_demo';

  const fetchSubscription = useCallback(async () => {
    if (!effectiveOrgId) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (
      subscriptionCache &&
      subscriptionCache.orgId === effectiveOrgId &&
      Date.now() - subscriptionCache.timestamp < CACHE_TTL
    ) {
      setSubscription(subscriptionCache.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await billingApi.getSubscription(effectiveOrgId);

      // Update cache
      subscriptionCache = {
        data,
        timestamp: Date.now(),
        orgId: effectiveOrgId,
      };

      setSubscription(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(errorMessage);
      console.error('useSubscription error:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId]);

  const refresh = useCallback(async () => {
    // Clear cache to force refresh
    subscriptionCache = null;
    await fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Computed properties
  const planName = useMemo<PlanName | null>(() => {
    return subscription?.plan?.name || null;
  }, [subscription]);

  const hasCustomBranding = useMemo(() => {
    // customBranding: true means the user CAN use custom branding (White Label)
    // This is available for EXPANDED and ENTERPRISE plans
    return subscription?.plan?.features?.customBranding === true;
  }, [subscription]);

  const hasWhiteLabel = hasCustomBranding; // Alias for clarity

  const isEnterprise = useMemo(() => {
    return planName === 'ENTERPRISE';
  }, [planName]);

  const isExpanded = useMemo(() => {
    return planName === 'EXPANDED';
  }, [planName]);

  const isPaidPlan = useMemo(() => {
    return planName !== 'FREE' && planName !== null;
  }, [planName]);

  return {
    subscription,
    loading,
    error,
    planName,
    hasWhiteLabel,
    hasCustomBranding,
    isEnterprise,
    isExpanded,
    isPaidPlan,
    refresh,
  };
}

/**
 * Check if the system logo should be shown
 * Returns true for FREE and BASIC plans (no White Label)
 * Returns false for EXPANDED and ENTERPRISE plans (has White Label)
 */
export function shouldShowSystemLogo(subscription: Subscription | null): boolean {
  if (!subscription?.plan) {
    // Default to showing logo if no subscription data
    return true;
  }

  // If customBranding is true, user has White Label - don't show system logo
  return subscription.plan.features?.customBranding !== true;
}
