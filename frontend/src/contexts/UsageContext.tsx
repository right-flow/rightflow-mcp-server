// Usage Context
// Created: 2026-02-05
// Purpose: React Context for usage tracking and quota management

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { billingApi } from '../api/billingApi';
import { Usage, QuotaStatus, QuotaCheckResult, UsageDetails } from '../api/types';
import { getUserFriendlyErrorMessage, logError } from '../api/utils/errorHandler';

/**
 * Usage context type definition
 */
interface UsageContextType {
  // State
  usage: Usage | null;
  quotaStatus: QuotaStatus | null;
  usageDetails: UsageDetails | null;
  loading: boolean;
  error: string | null;

  // Actions
  refreshUsage: () => Promise<void>;
  refreshQuotaStatus: () => Promise<void>;
  refreshUsageDetails: () => Promise<void>;
  checkQuota: (formId: string) => Promise<QuotaCheckResult>;
  incrementUsage: (formId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Create context with undefined default (will be provided by UsageProvider)
 */
const UsageContext = createContext<UsageContextType | undefined>(undefined);

/**
 * Usage Provider Props
 */
interface UsageProviderProps {
  children: ReactNode;
  orgId: string; // Current organization ID (from auth context)
  autoLoad?: boolean; // Auto-load data on mount (default: true)
  refreshInterval?: number; // Auto-refresh interval in ms (optional)
}

/**
 * Usage Context Provider
 * Manages usage and quota state for the organization
 */
export const UsageProvider: React.FC<UsageProviderProps> = ({
  children,
  orgId,
  autoLoad = true,
  refreshInterval,
}) => {
  // State
  const [usage, setUsage] = useState<Usage | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [usageDetails, setUsageDetails] = useState<UsageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load usage data from API
   */
  const refreshUsage = useCallback(async () => {
    if (!orgId) {
      setError('Organization ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await billingApi.getUsage(orgId);
      setUsage(data);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      logError(err, 'UsageContext.refreshUsage');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  /**
   * Load quota status from API
   */
  const refreshQuotaStatus = useCallback(async () => {
    if (!orgId) {
      setError('Organization ID is required');
      return;
    }

    try {
      setError(null);

      const data = await billingApi.getQuotaStatus(orgId);
      setQuotaStatus(data);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      logError(err, 'UsageContext.refreshQuotaStatus');
    }
  }, [orgId]);

  /**
   * Load usage details (per-form breakdown) from API
   */
  const refreshUsageDetails = useCallback(async () => {
    if (!orgId) {
      setError('Organization ID is required');
      return;
    }

    try {
      setError(null);

      const data = await billingApi.getUsageDetails(orgId);
      setUsageDetails(data);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      logError(err, 'UsageContext.refreshUsageDetails');
    }
  }, [orgId]);

  /**
   * Check if form submission is allowed (pre-submission validation)
   */
  const checkQuota = useCallback(
    async (formId: string): Promise<QuotaCheckResult> => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      if (!formId) {
        throw new Error('Form ID is required');
      }

      try {
        setError(null);

        const result = await billingApi.checkQuota(orgId, formId);
        return result;
      } catch (err) {
        const errorMessage = getUserFriendlyErrorMessage(err);
        setError(errorMessage);
        logError(err, 'UsageContext.checkQuota');
        throw err; // Re-throw so caller can handle
      }
    },
    [orgId]
  );

  /**
   * Increment usage counter (called after successful form submission)
   */
  const incrementUsage = useCallback(
    async (formId: string) => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      if (!formId) {
        throw new Error('Form ID is required');
      }

      try {
        setError(null);

        await billingApi.incrementUsage(orgId, formId);

        // Refresh usage data after incrementing
        await refreshUsage();
        await refreshQuotaStatus();
      } catch (err) {
        const errorMessage = getUserFriendlyErrorMessage(err);
        setError(errorMessage);
        logError(err, 'UsageContext.incrementUsage');
        throw err; // Re-throw so caller can handle
      }
    },
    [orgId, refreshUsage, refreshQuotaStatus]
  );

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
      refreshUsage();
      refreshQuotaStatus();
    }
  }, [autoLoad, orgId, refreshUsage, refreshQuotaStatus]);

  /**
   * Set up auto-refresh interval if specified
   */
  useEffect(() => {
    if (refreshInterval && orgId) {
      const interval = setInterval(() => {
        refreshUsage();
        refreshQuotaStatus();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, orgId, refreshUsage, refreshQuotaStatus]);

  /**
   * Refresh on window focus (user returns to tab)
   */
  useEffect(() => {
    const handleFocus = () => {
      if (orgId) {
        refreshUsage();
        refreshQuotaStatus();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [orgId, refreshUsage, refreshQuotaStatus]);

  /**
   * Context value
   */
  const value: UsageContextType = {
    usage,
    quotaStatus,
    usageDetails,
    loading,
    error,
    refreshUsage,
    refreshQuotaStatus,
    refreshUsageDetails,
    checkQuota,
    incrementUsage,
    clearError,
  };

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
};

/**
 * Custom hook to use usage context
 * Throws error if used outside UsageProvider
 */
export const useUsage = (): UsageContextType => {
  const context = useContext(UsageContext);

  if (context === undefined) {
    throw new Error('useUsage must be used within a UsageProvider');
  }

  return context;
};

/**
 * Export context for testing
 */
export { UsageContext };
