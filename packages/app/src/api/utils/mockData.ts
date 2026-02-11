// Mock Data for Billing API
// Created: 2026-02-05
// Purpose: Temporary mock data until backend API is ready

import {
  Subscription,
  Plan,
  QuotaStatus,
  UsageDetails,
  QuotaCheckResult,
  Invoice,
  PaymentMethodInfo,
} from '../types';

/**
 * Mock subscription data - Current plan is BASIC
 */
export const mockSubscription: Subscription = {
  id: 'sub_mock_001',
  orgId: 'org_demo',
  planId: 'plan_basic',
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: new Date('2026-02-01'),
  currentPeriodEnd: new Date('2026-03-01'),
  growCustomerId: null,
  growSubscriptionId: null,
  cancelledAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-02-01'),
  plan: {
    id: 'plan_basic',
    name: 'BASIC',
    displayName: 'Basic',
    priceMonthly: 30000, // ₪300 = 30000 agorot
    priceYearly: 288000, // ₪2,880 = 288000 agorot
    maxForms: 10,
    maxSubmissionsPerMonth: 100, // פעימות
    maxStorageMB: 500,
    maxMembers: 3,
    features: {
      customBranding: false,
      advancedReports: false,
      apiAccess: false,
      prioritySupport: false,
      abandonmentTracking: true,
      whatsappIntegration: true,
    },
    isActive: true,
    createdAt: new Date('2026-01-01'),
  },
};

/**
 * Mock plans data - Based on official pricing plan
 * Source: Features/-Planning-/11-Self-Service-Subscriptions/Pricing plan.md
 */
export const mockPlans: Plan[] = [
  {
    id: 'plan_free',
    name: 'FREE',
    displayName: 'Free',
    priceMonthly: 0,
    priceYearly: null,
    maxForms: 3,
    maxSubmissionsPerMonth: 50, // פעימות חודשי
    maxStorageMB: 100, // Not specified in plan
    maxMembers: 1,
    features: {
      customBranding: false, // חובה (לוגו המערכת)
      advancedReports: false, // בסיסי (גרפים)
      apiAccess: false, // ללא
      prioritySupport: false,
      abandonmentTracking: false, // ללא
      whatsappIntegration: false, // ללא אינטגרציות
    },
    isActive: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'plan_basic',
    name: 'BASIC',
    displayName: 'Basic',
    priceMonthly: 30000, // ₪300 = 30000 agorot
    priceYearly: 288000, // ₪2,880 (₪240/month annually) = 288000 agorot
    maxForms: 10,
    maxSubmissionsPerMonth: 100, // פעימות חודשי
    maxStorageMB: 500,
    maxMembers: 3,
    features: {
      customBranding: false, // חובה (לוגו המערכת)
      advancedReports: false, // בסיסי (גרפים)
      apiAccess: false,
      prioritySupport: false,
      abandonmentTracking: true, // צפייה בלבד (ללא תזכורות)
      whatsappIntegration: true, // בסיסיות (WhatsApp)
    },
    isActive: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'plan_expanded',
    name: 'EXPANDED',
    displayName: 'Expanded',
    priceMonthly: 40000, // ₪400 = 40000 agorot
    priceYearly: 384000, // ₪3,840 (₪320/month annually) = 384000 agorot
    maxForms: 50,
    maxSubmissionsPerMonth: 500, // פעימות חודשי
    maxStorageMB: 2000,
    maxMembers: 10,
    features: {
      customBranding: true, // ללא מיתוג (White Label)
      advancedReports: true, // השוואת נתונים היסטוריים
      apiAccess: false,
      prioritySupport: false,
      abandonmentTracking: true, // תזכורות אוטו' (SMS/Mail)
      whatsappIntegration: true, // פרימיום (WhatsApp, SMS, Mail)
      smsIntegration: true,
      emailIntegration: true,
    },
    isActive: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'plan_enterprise',
    name: 'ENTERPRISE',
    displayName: 'Enterprise',
    priceMonthly: 0, // מותאם אישית (custom pricing)
    priceYearly: null, // מותאם אישית
    maxForms: -1, // ללא הגבלה
    maxSubmissionsPerMonth: 5000, // 5,000+
    maxStorageMB: -1, // unlimited
    maxMembers: -1, // unlimited
    features: {
      customBranding: true, // דומיין מותאם אישית
      advancedReports: true, // מודל מסקנות והמלצות AI
      apiAccess: true, // API ו-Webhooks מלאים
      prioritySupport: true,
      abandonmentTracking: true, // ניתוח משפך המרה מלא
      whatsappIntegration: true,
      smsIntegration: true,
      emailIntegration: true,
      customDomain: true,
      aiInsights: true, // מודל מסקנות והמלצות AI
    },
    isActive: true,
    createdAt: new Date('2026-01-01'),
  },
];

/**
 * Mock quota status - Based on BASIC plan limits
 */
