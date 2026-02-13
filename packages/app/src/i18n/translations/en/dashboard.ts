import type { DashboardTranslations } from '../../types/dashboard.types';

const dashboard: DashboardTranslations = {
  // Header
  header: {
    search: 'Search...',
    sendFormLink: 'Send Form Link',
  },

  // Loading & Errors
  loading: 'Loading...',
  loadingDashboard: 'Loading dashboard...',
  errorLoadingProfile: 'Error loading profile',

  // Welcome Section
  welcome: {
    title: 'Welcome to RightFlow',
    description: 'To get started, create an organization or join an existing one',
    createOrg: 'Create Organization',
  },

  // Sidebar
  sidebar: {
    version: 'Version',
    upgradeNow: 'Upgrade Now',
    smartFormManagement: 'Smart Form Management',
    packageUsage: 'Package Usage',
    forms: 'Forms',
    submissions: 'Submissions',
    storage: 'Storage',
    ofQuota: 'of quota',
  },

  // Errors
  error: {
    formsLimit: 'Forms limit reached',
    submissionsLimit: 'Submissions limit reached',
    storageLimit: 'Storage limit reached',
  },

  errors: {
    failedToLoadForms: 'Error loading forms',
    failedToCreateForm: 'Error creating form',
    generic: 'An error occurred. Please try again.',
  },

  // Stats
  stats: {
    totalSubmissions: 'Total Submissions',
    monthlyViews: 'Monthly Views',
    activeForms: 'Active Forms',
    completedForms: 'Completed Forms',
    completionRate: 'Completion Rate',
    conversionRate: 'Conversion Rate',
    avgResponseTime: 'Avg Response Time',
    growth: 'Growth',
    sinceLastMonth: 'Since last month',
  },

  // Admin Dashboard
  admin: {
    totalOrganizations: 'Total Organizations',
    systemHealth: 'System Health',
    activeUsers: 'Active Users',
    newSubmissions: 'New Submissions',
    completionRate: 'Completion Rate',
    pendingApprovals: 'Pending Approvals',
    usageTrends: 'Usage Trends',
    recentActivity: 'Recent Activity',
    formPerformance: 'Form Performance',
  },

  // Months
  months: {
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
  },

  // Greetings
  greeting: {
    morning: 'Good Morning',
    afternoon: 'Good Afternoon',
    evening: 'Good Evening',
    defaultUser: 'User',
    adminMessage: 'Here is an overview of your organization',
    managerMessage: 'Here is an overview of your team',
    workerMessage: 'Here are the forms assigned to you',
  },

  // Roles
  role: {
    admin: 'Admin',
    manager: 'Manager',
    worker: 'Worker',
    user: 'User',
  },

  // My Forms Widget
  myForms: {
    title: 'My Forms',
    pending: 'Pending',
    pendingCount: 'Pending',
    completed: 'Completed',
    overdue: 'Overdue',
    noForms: 'No assigned forms',
    completedRecently: 'Recently Completed',
    viewAll: 'View all {count} forms',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    once: 'Once',
    soon: 'Soon',
    inHours: 'In {count} hours',
    inDays: 'In {count} days',
    overduePast: 'Overdue',
  },

  // Status & Time
  status: {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  },

  time: {
    now: 'Now',
    ago: '{time} ago',
    mins: 'mins',
    hours: 'hours',
    days: 'days',
  },

  common: {
    viewAll: 'All',
  },

  // Activity
  activity: {
    submitted: 'Form "{formName}" submitted',
    approved: 'Form "{formName}" approved',
    rejected: 'Form "{formName}" rejected',
    draft: 'Draft saved: "{formName}"',
    anonymousUser: 'Anonymous user',
  },

  // Demo Data
  demo: {
    activity: {
      formCompleted: 'New registration form completed',
      formCompletedBy: 'John Smith - 10 minutes ago',
      linkSent: 'Link sent to client',
      linkSentDetails: 'Contract agreement - 1 hour ago',
      automationUpdate: 'Automation update',
      automationDetails: 'Form approval process - 2 hours ago',
    },
    forms: {
      serviceJoin: 'Service Registration Form',
      techSupport: 'Technical Support Request',
      satisfaction: 'Satisfaction Survey',
      jobApplication: 'Job Application Form',
    },
  },

  // Form Performance
  formPerformance: {
    title: 'Form Performance',
  },

  // Recent Activity
  recentActivity: {
    title: 'Recent Activity',
  },

  // Usage Trends
  usageTrends: {
    title: 'Usage Trends',
    dateRange: 'Date Range',
    exportReport: 'Export Report',
  },

  // Widgets
  widgets: {
    recentSubmissions: {
      title: 'Recent Submissions',
      empty: 'No recent submissions',
    },
    quickActions: {
      title: 'Quick Actions',
      newForm: 'New Form',
      newFormDesc: 'Create a new form',
      responses: 'Responses',
      responsesDesc: 'View responses',
      myForms: 'My Forms',
      myFormsDesc: 'Manage your forms',
    },
    teamPerformance: {
      title: 'Team Performance',
      weeklySubmissions: 'Weekly Submissions',
      avgPerPerson: 'Avg per person',
      topPerformer: 'Top Performer',
      teamMembers: 'Team Members',
      today: 'Today',
    },
    pendingApprovals: {
      title: 'Pending Approvals',
      urgent: 'Urgent',
      low: 'Low',
      approvedToday: 'Approved Today',
      rejectedToday: 'Rejected Today',
      empty: 'No pending approvals',
      viewAll: 'View all approvals',
    },
    userManagement: {
      title: 'User Management',
      invite: 'Invite User',
      admins: 'Admins',
      managers: 'Managers',
      workers: 'Workers',
      empty: 'No other users',
      noName: 'No Name',
      removeUser: {
        title: 'Remove User',
        confirm: 'Are you sure you want to remove {name}?',
        description: "This will remove the user's access to the organization",
        removing: 'Removing user...',
        error: 'Error removing user',
      },
      addUser: {
        title: 'Add New User',
        emailLabel: 'Email Address',
        roleLabel: 'Role',
        emailRequired: 'Email is required',
        error: 'Error adding user',
        success: 'Invitation sent to user',
        sending: 'Sending invitation...',
        send: 'Send Invitation',
      },
      editRole: {
        title: 'Edit User Role',
        saving: 'Saving...',
        save: 'Save Changes',
        error: 'Error updating role',
      },
    },
  },

  // User Management Page (full page)
  userManagementPage: {
    dashboard: 'Dashboard',
    title: 'User Management',
    inviteUser: 'Invite User',
    totalUsers: 'Total Users',
    searchPlaceholder: 'Search by name or email...',
    all: 'All',
    loadingUsers: 'Loading users...',
    noUsersFound: 'No users found matching search',
    noUsersInOrg: 'No users in organization',
    user: 'User',
    roleColumn: 'Role',
    joinedDate: 'Joined Date',
    actions: 'Actions',
    editRole: 'Edit Role',
    removeUser: 'Remove User',
    backToDashboard: 'Back to Dashboard',
  },
};

export default dashboard;
