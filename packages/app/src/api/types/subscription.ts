// Subscription Type Definitions
// Created: 2026-02-05
// Purpose: TypeScript interfaces for subscription-related API responses

/**
 * Subscription plan names (must match backend enum)
 */
export type PlanName = 'FREE' | 'BASIC' | 'EXPANDED' | 'ENTERPRISE';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'grace_period' | 'suspended' | 'cancelled';

/**
 * Billing cycle
 */
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Subscription plan details
 */
export interface Plan {
  id: string;
  name: PlanName;
  displayName: string;
  priceMonthly: number; // in agorot (cents)
  priceYearly: number | null; // in agorot (cents)
  maxForms: number;
  maxSubmissionsPerMonth: number;
  maxStorageMB: number;
  maxMembers: number;
  features: Record<string, boolean>;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Organization subscription
 */
export interface Subscription {
  id: string;
  orgId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  growCustomerId: string | null;
  growSubscriptionId: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  plan?: Plan; // Joined from plans table
}

/**
 * Form to be archived (returned by downgrade check)
 */
export interface FormToArchive {
  id: string;
  name: string;
  createdAt: Date;
}

/**
 * Downgrade check result
 */
export interface DowngradeCheckResult {
  allowed: boolean;
  willArchiveForms: boolean;
  formsToArchiveCount: number;
  warning?: string;
  formsToArchive?: FormToArchive[];
}

/**
 * Downgrade result (after performing downgrade)
 */
export interface DowngradeResult {
  success: boolean;
  data?: Subscription;
  error?: string;
  warning?: string;
  archivedForms?: string[]; // Array of form IDs
}

/**
 * Cancellation result
 */
export interface CancellationResult {
  success: boolean;
  message?: string;
  effectiveDate?: Date;
  error?: string;
}

/**
 * Upgrade/Downgrade request body
 */
export interface PlanChangeRequest {
  targetPlan: PlanName;
  confirmArchive?: boolean; // Required for downgrades that will archive forms
}
