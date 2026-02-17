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
  PaymentRecord,
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
   * Create checkout session for payment (legacy - simple)
   * Redirects user to Grow payment page
   * @param planId - Plan ID to subscribe to
   * @param billingPeriod - 'monthly' or 'yearly'
   * @returns Checkout URL to redirect user to
   */
  async createCheckout(planId: string, billingPeriod: 'monthly' | 'yearly'): Promise<{ checkoutUrl: string }> {
    // Use Vercel API route directly (not Express backend)
    const response = await apiClient.post<{ checkoutUrl: string }>(
      '/api/billing',
      { action: 'checkout', planId, billingPeriod }
    );

    if (!response.checkoutUrl) {
      throw new Error('Failed to create checkout session');
    }

    return response;
  },

  /**
   * Create checkout session with full options (installments, payment method)
   * @param options - Checkout options including installments
   * @returns Checkout result with URL and credit days info
   */
  async createCheckoutWithOptions(options: {
    planId: string;
    billingPeriod: 'monthly' | 'yearly';
    installments?: number;
    paymentMethod?: string;
  }): Promise<{ checkoutUrl: string; processId: string; creditDays?: number }> {
    const response = await apiClient.post<{
      checkoutUrl: string;
      processId: string;
      creditDays?: number;
      error?: string;
    }>('/api/billing', {
      action: 'checkout-v2',
      ...options,
    });

    if (!response.checkoutUrl) {
      throw new Error(response.error || 'Failed to create checkout session');
    }

    return response;
  },

  /**
   * Calculate credit days for mid-period upgrade
   * @returns Credit days info if user has active subscription
   */
  async calculateCreditDays(): Promise<{
    creditDays: number;
    previousPlanName: string;
    previousBillingPeriod: string;
  } | null> {
    const response = await apiClient.get<ApiResponse<{
      creditDays: number;
      previousPlanName: string;
      previousBillingPeriod: string;
    } | null>>('/api/billing?action=credit-days');

    if (!response.success) {
      return null;
    }

    return response.data || null;
  },

  /**
   * Get checkout status (for polling after redirect)
   * @param processId - Checkout process ID
   * @returns Checkout status
   */
  async getCheckoutStatus(processId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'processing';
    message?: string;
    subscription?: Subscription;
  }> {
    const response = await apiClient.get<{
      status: 'pending' | 'completed' | 'failed' | 'processing';
      message?: string;
      subscription?: Subscription;
    }>(`/api/billing/checkout-status/${processId}`);

    return response;
  },

  /**
   * Get payment history
   * @param page - Page number (default 1)
   * @param pageSize - Items per page (default 10)
   * @returns Payment history with pagination
   */
  async getPaymentHistory(page: number = 1, pageSize: number = 10): Promise<{
    payments: PaymentRecord[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }> {
    const response = await apiClient.get<{
      payments: PaymentRecord[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
      };
    }>(`/api/billing/history?page=${page}&pageSize=${pageSize}`);

    return response;
  },

  /**
   * Create billing portal session
   * Redirects user to Grow billing management portal
   * @returns Portal URL to redirect user to
   */
  async createPortalSession(): Promise<{ portalUrl: string }> {
    // Use Vercel API route directly (not Express backend)
    const response = await apiClient.post<{ portalUrl: string }>(
      '/api/billing',
      { action: 'portal' }
    );

    if (!response.portalUrl) {
      throw new Error('Failed to create portal session');
    }

    return response;
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
