import type { DashboardTranslations } from '../../types/dashboard.types';

// Hebrew translations - placeholder, needs proper translation
const dashboard: DashboardTranslations = {
  // Header
  header: {
    search: 'חיפוש...',
    sendFormLink: 'שלח קישור לטופס',
  },

  // Loading & Errors
  loading: 'טוען...',
  loadingDashboard: 'טוען לוח בקרה...',
  errorLoadingProfile: 'שגיאה בטעינת פרופיל',

  // Welcome Section
  welcome: {
    title: 'ברוכים הבאים ל-RightFlow',
    description: 'כדי להתחיל, צור ארגון או הצטרף לארגון קיים',
    createOrg: 'צור ארגון',
  },

  // Sidebar
  sidebar: {
    version: 'גרסה',
    upgradeNow: 'שדרג עכשיו',
    smartFormManagement: 'ניהול טפסים חכם',
    packageUsage: 'שימוש בחבילה',
    forms: 'טפסים',
    submissions: 'הגשות',
    storage: 'אחסון',
    ofQuota: 'מהמכסה',
  },

  // Errors
  error: {
    formsLimit: 'הגעת למגבלת הטפסים',
    submissionsLimit: 'הגעת למגבלת ההגשות',
    storageLimit: 'הגעת למגבלת האחסון',
  },

  errors: {
    failedToLoadForms: 'שגיאה בטעינת טפסים',
    failedToCreateForm: 'שגיאה ביצירת טופס',
    generic: 'אירעה שגיאה. אנא נסה שוב.',
  },

  // Stats
  stats: {
    totalSubmissions: 'סה"כ הגשות',
    monthlyViews: 'צפיות חודשיות',
    activeForms: 'טפסים פעילים',
    completedForms: 'טפסים שהושלמו',
    completionRate: 'אחוז השלמה',
    conversionRate: 'אחוז המרה',
    avgResponseTime: 'זמן תגובה ממוצע',
    growth: 'צמיחה',
    sinceLastMonth: 'מאז החודש שעבר',
  },

  // Admin Dashboard
  admin: {
    totalOrganizations: 'סה"כ ארגונים',
    systemHealth: 'בריאות המערכת',
    activeUsers: 'משתמשים פעילים',
    newSubmissions: 'הגשות חדשות',
    completionRate: 'אחוז השלמה',
    pendingApprovals: 'ממתינים לאישור',
    usageTrends: 'מגמות שימוש',
    recentActivity: 'פעילות אחרונה',
    formPerformance: 'ביצועי טפסים',
  },

  // Months
  months: {
    january: 'ינואר',
    february: 'פברואר',
    march: 'מרץ',
    april: 'אפריל',
    may: 'מאי',
    june: 'יוני',
    july: 'יולי',
    august: 'אוגוסט',
    september: 'ספטמבר',
    october: 'אוקטובר',
    november: 'נובמבר',
    december: 'דצמבר',
  },

  // Greetings
  greeting: {
    morning: 'בוקר טוב',
    afternoon: 'צהריים טובים',
    evening: 'ערב טוב',
    defaultUser: 'משתמש',
    adminMessage: 'הנה סקירה של הארגון שלך',
    managerMessage: 'הנה סקירה של הצוות שלך',
    workerMessage: 'הנה הטפסים שהוקצו לך',
  },

  // Roles
  role: {
    admin: 'מנהל',
    manager: 'מנהל צוות',
    worker: 'עובד',
    user: 'משתמש',
  },

  // My Forms Widget
  myForms: {
    title: 'הטפסים שלי',
    pending: 'ממתין',
    pendingCount: 'ממתינים',
    completed: 'הושלם',
    overdue: 'באיחור',
    noForms: 'אין טפסים מוקצים',
    completedRecently: 'הושלמו לאחרונה',
    viewAll: 'צפה בכל {count} הטפסים',
    daily: 'יומי',
    weekly: 'שבועי',
    monthly: 'חודשי',
    once: 'חד פעמי',
    soon: 'בקרוב',
    inHours: 'בעוד {count} שעות',
    inDays: 'בעוד {count} ימים',
    overduePast: 'באיחור',
  },

  // Status & Time
  status: {
    pending: 'ממתין',
    approved: 'אושר',
    rejected: 'נדחה',
  },

  time: {
    now: 'עכשיו',
    ago: 'לפני {time}',
    mins: 'דקות',
    hours: 'שעות',
    days: 'ימים',
  },

  common: {
    viewAll: 'הכל',
  },

  // Activity
  activity: {
    submitted: 'הטופס "{formName}" הוגש',
    approved: 'הטופס "{formName}" אושר',
    rejected: 'הטופס "{formName}" נדחה',
    draft: 'טיוטה נשמרה: "{formName}"',
    anonymousUser: 'משתמש אנונימי',
  },

  // Demo Data
  demo: {
    activity: {
      formCompleted: 'טופס הרשמה חדש הושלם',
      formCompletedBy: 'יוסי כהן - לפני 10 דקות',
      linkSent: 'קישור נשלח ללקוח',
      linkSentDetails: 'הסכם חוזה - לפני שעה',
      automationUpdate: 'עדכון אוטומציה',
      automationDetails: 'תהליך אישור טופס - לפני שעתיים',
    },
    forms: {
      serviceJoin: 'טופס הצטרפות לשירות',
      techSupport: 'בקשת תמיכה טכנית',
      satisfaction: 'סקר שביעות רצון',
      jobApplication: 'טופס מועמדות לעבודה',
    },
  },

  // Form Performance
  formPerformance: {
    title: 'ביצועי טפסים',
  },

  // Recent Activity
  recentActivity: {
    title: 'פעילות אחרונה',
  },

  // Usage Trends
  usageTrends: {
    title: 'מגמות שימוש',
    dateRange: 'טווח תאריכים',
    exportReport: 'ייצוא דוח',
  },

  // Widgets
  widgets: {
    recentSubmissions: {
      title: 'הגשות אחרונות',
      empty: 'אין הגשות אחרונות',
    },
    quickActions: {
      title: 'פעולות מהירות',
      newForm: 'טופס חדש',
      newFormDesc: 'צור טופס חדש',
      responses: 'תגובות',
      responsesDesc: 'צפה בתגובות',
      myForms: 'הטפסים שלי',
      myFormsDesc: 'נהל את הטפסים שלך',
    },
    teamPerformance: {
      title: 'ביצועי צוות',
      weeklySubmissions: 'הגשות שבועיות',
      avgPerPerson: 'ממוצע לאדם',
      topPerformer: 'המצטיין',
      teamMembers: 'חברי צוות',
      today: 'היום',
    },
    pendingApprovals: {
      title: 'ממתינים לאישור',
      urgent: 'דחוף',
      low: 'נמוך',
      approvedToday: 'אושרו היום',
      rejectedToday: 'נדחו היום',
      empty: 'אין ממתינים לאישור',
      viewAll: 'צפה בכל האישורים',
    },
    userManagement: {
      title: 'ניהול משתמשים',
      invite: 'הזמן משתמש',
      admins: 'מנהלים',
      managers: 'מנהלי צוות',
      workers: 'עובדים',
      empty: 'אין משתמשים נוספים',
      noName: 'ללא שם',
      removeUser: {
        title: 'הסר משתמש',
        confirm: 'האם אתה בטוח שברצונך להסיר את {name}?',
        description: 'פעולה זו תסיר את הגישה של המשתמש לארגון',
        removing: 'מסיר משתמש...',
        error: 'שגיאה בהסרת משתמש',
      },
      addUser: {
        title: 'הוסף משתמש חדש',
        emailLabel: 'כתובת אימייל',
        roleLabel: 'תפקיד',
        emailRequired: 'אימייל נדרש',
        error: 'שגיאה בהוספת משתמש',
        success: 'הזמנה נשלחה למשתמש',
        sending: 'שולח הזמנה...',
        send: 'שלח הזמנה',
      },
      editRole: {
        title: 'ערוך תפקיד משתמש',
        saving: 'שומר...',
        save: 'שמור שינויים',
        error: 'שגיאה בעדכון תפקיד',
      },
    },
  },

  // User Management Page (full page)
  userManagementPage: {
    dashboard: 'לוח בקרה',
    title: 'ניהול משתמשים',
    inviteUser: 'הזמן משתמש',
    totalUsers: 'סה"כ משתמשים',
    searchPlaceholder: 'חפש לפי שם או אימייל...',
    all: 'הכל',
    loadingUsers: 'טוען משתמשים...',
    noUsersFound: 'לא נמצאו משתמשים התואמים לחיפוש',
    noUsersInOrg: 'אין משתמשים בארגון',
    user: 'משתמש',
    roleColumn: 'תפקיד',
    joinedDate: 'הצטרף בתאריך',
    actions: 'פעולות',
    editRole: 'ערוך תפקיד',
    removeUser: 'הסר משתמש',
    backToDashboard: 'חזרה ללוח הבקרה',
  },
};

export default dashboard;
