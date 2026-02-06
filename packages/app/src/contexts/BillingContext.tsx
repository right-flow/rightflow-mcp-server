// Billing Context
// Created: 2026-02-05
// Purpose: React Context for subscription management state

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { billingApi } from '../api/billingApi';
import { Subscription, Plan, PlanName, DowngradeResult, CancellationResult } from '../api/types';
import { getUserFriendlyErrorMessage, logError } from '../api/utils/errorHandler';

/**
 * Billing context type definition
 */
interface BillingContextType {
  // State
  subscription: Subscription | null;
  plans: Plan[];
  loading: boolean;
  error: string | null;

  // Actions
  refreshSubscription: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  upgradeSubscription: (targetPlan: PlanName) => Promise<void>;
  downgradeSubscription: (targetPlan: PlanName, confirmArchive?: boolean) => Promise<DowngradeResult>;
  cancelSubscription: () => Promise<CancellationResult>;
  clearError: () => void;
}

/**
 * Create context with undefined default (will be provided by BillingProvider)
 */
const BillingContext = createContext<BillingContextType | undefined>(undefined);

/**
 * Billing Provider Props
 */
interface BillingProviderProps {
  children: ReactNode;
  orgId: string; // Current organization ID (from auth context)
  autoLoad?: boolean; // Auto-load data on mount (default: true)
}

/**
 * Billing Context Provider
 * Manages subscription state and provides actions for subscription management
 */
export const BillingProvider: React.FC<BillingProviderProps> = ({
  children,
  orgId,
  autoLoad = true,
}) => {
  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load subscription data from API
   */
  const refreshSubscription = useCallback(async () => {
    if (!orgId) {
      setError('Organization ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await billingApi.getSubscription(orgId);
      setSubscription(data);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      logError(err, 'BillingContext.refreshSubscription');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  /**
   * Load all available plans from API
   */
  const refreshPlans = useCallback(async () => {
    try {
      setError(null);

      const data = await billingApi.getAllPlans();
      setPlans(data);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      logError(err, 'BillingContext.refreshPlans');
    }
  }, []);

  /**
   * Upgrade subscription to higher plan
   */
  const upgradeSubscription = useCallback(
    async (targetPlan: PlanName) => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      try {
        setError(null);

        const updatedSubscription = await billingApi.upgradeSubscription(orgId, targetPlan);
        setSubscription(updatedSubscription);
      } catch (err) {
        const errorMessage = getUserFriendlyErrorMessage(err);
        setError(errorMessage);
        logError(err, 'BillingContext.upgradeSubscription');
        throw err; // Re-throw so caller can handle
      }
    },
    [orgId]
  );

  /**
   * Downgrade subscription to lower plan (may archive forms)
   */
  const downgradeSubscription = useCallback(
    async (targetPlan: PlanName, confirmArchive: boolean = false): Promise<DowngradeResult> => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      try {
        setError(null);

        const result = await billingApi.downgradeSubscription(orgId, targetPlan, confirmArchive);

        // If successful, update subscription state
        if (result.success && result.data) {
          setSubscription(result.data);
        }

        return result;
      } catch (err) {
        const errorMessage = getUserFriendlyErrorMessage(err);
        setError(errorMessage);
        logError(err, 'BillingContext.downgradeSubscription');
        throw err; // Re-throw so caller can handle
      }
    },
    [orgId]
  );

  /**
   * Cancel subscription (effective at end of period)
   */
  const cancelSubscription = useCallback(async (): Promise<CancellationResult> => {
    if (!orgId) {
      throw new Error('Organization ID is required');
    }

    try {
      setError(null);

      const result = await billingApi.cancelSubscription(orgId);

      // Refresh subscription to get updated status
      if (result.success) {
        await refreshSubscription();
      }

      return result;
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      logError(err, 'BillingContext.cancelSubscription');
      throw err; // Re-throw so caller can handle
    }
  }, [orgId, refreshSubscription]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Load data on mount or when orgId changes
   */
  useEffect(() => {
    if (autoLoad && orgId) {
      refreshSubscription();
      refreshPlans();
    }
  }, [autoLoad, orgId, refreshSubscription, refreshPlans]);

  /**
   * Context value
   */
  const value: BillingContextType = {
    subscription,
    plans,
    loading,
    error,
    refreshSubscription,
    refreshPlans,
    upgradeSubscription,
    downgradeSubscription,
    cancelSubscription,
    clearError,
  };

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};

/**
 * Custom hook to use billing context
 * Throws error if used outside BillingProvider
 */
export const useBilling = (): BillingContextType => {
  const context = useContext(BillingContext);

  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }

  return context;
};

/**
 * Export context for testing
 */
export { BillingContext };
