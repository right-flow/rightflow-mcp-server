import type { BillingTranslations } from '../../types/billing.types';

// Arabic translations - placeholder, needs proper translation
const billing: BillingTranslations = {
  // Layout & Navigation
  title: 'الفوترة والاشتراك',
  nav: {
    subscription: 'الاشتراك',
    usage: 'الاستخدام',
    history: 'السجل',
  },

  // Subscription Page
  subscription: {
    title: 'إدارة الاشتراك',
    description: 'إدارة خطة الاشتراك، عرض الميزات، وتحديث إعدادات الفوترة',
    upgradedSuccess: 'تمت الترقية بنجاح إلى خطة {plan}!',
    downgradedSuccess: 'تم التخفيض بنجاح إلى خطة {plan}!',
    formsArchived: 'تم أرشفة {count} نماذج.',
    cancelledSuccess: 'تم إلغاء الاشتراك. ستحتفظ بالوصول حتى نهاية فترة الفوترة.',
    failedUpgrade: 'فشل ترقية الاشتراك',
    failedDowngrade: 'فشل تخفيض الاشتراك',
    failedCancel: 'فشل إلغاء الاشتراك',
  },

  // Subscription Card
  card: {
    noSubscription: 'لم يتم العثور على اشتراك',
    billingCycle: 'دورة الفوترة الحالية',
    yearly: 'سنوي',
    monthly: 'شهري',
    year: 'سنة',
    month: 'شهر',
    billedAnnually: '{price}/شهر بفوترة سنوية',
    freeForever: 'مجاني للأبد',
    forms: 'النماذج',
    submissions: 'الإرسالات',
    perMonth: '/شهر',
    storage: 'التخزين',
    teamMembers: 'أعضاء الفريق',
    currentPeriod: 'الفترة الحالية',
    cancelledOn: 'تم الإلغاء في',
    gracePeriodWarning: 'اشتراكك في فترة السماح. يرجى تحديث طريقة الدفع لاستمرار الخدمة.',
    suspendedWarning: 'اشتراكك معلق. يرجى التواصل مع الدعم أو الترقية لاستعادة الوصول.',
    cancelledInfo: 'سيظل اشتراكك نشطاً حتى نهاية فترة الفوترة الحالية.',
    upgradePlan: 'ترقية الخطة',
    downgradePlan: 'تخفيض الخطة',
    viewAllPlans: 'عرض جميع الخطط',
    cancelSubscription: 'إلغاء الاشتراك',
  },

  // Status Badge
  status: {
    active: 'نشط',
    gracePeriod: 'فترة السماح',
    suspended: 'معلق',
    cancelled: 'ملغى',
    subscriptionStatus: 'حالة الاشتراك',
  },

  // Pricing Toggle
  toggle: {
    monthly: 'شهري',
    yearly: 'سنوي',
    percentOff: 'خصم {percent}%',
  },

  // Pricing (legacy)
  pricing: {
    monthly: 'شهري',
    yearly: 'سنوي',
    off: 'خصم {percent}%',
  },

  // Plan Comparison
  plans: {
    title: 'اختر خطتك',
    description: 'اختر الخطة الأنسب لاحتياجاتك',
    customPlan: 'تحتاج خطة مخصصة؟',
    customPlanDescription: 'تبحث عن حدود أعلى، تكاملات مخصصة، أو ميزات مؤسسية؟',
    contactSales: 'تواصل مع المبيعات',
    freeTrial: 'جميع الخطط تشمل 14 يوم تجربة مجانية',
    cancel: 'إلغاء',
  },

  // Plan Card
  planCard: {
    currentPlan: 'الخطة الحالية',
    save: 'وفر {percent}%',
    free: 'مجاني',
    total: 'المجموع {price}/سنة',
    totalPerYear: 'المجموع {amount}/سنة',
    selectPlan: 'اختر الخطة',
    select: 'اختر',
    notAvailable: 'غير متوفر',
    perMonth: '/شهر',
    startingFrom: 'ابتداءً من ',
    contactUs: 'تواصل معنا',
  },

  // Cancel Modal
  cancel: {
    title: 'إلغاء الاشتراك',
    plan: 'خطة {name}',
    planLabel: 'خطة {plan}',
    confirmQuestion: 'هل أنت متأكد من إلغاء اشتراكك؟',
    activeUntil: 'سيظل اشتراكك نشطاً حتى:',
    retainAccess: 'ستحتفظ بالوصول لجميع الميزات حتى نهاية فترة الفوترة',
    dataPreserved: 'بعد الإلغاء، سيتم الاحتفاظ ببياناتك لمدة 30 يوم في حال أردت إعادة التفعيل',
    whatYouLose: 'ما ستفقده بعد {date}:',
    loseAccess: 'الوصول لجميع النماذج والإرسالات',
    loseForms: 'الوصول لجميع النماذج والإرسالات',
    loseTeam: 'وصول أعضاء الفريق',
    loseSupport: 'الدعم المميز',
    confirmCheckbox: 'أفهم أن اشتراكي سيُلغى وسأفقد الوصول بعد {date}',
    keepSubscription: 'الاحتفاظ بالاشتراك',
    cancelling: 'جاري الإلغاء...',
    confirmCancel: 'نعم، إلغاء الاشتراك',
    confirmButton: 'نعم، إلغاء الاشتراك',
    closeModal: 'إغلاق النافذة',
  },

  // Comparison Modal
  comparison: {
    title: 'اختر خطتك',
    description: 'اختر الخطة الأنسب لاحتياجاتك',
    close: 'إغلاق',
    customPlanTitle: 'تحتاج خطة مخصصة؟',
    customPlanDescription: 'تبحث عن حدود أعلى، تكاملات مخصصة، أو ميزات مؤسسية؟',
    contactSales: 'تواصل مع المبيعات',
    trialNote: 'جميع الخطط تشمل 14 يوم تجربة مجانية',
    cancel: 'إلغاء',
  },

  // Usage Dashboard
  usage: {
    title: 'لوحة الاستخدام',
    description: 'تتبع استخدامك وحصتك عبر جميع الموارد',
    refresh: 'تحديث',
    refreshing: 'جاري التحديث...',
    currentPlan: 'الخطة الحالية: {plan}',
    failedLoad: 'فشل تحميل بيانات الاستخدام',
    failedToLoad: 'فشل تحميل بيانات الاستخدام',
    tryAgain: 'حاول مرة أخرى',
    totalForms: 'إجمالي النماذج',
    thisMonth: 'هذا الشهر',
    storageUsed: 'التخزين المستخدم',
  },

  // Quota Status
  quota: {
    title: 'حالة الحصة',
    noData: 'لا توجد بيانات حصة متاحة',
    critical: 'حرج',
    warning: 'تحذير',
    healthy: 'سليم',
    forms: 'النماذج',
    submissionsMonth: 'الإرسالات (هذا الشهر)',
    submissionsThisMonth: 'الإرسالات (هذا الشهر)',
    storageMb: 'التخزين (MB)',
    storageMB: 'التخزين (MB)',
    limitReached: 'تم الوصول لحد الحصة',
    limitReachedDescription: 'لقد وصلت أو تجاوزت حدود حصتك. قم بترقية خطتك للاستمرار في استخدام جميع الميزات.',
    limitReachedDesc: 'لقد وصلت أو تجاوزت حدود حصتك. قم بترقية خطتك للاستمرار في استخدام جميع الميزات.',
    approachingLimit: 'تقترب من حدود الحصة',
    approachingLimitDescription: 'أنت تستخدم أكثر من 70% من حصتك. فكر في الترقية لتجنب الانقطاعات.',
    approachingLimitDesc: 'أنت تستخدم أكثر من 70% من حصتك. فكر في الترقية لتجنب الانقطاعات.',
    viewPlans: 'عرض الخطط',
    upgradePlan: 'ترقية الخطة',
    used: '{used} من {limit}',
    of: 'من',
    unlimited: 'غير محدود',
  },

  // History Page
  history: {
    title: 'سجل الفوترة',
    description: 'عرض الفواتير وإدارة طرق الدفع',
    failedLoad: 'فشل تحميل سجل الفوترة',
    failedToLoad: 'فشل تحميل سجل الفوترة',
    downloadNotAvailable: 'التحميل غير متاح لهذه الفاتورة',
    downloading: 'جاري تحميل الفاتورة {invoice}...',
    downloadFailed: 'فشل تحميل الفاتورة',
    addPaymentNotImplemented: 'إضافة طريقة الدفع غير متوفرة بعد',
    paymentMethodRemoved: 'تم إزالة طريقة الدفع بنجاح',
    removePaymentFailed: 'فشل إزالة طريقة الدفع',
    defaultUpdated: 'تم تحديث طريقة الدفع الافتراضية',
    updateDefaultFailed: 'فشل تحديث طريقة الدفع الافتراضية',
    tryAgain: 'حاول مرة أخرى',
  },

  // Invoice Table
  invoice: {
    title: 'سجل الفواتير',
    noInvoices: 'لا توجد فواتير بعد',
    filter: 'تصفية',
    allStatuses: 'جميع الحالات',
    invoiceNumber: 'الفاتورة #',
    date: 'التاريخ',
    amount: 'المبلغ',
    status: 'الحالة',
    actions: 'الإجراءات',
    download: 'تحميل',
    noFilteredInvoices: 'لا توجد فواتير {status}',
    clearFilter: 'مسح التصفية',
    statusPaid: 'مدفوعة',
    statusPending: 'قيد الانتظار',
    statusFailed: 'فاشلة',
    statusRefunded: 'مستردة',
  },

  // Invoices (legacy keys)
  invoices: {
    title: 'سجل الفواتير',
    noInvoices: 'لا توجد فواتير بعد',
    filter: 'تصفية:',
    allStatuses: 'جميع الحالات',
    invoiceNumber: 'الفاتورة #',
    date: 'التاريخ',
    amount: 'المبلغ',
    status: 'الحالة',
    actions: 'الإجراءات',
    download: 'تحميل',
    noFiltered: 'لا توجد فواتير {status}',
    clearFilter: 'مسح التصفية',
    statusPaid: 'مدفوعة',
    statusPending: 'قيد الانتظار',
    statusFailed: 'فاشلة',
    statusRefunded: 'مستردة',
  },

  // Payment Methods
  payment: {
    title: 'طرق الدفع',
    add: 'إضافة طريقة دفع',
    addPaymentMethod: 'إضافة طريقة دفع',
    noMethods: 'لم تتم إضافة طرق دفع',
    addFirst: 'أضف طريقة الدفع الأولى',
    addFirstMethod: 'أضف طريقة الدفع الأولى',
    default: 'افتراضي',
    expires: 'تنتهي {date}',
    added: 'أضيفت',
    setDefault: 'تعيين كافتراضي',
    remove: 'إزالة',
    note: 'ملاحظة',
    noteText: 'سيتم استخدام طريقة الدفع الافتراضية للتجديدات التلقائية والتجاوزات. يجب أن يكون لديك طريقة دفع واحدة على الأقل.',
    cardEnding: '{brand} تنتهي بـ {last4}',
    cardEndingIn: '{brand} تنتهي بـ {last4}',
    card: 'بطاقة',
    paypal: 'PayPal',
    bankTransfer: 'تحويل بنكي',
    paymentMethod: 'طريقة الدفع',
  },
};

export default billing;
