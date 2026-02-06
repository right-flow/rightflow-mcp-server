// useQuotaCheck Hook
// Created: 2026-02-05
// Purpose: Custom hook for form submission quota validation

import { useState, useCallback } from 'react';
import { useUsage } from '../contexts/UsageContext';
import { QuotaCheckResult } from '../api/types';

/**
 * Quota check hook state
 */
interface UseQuotaCheckReturn {
  // State
  showWarning: boolean;
  quotaResult: QuotaCheckResult | null;
  checking: boolean;

  // Actions
  checkBeforeSubmit: () => Promise<boolean>;
  closeWarning: () => void;
  setShowWarning: (show: boolean) => void;
}

/**
 * Custom hook for quota validation before form submission
 *
 * @param formId - ID of the form being submitted
 * @returns Quota check state and actions
 *
 * @example
 * ```tsx
 * const { checkBeforeSubmit, showWarning, quotaResult } = useQuotaCheck('form-123');
 *
 * const handleSubmit = async () => {
 *   const canSubmit = await checkBeforeSubmit();
 *   if (!canSubmit) return; // Blocked or user cancelled
 *
 *   // Proceed with submission
 *   await submitForm();
 * };
 * ```
 */
export const useQuotaCheck = (formId: string): UseQuotaCheckReturn => {
  const { checkQuota } = useUsage();
  const [showWarning, setShowWarning] = useState(false);
  const [quotaResult, setQuotaResult] = useState<QuotaCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  /**
   * Check quota before form submission
   *
   * @returns True if submission is allowed, false if blocked or user cancelled
   */
  const checkBeforeSubmit = useCallback(async (): Promise<boolean> => {
    if (!formId) {
      console.error('useQuotaCheck: formId is required');
      return false;
    }

    try {
      setChecking(true);

      // Call API to check quota
      const result = await checkQuota(formId);
      setQuotaResult(result);

      // If submission not allowed (FREE plan at limit), block immediately
      if (!result.allowed) {
        setShowWarning(true);
        return false;
      }

      // If submission will incur overage, show warning and require confirmation
      if (result.willIncurOverage) {
        // Check localStorage preference
        const dontShowAgain = localStorage.getItem('quotaWarning_dontShowAgain') === 'true';

        if (!dontShowAgain) {
          setShowWarning(true);
          // Return false to pause submission until user confirms via modal
          return false;
        }

        // User previously selected "don't show again", allow submission
        return true;
      }

      // Quota check passed, allow submission
      return true;
    } catch (error) {
      console.error('Quota check failed:', error);
      // Fail-safe: block submission on error
      return false;
    } finally {
      setChecking(false);
    }
  }, [formId, checkQuota]);

  /**
   * Close warning modal
   */
  const closeWarning = useCallback(() => {
    setShowWarning(false);
    setQuotaResult(null);
  }, []);

  return {
    showWarning,
    quotaResult,
    checking,
    checkBeforeSubmit,
    closeWarning,
    setShowWarning,
  };
};

/**
 * Set "don't show again" preference for quota warnings
 */
export const setQuotaWarningPreference = (dontShowAgain: boolean): void => {
  if (dontShowAgain) {
    localStorage.setItem('quotaWarning_dontShowAgain', 'true');
  } else {
    localStorage.removeItem('quotaWarning_dontShowAgain');
  }
};

/**
 * Get "don't show again" preference
 */
export const getQuotaWarningPreference = (): boolean => {
  return localStorage.getItem('quotaWarning_dontShowAgain') === 'true';
};

/**
 * Clear "don't show again" preference
 */
export const clearQuotaWarningPreference = (): void => {
  localStorage.removeItem('quotaWarning_dontShowAgain');
};
