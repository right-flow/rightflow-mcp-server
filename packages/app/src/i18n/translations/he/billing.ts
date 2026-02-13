import type { BillingTranslations } from '../../types/billing.types';

// Hebrew translations
const billing: BillingTranslations = {
  // Layout & Navigation
  title: 'חיוב ומנוי',
  nav: {
    subscription: 'מנוי',
    usage: 'שימוש',
    history: 'היסטוריה',
  },

  // Subscription Page
  subscription: {
    title: 'ניהול מנוי',
    description: 'נהל את תוכנית המנוי שלך, צפה בתכונות ועדכן הגדרות חיוב',
    upgradedSuccess: 'שודרגת בהצלחה לתוכנית {plan}!',
    downgradedSuccess: 'שונמכת בהצלחה לתוכנית {plan}!',
    formsArchived: '{count} טפסים הועברו לארכיון.',
    cancelledSuccess: 'המנוי בוטל. תשמור גישה עד סוף תקופת החיוב.',
    failedUpgrade: 'שדרוג המנוי נכשל',
    failedDowngrade: 'שנמוך המנוי נכשל',
    failedCancel: 'ביטול המנוי נכשל',
  },

  // Subscription Card
  card: {
    noSubscription: 'לא נמצא מנוי',
    billingCycle: 'מחזור חיוב נוכחי',
    yearly: 'שנתי',
    monthly: 'חודשי',
    year: 'שנה',
    month: 'חודש',
    billedAnnually: '{price}/חודש בחיוב שנתי',
    freeForever: 'חינם לנצח',
    forms: 'טפסים',
    submissions: 'הגשות',
    perMonth: '/חודש',
    storage: 'אחסון',
    teamMembers: 'חברי צוות',
    currentPeriod: 'תקופה נוכחית',
    cancelledOn: 'בוטל ב-',
    gracePeriodWarning: 'המנוי שלך בתקופת חסד. אנא עדכן את אמצעי התשלום להמשך השירות.',
    suspendedWarning: 'המנוי שלך מושעה. אנא פנה לתמיכה או שדרג לשחזור הגישה.',
    cancelledInfo: 'המנוי שלך יישאר פעיל עד סוף תקופת החיוב הנוכחית.',
    upgradePlan: 'שדרג תוכנית',
    downgradePlan: 'שנמך תוכנית',
    viewAllPlans: 'צפה בכל התוכניות',
    cancelSubscription: 'בטל מנוי',
  },

  // Status Badge
  status: {
    active: 'פעיל',
    gracePeriod: 'תקופת חסד',
    suspended: 'מושעה',
    cancelled: 'מבוטל',
    subscriptionStatus: 'סטטוס מנוי',
  },

  // Pricing Toggle
  toggle: {
    monthly: 'חודשי',
    yearly: 'שנתי',
    percentOff: 'הנחה של {percent}%',
  },

  // Pricing (legacy)
  pricing: {
    monthly: 'חודשי',
    yearly: 'שנתי',
    off: 'הנחה של {percent}%',
  },

  // Plan Comparison
  plans: {
    title: 'בחר את התוכנית שלך',
    description: 'בחר את התוכנית המתאימה לצרכים שלך',
    customPlan: 'צריך תוכנית מותאמת אישית?',
    customPlanDescription: 'מחפש מגבלות גבוהות יותר, אינטגרציות מותאמות או תכונות ארגוניות?',
    contactSales: 'צור קשר עם מכירות',
    freeTrial: 'כל התוכניות כוללות 14 ימי ניסיון חינם',
    cancel: 'ביטול',
  },

  // Plan Card
  planCard: {
    currentPlan: 'תוכנית נוכחית',
    save: 'חסוך {percent}%',
    free: 'חינם',
    total: 'סה"כ {price}/שנה',
    totalPerYear: 'סה"כ {amount}/שנה',
    selectPlan: 'בחר תוכנית',
    select: 'בחר',
    notAvailable: 'לא זמין',
    perMonth: '/חודש',
    startingFrom: 'החל מ-',
    contactUs: 'צור קשר',
  },

  // Cancel Modal
  cancel: {
    title: 'ביטול מנוי',
    plan: 'תוכנית {name}',
    planLabel: 'תוכנית {plan}',
    confirmQuestion: 'האם אתה בטוח שברצונך לבטל את המנוי?',
    activeUntil: 'המנוי שלך יישאר פעיל עד:',
    retainAccess: 'תשמור גישה לכל התכונות עד סוף תקופת החיוב',
    dataPreserved: 'לאחר הביטול, הנתונים שלך יישמרו 30 יום למקרה שתרצה להפעיל מחדש',
    whatYouLose: 'מה תאבד אחרי {date}:',
    loseAccess: 'גישה לכל הטפסים וההגשות',
    loseForms: 'גישה לכל הטפסים וההגשות',
    loseTeam: 'גישת חברי צוות',
    loseSupport: 'תמיכה פרימיום',
    confirmCheckbox: 'אני מבין שהמנוי יבוטל ואאבד גישה אחרי {date}',
    keepSubscription: 'שמור מנוי',
    cancelling: 'מבטל...',
    confirmCancel: 'כן, בטל מנוי',
    confirmButton: 'כן, בטל מנוי',
    closeModal: 'סגור חלון',
  },

  // Comparison Modal
  comparison: {
    title: 'בחר את התוכנית שלך',
    description: 'בחר את התוכנית המתאימה לצרכים שלך',
    close: 'סגור',
    customPlanTitle: 'צריך תוכנית מותאמת אישית?',
    customPlanDescription: 'מחפש מגבלות גבוהות יותר, אינטגרציות מותאמות או תכונות ארגוניות?',
    contactSales: 'צור קשר עם מכירות',
    trialNote: 'כל התוכניות כוללות 14 ימי ניסיון חינם',
    cancel: 'ביטול',
  },

  // Usage Dashboard
  usage: {
    title: 'לוח שימוש',
    description: 'עקוב אחר השימוש והמכסה שלך בכל המשאבים',
    refresh: 'רענן',
    refreshing: 'מרענן...',
    currentPlan: 'תוכנית נוכחית: {plan}',
    failedLoad: 'נכשל בטעינת נתוני שימוש',
    failedToLoad: 'נכשל בטעינת נתוני שימוש',
    tryAgain: 'נסה שוב',
    totalForms: 'סה"כ טפסים',
    thisMonth: 'החודש',
    storageUsed: 'אחסון בשימוש',
  },

  // Quota Status
  quota: {
    title: 'סטטוס מכסה',
    noData: 'אין נתוני מכסה זמינים',
    critical: 'קריטי',
    warning: 'אזהרה',
    healthy: 'תקין',
    forms: 'טפסים',
    submissionsMonth: 'הגשות (החודש)',
    submissionsThisMonth: 'הגשות (החודש)',
    storageMb: 'אחסון (MB)',
    storageMB: 'אחסון (MB)',
    limitReached: 'הגעת למגבלת המכסה',
    limitReachedDescription: 'הגעת או עברת את מגבלות המכסה שלך. שדרג את התוכנית להמשך השימוש בכל התכונות.',
    limitReachedDesc: 'הגעת או עברת את מגבלות המכסה שלך. שדרג את התוכנית להמשך השימוש בכל התכונות.',
    approachingLimit: 'מתקרב למגבלות המכסה',
    approachingLimitDescription: 'אתה משתמש ביותר מ-70% מהמכסה שלך. שקול לשדרג למניעת הפרעות.',
    approachingLimitDesc: 'אתה משתמש ביותר מ-70% מהמכסה שלך. שקול לשדרג למניעת הפרעות.',
    viewPlans: 'צפה בתוכניות',
    upgradePlan: 'שדרג תוכנית',
    used: '{used} מתוך {limit}',
    of: 'מתוך',
    unlimited: 'ללא הגבלה',
  },

  // History Page
  history: {
    title: 'היסטוריית חיוב',
    description: 'צפה בחשבוניות ונהל אמצעי תשלום',
    failedLoad: 'נכשל בטעינת היסטוריית חיוב',
    failedToLoad: 'נכשל בטעינת היסטוריית חיוב',
    downloadNotAvailable: 'הורדה לא זמינה לחשבונית זו',
    downloading: 'מוריד חשבונית {invoice}...',
    downloadFailed: 'הורדת החשבונית נכשלה',
    addPaymentNotImplemented: 'הוספת אמצעי תשלום עדיין לא מיושמת',
    paymentMethodRemoved: 'אמצעי התשלום הוסר בהצלחה',
    removePaymentFailed: 'הסרת אמצעי התשלום נכשלה',
    defaultUpdated: 'אמצעי התשלום ברירת המחדל עודכן',
    updateDefaultFailed: 'עדכון ברירת המחדל נכשל',
    tryAgain: 'נסה שוב',
  },

  // Invoice Table
  invoice: {
    title: 'היסטוריית חשבוניות',
    noInvoices: 'אין חשבוניות עדיין',
    filter: 'סנן',
    allStatuses: 'כל הסטטוסים',
    invoiceNumber: 'חשבונית #',
    date: 'תאריך',
    amount: 'סכום',
    status: 'סטטוס',
    actions: 'פעולות',
    download: 'הורד',
    noFilteredInvoices: 'לא נמצאו חשבוניות {status}',
    clearFilter: 'נקה סינון',
    statusPaid: 'שולם',
    statusPending: 'ממתין',
    statusFailed: 'נכשל',
    statusRefunded: 'הוחזר',
  },

  // Invoices (legacy keys)
  invoices: {
    title: 'היסטוריית חשבוניות',
    noInvoices: 'אין חשבוניות עדיין',
    filter: 'סנן:',
    allStatuses: 'כל הסטטוסים',
    invoiceNumber: 'חשבונית #',
    date: 'תאריך',
    amount: 'סכום',
    status: 'סטטוס',
    actions: 'פעולות',
    download: 'הורד',
    noFiltered: 'לא נמצאו חשבוניות {status}',
    clearFilter: 'נקה סינון',
    statusPaid: 'שולם',
    statusPending: 'ממתין',
    statusFailed: 'נכשל',
    statusRefunded: 'הוחזר',
  },

  // Payment Methods
  payment: {
    title: 'אמצעי תשלום',
    add: 'הוסף אמצעי תשלום',
    addPaymentMethod: 'הוסף אמצעי תשלום',
    noMethods: 'לא נוספו אמצעי תשלום',
    addFirst: 'הוסף את אמצעי התשלום הראשון שלך',
    addFirstMethod: 'הוסף את אמצעי התשלום הראשון שלך',
    default: 'ברירת מחדל',
    expires: 'פג תוקף {date}',
    added: 'נוסף',
    setDefault: 'הגדר כברירת מחדל',
    remove: 'הסר',
    note: 'הערה',
    noteText: 'אמצעי התשלום ברירת המחדל ישמש לחידושים אוטומטיים וחריגות. חייב להיות לפחות אמצעי תשלום אחד.',
    cardEnding: '{brand} המסתיים ב-{last4}',
    cardEndingIn: '{brand} המסתיים ב-{last4}',
    card: 'כרטיס',
    paypal: 'PayPal',
    bankTransfer: 'העברה בנקאית',
    paymentMethod: 'אמצעי תשלום',
  },
};

export default billing;