export const mockQuotaStatus: QuotaStatus = {
  // Submission quota
  totalSubmissions: 47,
  quotaLimit: 100, // BASIC plan: 100 submissions
  remaining: 53,
  percentUsed: 47.0,
  isExceeded: false,
  overageAmount: 0,
  canIncurOverage: true, // BASIC can go to overage (50₪ per 50 submissions)

  // Plan info
  planName: 'BASIC',
  subscriptionStatus: 'active',
  billingPeriodStart: new Date('2026-02-01'),
  billingPeriodEnd: new Date('2026-03-01'),

  // Forms quota
  formsUsed: 7,
  formsLimit: 10, // BASIC plan: 10 forms

  // Submissions quota (UI-specific)
  submissionsThisMonth: 47,
  submissionsLimit: 100, // BASIC plan: 100 submissions

  // Storage quota
  storageUsedMB: 123,
  storageLimitMB: 500,
};

/**
 * Mock usage details - Based on BASIC plan
 */
export const mockUsageDetails: UsageDetails = {
  totalSubmissions: 47,
  quotaLimit: 100, // BASIC plan: 100 submissions
  remaining: 53,
  percentUsed: 47.0,
  overageAmount: 0,
  formsBreakdown: [
    { formId: 'form_001', formName: 'טופס יצירת קשר', submissions: 18 },
    { formId: 'form_002', formName: 'סקר שביעות רצון', submissions: 12 },
    { formId: 'form_003', formName: 'הרשמה לאירוע', submissions: 9 },
    { formId: 'form_004', formName: 'בקשת הצעת מחיר', submissions: 8 },
  ],
};

/**
 * Mock quota check result (pre-submission) - Based on BASIC plan
 */
export const mockQuotaCheckResult: QuotaCheckResult = {
  allowed: true,
  willIncurOverage: false,
  quotaInfo: {
    totalSubmissions: 47,
    quotaLimit: 100, // BASIC plan
    remaining: 53,
    percentUsed: 47.0,
    overageAmount: 0,
    formsUsed: 7,
    formsLimit: 10,
    submissionsThisMonth: 47,
    submissionsLimit: 100,
    storageUsedMB: 123,
    storageLimitMB: 500,
  },
};

/**
 * Mock invoices
 */
export const mockInvoices: Invoice[] = [
  {
    id: 'inv_001',
    invoiceNumber: 'INV-2026-001',
    orgId: 'org_demo',
    status: 'paid',
    amount: 9900,
    currency: 'ILS',
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-01-31'),
    issuedAt: new Date('2026-01-25'),
    dueAt: new Date('2026-02-01'),
    paidAt: new Date('2026-02-01'),
    downloadUrl: '/invoices/INV-2026-001.pdf',
  },
  {
    id: 'inv_002',
    invoiceNumber: 'INV-2026-002',
    orgId: 'org_demo',
    status: 'paid',
    amount: 9900,
    currency: 'ILS',
    periodStart: new Date('2025-12-01'),
    periodEnd: new Date('2025-12-31'),
    issuedAt: new Date('2025-12-25'),
    dueAt: new Date('2026-01-01'),
    paidAt: new Date('2026-01-01'),
    downloadUrl: '/invoices/INV-2026-002.pdf',
  },
];

/**
 * Mock payment methods
 */
export const mockPaymentMethods: PaymentMethodInfo[] = [
  {
    id: 'pm_001',
    type: 'credit_card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 2027,
    isDefault: true,
    createdAt: new Date('2025-06-15'),
  },
];

/**
 * Check if URL is a billing API endpoint
 */
export function isBillingEndpoint(url: string): boolean {
  return url.includes('/api/v1/billing');
}

/**
 * Get mock response for billing endpoint
 */
export function getMockResponse(url: string, method: string = 'GET'): any {
  // Subscription endpoints
  if (url.includes('/subscriptions/') && url.includes('/upgrade')) {
    return { success: true, data: mockSubscription };
  }
  if (url.includes('/subscriptions/') && url.includes('/downgrade')) {
    return { success: true, data: mockSubscription };
  }
  if (url.includes('/subscriptions/') && url.includes('/cancel')) {
    return { success: true, message: 'Subscription cancelled', effectiveDate: new Date('2026-03-01') };
  }
  if (url.includes('/subscriptions/plans')) {
    return { success: true, data: mockPlans };
  }
  if (url.includes('/subscriptions/')) {
    return { success: true, data: mockSubscription };
  }

  // Usage endpoints
  if (url.includes('/usage/') && url.includes('/quota-status')) {
    return { success: true, data: mockQuotaStatus };
  }
  if (url.includes('/usage/') && url.includes('/details')) {
    return { success: true, data: mockUsageDetails };
  }
  if (url.includes('/usage/') && url.includes('/check-quota')) {
    return { success: true, data: mockQuotaCheckResult };
  }
  if (url.includes('/usage/') && method === 'POST') {
    return { success: true, message: 'Usage incremented' };
  }

  // Invoice endpoints
  if (url.includes('/billing-history/') && url.includes('/invoices')) {
    return { success: true, data: mockInvoices };
  }

  // Payment methods endpoints
  if (url.includes('/billing-history/') && url.includes('/payment-methods')) {
    return { success: true, data: mockPaymentMethods };
  }

  // Default fallback
  return { success: false, error: 'Mock endpoint not found' };
}
