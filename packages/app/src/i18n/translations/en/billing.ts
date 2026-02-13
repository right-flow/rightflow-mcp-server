import type { BillingTranslations } from '../../types/billing.types';

const billing: BillingTranslations = {
  // Layout & Navigation
  title: 'Billing & Subscription',
  nav: {
    subscription: 'Subscription',
    usage: 'Usage',
    history: 'History',
  },

  // Subscription Page
  subscription: {
    title: 'Subscription Management',
    description: 'Manage your subscription plan, view features, and update billing settings',
    upgradedSuccess: 'Successfully upgraded to {plan} plan!',
    downgradedSuccess: 'Successfully downgraded to {plan} plan!',
    formsArchived: '{count} forms archived.',
    cancelledSuccess: 'Subscription cancelled. You will retain access until the end of your billing period.',
    failedUpgrade: 'Failed to upgrade subscription',
    failedDowngrade: 'Failed to downgrade subscription',
    failedCancel: 'Failed to cancel subscription',
  },

  // Subscription Card
  card: {
    noSubscription: 'No subscription found',
    billingCycle: 'Current billing cycle',
    yearly: 'Yearly',
    monthly: 'Monthly',
    year: 'year',
    month: 'month',
    billedAnnually: '{price}/month billed annually',
    freeForever: 'Free Forever',
    forms: 'Forms',
    submissions: 'Submissions',
    perMonth: '/mo',
    storage: 'Storage',
    teamMembers: 'Team Members',
    currentPeriod: 'Current period',
    cancelledOn: 'Cancelled on',
    gracePeriodWarning: 'Your subscription is in grace period. Please update your payment method to continue service.',
    suspendedWarning: 'Your subscription is suspended. Please contact support or upgrade to restore access.',
    cancelledInfo: 'Your subscription will remain active until the end of the current billing period.',
    upgradePlan: 'Upgrade Plan',
    downgradePlan: 'Downgrade Plan',
    viewAllPlans: 'View All Plans',
    cancelSubscription: 'Cancel Subscription',
  },

  // Status Badge
  status: {
    active: 'Active',
    gracePeriod: 'Grace Period',
    suspended: 'Suspended',
    cancelled: 'Cancelled',
    subscriptionStatus: 'Subscription status',
  },

  // Pricing Toggle
  toggle: {
    monthly: 'Monthly',
    yearly: 'Yearly',
    percentOff: '{percent}% off',
  },

  // Pricing (legacy)
  pricing: {
    monthly: 'Monthly',
    yearly: 'Yearly',
    off: '{percent}% off',
  },

  // Plan Comparison
  plans: {
    title: 'Choose Your Plan',
    description: 'Select the plan that best fits your needs',
    customPlan: 'Need a Custom Plan?',
    customPlanDescription: 'Looking for higher limits, custom integrations, or enterprise features?',
    contactSales: 'Contact Sales',
    freeTrial: 'All plans include 14-day free trial',
    cancel: 'Cancel',
  },

  // Plan Card
  planCard: {
    currentPlan: 'Current Plan',
    save: 'Save {percent}%',
    free: 'Free',
    total: 'Total {price}/year',
    totalPerYear: 'Total {amount}/year',
    selectPlan: 'Select Plan',
    select: 'Select',
    notAvailable: 'Not Available',
    perMonth: '/mo',
    startingFrom: 'Starting from ',
    contactUs: 'Contact Us',
  },

  // Cancel Modal
  cancel: {
    title: 'Cancel Subscription',
    plan: '{name} Plan',
    planLabel: '{plan} Plan',
    confirmQuestion: 'Are you sure you want to cancel your subscription?',
    activeUntil: 'Your subscription will remain active until:',
    retainAccess: "You'll retain access to all features until the end of your billing period",
    dataPreserved: 'After cancellation, your data will be preserved for 30 days in case you want to reactivate',
    whatYouLose: "What you'll lose after {date}:",
    loseAccess: 'Access to all forms and submissions',
    loseForms: 'Access to all forms and submissions',
    loseTeam: 'Team member access',
    loseSupport: 'Premium support',
    confirmCheckbox: 'I understand that my subscription will be cancelled and I will lose access after {date}',
    keepSubscription: 'Keep Subscription',
    cancelling: 'Cancelling...',
    confirmCancel: 'Yes, Cancel Subscription',
    confirmButton: 'Yes, Cancel Subscription',
    closeModal: 'Close modal',
  },

  // Comparison Modal
  comparison: {
    title: 'Choose Your Plan',
    description: 'Select the plan that best fits your needs',
    close: 'Close',
    customPlanTitle: 'Need a Custom Plan?',
    customPlanDescription: 'Looking for higher limits, custom integrations, or enterprise features?',
    contactSales: 'Contact Sales',
    trialNote: 'All plans include 14-day free trial',
    cancel: 'Cancel',
  },

  // Usage Dashboard
  usage: {
    title: 'Usage Dashboard',
    description: 'Monitor your usage and quota across all resources',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    currentPlan: 'Current Plan: {plan}',
    failedLoad: 'Failed to load usage data',
    failedToLoad: 'Failed to load usage data',
    tryAgain: 'Try again',
    totalForms: 'Total Forms',
    thisMonth: 'This Month',
    storageUsed: 'Storage Used',
  },

  // Quota Status
  quota: {
    title: 'Quota Status',
    noData: 'No quota data available',
    critical: 'Critical',
    warning: 'Warning',
    healthy: 'Healthy',
    forms: 'Forms',
    submissionsMonth: 'Submissions (This Month)',
    submissionsThisMonth: 'Submissions (This Month)',
    storageMb: 'Storage (MB)',
    storageMB: 'Storage (MB)',
    limitReached: 'Quota limit reached',
    limitReachedDescription: "You've reached or exceeded your quota limits. Upgrade your plan to continue using all features.",
    limitReachedDesc: "You've reached or exceeded your quota limits. Upgrade your plan to continue using all features.",
    approachingLimit: 'Approaching quota limits',
    approachingLimitDescription: "You're using over 70% of your quota. Consider upgrading to avoid interruptions.",
    approachingLimitDesc: "You're using over 70% of your quota. Consider upgrading to avoid interruptions.",
    viewPlans: 'View Plans',
    upgradePlan: 'Upgrade Plan',
    used: '{used} of {limit}',
    of: 'of',
    unlimited: 'Unlimited',
  },

  // History Page
  history: {
    title: 'Billing History',
    description: 'View your invoices and manage payment methods',
    failedLoad: 'Failed to load billing history',
    failedToLoad: 'Failed to load billing history',
    downloadNotAvailable: 'Download not available for this invoice',
    downloading: 'Downloading invoice {invoice}...',
    downloadFailed: 'Failed to download invoice',
    addPaymentNotImplemented: 'Add payment method is not implemented yet',
    paymentMethodRemoved: 'Payment method removed successfully',
    removePaymentFailed: 'Failed to remove payment method',
    defaultUpdated: 'Default payment method updated',
    updateDefaultFailed: 'Failed to update default payment method',
    tryAgain: 'Try again',
  },

  // Invoice Table
  invoice: {
    title: 'Invoice History',
    noInvoices: 'No invoices yet',
    filter: 'Filter',
    allStatuses: 'All Statuses',
    invoiceNumber: 'Invoice #',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    actions: 'Actions',
    download: 'Download',
    noFilteredInvoices: 'No {status} invoices found',
    clearFilter: 'Clear filter',
    statusPaid: 'Paid',
    statusPending: 'Pending',
    statusFailed: 'Failed',
    statusRefunded: 'Refunded',
  },

  // Invoices (legacy keys)
  invoices: {
    title: 'Invoice History',
    noInvoices: 'No invoices yet',
    filter: 'Filter:',
    allStatuses: 'All Statuses',
    invoiceNumber: 'Invoice #',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    actions: 'Actions',
    download: 'Download',
    noFiltered: 'No {status} invoices found',
    clearFilter: 'Clear filter',
    statusPaid: 'Paid',
    statusPending: 'Pending',
    statusFailed: 'Failed',
    statusRefunded: 'Refunded',
  },

  // Payment Methods
  payment: {
    title: 'Payment Methods',
    add: 'Add Payment Method',
    addPaymentMethod: 'Add Payment Method',
    noMethods: 'No payment methods added',
    addFirst: 'Add Your First Payment Method',
    addFirstMethod: 'Add Your First Payment Method',
    default: 'Default',
    expires: 'Expires {date}',
    added: 'Added',
    setDefault: 'Set Default',
    remove: 'Remove',
    note: 'Note',
    noteText: 'Your default payment method will be used for automatic renewals and overages. You must have at least one payment method on file.',
    cardEnding: '{brand} ending in {last4}',
    cardEndingIn: '{brand} ending in {last4}',
    card: 'Card',
    paypal: 'PayPal',
    bankTransfer: 'Bank Transfer',
    paymentMethod: 'Payment Method',
  },
};

export default billing;
