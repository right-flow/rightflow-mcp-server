// Billing API Client
// Created: 2026-02-05
// Purpose: API methods for subscription management and usage tracking

import { apiClient } from './utils/apiClient';
import {
  Subscription,
  Plan,
  PlanName,
  DowngradeResult,
  CancellationResult,
  Usage,
  QuotaStatus,
  QuotaCheckResult,
  UsageDetails,
  ApiResponse,
} from './types';

const BILLING_API_BASE = '/api/v1/billing';

/**
 * Billing API client with all subscription and usage methods
 */
export const billingApi = {
  // ============================================================================
  // Subscription Management API
  // ============================================================================

  /**
   * Get organization's current subscription
   * @param orgId - Organization ID
   * @returns Subscription with plan details
   */
  async getSubscription(orgId: string): Promise<Subscription> {
    const response = await apiClient.get<ApiResponse<Subscription>>(
      `${BILLING_API_BASE}/subscriptions/${orgId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch subscription');
    }

    return response.data;
  },

  /**
   * Get all available subscription plans
   * @returns Array of plans with pricing and features
   */
  async getAllPlans(): Promise<Plan[]> {
    const response = await apiClient.get<ApiResponse<Plan[]>>(
      `${BILLING_API_BASE}/subscriptions/plans`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch plans');
    }

    return response.data;
  },

  /**
   * Upgrade subscription to higher plan
   * @param orgId - Organization ID
   * @param targetPlan - Target plan name (BASIC, EXPANDED, ENTERPRISE)
   * @returns Updated subscription
   */
  async upgradeSubscription(orgId: string, targetPlan: PlanName): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `${BILLING_API_BASE}/subscriptions/${orgId}/upgrade`,
      { targetPlan }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to upgrade subscription');
    }

    return response.data;
  },

  /**
   * Downgrade subscription to lower plan (may archive forms)
   * @param orgId - Organization ID
   * @param targetPlan - Target plan name (FREE, BASIC, EXPANDED)
   * @param confirmArchive - Confirmation required if forms will be archived
   * @returns Downgrade result with warning and archived form IDs
   */
  async downgradeSubscription(
    orgId: string,
    targetPlan: PlanName,
    confirmArchive: boolean = false
  ): Promise<DowngradeResult> {
    const response = await apiClient.post<DowngradeResult>(
      `${BILLING_API_BASE}/subscriptions/${orgId}/downgrade`,
      { targetPlan, confirmArchive }
    );

    if (!response.success) {
      // If confirmation required, return result with warning
      if (response.error === 'Confirmation required') {
        return response;
      }

      throw new Error(response.error || 'Failed to downgrade subscription');
    }

    return response;
  },

  /**
   * Cancel subscription (effective at end of current period)
   * @param orgId - Organization ID
   * @returns Cancellation result with effective date
   */
  async cancelSubscription(orgId: string): Promise<CancellationResult> {
    const response = await apiClient.delete<CancellationResult>(
      `${BILLING_API_BASE}/subscriptions/${orgId}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to cancel subscription');
    }

    return response;
  },

  // ============================================================================
  // Usage Tracking API
  // ============================================================================

  /**
   * Get organization's current usage
   * @param orgId - Organization ID
   * @returns Usage record with submission counts
   */
  async getUsage(orgId: string): Promise<Usage> {
    const response = await apiClient.get<ApiResponse<Usage>>(
      `${BILLING_API_BASE}/usage/${orgId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch usage');
    }

    return response.data;
  },

  /**
   * Get detailed quota status with calculations
   * @param orgId - Organization ID
   * @returns Quota status with remaining, percentage, overage info
   */
  async getQuotaStatus(orgId: string): Promise<QuotaStatus> {
    const response = await apiClient.get<ApiResponse<QuotaStatus>>(
      `${BILLING_API_BASE}/usage/${orgId}/quota-status`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch quota status');
    }

    return response.data;
  },

  /**
   * Check if form submission is allowed (pre-submission validation)
   * @param orgId - Organization ID
   * @param formId - Form ID to submit
   * @returns Quota check result with allowed status and overage info
   */
  async checkQuota(orgId: string, formId: string): Promise<QuotaCheckResult> {
    const response = await apiClient.post<ApiResponse<QuotaCheckResult>>(
      `${BILLING_API_BASE}/usage/${orgId}/check-quota`,
      { formId }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to check quota');
    }

    return response.data;
  },

  /**
   * Get usage breakdown by form (analytics)
   * @param orgId - Organization ID
   * @returns Usage details with per-form submission counts
   */
  async getUsageDetails(orgId: string): Promise<UsageDetails> {
    const response = await apiClient.get<ApiResponse<UsageDetails>>(
      `${BILLING_API_BASE}/usage/${orgId}/details`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch usage details');
    }

    return response.data;
  },

  /**
   * Increment usage counter (called after form submission)
   * @param orgId - Organization ID
   * @param formId - Form ID that was submitted
   */
  async incrementUsage(orgId: string, formId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(
      `${BILLING_API_BASE}/usage/${orgId}/increment`,
      { formId }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to increment usage');
    }
  },
};

/**
 * Type guard to check if downgrade requires confirmation
 */
export function requiresDowngradeConfirmation(result: DowngradeResult): boolean {
  return !result.success && result.error === 'Confirmation required';
}

/**
 * Extract archived form count from downgrade result
 */
export function getArchivedFormCount(result: DowngradeResult): number {
  return result.archivedForms?.length || 0;
}
