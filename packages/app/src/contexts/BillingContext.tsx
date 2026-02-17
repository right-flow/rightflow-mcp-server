// Billing Context
// Created: 2026-02-05
// Purpose: React Context for subscription management state

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { billingApi } from '../api/billingApi';
import { Subscription, Plan, PlanName, DowngradeResult, CancellationResult, PaymentRecord, CheckoutOptions } from '../api/types';
import { getUserFriendlyErrorMessage, logError } from '../api/utils/errorHandler';

/**
 * Credit days info for mid-period upgrades
 */
interface CreditDaysInfo {
  creditDays: number;
  previousPlanName: string;
  previousBillingPeriod: string;
}

/**
 * Checkout status response
 */
interface CheckoutStatus {
  status: 'pending' | 'completed' | 'failed' | 'processing';
  message?: string;
  subscription?: Subscription;
}

/**
 * Billing context type definition
 */
interface BillingContextType {
  // State
  subscription: Subscription | null;
  plans: Plan[];
  loading: boolean;
  error: string | null;
  creditDaysInfo: CreditDaysInfo | null;
  paymentHistory: PaymentRecord[];
  paymentHistoryLoading: boolean;

  // Actions
  refreshSubscription: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  startCheckout: (planId: string, billingPeriod: 'monthly' | 'yearly') => Promise<void>;
  startCheckoutWithOptions: (options: CheckoutOptions) => Promise<{ processId: string; creditDays?: number }>;
  calculateCreditDays: () => Promise<CreditDaysInfo | null>;
  getCheckoutStatus: (processId: string) => Promise<CheckoutStatus>;
  getPaymentHistory: (page?: number, pageSize?: number) => Promise<void>;
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
  const [creditDaysInfo, setCreditDaysInfo] = useState<CreditDaysInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);

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
   * Start checkout process - redirects to Grow payment page (legacy)
   */
  const startCheckout = useCallback(
    async (planId: string, billingPeriod: 'monthly' | 'yearly') => {
      try {
        setError(null);

        // Get checkout URL from API
        const { checkoutUrl } = await billingApi.createCheckout(planId, billingPeriod);

        // Redirect to Grow payment page
        window.location.href = checkoutUrl;
      } catch (err) {
        const errorMessage = getUserFriendlyErrorMessage(err);
        setError(errorMessage);
        logError(err, 'BillingContext.startCheckout');
        throw err;
      }
    },
    []
  );

  /**
   * Start checkout with full options (installments support)
   * Returns processId for status polling, then redirects
   */
  const startCheckoutWithOptions = useCallback(
    async (options: CheckoutOptions): Promise<{ processId: string; creditDays?: number }> => {
      try {
        setError(null);

        // Get checkout URL with full options from API
        const result = await billingApi.createCheckoutWithOptions(options);

        // Redirect to Grow payment page
        window.location.href = result.checkoutUrl;

        return {
          processId: result.processId,
          creditDays: result.creditDays,
        };
      } catch (err) {
        const errorMessage = getUserFriendlyErrorMessage(err);
        setError(errorMessage);
        logError(err, 'BillingContext.startCheckoutWithOptions');
        throw err;
      }
    },
    []
  );

  /**
   * Calculate credit days for mid-period upgrade
   */
  const calculateCreditDays = useCallback(async (): Promise<CreditDaysInfo | null> => {
    try {
      setError(null);
      const result = await billingApi.calculateCreditDays();
      if (result) {
        setCreditDaysInfo(result);
      }
      return result;
    } catch (err) {
      logError(err, 'BillingContext.calculateCreditDays');
      return null;
    }
  }, []);

  /**
   * Get checkout status (for polling after redirect)
   */
  const getCheckoutStatus = useCallback(
    async (processId: string): Promise<CheckoutStatus> => {
      try {
        const status = await billingApi.getCheckoutStatus(processId);

        // Update subscription if completed
        if (status.status === 'completed' && status.subscription) {
          setSubscription(status.subscription);
        }

        return status;
      } catch (err) {
        logError(err, 'BillingContext.getCheckoutStatus');
        return { status: 'processing', message: 'התשלום בעיבוד' };
      }
    },
    []
  );

  /**
   * Get payment history
   */
  const getPaymentHistory = useCallback(
    async (page: number = 1, pageSize: number = 10): Promise<void> => {
      try {
        setPaymentHistoryLoading(true);
        setError(null);

        const result = await billingApi.getPaymentHistory(page, pageSize);
        setPaymentHistory(result.payments);
      } catch (err) {
        const errorMessage = getUserFriendlyErrorMessage(err);
        setError(errorMessage);
        logError(err, 'BillingContext.getPaymentHistory');
      } finally {
        setPaymentHistoryLoading(false);
      }
    },
    []
  );

  /**
   * Upgrade subscription to higher plan
   * Note: For paid plans, use startCheckout instead
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
    creditDaysInfo,
    paymentHistory,
    paymentHistoryLoading,
    refreshSubscription,
    refreshPlans,
    startCheckout,
    startCheckoutWithOptions,
    calculateCreditDays,
    getCheckoutStatus,
    getPaymentHistory,
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
