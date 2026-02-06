// Billing and Subscription Types
// Created: 2026-02-05
// Reference: PRD-Self-Service-Subscriptions.md

export type PlanName = 'FREE' | 'BASIC' | 'EXPANDED' | 'ENTERPRISE';

export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'active'          // תשלום תקין, שירות פעיל
  | 'grace_period'    // תשלום נכשל, בתקופת חסד
  | 'suspended'       // תקופת חסד הסתיימה, שירות מושבת
  | 'pending_deletion'// 90 ימים אחרי השעיה, ממתין למחיקה
  | 'cancelled';      // בוטל ע"י המשתמש

export type PaymentAttemptStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type GracePeriodStatus = 'active' | 'resolved' | 'expired';

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  displayName: string;
  priceMonthly: number;        // in cents (ILS)
  priceYearly: number | null;  // in cents (ILS)
  maxForms: number;
  maxSubmissionsPerMonth: number;
  maxStorageMB: number;
  maxMembers: number;
  features: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

export interface OrganizationSubscription {
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
  // Joined data
  plan?: SubscriptionPlan;
}

export interface OrganizationUsage {
  id: string;
  orgId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  totalSubmissions: number;
  quotaLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormUsageDetails {
  id: string;
  orgId: string;
  formId: string;
  billingPeriodStart: Date;
  submissionsCount: number;
}

export interface PaymentAttempt {
  id: string;
  orgId: string;
  subscriptionId: string;
  amountCents: number;
  currency: string;
  status: PaymentAttemptStatus;
  failureReason: string | null;
  growTransactionId: string | null;
  attemptNumber: number;
  processedAt: Date | null;
  createdAt: Date;
}

export interface GracePeriod {
  id: string;
  orgId: string;
  subscriptionId: string;
  startedAt: Date;
  endsAt: Date;
  retryCount: number;
  lastRetryAt: Date | null;
  nextRetryAt: Date | null;
  status: GracePeriodStatus;
  resolvedAt: Date | null;
  resolutionReason: string | null;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  orgId: string;
  subscriptionId: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  paidAt: Date | null;
  growInvoiceId: string | null;
  createdAt: Date;
}

export interface OverageCharge {
  id: string;
  orgId: string;
  billingPeriodStart: Date;
  submissionsOverLimit: number;
  chargeCents: number;
  status: string;
  createdAt: Date;
}

// Request/Response DTOs

export interface CreateSubscriptionRequest {
  orgId: string;
  planId: string;
  billingCycle: BillingCycle;
}

export interface CreateSubscriptionResponse {
  success: boolean;
  subscription?: OrganizationSubscription;
  error?: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  effectiveDate?: Date;
  error?: string;
}

export interface QuotaStatus {
  submissions: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  forms: {
    current: number;
    limit: number;
    canCreate: boolean;
  };
  canSubmit: boolean;
}

export interface QuotaWarning {
  type: 'submissions_80_percent' | 'submissions_100_percent' | 'forms_limit_reached';
  severity: 'warning' | 'critical';
  message: string;
}

// Database row types (snake_case from DB)
export interface SubscriptionPlanRow {
  id: string;
  name: string;
  display_name: string;
  price_monthly_cents: number;
  price_yearly_cents: number | null;
  max_forms: number;
  max_submissions_per_month: number;
  max_storage_mb: number;
  max_members: number;
  features: any;
  is_active: boolean;
  created_at: string;
}

export interface OrganizationSubscriptionRow {
  id: string;
  org_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  grow_customer_id: string | null;
  grow_subscription_id: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUsageRow {
  id: string;
  org_id: string;
  billing_period_start: string;
  billing_period_end: string;
  total_submissions: number;
  quota_limit: number;
  created_at: string;
  updated_at: string;
}

// Utility functions
export function mapPlanFromRow(row: SubscriptionPlanRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name as PlanName,
    displayName: row.display_name,
    priceMonthly: row.price_monthly_cents,
    priceYearly: row.price_yearly_cents,
    maxForms: row.max_forms,
    maxSubmissionsPerMonth: row.max_submissions_per_month,
    maxStorageMB: row.max_storage_mb,
    maxMembers: row.max_members,
    features: row.features,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
  };
}

export function mapSubscriptionFromRow(
  row: OrganizationSubscriptionRow,
): OrganizationSubscription {
  return {
    id: row.id,
    orgId: row.org_id,
    planId: row.plan_id,
    status: row.status as SubscriptionStatus,
    billingCycle: row.billing_cycle as BillingCycle,
    currentPeriodStart: new Date(row.current_period_start),
    currentPeriodEnd: new Date(row.current_period_end),
    growCustomerId: row.grow_customer_id,
    growSubscriptionId: row.grow_subscription_id,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapUsageFromRow(row: OrganizationUsageRow): OrganizationUsage {
  return {
    id: row.id,
    orgId: row.org_id,
    billingPeriodStart: new Date(row.billing_period_start),
    billingPeriodEnd: new Date(row.billing_period_end),
    totalSubmissions: row.total_submissions,
    quotaLimit: row.quota_limit,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
