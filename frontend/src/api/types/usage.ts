// Usage Type Definitions
// Created: 2026-02-05
// Purpose: TypeScript interfaces for usage tracking and quota management

/**
 * Usage record for an organization
 */
export interface Usage {
  id: string;
  orgId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  totalSubmissions: number;
  quotaLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Quota information (simplified version for quota checks)
 */
export interface QuotaInfo {
  totalSubmissions: number;
  quotaLimit: number;
  remaining: number;
  percentUsed: number;
  overageAmount: number;
}

/**
 * Detailed quota status
 */
export interface QuotaStatus {
  // Submission quota fields
  totalSubmissions: number;
  quotaLimit: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
  overageAmount: number;
  canIncurOverage: boolean;

  // Plan and subscription info
  planName: string;
  subscriptionStatus: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;

  // Forms quota (required by UI components)
  formsUsed: number;
  formsLimit: number;

  // Submissions quota (required by UI components - duplicates above for clarity)
  submissionsThisMonth: number;
  submissionsLimit: number;

  // Storage quota (required by UI components)
  storageUsedMB: number;
  storageLimitMB: number;
}

/**
 * Quota check result (pre-submission validation)
 */
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string; // e.g., 'quota_exceeded_free_plan'
  upgradeRequired?: boolean;
  willIncurOverage?: boolean;
  estimatedOverageCost?: number; // in agorot (cents)
  quotaInfo: QuotaInfo;
}

/**
 * Per-form usage breakdown
 */
export interface FormUsage {
  formId: string;
  formName: string;
  submissions: number;
}

/**
 * Usage details with per-form breakdown
 */
export interface UsageDetails {
  totalSubmissions: number;
  quotaLimit: number;
  remaining: number;
  percentUsed: number;
  overageAmount: number;
  formsBreakdown: FormUsage[];
}

/**
 * Check quota request body
 */
export interface CheckQuotaRequest {
  formId: string;
}

/**
 * Increment usage request body
 */
export interface IncrementUsageRequest {
  formId: string;
}
