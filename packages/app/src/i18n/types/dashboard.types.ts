/**
 * Dashboard namespace - widgets, stats, activity, greetings
 * Used by dashboard pages and widgets
 */
export interface DashboardTranslations {
  // Header
  header: {
    search: string;
    sendFormLink: string;
  };

  // Loading & Errors
  loading: string;
  loadingDashboard: string;
  errorLoadingProfile: string;

  // Welcome Section
  welcome: {
    title: string;
    description: string;
    createOrg: string;
  };

  // Sidebar
  sidebar: {
    version: string;
    upgradeNow: string;
    smartFormManagement: string;
    packageUsage: string;
    forms: string;
    submissions: string;
    storage: string;
    ofQuota: string;
  };

  // Errors
  error: {
    formsLimit: string;
    submissionsLimit: string;
    storageLimit: string;
  };

  errors: {
    failedToLoadForms: string;
    failedToCreateForm: string;
    generic: string;
  };

  // Stats
  stats: {
    totalSubmissions: string;
    monthlyViews: string;
    activeForms: string;
    completedForms: string;
    completionRate: string;
    conversionRate: string;
    avgResponseTime: string;
    growth: string;
    sinceLastMonth: string;
  };

  // Admin Dashboard
  admin: {
    totalOrganizations: string;
    systemHealth: string;
    activeUsers: string;
    newSubmissions: string;
    completionRate: string;
    pendingApprovals: string;
    usageTrends: string;
    recentActivity: string;
    formPerformance: string;
  };

  // Months
  months: {
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
  };

  // Greetings
  greeting: {
    morning: string;
    afternoon: string;
    evening: string;
    defaultUser: string;
    adminMessage: string;
    managerMessage: string;
    workerMessage: string;
  };

  // Roles
  role: {
    admin: string;
    manager: string;
    worker: string;
    user: string;
  };

  // My Forms Widget
  myForms: {
    title: string;
    pending: string;
    pendingCount: string;
    completed: string;
    overdue: string;
    noForms: string;
    completedRecently: string;
    viewAll: string;
    daily: string;
    weekly: string;
    monthly: string;
    once: string;
    soon: string;
    inHours: string;
    inDays: string;
    overduePast: string;
  };

  // Status & Time
  status: {
    pending: string;
    approved: string;
    rejected: string;
  };

  time: {
    now: string;
    ago: string;
    mins: string;
    hours: string;
    days: string;
  };

  common: {
    viewAll: string;
  };

  // Activity
  activity: {
    submitted: string;
    approved: string;
    rejected: string;
    draft: string;
    anonymousUser: string;
  };

  // Demo Data
  demo: {
    activity: {
      formCompleted: string;
      formCompletedBy: string;
      linkSent: string;
      linkSentDetails: string;
      automationUpdate: string;
      automationDetails: string;
    };
    forms: {
      serviceJoin: string;
      techSupport: string;
      satisfaction: string;
      jobApplication: string;
    };
  };

  // Form Performance
  formPerformance: {
    title: string;
  };

  // Recent Activity
  recentActivity: {
    title: string;
  };

  // Usage Trends
  usageTrends: {
    title: string;
    dateRange: string;
    exportReport: string;
  };

  // Widgets
  widgets: {
    recentSubmissions: {
      title: string;
      empty: string;
    };
    quickActions: {
      title: string;
      newForm: string;
      newFormDesc: string;
      responses: string;
      responsesDesc: string;
      myForms: string;
      myFormsDesc: string;
    };
    teamPerformance: {
      title: string;
      weeklySubmissions: string;
      avgPerPerson: string;
      topPerformer: string;
      teamMembers: string;
      today: string;
    };
    pendingApprovals: {
      title: string;
      urgent: string;
      low: string;
      approvedToday: string;
      rejectedToday: string;
      empty: string;
      viewAll: string;
    };
    userManagement: {
      title: string;
      invite: string;
      admins: string;
      managers: string;
      workers: string;
      empty: string;
      noName: string;
      removeUser: {
        title: string;
        confirm: string;
        description: string;
        removing: string;
        error: string;
      };
      addUser: {
        title: string;
        emailLabel: string;
        roleLabel: string;
        emailRequired: string;
        error: string;
        success: string;
        sending: string;
        send: string;
      };
      editRole: {
        title: string;
        saving: string;
        save: string;
        error: string;
      };
    };
  };

  // User Management Page (full page, not widget)
  userManagementPage: {
    dashboard: string;
    title: string;
    inviteUser: string;
    totalUsers: string;
    searchPlaceholder: string;
    all: string;
    loadingUsers: string;
    noUsersFound: string;
    noUsersInOrg: string;
    user: string;
    roleColumn: string;
    joinedDate: string;
    actions: string;
    editRole: string;
    removeUser: string;
    backToDashboard: string;
  };
}
