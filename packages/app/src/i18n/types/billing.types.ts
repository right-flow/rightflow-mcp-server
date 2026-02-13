/**
 * Billing namespace - subscription, payment, usage, invoices
 * Used by billing pages and components
 */
export interface BillingTranslations {
  // Layout & Navigation
  title: string;
  nav: {
    subscription: string;
    usage: string;
    history: string;
  };

  // Subscription Page
  subscription: {
    title: string;
    description: string;
    upgradedSuccess: string;
    downgradedSuccess: string;
    formsArchived: string;
    cancelledSuccess: string;
    failedUpgrade: string;
    failedDowngrade: string;
    failedCancel: string;
  };

  // Subscription Card
  card: {
    noSubscription: string;
    billingCycle: string;
    yearly: string;
    monthly: string;
    year: string;
    month: string;
    billedAnnually: string;
    freeForever: string;
    forms: string;
    submissions: string;
    perMonth: string;
    storage: string;
    teamMembers: string;
    currentPeriod: string;
    cancelledOn: string;
    gracePeriodWarning: string;
    suspendedWarning: string;
    cancelledInfo: string;
    upgradePlan: string;
    downgradePlan: string;
    viewAllPlans: string;
    cancelSubscription: string;
  };

  // Status Badge
  status: {
    active: string;
    gracePeriod: string;
    suspended: string;
    cancelled: string;
    subscriptionStatus: string;
  };

  // Pricing Toggle
  toggle: {
    monthly: string;
    yearly: string;
    percentOff: string;
  };

  // Pricing (legacy)
  pricing: {
    monthly: string;
    yearly: string;
    off: string;
  };

  // Plan Comparison
  plans: {
    title: string;
    description: string;
    customPlan: string;
    customPlanDescription: string;
    contactSales: string;
    freeTrial: string;
    cancel: string;
  };

  // Plan Card
  planCard: {
    currentPlan: string;
    save: string;
    free: string;
    total: string;
    totalPerYear: string;
    selectPlan: string;
    select: string;
    notAvailable: string;
    perMonth: string;
    startingFrom: string;
    contactUs: string;
  };

  // Cancel Modal
  cancel: {
    title: string;
    plan: string;
    planLabel: string;
    confirmQuestion: string;
    activeUntil: string;
    retainAccess: string;
    dataPreserved: string;
    whatYouLose: string;
    loseAccess: string;
    loseForms: string;
    loseTeam: string;
    loseSupport: string;
    confirmCheckbox: string;
    keepSubscription: string;
    cancelling: string;
    confirmCancel: string;
    confirmButton: string;
    closeModal: string;
  };

  // Comparison Modal
  comparison: {
    title: string;
    description: string;
    close: string;
    customPlanTitle: string;
    customPlanDescription: string;
    contactSales: string;
    trialNote: string;
    cancel: string;
  };

  // Usage Dashboard
  usage: {
    title: string;
    description: string;
    refresh: string;
    refreshing: string;
    currentPlan: string;
    failedLoad: string;
    failedToLoad: string;
    tryAgain: string;
    totalForms: string;
    thisMonth: string;
    storageUsed: string;
  };

  // Quota Status
  quota: {
    title: string;
    noData: string;
    critical: string;
    warning: string;
    healthy: string;
    forms: string;
    submissionsMonth: string;
    submissionsThisMonth: string;
    storageMb: string;
    storageMB: string;
    limitReached: string;
    limitReachedDescription: string;
    limitReachedDesc: string;
    approachingLimit: string;
    approachingLimitDescription: string;
    approachingLimitDesc: string;
    viewPlans: string;
    upgradePlan: string;
    used: string;
    of: string;
    unlimited: string;
  };

  // History Page
  history: {
    title: string;
    description: string;
    failedLoad: string;
    failedToLoad: string;
    downloadNotAvailable: string;
    downloading: string;
    downloadFailed: string;
    addPaymentNotImplemented: string;
    paymentMethodRemoved: string;
    removePaymentFailed: string;
    defaultUpdated: string;
    updateDefaultFailed: string;
    tryAgain: string;
  };

  // Invoice Table
  invoice: {
    title: string;
    noInvoices: string;
    filter: string;
    allStatuses: string;
    invoiceNumber: string;
    date: string;
    amount: string;
    status: string;
    actions: string;
    download: string;
    noFilteredInvoices: string;
    clearFilter: string;
    statusPaid: string;
    statusPending: string;
    statusFailed: string;
    statusRefunded: string;
  };

  // Invoices (legacy keys)
  invoices: {
    title: string;
    noInvoices: string;
    filter: string;
    allStatuses: string;
    invoiceNumber: string;
    date: string;
    amount: string;
    status: string;
    actions: string;
    download: string;
    noFiltered: string;
    clearFilter: string;
    statusPaid: string;
    statusPending: string;
    statusFailed: string;
    statusRefunded: string;
  };

  // Payment Methods
  payment: {
    title: string;
    add: string;
    addPaymentMethod: string;
    noMethods: string;
    addFirst: string;
    addFirstMethod: string;
    default: string;
    expires: string;
    added: string;
    setDefault: string;
    remove: string;
    note: string;
    noteText: string;
    cardEnding: string;
    cardEndingIn: string;
    card: string;
    paypal: string;
    bankTransfer: string;
    paymentMethod: string;
  };
}
