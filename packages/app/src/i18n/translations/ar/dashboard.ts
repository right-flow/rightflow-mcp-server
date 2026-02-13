import type { DashboardTranslations } from '../../types/dashboard.types';

// Arabic translations - placeholder, needs proper translation
const dashboard: DashboardTranslations = {
  // Header
  header: {
    search: 'بحث...',
    sendFormLink: 'إرسال رابط النموذج',
  },

  // Loading & Errors
  loading: 'جاري التحميل...',
  loadingDashboard: 'جاري تحميل لوحة التحكم...',
  errorLoadingProfile: 'خطأ في تحميل الملف الشخصي',

  // Welcome Section
  welcome: {
    title: 'مرحباً بك في RightFlow',
    description: 'للبدء، أنشئ منظمة أو انضم إلى منظمة موجودة',
    createOrg: 'إنشاء منظمة',
  },

  // Sidebar
  sidebar: {
    version: 'الإصدار',
    upgradeNow: 'ترقية الآن',
    smartFormManagement: 'إدارة النماذج الذكية',
    packageUsage: 'استخدام الحزمة',
    forms: 'النماذج',
    submissions: 'الإرسالات',
    storage: 'التخزين',
    ofQuota: 'من الحصة',
  },

  // Errors
  error: {
    formsLimit: 'تم الوصول إلى حد النماذج',
    submissionsLimit: 'تم الوصول إلى حد الإرسالات',
    storageLimit: 'تم الوصول إلى حد التخزين',
  },

  errors: {
    failedToLoadForms: 'خطأ في تحميل النماذج',
    failedToCreateForm: 'خطأ في إنشاء النموذج',
    generic: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
  },

  // Stats
  stats: {
    totalSubmissions: 'إجمالي الإرسالات',
    monthlyViews: 'المشاهدات الشهرية',
    activeForms: 'النماذج النشطة',
    completedForms: 'النماذج المكتملة',
    completionRate: 'معدل الإكمال',
    conversionRate: 'معدل التحويل',
    avgResponseTime: 'متوسط وقت الاستجابة',
    growth: 'النمو',
    sinceLastMonth: 'منذ الشهر الماضي',
  },

  // Admin Dashboard
  admin: {
    totalOrganizations: 'إجمالي المنظمات',
    systemHealth: 'صحة النظام',
    activeUsers: 'المستخدمون النشطون',
    newSubmissions: 'الإرسالات الجديدة',
    completionRate: 'معدل الإكمال',
    pendingApprovals: 'في انتظار الموافقة',
    usageTrends: 'اتجاهات الاستخدام',
    recentActivity: 'النشاط الأخير',
    formPerformance: 'أداء النماذج',
  },

  // Months
  months: {
    january: 'يناير',
    february: 'فبراير',
    march: 'مارس',
    april: 'أبريل',
    may: 'مايو',
    june: 'يونيو',
    july: 'يوليو',
    august: 'أغسطس',
    september: 'سبتمبر',
    october: 'أكتوبر',
    november: 'نوفمبر',
    december: 'ديسمبر',
  },

  // Greetings
  greeting: {
    morning: 'صباح الخير',
    afternoon: 'مساء الخير',
    evening: 'مساء الخير',
    defaultUser: 'مستخدم',
    adminMessage: 'إليك نظرة عامة على منظمتك',
    managerMessage: 'إليك نظرة عامة على فريقك',
    workerMessage: 'إليك النماذج المخصصة لك',
  },

  // Roles
  role: {
    admin: 'مدير',
    manager: 'مدير فريق',
    worker: 'عامل',
    user: 'مستخدم',
  },

  // My Forms Widget
  myForms: {
    title: 'نماذجي',
    pending: 'قيد الانتظار',
    pendingCount: 'قيد الانتظار',
    completed: 'مكتمل',
    overdue: 'متأخر',
    noForms: 'لا توجد نماذج مخصصة',
    completedRecently: 'أُكملت مؤخراً',
    viewAll: 'عرض جميع النماذج ({count})',
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    once: 'مرة واحدة',
    soon: 'قريباً',
    inHours: 'خلال {count} ساعات',
    inDays: 'خلال {count} أيام',
    overduePast: 'متأخر',
  },

  // Status & Time
  status: {
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
  },

  time: {
    now: 'الآن',
    ago: 'منذ {time}',
    mins: 'دقائق',
    hours: 'ساعات',
    days: 'أيام',
  },

  common: {
    viewAll: 'الكل',
  },

  // Activity
  activity: {
    submitted: 'تم إرسال النموذج "{formName}"',
    approved: 'تمت الموافقة على النموذج "{formName}"',
    rejected: 'تم رفض النموذج "{formName}"',
    draft: 'تم حفظ المسودة: "{formName}"',
    anonymousUser: 'مستخدم مجهول',
  },

  // Demo Data
  demo: {
    activity: {
      formCompleted: 'نموذج تسجيل جديد مكتمل',
      formCompletedBy: 'أحمد محمد - منذ 10 دقائق',
      linkSent: 'تم إرسال الرابط للعميل',
      linkSentDetails: 'اتفاقية العقد - منذ ساعة',
      automationUpdate: 'تحديث الأتمتة',
      automationDetails: 'عملية الموافقة على النموذج - منذ ساعتين',
    },
    forms: {
      serviceJoin: 'نموذج التسجيل في الخدمة',
      techSupport: 'طلب الدعم الفني',
      satisfaction: 'استبيان الرضا',
      jobApplication: 'نموذج طلب التوظيف',
    },
  },

  // Form Performance
  formPerformance: {
    title: 'أداء النماذج',
  },

  // Recent Activity
  recentActivity: {
    title: 'النشاط الأخير',
  },

  // Usage Trends
  usageTrends: {
    title: 'اتجاهات الاستخدام',
    dateRange: 'نطاق التاريخ',
    exportReport: 'تصدير التقرير',
  },

  // Widgets
  widgets: {
    recentSubmissions: {
      title: 'الإرسالات الأخيرة',
      empty: 'لا توجد إرسالات أخيرة',
    },
    quickActions: {
      title: 'إجراءات سريعة',
      newForm: 'نموذج جديد',
      newFormDesc: 'إنشاء نموذج جديد',
      responses: 'الردود',
      responsesDesc: 'عرض الردود',
      myForms: 'نماذجي',
      myFormsDesc: 'إدارة نماذجك',
    },
    teamPerformance: {
      title: 'أداء الفريق',
      weeklySubmissions: 'الإرسالات الأسبوعية',
      avgPerPerson: 'المعدل لكل شخص',
      topPerformer: 'الأفضل أداءً',
      teamMembers: 'أعضاء الفريق',
      today: 'اليوم',
    },
    pendingApprovals: {
      title: 'في انتظار الموافقة',
      urgent: 'عاجل',
      low: 'منخفض',
      approvedToday: 'تمت الموافقة اليوم',
      rejectedToday: 'مرفوض اليوم',
      empty: 'لا توجد موافقات معلقة',
      viewAll: 'عرض جميع الموافقات',
    },
    userManagement: {
      title: 'إدارة المستخدمين',
      invite: 'دعوة مستخدم',
      admins: 'المديرون',
      managers: 'مديرو الفرق',
      workers: 'العمال',
      empty: 'لا يوجد مستخدمون آخرون',
      noName: 'بدون اسم',
      removeUser: {
        title: 'إزالة المستخدم',
        confirm: 'هل أنت متأكد من إزالة {name}؟',
        description: 'سيؤدي هذا إلى إزالة وصول المستخدم إلى المنظمة',
        removing: 'جاري الإزالة...',
        error: 'خطأ في إزالة المستخدم',
      },
      addUser: {
        title: 'إضافة مستخدم جديد',
        emailLabel: 'عنوان البريد الإلكتروني',
        roleLabel: 'الدور',
        emailRequired: 'البريد الإلكتروني مطلوب',
        error: 'خطأ في إضافة المستخدم',
        success: 'تم إرسال الدعوة للمستخدم',
        sending: 'جاري إرسال الدعوة...',
        send: 'إرسال الدعوة',
      },
      editRole: {
        title: 'تعديل دور المستخدم',
        saving: 'جاري الحفظ...',
        save: 'حفظ التغييرات',
        error: 'خطأ في تحديث الدور',
      },
    },
  },

  // User Management Page (full page)
  userManagementPage: {
    dashboard: 'لوحة التحكم',
    title: 'إدارة المستخدمين',
    inviteUser: 'دعوة مستخدم',
    totalUsers: 'إجمالي المستخدمين',
    searchPlaceholder: 'بحث بالاسم أو البريد الإلكتروني...',
    all: 'الكل',
    loadingUsers: 'جاري تحميل المستخدمين...',
    noUsersFound: 'لم يتم العثور على مستخدمين مطابقين للبحث',
    noUsersInOrg: 'لا يوجد مستخدمون في المنظمة',
    user: 'مستخدم',
    roleColumn: 'الدور',
    joinedDate: 'تاريخ الانضمام',
    actions: 'الإجراءات',
    editRole: 'تعديل الدور',
    removeUser: 'إزالة المستخدم',
    backToDashboard: 'العودة إلى لوحة التحكم',
  },
};

export default dashboard;
