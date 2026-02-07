import { Language } from '@/store/appStore';

export interface Translations {
  // Header
  appTitle: string;
  poweredBy: string;

  // Toolbar - File operations
  uploadPdf: string;
  savePdf: string;
  settings: string;

  // Toolbar - Field operations
  saveFields: string;
  loadFields: string;
  exportHtml: string;
  autoDetect: string;
  detecting: string;
  generating: string;

  // Toolbar - Navigation
  page: string;
  of: string;
  previousPage: string;
  nextPage: string;

  // Toolbar - Zoom
  zoomIn: string;
  zoomOut: string;

  // Toolbar - Undo/Redo
  undo: string;
  redo: string;

  // Tools bar
  selectTool: string;
  textFieldTool: string;
  checkboxFieldTool: string;
  radioFieldTool: string;
  dropdownFieldTool: string;
  signatureFieldTool: string;
  staticTextFieldTool: string;
  cameraFieldTool: string;
  gpsLocationFieldTool: string;
  qrScanFieldTool: string;
  barcodeScanFieldTool: string;

  // Field types
  textField: string;
  checkboxField: string;
  radioField: string;
  dropdownField: string;
  signatureField: string;

  // Common actions
  save: string;
  cancel: string;
  delete: string;
  confirm: string;
  close: string;
  add: string;
  remove: string;
  edit: string;

  // Messages
  noPdfLoaded: string;
  noFieldsToSave: string;
  noFieldsToExport: string;
  pdfLoadError: string;
  invalidPdfFile: string;
  fieldsFound: string;
  fieldsImported: string;
  downloadSuccess: string;

  // Settings
  settingsTitle: string;
  textFieldSettings: string;
  checkboxFieldSettings: string;
  radioFieldSettings: string;
  dropdownFieldSettings: string;
  signatureFieldSettings: string;
  namingSettings: string;
  font: string;
  fontSize: string;
  direction: string;
  style: string;
  orientation: string;
  spacing: string;
  buttonCount: string;
  defaultWidth: string;
  defaultHeight: string;
  resetToDefaults: string;

  // Language selector
  language: string;
  hebrew: string;
  english: string;
  arabic: string;

  // Theme
  darkMode: string;
  lightMode: string;

  // Field list sidebar
  fieldsList: string;
  searchFields: string;
  noFields: string;
  fieldsOnPage: string;
  counter: string;
  field: string;
  fields: string;
  noFieldsYet: string;
  useToolsAbove: string;
  general: string;
  deleteField: string;

  // Sections (NEW - v2.0)
  addSection: string;
  renameSection: string;
  deleteSection: string;
  ungrouped: string;

  // Field properties panel
  fieldName: string;
  fieldLabel: string;
  required: string;
  defaultValue: string;
  options: string;
  addOption: string;
  textFieldProperties: string;
  checkboxProperties: string;
  radioProperties: string;
  dropdownProperties: string;
  signatureProperties: string;
  staticTextProperties: string;
  fieldNameEnglish: string;
  fieldNameHint: string;
  labelTitle: string;
  labelHint: string;
  serialNumber: string;
  serialNumberHint: string;
  sectionName: string;
  sectionNameHint: string;
  sectionNamePlaceholder: string;
  defaultValueHint: string;
  defaultValuePlaceholder: string;
  radioOrientation: string;
  radioOrientationHint: string;
  vertical: string;
  horizontal: string;
  spacingBetweenButtons: string;
  spacingHint: string;
  radioOptions: string;
  radioOptionsHint: string;
  dropdownOptionsHint: string;
  signature: string;
  addSignature: string;
  editSignature: string;
  created: string;
  requiredField: string;
  requiredFieldHint: string;
  autoFill: string;
  autoFillHint: string;
  station: string;
  stationHint: string;
  stationClient: string;
  stationAgent: string;
  textDirectionRtl: string;
  textDirectionHint: string;
  selectFontHint: string;
  fontSizeRange: string;
  pageLabel: string;
  typeLabel: string;
  widthLabel: string;
  heightLabel: string;

  // Static text properties
  content: string;
  textAlignment: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  fontWeight: string;
  normal: string;
  bold: string;
  fontStyle: string;
  italic: string;
  textColor: string;
  backgroundColor: string;
  border: string;
  width: string;
  color: string;
  enterStaticText: string;

  // Recovery dialog
  recoveryTitle: string;
  recoveryMessage: string;
  restore: string;
  discard: string;

  // Upload warning
  uploadWarningTitle: string;
  uploadWarningMessage: string;
  newDocument: string;
  newVersion: string;

  // AI extraction
  aiExtractionTitle: string;
  aiExtractionInProgress: string;
  aiExtractionSuccess: string;
  aiExtractionError: string;
  replaceOrMerge: string;
  replace: string;
  merge: string;

  // HTML preview
  htmlPreviewTitle: string;
  downloadHtml: string;
  copyHtml: string;
  copied: string;

  // Reprocess page
  reprocessPage: string;
  reprocessConfirm: string;
  reprocessSuccess: string;

  // Multi-select properties panel
  multiEdit: string;
  fieldsSelected: string;
  fieldTypes: string;
  willUpdateAllFields: string;
  textProperties: string;
  appliesToTextFieldsOnly: string;
  appliesToRadioFieldsOnly: string;
  mixed: string;
  multiSelectTip: string;

  // Sidebar tabs
  extractedFields: string;
  jsonView: string;
  documentHistory: string;

  // JSON view tab
  jsonReadOnly: string;
  copyJson: string;
  jsonCopied: string;
  noFieldsForJson: string;
  sortRTL: string;
  sorted: string;
  sortByPosition: string;
  showOriginalOrder: string;

  // Document history tab
  noDocumentHistory: string;
  documents: string;
  documentName: string;
  pages: string;
  lastModified: string;
  loadHistoryFields: string;
  deleteHistory: string;
  clearAllHistory: string;
  clearHistoryConfirm: string;
  documentLoaded: string;
  bytes: string;
  kb: string;
  mb: string;

  // Field validation
  fieldValidation: string;
  active: string;
  suggestedType: string;
  apply: string;
  validationType: string;
  noValidation: string;
  enableValidation: string;
  validators: string;
  validationMultiHint: string;

  deleteConfirmMessage: string;

  // Dashboard
  dashboard: string;
  backToDashboard: string;
  backToSettings: string;
  overview: string;
  myForms: string;
  responses: string;
  helpCenter: string;
  noFormsFound: string;
  createNewForm: string;
  createFirstForm: string;
  searchFormsPlaceholder: string;
  manageFormsDescription: string;
  freePlan: string;
  loadingDashboard: string;
  noResultsFor: string;

  // Additional Toolbar
  viewHistory: string;
  publish: string;
  publishing: string;
  currentDocument: string;
  untitledForm: string;
  draft: string;
  published: string;
  archived: string;
  export: string;

  // Conditional Logic
  conditionalLogic: string;
  addRule: string;
  when: string;
  equals: string;
  notEquals: string;
  contains: string;
  isEmpty: string;
  isNotEmpty: string;
  then: string;
  show: string;
  hide: string;
  require: string;
  unrequire: string;
  selectField: string;
  enterValue: string;
  and: string;
  or: string;
  defaultVisibility: string;
  visible: string;
  hidden: string;
  noRules: string;

  // Offline/PWA
  online: string;
  offline: string;
  syncing: string;
  pendingItems: string;
  syncNow: string;
  syncError: string;
  lastSynced: string;
  noConnection: string;
  connectionRestored: string;
  itemsWaitingToSync: string;

  // Landing Page
  heroTitle: string;
  heroSubtitle: string;
  getStarted: string;
  viewDemo: string;
  featureHebrewTitle: string;
  featureHebrewDesc: string;
  featureAiTitle: string;
  featureAiDesc: string;
  featureOfflineTitle: string;
  featureOfflineDesc: string;
  socialProofTitle: string;

  // Landing Page V3 Niches
  medicalTitle: string;
  medicalDesc: string;
  technicalTitle: string;
  technicalDesc: string;
  constructionTitle: string;
  constructionDesc: string;
  salesTitle: string;
  salesDesc: string;
  securityTitle: string;
  securityDesc: string;

  // New Features Grid
  pwaTitle: string;
  pwaDesc: string;
  offlineFirstTitle: string;
  offlineFirstDesc: string;
  signatureSmoothingTitle: string;
  signatureSmoothingDesc: string;
  aiDetectionTitle: string;
  aiDetectionDesc: string;

  // WhatsApp
  whatsappChannels: string;
  whatsappManageChannelsDesc: string;
  connectNewWhatsapp: string;
  disconnectChannel: string;
  disconnectConfirm: string;
  channelName: string;
  channelNamePlaceholder: string;
  statusWorking: string;
  statusFailed: string;
  statusStopped: string;
  statusStarting: string;
  statusScanQr: string;
  scanQrCode: string;
  scanQrInstructions: string;
  qrExpired: string;
  connectionSuccess: string;
  sendFormLink: string;
  recipientPhone: string;
  recipientPhonePlaceholder: string;
  messageCaption: string;
  selectChannel: string;
  sendMessage: string;
  messageSent: string;
  messageFailed: string;
  noChannelsConnected: string;
  noWorkingChannels: string;
  noWorkingChannelsLinkText: string;
  messagesSentLabel: string;
  refreshStatus: string;

  // Language Auto-Detection
  'language.autoDetect.title': string;
  'language.autoDetect.message': string;
  'language.autoDetect.dontAskAgain': string;

  // Landing Page (More)
  featuresLabel: string;
  useCasesLabel: string;
  integrationsLabel: string;
  loginLabel: string;
  satisfiedTeams: string;
  trulyIntelligentForms: string;
  offlineReady: string;
  rightToolsForField: string;
  builtFromScratch: string;
  anyNicheAnywhere: string;
  readUseCase: string;
  connectToYourWorld: string;
  streamDataDirectly: string;
  readyToGoPaperless: string;
  joinMobileFirst: string;
  contactUs: string;
  noCreditCard: string;

  // PWA/System
  pwaNewVersionTitle: string;
  pwaNewVersionMessage: string;
  pwaOfflineReady: string;
  pwaRegistered: string;
  pwaRegistrationError: string;

  failedToLoadForms: string;
  noFormsYetDescription: string;
  deleteFormConfirm: string;
  noDescription: string;
  onePage: string;
  copyLink: string;
  viewResponses: string;
  fieldsCount: string;
  sendWhatsApp: string;

  // Onboarding Progress Checklist
  onboardingTitle: string;
  onboardingCompleted: string;
  onboardingCreateForm: string;
  onboardingCustomize: string;
  onboardingPublish: string;
  onboardingFirstResponse: string;
  onboardingShare: string;

  // Common (additional)
  'common.yes': string;
  'common.no': string;

  // Workflow - Approval Chain
  'workflow.approval.chainSettings': string;
  'workflow.approval.overallTimeout': string;
  'workflow.approval.hours': string;
  'workflow.approval.onTimeout': string;
  'workflow.approval.timeout.fail': string;
  'workflow.approval.timeout.escalate': string;
  'workflow.approval.timeout.autoApprove': string;
  'workflow.approval.addLevel': string;
  'workflow.approval.level': string;
  'workflow.approval.approvalType': string;
  'workflow.approval.approvalType.any': string;
  'workflow.approval.approvalType.all': string;
  'workflow.approval.approvalType.allDescription': string;
  'workflow.approval.approvalType.anyDescription': string;
  'workflow.approval.approvers': string;
  'workflow.approval.addApprover': string;
  'workflow.approval.timeout': string;
  'workflow.approval.escalation': string;
  'workflow.approval.escalation.timeoutHours': string;
  'workflow.approval.escalation.escalateTo': string;
  'workflow.approval.addEscalation': string;
  'workflow.approval.removeEscalation': string;
  'workflow.approval.approverType.user': string;
  'workflow.approval.approverType.role': string;
  'workflow.approval.approverType.dynamic': string;
  'workflow.approval.selectUser': string;
  'workflow.approval.selectRole': string;

  // Workflow - Template Gallery
  'workflow.template.gallery': string;
  'workflow.template.searchPlaceholder': string;
  'workflow.template.allCategories': string;
  'workflow.template.category.approval': string;
  'workflow.template.category.dataCollection': string;
  'workflow.template.category.automation': string;
  'workflow.template.category.conditional': string;
  'workflow.template.category.integration': string;
  'workflow.template.category.notification': string;
  'workflow.template.category.custom': string;
  'workflow.template.sortBy': string;
  'workflow.template.sort.usageDesc': string;
  'workflow.template.sort.usageAsc': string;
  'workflow.template.sort.dateDesc': string;
  'workflow.template.sort.dateAsc': string;
  'workflow.template.sort.nameAsc': string;
  'workflow.template.sort.nameDesc': string;
  'workflow.template.viewGrid': string;
  'workflow.template.viewList': string;
  'workflow.template.used': string;
  'workflow.template.times': string;
  'workflow.template.useTemplate': string;
  'workflow.template.exportTemplate': string;
  'workflow.template.deleteTemplate': string;
  'workflow.template.importTemplate': string;
  'workflow.template.storageUsed': string;
  'workflow.template.storageWarning': string;
  'workflow.template.noTemplates': string;

  // Workflow - Conditional Logic
  'workflow.conditional.builder': string;
  'workflow.conditional.addGroup': string;
  'workflow.conditional.addRule': string;
  'workflow.conditional.operator.and': string;
  'workflow.conditional.operator.or': string;
  'workflow.conditional.field': string;
  'workflow.conditional.operator': string;
  'workflow.conditional.value': string;
  'workflow.conditional.op.eq': string;
  'workflow.conditional.op.ne': string;
  'workflow.conditional.op.gt': string;
  'workflow.conditional.op.lt': string;
  'workflow.conditional.op.gte': string;
  'workflow.conditional.op.lte': string;
  'workflow.conditional.op.contains': string;
  'workflow.conditional.op.exists': string;
  'workflow.conditional.op.in': string;
  'workflow.conditional.op.notIn': string;
  'workflow.conditional.removeRule': string;
  'workflow.conditional.removeGroup': string;
  'workflow.conditional.maxDepth': string;
}

const hebrewTranslations: Translations = {
  // Header
  appTitle: 'RightFlow PDF to HTML Convertor',
  poweredBy: 'Powered by RightFlow',

  // Toolbar - File operations
  uploadPdf: 'העלה PDF',
  savePdf: 'שמור PDF',
  settings: 'הגדרות',

  // Toolbar - Field operations
  saveFields: 'שמור שדות',
  loadFields: 'טען שדות',
  exportHtml: 'ייצא HTML',
  autoDetect: 'זיהוי אוטומטי',
  detecting: 'מזהה...',
  generating: 'מייצר...',

  // Toolbar - Navigation
  page: 'עמוד',
  of: 'מתוך',
  previousPage: 'עמוד קודם',
  nextPage: 'עמוד הבא',

  // Toolbar - Zoom
  zoomIn: 'הגדל',
  zoomOut: 'הקטן',

  // Toolbar - Undo/Redo
  undo: 'בטל (Ctrl+Z)',
  redo: 'בצע שוב (Ctrl+Shift+Z)',

  // Tools bar
  selectTool: 'בחירה',
  textFieldTool: 'שדה טקסט',
  checkboxFieldTool: 'תיבת סימון',
  radioFieldTool: 'כפתורי בחירה',
  dropdownFieldTool: 'רשימה נפתחת',
  signatureFieldTool: 'חתימה',
  staticTextFieldTool: 'טקסט סטטי',
  cameraFieldTool: 'מצלמה',
  gpsLocationFieldTool: 'מיקום GPS',
  qrScanFieldTool: 'סורק QR',
  barcodeScanFieldTool: 'סורק ברקוד',

  // Field types
  textField: 'טקסט',
  checkboxField: 'תיבת סימון',
  radioField: 'כפתור בחירה',
  dropdownField: 'רשימה נפתחת',
  signatureField: 'חתימה',

  // Common actions
  save: 'שמור',
  cancel: 'ביטול',
  delete: 'מחק',
  confirm: 'אישור',
  close: 'סגור',
  add: 'הוסף',
  remove: 'הסר',
  edit: 'ערוך',

  // Messages
  noPdfLoaded: 'אין PDF לטעינה. אנא טען קובץ PDF תחילה.',
  noFieldsToSave: 'אין שדות לשמירה. אנא הוסף לפחות שדה אחד.',
  noFieldsToExport: 'אין שדות לייצוא. אנא הוסף לפחות שדה אחד.',
  pdfLoadError: 'שגיאה בטעינת קובץ PDF',
  invalidPdfFile: 'קובץ PDF לא תקין',
  fieldsFound: 'נמצאו שדות קיימים ב-PDF',
  fieldsImported: 'שדות יובאו בהצלחה',
  downloadSuccess: 'קובץ הורד בהצלחה! בדוק את תיקיית ההורדות.',

  // Settings
  settingsTitle: 'הגדרות',
  textFieldSettings: 'הגדרות שדה טקסט',
  checkboxFieldSettings: 'הגדרות תיבת סימון',
  radioFieldSettings: 'הגדרות כפתורי בחירה',
  dropdownFieldSettings: 'הגדרות רשימה נפתחת',
  signatureFieldSettings: 'הגדרות חתימה',
  namingSettings: 'הגדרות שמות',
  font: 'פונט',
  fontSize: 'גודל פונט',
  direction: 'כיוון',
  style: 'סגנון',
  orientation: 'כיוון סידור',
  spacing: 'מרווח',
  buttonCount: 'מספר כפתורים',
  defaultWidth: 'רוחב ברירת מחדל',
  defaultHeight: 'גובה ברירת מחדל',
  resetToDefaults: 'אפס להגדרות ברירת מחדל',

  // Language selector
  language: 'שפה',
  hebrew: 'עברית',
  english: 'English',
  arabic: 'العربية',

  // Theme
  darkMode: 'מצב כהה',
  lightMode: 'מצב בהיר',

  // Field list sidebar
  fieldsList: 'רשימת שדות',
  searchFields: 'חיפוש שדות...',
  noFields: 'אין שדות',
  fieldsOnPage: 'שדות בעמוד',
  counter: 'מונה',
  field: 'שדה',
  fields: 'שדות',
  noFieldsYet: 'אין שדות עדיין',
  useToolsAbove: 'השתמש בכלים מלמעלה להוספת שדות',
  general: 'כללי',
  deleteField: 'מחק שדה',

  // Sections (NEW - v2.0)
  addSection: 'הוסף קטע',
  renameSection: 'שנה שם קטע',
  deleteSection: 'מחק קטע',
  ungrouped: 'ללא קבוצה',

  // Field properties panel
  fieldName: 'שם שדה',
  fieldLabel: 'תווית',
  required: 'שדה חובה',
  defaultValue: 'ערך ברירת מחדל',
  options: 'אפשרויות',
  addOption: 'הוסף אפשרות',
  textFieldProperties: 'מאפייני שדה טקסט',
  checkboxProperties: 'מאפייני תיבת סימון',
  radioProperties: 'מאפייני כפתור רדיו',
  dropdownProperties: 'מאפייני רשימה נפתחת',
  signatureProperties: 'מאפייני שדה חתימה',
  staticTextProperties: 'מאפייני טקסט סטטי',
  fieldNameEnglish: 'שם שדה (באנגלית)',
  fieldNameHint: 'שם השדה (רק אותיות אנגליות, מספרים וקו תחתון)',
  labelTitle: 'תווית (כותרת)',
  labelHint: 'טקסט שיוצג ליד השדה',
  serialNumber: 'מספר סידורי',
  serialNumberHint: 'סדר יצירת השדה (לא ניתן לעריכה)',
  sectionName: 'שם מקטע',
  sectionNameHint: 'קיבוץ שדות למקטעים (מועתק אוטומטית לשדות חדשים)',
  sectionNamePlaceholder: 'לדוגמה: פרטים אישיים',
  defaultValueHint: 'הטקסט שיופיע בשדה כברירת מחדל',
  defaultValuePlaceholder: 'טקסט ברירת מחדל',
  radioOrientation: 'כיוון סידור כפתורים',
  radioOrientationHint: 'אנכי - כפתורים מסודרים למטה | אופקי - כפתורים מסודרים לצד',
  vertical: 'אנכי (↓)',
  horizontal: 'אופקי (→)',
  spacingBetweenButtons: 'מרווח בין כפתורים (pt)',
  spacingHint: 'המרחק בין כל כפתור לשכנו (-5 עד 10 נקודות | שלילי = overlapping, 1pt ≈ 0.35mm)',
  radioOptions: 'אפשרויות כפתורי רדיו',
  radioOptionsHint: 'כפתורי רדיו מאפשרים בחירת אפשרות אחת בלבד מהרשימה',
  dropdownOptionsHint: 'כל שורה היא אפשרות נפרדת ברשימה',
  signature: 'חתימה',
  addSignature: 'הוסף חתימה',
  editSignature: 'ערוך חתימה',
  created: 'נוצרה',
  requiredField: 'שדה חובה',
  requiredFieldHint: 'האם יש חובה למלא שדה זה',
  autoFill: 'מילוי אוטומטי',
  autoFillHint: 'האם להפעיל מילוי אוטומטי עבור שדה זה',
  station: 'תחנת מילוי',
  stationHint: 'מי ימלא את השדה הזה',
  stationClient: 'לקוח',
  stationAgent: 'סוכן',
  textDirectionRtl: 'כיוון טקסט מימין לשמאל',
  textDirectionHint: 'RTL עבור עברית, LTR עבור אנגלית',
  selectFontHint: 'בחר Noto Sans Hebrew לטקסט עברי',
  fontSizeRange: 'טווח: 8-24 נקודות (pt)',
  pageLabel: 'עמוד',
  typeLabel: 'סוג',
  widthLabel: 'רוחב',
  heightLabel: 'גובה',

  // Static text properties
  content: 'תוכן',
  textAlignment: 'יישור טקסט',
  alignLeft: 'שמאל',
  alignCenter: 'מרכז',
  alignRight: 'ימין',
  fontWeight: 'עובי גופן',
  normal: 'רגיל',
  bold: 'מודגש',
  fontStyle: 'סגנון גופן',
  italic: 'נטוי',
  textColor: 'צבע טקסט',
  backgroundColor: 'צבע רקע',
  border: 'מסגרת',
  width: 'רוחב',
  color: 'צבע',
  enterStaticText: 'הזן טקסט סטטי...',

  // Recovery dialog
  recoveryTitle: 'שחזור נתונים',
  recoveryMessage: 'נמצאו נתונים משמורים מפעילות קודמת. האם לשחזר?',
  restore: 'שחזר',
  discard: 'התעלם',

  // Upload warning
  uploadWarningTitle: 'אזהרת העלאה',
  uploadWarningMessage: 'קיימים שדות במסמך הנוכחי. מה לעשות?',
  newDocument: 'מסמך חדש (מחק שדות)',
  newVersion: 'גרסה חדשה (שמור שדות)',

  // AI extraction
  aiExtractionTitle: 'זיהוי שדות באמצעות AI',
  aiExtractionInProgress: 'מזהה שדות...',
  aiExtractionSuccess: 'שדות זוהו בהצלחה!',
  aiExtractionError: 'שגיאה בזיהוי שדות',
  replaceOrMerge: 'האם להחליף את השדות הקיימים או למזג?',
  replace: 'החלף',
  merge: 'מזג',

  // HTML preview
  htmlPreviewTitle: 'תצוגה מקדימה של HTML',
  downloadHtml: 'הורד HTML',
  copyHtml: 'העתק HTML',
  copied: 'הועתק!',

  // Reprocess page
  reprocessPage: 'עיבוד מחדש',
  reprocessConfirm: 'פעולה זו תמחק שדות קיימים בעמוד זה. להמשיך?',
  reprocessSuccess: 'עמוד עובד מחדש בהצלחה!',

  // Multi-select properties panel
  multiEdit: 'עריכה מרובה',
  fieldsSelected: 'שדות נבחרו',
  fieldTypes: 'סוגי שדות',
  willUpdateAllFields: 'יעודכן עבור כל השדות הנבחרים',
  textProperties: 'מאפייני טקסט',
  appliesToTextFieldsOnly: '* יחולו רק על שדות טקסט',
  appliesToRadioFieldsOnly: '* יחולו רק על שדות רדיו',
  mixed: '(מעורב)',
  multiSelectTip: 'טיפ: לחץ על שדה תוך לחיצה על Ctrl להוספה/הסרה מהבחירה',

  // Sidebar tabs
  extractedFields: 'שדות שחולצו',
  jsonView: 'תצוגת JSON',
  documentHistory: 'היסטוריית מסמכים',

  // JSON view tab
  jsonReadOnly: 'קריאה בלבד',
  copyJson: 'העתק JSON',
  jsonCopied: 'JSON הועתק!',
  noFieldsForJson: 'אין שדות להצגה',
  sortRTL: 'מיין RTL',
  sorted: 'ממוין',
  sortByPosition: 'מיין לפי מיקום פיזי (RTL)',
  showOriginalOrder: 'הצג סדר מקורי',

  // Document history tab
  noDocumentHistory: 'אין היסטוריית מסמכים',
  documents: 'מסמכים',
  documentName: 'שם מסמך',
  pages: 'עמודים',
  lastModified: 'עודכן לאחרונה',
  loadHistoryFields: 'טען שדות',
  deleteHistory: 'מחק',
  clearAllHistory: 'נקה היסטוריה',
  clearHistoryConfirm: 'האם למחוק את כל היסטוריית המסמכים?',
  documentLoaded: 'שדות נטענו בהצלחה',
  bytes: 'בייט',
  kb: 'ק"ב',
  mb: 'מ"ב',

  // Field validation
  fieldValidation: 'אימות שדה',
  active: 'פעיל',
  suggestedType: 'סוג מוצע',
  apply: 'החל',
  validationType: 'סוג אימות',
  noValidation: 'ללא אימות',
  enableValidation: 'הפעל אימות',
  validators: 'חוקי אימות',
  validationMultiHint: 'אימות יוחל על כל השדות הנבחרים',

  deleteConfirmMessage: 'האם אתה בטוח שברצונך למחוק {count} שדות?',

  // Dashboard
  dashboard: 'לוח בקרה',
  backToDashboard: 'חזרה ללוח הבקרה',
  backToSettings: 'חזרה להגדרות',
  overview: 'סקירה כללית',
  myForms: 'הטפסים שלי',
  responses: 'תגובות',
  helpCenter: 'מרכז עזרה',
  noFormsFound: 'לא נמצאו טפסים',
  createNewForm: 'יצירת טופס חדש',
  createFirstForm: 'צור את הטופס הראשון שלך',
  searchFormsPlaceholder: 'חיפוש טפסים...',
  manageFormsDescription: 'ניהול ומעקב אחר טפסי ה-PDF שלך (עברית וערבית).',
  freePlan: 'תוכנית חינמית',
  loadingDashboard: 'טוען לוח בקרה...',
  noResultsFor: 'לא נמצאו תוצאות עבור "{query}". נסה חיפוש אחר.',

  // Additional Toolbar
  viewHistory: 'היסטוריית גרסאות',
  publish: 'פרסם',
  publishing: 'מפרסם...',
  currentDocument: 'מסמך נוכחי',
  untitledForm: 'טופס ללא שם',
  draft: 'טיוטה',
  published: 'מפורסם',
  archived: 'בארכיון',
  export: 'ייצוא',

  // Conditional Logic
  conditionalLogic: 'לוגיקה מותנית',
  addRule: 'הוסף כלל',
  when: 'כאשר',
  equals: 'שווה ל',
  notEquals: 'לא שווה ל',
  contains: 'מכיל',
  isEmpty: 'ריק',
  isNotEmpty: 'לא ריק',
  then: 'אז',
  show: 'הצג',
  hide: 'הסתר',
  require: 'חובה',
  unrequire: 'לא חובה',
  selectField: 'בחר שדה',
  enterValue: 'הזן ערך',
  and: 'וגם',
  or: 'או',
  defaultVisibility: 'ברירת מחדל',
  visible: 'גלוי',
  hidden: 'מוסתר',
  noRules: 'אין כללים מוגדרים',

  // Offline/PWA
  online: 'מחובר',
  offline: 'לא מחובר',
  syncing: 'מסנכרן...',
  pendingItems: 'פריטים בהמתנה',
  syncNow: 'סנכרן עכשיו',
  syncError: 'שגיאת סנכרון',
  lastSynced: 'סונכרן לאחרונה',
  noConnection: 'אין חיבור לאינטרנט',
  connectionRestored: 'החיבור שוחזר',
  itemsWaitingToSync: 'פריטים ממתינים לסנכרון',

  // Landing Page
  heroTitle: 'הופכים קבצי PDF לתהליכים אינטראקטיביים',
  heroSubtitle: 'בונה טפסי ה-PDF היחיד עם תמיכה מלאה בעברית, עבודה ללא אינטרנט ודיגיטציה מבוססת AI לצוותי שטח.',
  getStarted: 'התחל בחינם',
  viewDemo: 'צפה בדמו',
  featureHebrewTitle: 'עברית וערבית כשפת אם',
  featureHebrewDesc: 'תמיכה מלאה ב-RTL עבור עברית וערבית, עם תצוגה מושלמת וטיפול בטקסט דו-כיווני (BiDi).',
  featureAiTitle: 'זיהוי שדות AI',
  featureAiDesc: 'הפוך טפסים פיזיים לדיגיטליים בתוך שניות באמצעות מנוע ה-OCR שלנו.',
  featureOfflineTitle: 'מאובטח ואופליין',
  featureOfflineDesc: 'איסוף נתונים ללא צורך בחיבור לאינטרנט. מוצפן ומאוחסן בענן ישראלי.',
  socialProofTitle: 'הבחירה של החברות המובילות בישראל',

  // Landing Page V3 Niches
  medicalTitle: 'ציוד רפואי ולוגיסטיקה',
  medicalDesc: 'מילוי טפסים במרתפי בתי חולים ללא קליטה, עם סנכרון אוטומטי כשעולים למעלה.',
  technicalTitle: 'שירות טכני ו-HVAC',
  technicalDesc: 'תיעוד תקלות בשטח, צילום תמונות דחוסות וחתימת לקוח מהירה עם חותמת זמן.',
  constructionTitle: 'פיקוח בנייה ובטיחות',
  constructionDesc: 'סריקת קודי QR על ציוד, מילוי צ׳קליסטים ודיווח ליקויים עם מיקום GPS מדויק.',
  salesTitle: 'מכירות וביטוח',
  salesDesc: 'חתימת לקוח על פוליסות וחוזים בממשק פרימיום שמרגיש כמו דיו אמיתי.',
  securityTitle: 'אבטחה וסיור',
  securityDesc: 'תיעוד נוכחות בסיורים מבוסס GPS ודיווח על אירועים חריגים בזמן אמת.',

  // New Features Grid
  pwaTitle: 'אפליקציית PWA מתקדמת',
  pwaDesc: 'התקן את RightFlow למסך הבית ללא צורך בחנות אפליקציות. עובד מיידית.',
  offlineFirstTitle: 'Offline-First אמיתי',
  offlineFirstDesc: 'כל היכולות זמינות גם ללא אינטרנט. המידע נשמר על המכשיר ומסתנכרן ברקע.',
  signatureSmoothingTitle: 'חתימה דיגיטלית חלקה',
  signatureSmoothingDesc: 'אלגוריתם Bézier ליצירת חתימות מקצועיות שנראות סרוקות בתוך ה-PDF.',
  aiDetectionTitle: 'זיהוי שדות ב-AI',
  aiDetectionDesc: 'העלה כל קובץ PDF והמערכת שלנו תזהה ותמפה את השדות עבורך בשניות.',

  // WhatsApp
  whatsappChannels: 'ערוצי וואטסאפ',
  whatsappManageChannelsDesc: 'ניהול ערוצי וואטסאפ ושליחת הודעות',
  connectNewWhatsapp: 'חבר וואטסאפ חדש',
  disconnectChannel: 'נתק ערוץ',
  disconnectConfirm: 'האם אתה בטוח שברצונך לנתק ערוץ זה?',
  channelName: 'שם הערוץ',
  channelNamePlaceholder: 'לדוגמה: מכירות',
  statusWorking: 'מחובר',
  statusFailed: 'נכשל',
  statusStopped: 'מנותק',
  statusStarting: 'מתחבר...',
  statusScanQr: 'ממתין לסריקה',
  scanQrCode: 'סרוק קוד QR',
  scanQrInstructions: 'פתח את וואטסאפ בטלפון \u2190 הגדרות \u2190 מכשירים מקושרים \u2190 קשר מכשיר \u2190 סרוק את הקוד',
  qrExpired: 'הקוד פג תוקף, מרענן...',
  connectionSuccess: 'וואטסאפ חובר בהצלחה!',
  sendFormLink: 'שלח קישור בוואטסאפ',
  recipientPhone: 'מספר טלפון נמען',
  recipientPhonePlaceholder: '052-1234567',
  messageCaption: 'הודעה מצורפת (אופציונלי)',
  selectChannel: 'בחר ערוץ וואטסאפ',
  sendMessage: 'שלח הודעה',
  messageSent: 'ההודעה נשלחה בהצלחה',
  messageFailed: 'שליחת ההודעה נכשלה',
  noChannelsConnected: 'אין ערוצי וואטסאפ מחוברים',
  noWorkingChannels: 'אין ערוצים פעילים.',
  noWorkingChannelsLinkText: 'הגדרות ערוצי וואטסאפ',
  messagesSentLabel: 'הודעות נשלחו',
  refreshStatus: 'רענן סטטוס',

  // Language Auto-Detection
  'language.autoDetect.title': 'זוהתה שפה אחרת',
  'language.autoDetect.message': 'נראה שאתה כותב ב{language}. האם לשנות את שפת האפליקציה?',
  'language.autoDetect.dontAskAgain': 'אל תשאל שוב',

  // Landing Page (More)
  featuresLabel: 'פיצ׳רים',
  useCasesLabel: 'מקרי שימוש',
  integrationsLabel: 'אינטגרציות',
  loginLabel: 'התחברות',
  satisfiedTeams: '500+ צוותי שטח מרוצים בישראל',
  trulyIntelligentForms: 'טפסים חכמים באמת',
  offlineReady: 'אופליין פעיל',
  rightToolsForField: 'הכלים הנכונים לעבודה בשטח',
  builtFromScratch: 'RightFlow 2.0 נבנה מאפס כדי לתת מענה לאתגרים של עובדי שטח בישראל.',
  anyNicheAnywhere: 'מכל נישה, בכל מקום',
  readUseCase: 'קרא עוד על המקרה',
  connectToYourWorld: 'מתחברים לעולם שלכם',
  streamDataDirectly: 'הזרם נתונים ישירות ל-CRM, לניהול הפרויקטים או לכל מערכת אוטומציה שאתה כבר עובד איתה.',
  readyToGoPaperless: 'הנייר נגמר, התזרים מתחיל',
  joinMobileFirst: 'הצטרפו למהפכת ה-Mobile-First של עובדי שטח בישראל.',
  contactUs: 'צור קשר',
  noCreditCard: 'אין צורך בכרטיס אשראי • 14 יום ניסיון כלול',

  // PWA/System
  pwaNewVersionTitle: 'גרסה חדשה זמינה',
  pwaNewVersionMessage: 'גרסה חדשה של האפליקציה זמינה! לחץ אישור כדי לעדכן עכשיו.',
  pwaOfflineReady: 'האפליקציה מוכנה לעבודה במצב לא מקוון',
  pwaRegistered: 'Service Worker נרשם בהצלחה',
  pwaRegistrationError: 'שגיאה ברישום Service Worker',

  failedToLoadForms: 'טעינת הטפסים נכשלה',
  noFormsYetDescription: 'עדיין לא יצרת טפסים. התחל עכשיו.',
  deleteFormConfirm: 'למחוק טופס זה?',
  noDescription: 'אין תיאור לטופס זה.',
  onePage: '1 עמוד',
  copyLink: 'העתק קישור',
  viewResponses: 'צפה בתגובות',
  fieldsCount: '{count} שדות',
  sendWhatsApp: 'שלח בוואטסאפ',

  // Onboarding Progress Checklist
  onboardingTitle: 'הפק את המקסימום מ-RightFlow',
  onboardingCompleted: 'מתוך {total} הושלמו {completed}',
  onboardingCreateForm: 'צור את הטופס הראשון שלך',
  onboardingCustomize: 'התאם אישית שדות בטופס',
  onboardingPublish: 'פרסם טופס',
  onboardingFirstResponse: 'קבל תגובה ראשונה',
  onboardingShare: 'שתף בוואטסאפ',

  // Common (additional)
  'common.yes': 'כן',
  'common.no': 'לא',

  // Workflow - Approval Chain
  'workflow.approval.chainSettings': 'הגדרות שרשרת אישורים',
  'workflow.approval.overallTimeout': 'זמן תפוגה כללי',
  'workflow.approval.hours': 'שעות',
  'workflow.approval.onTimeout': 'בעת תפוגת זמן',
  'workflow.approval.timeout.fail': 'כשל',
  'workflow.approval.timeout.escalate': 'העלאה',
  'workflow.approval.timeout.autoApprove': 'אישור אוטומטי',
  'workflow.approval.addLevel': 'הוסף שכבה',
  'workflow.approval.level': 'שכבה',
  'workflow.approval.approvalType': 'סוג אישור',
  'workflow.approval.approvalType.any': 'כל אחד (ANY)',
  'workflow.approval.approvalType.all': 'כולם (ALL)',
  'workflow.approval.approvalType.allDescription': 'כל המאשרים חייבים לאשר',
  'workflow.approval.approvalType.anyDescription': 'מספיק שמאשר אחד יאשר',
  'workflow.approval.approvers': 'מאשרים',
  'workflow.approval.addApprover': 'הוסף מאשר',
  'workflow.approval.timeout': 'זמן תפוגה',
  'workflow.approval.escalation': 'העלאה',
  'workflow.approval.escalation.timeoutHours': 'שעות עד העלאה',
  'workflow.approval.escalation.escalateTo': 'העלה אל',
  'workflow.approval.addEscalation': 'הוסף העלאה',
  'workflow.approval.removeEscalation': 'הסר העלאה',
  'workflow.approval.approverType.user': 'משתמש',
  'workflow.approval.approverType.role': 'תפקיד',
  'workflow.approval.approverType.dynamic': 'דינמי',
  'workflow.approval.selectUser': 'בחר משתמש',
  'workflow.approval.selectRole': 'בחר תפקיד',

  // Workflow - Template Gallery
  'workflow.template.gallery': 'גלריית תבניות',
  'workflow.template.searchPlaceholder': 'חפש תבניות...',
  'workflow.template.allCategories': 'כל הקטגוריות',
  'workflow.template.category.approval': 'אישורים',
  'workflow.template.category.dataCollection': 'איסוף נתונים',
  'workflow.template.category.automation': 'אוטומציה',
  'workflow.template.category.conditional': 'לוגיקה מותנית',
  'workflow.template.category.integration': 'אינטגרציה',
  'workflow.template.category.notification': 'התראות',
  'workflow.template.category.custom': 'מותאם אישית',
  'workflow.template.sortBy': 'מיין לפי',
  'workflow.template.sort.usageDesc': 'הכי בשימוש',
  'workflow.template.sort.usageAsc': 'הכי פחות בשימוש',
  'workflow.template.sort.dateDesc': 'החדשים ביותר',
  'workflow.template.sort.dateAsc': 'הישנים ביותר',
  'workflow.template.sort.nameAsc': 'שם (א-ת)',
  'workflow.template.sort.nameDesc': 'שם (ת-א)',
  'workflow.template.viewGrid': 'תצוגת רשת',
  'workflow.template.viewList': 'תצוגת רשימה',
  'workflow.template.used': 'בשימוש',
  'workflow.template.times': 'פעמים',
  'workflow.template.useTemplate': 'השתמש בתבנית',
  'workflow.template.exportTemplate': 'ייצא תבנית',
  'workflow.template.deleteTemplate': 'מחק תבנית',
  'workflow.template.importTemplate': 'ייבא תבנית',
  'workflow.template.storageUsed': 'אחסון בשימוש',
  'workflow.template.storageWarning': 'אחסון מתקרב לגבול',
  'workflow.template.noTemplates': 'לא נמצאו תבניות',

  // Workflow - Conditional Logic
  'workflow.conditional.builder': 'בונה לוגיקה מותנית',
  'workflow.conditional.addGroup': 'הוסף קבוצה',
  'workflow.conditional.addRule': 'הוסף כלל',
  'workflow.conditional.operator.and': 'וגם (AND)',
  'workflow.conditional.operator.or': 'או (OR)',
  'workflow.conditional.field': 'שדה',
  'workflow.conditional.operator': 'אופרטור',
  'workflow.conditional.value': 'ערך',
  'workflow.conditional.op.eq': 'שווה ל',
  'workflow.conditional.op.ne': 'לא שווה ל',
  'workflow.conditional.op.gt': 'גדול מ',
  'workflow.conditional.op.lt': 'קטן מ',
  'workflow.conditional.op.gte': 'גדול או שווה ל',
  'workflow.conditional.op.lte': 'קטן או שווה ל',
  'workflow.conditional.op.contains': 'מכיל',
  'workflow.conditional.op.exists': 'קיים',
  'workflow.conditional.op.in': 'בתוך',
  'workflow.conditional.op.notIn': 'לא בתוך',
  'workflow.conditional.removeRule': 'הסר כלל',
  'workflow.conditional.removeGroup': 'הסר קבוצה',
  'workflow.conditional.maxDepth': 'הגעת לעומק המקסימלי (3 רמות)',
};

const englishTranslations: Translations = {
  // Header
  appTitle: 'RightFlow PDF to HTML Convertor',
  poweredBy: 'Powered by RightFlow',

  // Toolbar - File operations
  uploadPdf: 'Upload PDF',
  savePdf: 'Save PDF',
  settings: 'Settings',

  // Toolbar - Field operations
  saveFields: 'Save Fields',
  loadFields: 'Load Fields',
  exportHtml: 'Export HTML',
  autoDetect: 'Auto Detect',
  detecting: 'Detecting...',
  generating: 'Generating...',

  // Toolbar - Navigation
  page: 'Page',
  of: 'of',
  previousPage: 'Previous Page',
  nextPage: 'Next Page',

  // Toolbar - Zoom
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',

  // Toolbar - Undo/Redo
  undo: 'Undo (Ctrl+Z)',
  redo: 'Redo (Ctrl+Shift+Z)',

  // Tools bar
  selectTool: 'Select',
  textFieldTool: 'Text Field',
  checkboxFieldTool: 'Checkbox',
  radioFieldTool: 'Radio Buttons',
  dropdownFieldTool: 'Dropdown',
  signatureFieldTool: 'Signature',
  staticTextFieldTool: 'Static Text',
  cameraFieldTool: 'Camera',
  gpsLocationFieldTool: 'GPS Location',
  qrScanFieldTool: 'QR Scanner',
  barcodeScanFieldTool: 'Barcode Scanner',

  // Field types
  textField: 'Text',
  checkboxField: 'Checkbox',
  radioField: 'Radio',
  dropdownField: 'Dropdown',
  signatureField: 'Signature',

  // Common actions
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  confirm: 'Confirm',
  close: 'Close',
  add: 'Add',
  remove: 'Remove',
  edit: 'Edit',

  // Messages
  noPdfLoaded: 'No PDF loaded. Please upload a PDF file first.',
  noFieldsToSave: 'No fields to save. Please add at least one field.',
  noFieldsToExport: 'No fields to export. Please add at least one field.',
  pdfLoadError: 'Error loading PDF file',
  invalidPdfFile: 'Invalid PDF file',
  fieldsFound: 'Existing fields found in PDF',
  fieldsImported: 'Fields imported successfully',
  downloadSuccess: 'File downloaded successfully! Check your downloads folder.',

  // Settings
  settingsTitle: 'Settings',
  textFieldSettings: 'Text Field Settings',
  checkboxFieldSettings: 'Checkbox Settings',
  radioFieldSettings: 'Radio Button Settings',
  dropdownFieldSettings: 'Dropdown Settings',
  signatureFieldSettings: 'Signature Settings',
  namingSettings: 'Naming Settings',
  font: 'Font',
  fontSize: 'Font Size',
  direction: 'Direction',
  style: 'Style',
  orientation: 'Orientation',
  spacing: 'Spacing',
  buttonCount: 'Button Count',
  defaultWidth: 'Default Width',
  defaultHeight: 'Default Height',
  resetToDefaults: 'Reset to Defaults',

  // Language selector
  language: 'Language',
  hebrew: 'עברית',
  english: 'English',
  arabic: 'العربية',

  // Theme
  darkMode: 'Dark Mode',
  lightMode: 'Light Mode',

  // Field list sidebar
  fieldsList: 'Fields List',
  searchFields: 'Search fields...',
  noFields: 'No fields',
  fieldsOnPage: 'Fields on page',
  counter: 'Counter',
  field: 'field',
  fields: 'fields',
  noFieldsYet: 'No fields yet',
  useToolsAbove: 'Use the tools above to add fields',
  general: 'General',
  deleteField: 'Delete field',

  // Sections (NEW - v2.0)
  addSection: 'Add Section',
  renameSection: 'Rename Section',
  deleteSection: 'Delete Section',
  ungrouped: 'Ungrouped',

  // Field properties panel
  fieldName: 'Field Name',
  fieldLabel: 'Label',
  required: 'Required',
  defaultValue: 'Default Value',
  options: 'Options',
  addOption: 'Add Option',
  textFieldProperties: 'Text Field Properties',
  checkboxProperties: 'Checkbox Properties',
  radioProperties: 'Radio Button Properties',
  dropdownProperties: 'Dropdown Properties',
  signatureProperties: 'Signature Field Properties',
  staticTextProperties: 'Static Text Properties',
  fieldNameEnglish: 'Field Name (English)',
  fieldNameHint: 'Field name (only English letters, numbers and underscore)',
  labelTitle: 'Label (Title)',
  labelHint: 'Text displayed next to the field',
  serialNumber: 'Serial Number',
  serialNumberHint: 'Field creation order (read-only)',
  sectionName: 'Section Name',
  sectionNameHint: 'Group fields into sections (auto-copied to new fields)',
  sectionNamePlaceholder: 'e.g., Personal Details',
  defaultValueHint: 'The text that will appear in the field by default',
  defaultValuePlaceholder: 'Default text',
  radioOrientation: 'Button Orientation',
  radioOrientationHint: 'Vertical - buttons arranged downward | Horizontal - buttons arranged sideways',
  vertical: 'Vertical (↓)',
  horizontal: 'Horizontal (→)',
  spacingBetweenButtons: 'Spacing Between Buttons (pt)',
  spacingHint: 'Distance between each button (-5 to 10 points | negative = overlapping, 1pt ≈ 0.35mm)',
  radioOptions: 'Radio Button Options',
  radioOptionsHint: 'Radio buttons allow selecting only one option from the list',
  dropdownOptionsHint: 'Each line is a separate option in the list',
  signature: 'Signature',
  addSignature: 'Add Signature',
  editSignature: 'Edit Signature',
  created: 'Created',
  requiredField: 'Required Field',
  requiredFieldHint: 'Is this field mandatory to fill',
  autoFill: 'Auto Fill',
  autoFillHint: 'Enable auto-fill for this field',
  station: 'Filling Station',
  stationHint: 'Who will fill this field',
  stationClient: 'Client',
  stationAgent: 'Agent',
  textDirectionRtl: 'Text Direction Right-to-Left',
  textDirectionHint: 'RTL for Hebrew, LTR for English',
  selectFontHint: 'Select Noto Sans Hebrew for Hebrew text',
  fontSizeRange: 'Range: 8-24 points (pt)',
  pageLabel: 'Page',
  typeLabel: 'Type',
  widthLabel: 'Width',
  heightLabel: 'Height',

  // Static text properties
  content: 'Content',
  textAlignment: 'Text Alignment',
  alignLeft: 'Left',
  alignCenter: 'Center',
  alignRight: 'Right',
  fontWeight: 'Font Weight',
  normal: 'Normal',
  bold: 'Bold',
  fontStyle: 'Font Style',
  italic: 'Italic',
  textColor: 'Text Color',
  backgroundColor: 'Background Color',
  border: 'Border',
  width: 'Width',
  color: 'Color',
  enterStaticText: 'Enter static text...',

  // Recovery dialog
  recoveryTitle: 'Data Recovery',
  recoveryMessage: 'Saved data found from previous session. Restore?',
  restore: 'Restore',
  discard: 'Discard',

  // Upload warning
  uploadWarningTitle: 'Upload Warning',
  uploadWarningMessage: 'Existing fields in current document. What to do?',
  newDocument: 'New Document (Delete Fields)',
  newVersion: 'New Version (Keep Fields)',

  // AI extraction
  aiExtractionTitle: 'AI Field Detection',
  aiExtractionInProgress: 'Detecting fields...',
  aiExtractionSuccess: 'Fields detected successfully!',
  aiExtractionError: 'Error detecting fields',
  replaceOrMerge: 'Replace existing fields or merge?',
  replace: 'Replace',
  merge: 'Merge',

  // HTML preview
  htmlPreviewTitle: 'HTML Preview',
  downloadHtml: 'Download HTML',
  copyHtml: 'Copy HTML',
  copied: 'Copied!',

  // Reprocess page
  reprocessPage: 'Reprocess',
  reprocessConfirm: 'This will delete existing fields on this page. Continue?',
  reprocessSuccess: 'Page reprocessed successfully!',

  // Multi-select properties panel
  multiEdit: 'Multi Edit',
  fieldsSelected: 'fields selected',
  fieldTypes: 'Field types',
  willUpdateAllFields: 'Will update all selected fields',
  textProperties: 'Text Properties',
  appliesToTextFieldsOnly: '* Applies to text fields only',
  appliesToRadioFieldsOnly: '* Applies to radio fields only',
  mixed: '(Mixed)',
  multiSelectTip: 'Tip: Click a field while holding Ctrl to add/remove from selection',

  // Sidebar tabs
  extractedFields: 'Extracted Fields',
  jsonView: 'JSON View',
  documentHistory: 'Document History',

  // JSON view tab
  jsonReadOnly: 'Read only',
  copyJson: 'Copy JSON',
  jsonCopied: 'JSON Copied!',
  noFieldsForJson: 'No fields to display',
  sortRTL: 'Sort RTL',
  sorted: 'Sorted',
  sortByPosition: 'Sort by physical position (RTL)',
  showOriginalOrder: 'Show original order',

  // Document history tab
  noDocumentHistory: 'No document history',
  documents: 'documents',
  documentName: 'Document Name',
  pages: 'Pages',
  lastModified: 'Last Modified',
  loadHistoryFields: 'Load Fields',
  deleteHistory: 'Delete',
  clearAllHistory: 'Clear History',
  clearHistoryConfirm: 'Delete all document history?',
  documentLoaded: 'Fields loaded successfully',
  bytes: 'bytes',
  kb: 'KB',
  mb: 'MB',

  // Field validation
  fieldValidation: 'Field Validation',
  active: 'Active',
  suggestedType: 'Suggested Type',
  apply: 'Apply',
  validationType: 'Validation Type',
  noValidation: 'No Validation',
  enableValidation: 'Enable Validation',
  validators: 'Validators',
  validationMultiHint: 'Validation will apply to all selected fields',

  deleteConfirmMessage: 'Are you sure you want to delete {count} fields?',

  // Dashboard
  dashboard: 'Dashboard',
  backToDashboard: 'Back to Dashboard',
  backToSettings: 'Back to Settings',
  overview: 'Overview',
  myForms: 'My Forms',
  responses: 'Responses',
  helpCenter: 'Help Center',
  noFormsFound: 'No forms found',
  createNewForm: 'Create New Form',
  createFirstForm: 'Create Your First Form',
  searchFormsPlaceholder: 'Search your forms...',
  manageFormsDescription: 'Manage and monitor your Hebrew & Arabic PDF forms.',
  freePlan: 'Free Plan',
  loadingDashboard: 'Initializing Dashboard...',
  noResultsFor: 'No results for "{query}". Try a different search.',

  // Additional Toolbar
  viewHistory: 'Version History',
  publish: 'Publish',
  publishing: 'Publishing...',
  currentDocument: 'Current Document',
  untitledForm: 'Untitled Form',
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
  export: 'Export',

  // Conditional Logic
  conditionalLogic: 'Conditional Logic',
  addRule: 'Add Rule',
  when: 'When',
  equals: 'Equals',
  notEquals: 'Not Equals',
  contains: 'Contains',
  isEmpty: 'Is Empty',
  isNotEmpty: 'Is Not Empty',
  then: 'Then',
  show: 'Show',
  hide: 'Hide',
  require: 'Require',
  unrequire: 'Unrequire',
  selectField: 'Select Field',
  enterValue: 'Enter Value',
  and: 'And',
  or: 'Or',
  defaultVisibility: 'Default Visibility',
  visible: 'Visible',
  hidden: 'Hidden',
  noRules: 'No rules defined',

  // Offline/PWA
  online: 'Online',
  offline: 'Offline',
  syncing: 'Syncing...',
  pendingItems: 'Pending items',
  syncNow: 'Sync Now',
  syncError: 'Sync Error',
  lastSynced: 'Last synced',
  noConnection: 'No internet connection',
  connectionRestored: 'Connection restored',
  itemsWaitingToSync: 'Items waiting to sync',

  // Landing Page
  heroTitle: 'Transform PDFs into Conversational Flows',
  heroSubtitle: 'The only PDF form builder with native RTL support, offline-first reliability, and AI-powered digitization for Israeli field sales teams.',
  getStarted: 'Get Started Free',
  viewDemo: 'View Demo',
  featureHebrewTitle: 'Native Hebrew & Arabic',
  featureHebrewDesc: 'Full RTL support for both Hebrew and Arabic with perfect rendering and bidirectional text handling.',
  featureAiTitle: 'AI Digitization',
  featureAiDesc: 'Turn paper forms into digital interfaces in seconds using our advanced AI engine.',
  featureOfflineTitle: 'Secure & Offline',
  featureOfflineDesc: 'Collect data without internet. Fully encrypted and hosted on Israeli cloud.',
  socialProofTitle: 'TRUSTED BY LEADING ISRAELI COMPANIES',

  // Landing Page V3 Niches
  medicalTitle: 'Medical Equipment',
  medicalDesc: 'Form filling in hospital basements with zero signal, auto-syncing when online.',
  technicalTitle: 'Technical Services',
  technicalDesc: 'Document field faults with compressed photos and fast timestamped signatures.',
  constructionTitle: 'Construction & Safety',
  constructionDesc: 'Scan equipment QR codes, complete checklists and report defects with GPS.',
  salesTitle: 'Sales & Insurance',
  salesDesc: 'Client signatures on policies with a premium interface that feels like real ink.',
  securityTitle: 'Security & Patrol',
  securityDesc: 'GPS-based patrol tracking and real-time incident reporting.',

  // New Features Grid
  pwaTitle: 'Progressive Web App',
  pwaDesc: 'Install RightFlow to home screen without app stores. Works instantly.',
  offlineFirstTitle: 'True Offline-First',
  offlineFirstDesc: 'All capabilities available offline. Data stays on device and syncs in background.',
  signatureSmoothingTitle: 'Smooth Digital Signature',
  signatureSmoothingDesc: 'Bézier algorithm for professional signatures that look scanned in the PDF.',
  aiDetectionTitle: 'AI Field Detection',
  aiDetectionDesc: 'Upload any PDF and our system will detect and map fields for you in seconds.',

  // WhatsApp
  whatsappChannels: 'WhatsApp Channels',
  whatsappManageChannelsDesc: 'Manage WhatsApp channels and send messages',
  connectNewWhatsapp: 'Connect New WhatsApp',
  disconnectChannel: 'Disconnect Channel',
  disconnectConfirm: 'Are you sure you want to disconnect this channel?',
  channelName: 'Channel Name',
  channelNamePlaceholder: 'e.g. Sales',
  statusWorking: 'Connected',
  statusFailed: 'Failed',
  statusStopped: 'Disconnected',
  statusStarting: 'Connecting...',
  statusScanQr: 'Awaiting Scan',
  scanQrCode: 'Scan QR Code',
  scanQrInstructions: 'Open WhatsApp on your phone \u2192 Settings \u2192 Linked Devices \u2192 Link a Device \u2192 Scan the code',
  qrExpired: 'Code expired, refreshing...',
  connectionSuccess: 'WhatsApp connected successfully!',
  sendFormLink: 'Send Link via WhatsApp',
  recipientPhone: 'Recipient Phone Number',
  recipientPhonePlaceholder: '052-1234567',
  messageCaption: 'Caption (optional)',
  selectChannel: 'Select WhatsApp Channel',
  sendMessage: 'Send Message',
  messageSent: 'Message sent successfully',
  messageFailed: 'Message sending failed',
  noChannelsConnected: 'No WhatsApp channels connected',
  noWorkingChannels: 'No active channels.',
  noWorkingChannelsLinkText: 'WhatsApp Channels Settings',
  messagesSentLabel: 'Messages Sent',
  refreshStatus: 'Refresh Status',

  // Language Auto-Detection
  'language.autoDetect.title': 'Different Language Detected',
  'language.autoDetect.message': 'It looks like you\'re typing in {language}. Switch app language?',
  'language.autoDetect.dontAskAgain': 'Don\'t ask again',

  // Landing Page (More)
  featuresLabel: 'Features',
  useCasesLabel: 'Use Cases',
  integrationsLabel: 'Integrations',
  loginLabel: 'Login',
  satisfiedTeams: '500+ Satisfied field teams in Israel',
  trulyIntelligentForms: 'Truly Intelligent Forms',
  offlineReady: 'Offline Ready',
  rightToolsForField: 'The right tools for the field',
  builtFromScratch: 'RightFlow 2.0 was built from the ground up to solve field team challenges.',
  anyNicheAnywhere: 'Any niche, anywhere',
  readUseCase: 'Read use case',
  connectToYourWorld: 'Connect to your world',
  streamDataDirectly: 'Stream data directly to your CRM, project management tool, or any automation platform.',
  readyToGoPaperless: 'Ready to go paperless?',
  joinMobileFirst: 'Join the Mobile-First revolution for field workers.',
  contactUs: 'Contact Us',
  noCreditCard: 'No credit card required • 14-day free trial included',

  // PWA/System
  pwaNewVersionTitle: 'New Version Available',
  pwaNewVersionMessage: 'A new version of the app is available! Click OK to update now.',
  pwaOfflineReady: 'App is ready to work offline',
  pwaRegistered: 'Service Worker registered successfully',
  pwaRegistrationError: 'Error registering Service Worker',

  failedToLoadForms: 'Failed to load forms',
  noFormsYetDescription: 'You haven\'t created any forms yet. Start now.',
  deleteFormConfirm: 'Delete this form?',
  noDescription: 'No description for this form.',
  onePage: '1 page',
  copyLink: 'Copy Link',
  viewResponses: 'View Responses',
  fieldsCount: '{count} fields',
  sendWhatsApp: 'Send via WhatsApp',

  // Onboarding Progress Checklist
  onboardingTitle: 'Get the most out of RightFlow',
  onboardingCompleted: '{completed} of {total} completed',
  onboardingCreateForm: 'Create your first form',
  onboardingCustomize: 'Customize form fields',
  onboardingPublish: 'Publish form',
  onboardingFirstResponse: 'Receive first response',
  onboardingShare: 'Share via WhatsApp',

  // Common (additional)
  'common.yes': 'Yes',
  'common.no': 'No',

  // Workflow - Approval Chain
  'workflow.approval.chainSettings': 'Approval Chain Settings',
  'workflow.approval.overallTimeout': 'Overall Timeout',
  'workflow.approval.hours': 'Hours',
  'workflow.approval.onTimeout': 'On Timeout',
  'workflow.approval.timeout.fail': 'Fail',
  'workflow.approval.timeout.escalate': 'Escalate',
  'workflow.approval.timeout.autoApprove': 'Auto Approve',
  'workflow.approval.addLevel': 'Add Level',
  'workflow.approval.level': 'Level',
  'workflow.approval.approvalType': 'Approval Type',
  'workflow.approval.approvalType.any': 'Any',
  'workflow.approval.approvalType.all': 'All',
  'workflow.approval.approvalType.allDescription': 'All approvers must approve',
  'workflow.approval.approvalType.anyDescription': 'Only one approver needs to approve',
  'workflow.approval.approvers': 'Approvers',
  'workflow.approval.addApprover': 'Add Approver',
  'workflow.approval.timeout': 'Timeout',
  'workflow.approval.escalation': 'Escalation',
  'workflow.approval.escalation.timeoutHours': 'Timeout Hours',
  'workflow.approval.escalation.escalateTo': 'Escalate To',
  'workflow.approval.addEscalation': 'Add Escalation',
  'workflow.approval.removeEscalation': 'Remove Escalation',
  'workflow.approval.approverType.user': 'User',
  'workflow.approval.approverType.role': 'Role',
  'workflow.approval.approverType.dynamic': 'Dynamic',
  'workflow.approval.selectUser': 'Select User',
  'workflow.approval.selectRole': 'Select Role',

  // Workflow - Template Gallery
  'workflow.template.gallery': 'Template Gallery',
  'workflow.template.searchPlaceholder': 'Search templates...',
  'workflow.template.allCategories': 'All Categories',
  'workflow.template.category.approval': 'Approval',
  'workflow.template.category.dataCollection': 'Data Collection',
  'workflow.template.category.automation': 'Automation',
  'workflow.template.category.conditional': 'Conditional Logic',
  'workflow.template.category.integration': 'Integration',
  'workflow.template.category.notification': 'Notification',
  'workflow.template.category.custom': 'Custom',
  'workflow.template.sortBy': 'Sort By',
  'workflow.template.sort.usageDesc': 'Most Used',
  'workflow.template.sort.usageAsc': 'Least Used',
  'workflow.template.sort.dateDesc': 'Newest',
  'workflow.template.sort.dateAsc': 'Oldest',
  'workflow.template.sort.nameAsc': 'Name (A-Z)',
  'workflow.template.sort.nameDesc': 'Name (Z-A)',
  'workflow.template.viewGrid': 'Grid View',
  'workflow.template.viewList': 'List View',
  'workflow.template.used': 'Used',
  'workflow.template.times': 'times',
  'workflow.template.useTemplate': 'Use Template',
  'workflow.template.exportTemplate': 'Export Template',
  'workflow.template.deleteTemplate': 'Delete Template',
  'workflow.template.importTemplate': 'Import Template',
  'workflow.template.storageUsed': 'Storage Used',
  'workflow.template.storageWarning': 'Storage approaching limit',
  'workflow.template.noTemplates': 'No templates found',

  // Workflow - Conditional Logic
  'workflow.conditional.builder': 'Conditional Logic Builder',
  'workflow.conditional.addGroup': 'Add Group',
  'workflow.conditional.addRule': 'Add Rule',
  'workflow.conditional.operator.and': 'AND',
  'workflow.conditional.operator.or': 'OR',
  'workflow.conditional.field': 'Field',
  'workflow.conditional.operator': 'Operator',
  'workflow.conditional.value': 'Value',
  'workflow.conditional.op.eq': 'Equals',
  'workflow.conditional.op.ne': 'Not Equals',
  'workflow.conditional.op.gt': 'Greater Than',
  'workflow.conditional.op.lt': 'Less Than',
  'workflow.conditional.op.gte': 'Greater or Equal',
  'workflow.conditional.op.lte': 'Less or Equal',
  'workflow.conditional.op.contains': 'Contains',
  'workflow.conditional.op.exists': 'Exists',
  'workflow.conditional.op.in': 'In',
  'workflow.conditional.op.notIn': 'Not In',
  'workflow.conditional.removeRule': 'Remove Rule',
  'workflow.conditional.removeGroup': 'Remove Group',
  'workflow.conditional.maxDepth': 'Maximum nesting depth reached (3 levels)',
};

const arabicTranslations: Translations = {
  // Header
  appTitle: 'RightFlow PDF to HTML Convertor',
  poweredBy: 'مدعوم من RightFlow',

  // Toolbar - File operations
  uploadPdf: 'تحميل PDF',
  savePdf: 'حفظ PDF',
  settings: 'الإعدادات',

  // Toolbar - Field operations
  saveFields: 'حفظ الحقول',
  loadFields: 'تحميل الحقول',
  exportHtml: 'تصدير HTML',
  autoDetect: 'كشف تلقائي',
  detecting: 'جاري الكشف...',
  generating: 'جاري الإنشاء...',

  // Toolbar - Navigation
  page: 'صفحة',
  of: 'من',
  previousPage: 'الصفحة السابقة',
  nextPage: 'الصفحة التالية',

  // Toolbar - Zoom
  zoomIn: 'تكبير',
  zoomOut: 'تصغير',

  // Toolbar - Undo/Redo
  undo: 'تراجع (Ctrl+Z)',
  redo: 'إعادة (Ctrl+Shift+Z)',

  // Tools bar
  selectTool: 'تحديد',
  textFieldTool: 'حقل نص',
  checkboxFieldTool: 'مربع اختيار',
  radioFieldTool: 'أزرار اختيار',
  dropdownFieldTool: 'قائمة منسدلة',
  signatureFieldTool: 'توقيع',
  staticTextFieldTool: 'نص ثابت',
  cameraFieldTool: 'كاميرا',
  gpsLocationFieldTool: 'موقع GPS',
  qrScanFieldTool: 'ماسح QR',
  barcodeScanFieldTool: 'ماسح الباركود',

  // Field types
  textField: 'نص',
  checkboxField: 'مربع اختيار',
  radioField: 'زر اختيار',
  dropdownField: 'قائمة منسدلة',
  signatureField: 'توقيع',

  // Common actions
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  confirm: 'تأكيد',
  close: 'إغلاق',
  add: 'إضافة',
  remove: 'إزالة',
  edit: 'تحرير',

  // Messages
  noPdfLoaded: 'لم يتم تحميل PDF. الرجاء تحميل ملف PDF أولاً.',
  noFieldsToSave: 'لا توجد حقول للحفظ. الرجاء إضافة حقل واحد على الأقل.',
  noFieldsToExport: 'لا توجد حقول للتصدير. الرجاء إضافة حقل واحد على الأقل.',
  pdfLoadError: 'خطأ في تحميل ملف PDF',
  invalidPdfFile: 'ملف PDF غير صالح',
  fieldsFound: 'تم العثور على حقول موجودة في PDF',
  fieldsImported: 'تم استيراد الحقول بنجاح',
  downloadSuccess: 'تم تنزيل الملف بنجاح! تحقق من مجلد التنزيلات.',

  // Settings
  settingsTitle: 'الإعدادات',
  textFieldSettings: 'إعدادات حقل النص',
  checkboxFieldSettings: 'إعدادات مربع الاختيار',
  radioFieldSettings: 'إعدادات أزرار الاختيار',
  dropdownFieldSettings: 'إعدادات القائمة المنسدلة',
  signatureFieldSettings: 'إعدادات التوقيع',
  namingSettings: 'إعدادات التسمية',
  font: 'الخط',
  fontSize: 'حجم الخط',
  direction: 'الاتجاه',
  style: 'النمط',
  orientation: 'التوجيه',
  spacing: 'التباعد',
  buttonCount: 'عدد الأزرار',
  defaultWidth: 'العرض الافتراضي',
  defaultHeight: 'الارتفاع الافتراضي',
  resetToDefaults: 'إعادة تعيين إلى الافتراضيات',

  // Language selector
  language: 'اللغة',
  hebrew: 'عبري',
  english: 'English',
  arabic: 'العربية',

  // Theme
  darkMode: 'الوضع الداكن',
  lightMode: 'الوضع الفاتح',

  // Field list sidebar
  fieldsList: 'قائمة الحقول',
  searchFields: 'البحث عن الحقول...',
  noFields: 'لا توجد حقول',
  fieldsOnPage: 'الحقول في الصفحة',
  counter: 'عداد',
  field: 'حقل',
  fields: 'حقول',
  noFieldsYet: 'لا توجد حقول بعد',
  useToolsAbove: 'استخدم الأدوات أعلاه لإضافة حقول',
  general: 'عام',
  deleteField: 'حذف الحقل',

  // Sections (NEW - v2.0)
  addSection: 'إضافة قسم',
  renameSection: 'إعادة تسمية القسم',
  deleteSection: 'حذف القسم',
  ungrouped: 'بدون مجموعة',

  // Field properties panel
  fieldName: 'اسم الحقل',
  fieldLabel: 'التسمية',
  required: 'مطلوب',
  defaultValue: 'القيمة الافتراضية',
  options: 'الخيارات',
  addOption: 'إضافة خيار',
  textFieldProperties: 'خصائص حقل النص',
  checkboxProperties: 'خصائص مربع الاختيار',
  radioProperties: 'خصائص زر الاختيار',
  dropdownProperties: 'خصائص القائمة المنسدلة',
  signatureProperties: 'خصائص حقل التوقيع',
  staticTextProperties: 'خصائص النص الثابت',
  fieldNameEnglish: 'اسم الحقل (بالإنجليزية)',
  fieldNameHint: 'اسم الحقل (أحرف إنجليزية وأرقام وشرطة سفلية فقط)',
  labelTitle: 'التسمية (العنوان)',
  labelHint: 'النص المعروض بجوار الحقل',
  serialNumber: 'الرقم التسلسلي',
  serialNumberHint: 'ترتيب إنشاء الحقل (للقراءة فقط)',
  sectionName: 'اسم القسم',
  sectionNameHint: 'تجميع الحقول في أقسام (يتم نسخه تلقائيًا للحقول الجديدة)',
  sectionNamePlaceholder: 'مثال: التفاصيل الشخصية',
  defaultValueHint: 'النص الذي سيظهر في الحقل افتراضيًا',
  defaultValuePlaceholder: 'النص الافتراضي',
  radioOrientation: 'اتجاه ترتيب الأزرار',
  radioOrientationHint: 'عمودي - الأزرار مرتبة للأسفل | أفقي - الأزرار مرتبة جانبيًا',
  vertical: 'عمودي (↓)',
  horizontal: 'أفقي (→)',
  spacingBetweenButtons: 'التباعد بين الأزرار (pt)',
  spacingHint: 'المسافة بين كل زر وجاره (-5 إلى 10 نقاط | سالب = متداخل، 1pt ≈ 0.35mm)',
  radioOptions: 'خيارات أزرار الاختيار',
  radioOptionsHint: 'تسمح أزرار الاختيار باختيار خيار واحد فقط من القائمة',
  dropdownOptionsHint: 'كل سطر هو خيار منفصل في القائمة',
  signature: 'التوقيع',
  addSignature: 'إضافة توقيع',
  editSignature: 'تحرير التوقيع',
  created: 'تم الإنشاء',
  requiredField: 'حقل مطلوب',
  requiredFieldHint: 'هل يجب ملء هذا الحقل',
  autoFill: 'ملء تلقائي',
  autoFillHint: 'تمكين الملء التلقائي لهذا الحقل',
  station: 'محطة الملء',
  stationHint: 'من سيملأ هذا الحقل',
  stationClient: 'العميل',
  stationAgent: 'الوكيل',
  textDirectionRtl: 'اتجاه النص من اليمين إلى اليسار',
  textDirectionHint: 'RTL للعربية، LTR للإنجليزية',
  selectFontHint: 'اختر خطًا عربيًا للنص العربي',
  fontSizeRange: 'النطاق: 8-24 نقطة (pt)',
  pageLabel: 'صفحة',
  typeLabel: 'النوع',
  widthLabel: 'العرض',
  heightLabel: 'الارتفاع',

  // Static text properties
  content: 'المحتوى',
  textAlignment: 'محاذاة النص',
  alignLeft: 'يسار',
  alignCenter: 'وسط',
  alignRight: 'يمين',
  fontWeight: 'وزن الخط',
  normal: 'عادي',
  bold: 'عريض',
  fontStyle: 'نمط الخط',
  italic: 'مائل',
  textColor: 'لون النص',
  backgroundColor: 'لون الخلفية',
  border: 'الحدود',
  width: 'العرض',
  color: 'اللون',
  enterStaticText: 'أدخل نصًا ثابتًا...',

  // Recovery dialog
  recoveryTitle: 'استرجاع البيانات',
  recoveryMessage: 'تم العثور على بيانات محفوظة من جلسة سابقة. الاسترجاع؟',
  restore: 'استرجاع',
  discard: 'تجاهل',

  // Upload warning
  uploadWarningTitle: 'تحذير التحميل',
  uploadWarningMessage: 'حقول موجودة في المستند الحالي. ماذا تفعل؟',
  newDocument: 'مستند جديد (حذف الحقول)',
  newVersion: 'إصدار جديد (الاحتفاظ بالحقول)',

  // AI extraction
  aiExtractionTitle: 'كشف الحقول بواسطة AI',
  aiExtractionInProgress: 'جاري الكشف عن الحقول...',
  aiExtractionSuccess: 'تم اكتشاف الحقول بنجاح!',
  aiExtractionError: 'خطأ في اكتشاف الحقول',
  replaceOrMerge: 'استبدال الحقول الموجودة أم الدمج؟',
  replace: 'استبدال',
  merge: 'دمج',

  // HTML preview
  htmlPreviewTitle: 'معاينة HTML',
  downloadHtml: 'تنزيل HTML',
  copyHtml: 'نسخ HTML',
  copied: 'تم النسخ!',

  // Reprocess page
  reprocessPage: 'إعادة المعالجة',
  reprocessConfirm: 'سيؤدي هذا إلى حذف الحقول الموجودة في هذه الصفحة. المتابعة؟',
  reprocessSuccess: 'تمت إعادة معالجة الصفحة بنجاح!',

  // Multi-select properties panel
  multiEdit: 'تحرير متعدد',
  fieldsSelected: 'حقول محددة',
  fieldTypes: 'أنواع الحقول',
  willUpdateAllFields: 'سيتم التحديث لجميع الحقول المحددة',
  textProperties: 'خصائص النص',
  appliesToTextFieldsOnly: '* ينطبق على حقول النص فقط',
  appliesToRadioFieldsOnly: '* ينطبق على أزرار الاختيار فقط',
  mixed: '(مختلط)',
  multiSelectTip: 'نصيحة: انقر على حقل أثناء الضغط على Ctrl للإضافة/الإزالة من التحديد',

  // Sidebar tabs
  extractedFields: 'الحقول المستخرجة',
  jsonView: 'عرض JSON',
  documentHistory: 'سجل المستندات',

  // JSON view tab
  jsonReadOnly: 'للقراءة فقط',
  copyJson: 'نسخ JSON',
  jsonCopied: 'تم نسخ JSON!',
  noFieldsForJson: 'لا توجد حقول للعرض',
  sortRTL: 'ترتيب RTL',
  sorted: 'مرتب',
  sortByPosition: 'ترتيب حسب الموضع الفعلي (RTL)',
  showOriginalOrder: 'إظهار الترتيب الأصلي',

  // Document history tab
  noDocumentHistory: 'لا يوجد سجل مستندات',
  documents: 'مستندات',
  documentName: 'اسم المستند',
  pages: 'صفحات',
  lastModified: 'آخر تعديل',
  loadHistoryFields: 'تحميل الحقول',
  deleteHistory: 'حذف',
  clearAllHistory: 'مسح السجل',
  clearHistoryConfirm: 'حذف سجل المستندات بالكامل؟',
  documentLoaded: 'تم تحميل الحقول بنجاح',
  bytes: 'بايت',
  kb: 'كيلوبايت',
  mb: 'ميغابايت',

  // Field validation
  fieldValidation: 'التحقق من الحقل',
  active: 'نشط',
  suggestedType: 'النوع المقترح',
  apply: 'تطبيق',
  validationType: 'نوع التحقق',
  noValidation: 'بدون تحقق',
  enableValidation: 'تمكين التحقق',
  validators: 'قواعد التحقق',
  validationMultiHint: 'سيتم تطبيق التحقق على جميع الحقول المحددة',

  deleteConfirmMessage: 'هل أنت متأكد من حذف {count} حقول؟',

  // Dashboard
  dashboard: 'لوحة التحكم',
  backToDashboard: 'العودة إلى لوحة التحكم',
  backToSettings: 'العودة إلى الإعدادات',
  overview: 'نظرة عامة',
  myForms: 'نماذجي',
  responses: 'الردود',
  helpCenter: 'مركز المساعدة',
  noFormsFound: 'لم يتم العثور على نماذج',
  createNewForm: 'إنشاء نموذج جديد',
  createFirstForm: 'أنشئ نموذجك الأول',
  searchFormsPlaceholder: 'البحث عن النماذج...',
  manageFormsDescription: 'إدارة ومراقبة نماذج PDF الخاصة بك (العربية والعبرية).',
  freePlan: 'الخطة المجانية',
  loadingDashboard: 'جاري تحميل لوحة التحكم...',
  noResultsFor: 'لا توجد نتائج لـ "{query}". جرب بحثًا آخر.',

  // Additional Toolbar
  viewHistory: 'سجل الإصدارات',
  publish: 'نشر',
  publishing: 'جاري النشر...',
  currentDocument: 'المستند الحالي',
  untitledForm: 'نموذج بدون عنوان',
  draft: 'مسودة',
  published: 'منشور',
  archived: 'مؤرشف',
  export: 'تصدير',

  // Conditional Logic
  conditionalLogic: 'المنطق الشرطي',
  addRule: 'إضافة قاعدة',
  when: 'عندما',
  equals: 'يساوي',
  notEquals: 'لا يساوي',
  contains: 'يحتوي على',
  isEmpty: 'فارغ',
  isNotEmpty: 'غير فارغ',
  then: 'إذن',
  show: 'إظهار',
  hide: 'إخفاء',
  require: 'مطلوب',
  unrequire: 'غير مطلوب',
  selectField: 'اختر حقلاً',
  enterValue: 'أدخل قيمة',
  and: 'و',
  or: 'أو',
  defaultVisibility: 'الرؤية الافتراضية',
  visible: 'مرئي',
  hidden: 'مخفي',
  noRules: 'لا توجد قواعد محددة',

  // Offline/PWA
  online: 'متصل',
  offline: 'غير متصل',
  syncing: 'جاري المزامنة...',
  pendingItems: 'عناصر معلقة',
  syncNow: 'زامن الآن',
  syncError: 'خطأ في المزامنة',
  lastSynced: 'آخر مزامنة',
  noConnection: 'لا يوجد اتصال بالإنترنت',
  connectionRestored: 'تم استعادة الاتصال',
  itemsWaitingToSync: 'عناصر في انتظار المزامنة',

  // Landing Page
  heroTitle: 'تحويل ملفات PDF إلى تدفقات تفاعلية',
  heroSubtitle: 'منشئ نماذج PDF الوحيد مع دعم RTL أصلي، موثوقية غير متصلة بالإنترنت، ورقمنة مدعومة بالذكاء الاصطناعي لفرق المبيعات الميدانية.',
  getStarted: 'ابدأ مجانًا',
  viewDemo: 'عرض توضيحي',
  featureHebrewTitle: 'دعم العربية والعبرية',
  featureHebrewDesc: 'دعم كامل لـ RTL للعربية والعبرية مع عرض مثالي ومعالجة نص ثنائي الاتجاه.',
  featureAiTitle: 'رقمنة بالذكاء الاصطناعي',
  featureAiDesc: 'حول النماذج الورقية إلى واجهات رقمية في ثوانٍ باستخدام محرك OCR المتقدم.',
  featureOfflineTitle: 'آمن وغير متصل',
  featureOfflineDesc: 'جمع البيانات بدون إنترنت. مشفر بالكامل ومستضاف على سحابة محلية.',
  socialProofTitle: 'موثوق به من قبل الشركات الرائدة',

  // Landing Page V3 Niches
  medicalTitle: 'المعدات الطبية',
  medicalDesc: 'ملء النماذج في أقبية المستشفيات بدون إشارة، مع مزامنة تلقائية عند الاتصال.',
  technicalTitle: 'الخدمات الفنية',
  technicalDesc: 'توثيق الأعطال الميدانية بصور مضغوطة وتوقيع العميل السريع مع طابع زمني.',
  constructionTitle: 'الإنشاءات والسلامة',
  constructionDesc: 'مسح رموز QR على المعدات، استكمال قوائم المراجعة والإبلاغ عن العيوب مع موقع GPS دقيق.',
  salesTitle: 'المبيعات والتأمين',
  salesDesc: 'توقيع العميل على وثائق التأمين بواجهة متميزة تبدو كالحبر الحقيقي.',
  securityTitle: 'الأمن والدوريات',
  securityDesc: 'تتبع الدوريات المستند إلى GPS والإبلاغ عن الحوادث في الوقت الفعلي.',

  // New Features Grid
  pwaTitle: 'تطبيق ويب تقدمي',
  pwaDesc: 'ثبت RightFlow على الشاشة الرئيسية بدون متاجر التطبيقات. يعمل فورًا.',
  offlineFirstTitle: 'غير متصل حقيقي أولاً',
  offlineFirstDesc: 'جميع القدرات متاحة دون اتصال. البيانات تبقى على الجهاز وتتم المزامنة في الخلفية.',
  signatureSmoothingTitle: 'توقيع رقمي سلس',
  signatureSmoothingDesc: 'خوارزمية Bézier لتوقيعات احترافية تبدو ممسوحة ضوئيًا في PDF.',
  aiDetectionTitle: 'كشف الحقول بالذكاء الاصطناعي',
  aiDetectionDesc: 'قم بتحميل أي PDF وسيكتشف نظامنا الحقول ويرسمها لك في ثوانٍ.',

  // WhatsApp
  whatsappChannels: 'قنوات واتساب',
  whatsappManageChannelsDesc: 'إدارة قنوات واتساب وإرسال الرسائل',
  connectNewWhatsapp: 'توصيل واتساب جديد',
  disconnectChannel: 'قطع اتصال القناة',
  disconnectConfirm: 'هل أنت متأكد من قطع اتصال هذه القناة؟',
  channelName: 'اسم القناة',
  channelNamePlaceholder: 'مثال: المبيعات',
  statusWorking: 'متصل',
  statusFailed: 'فشل',
  statusStopped: 'غير متصل',
  statusStarting: 'جاري الاتصال...',
  statusScanQr: 'في انتظار المسح',
  scanQrCode: 'مسح رمز QR',
  scanQrInstructions: 'افتح واتساب على هاتفك ← الإعدادات ← الأجهزة المرتبطة ← ربط جهاز ← امسح الرمز',
  qrExpired: 'انتهت صلاحية الرمز، جاري التحديث...',
  connectionSuccess: 'تم توصيل واتساب بنجاح!',
  sendFormLink: 'إرسال رابط عبر واتساب',
  recipientPhone: 'رقم هاتف المستلم',
  recipientPhonePlaceholder: '05-1234567',
  messageCaption: 'رسالة مرفقة (اختياري)',
  selectChannel: 'اختر قناة واتساب',
  sendMessage: 'إرسال رسالة',
  messageSent: 'تم إرسال الرسالة بنجاح',
  messageFailed: 'فشل إرسال الرسالة',
  noChannelsConnected: 'لا توجد قنوات واتساب متصلة',
  noWorkingChannels: 'لا توجد قنوات نشطة.',
  noWorkingChannelsLinkText: 'إعدادات قنوات واتساب',
  messagesSentLabel: 'الرسائل المرسلة',
  refreshStatus: 'تحديث الحالة',

  // Language Auto-Detection
  'language.autoDetect.title': 'تم اكتشاف لغة مختلفة',
  'language.autoDetect.message': 'يبدو أنك تكتب بـ {language}. تبديل لغة التطبيق؟',
  'language.autoDetect.dontAskAgain': 'لا تسأل مرة أخرى',

  // Landing Page (More)
  featuresLabel: 'ميزات',
  useCasesLabel: 'حالات الاستخدام',
  integrationsLabel: 'تكاملات',
  loginLabel: 'تسجيل الدخول',
  satisfiedTeams: 'أكثر من 500 فريق ميداني راضٍ',
  trulyIntelligentForms: 'نماذج ذكية حقًا',
  offlineReady: 'جاهز للعمل بدون إنترنت',
  rightToolsForField: 'الأدوات المناسبة للعمل الميداني',
  builtFromScratch: 'تم بناء RightFlow 2.0 من الألف إلى الياء لحل تحديات الفرق الميدانية.',
  anyNicheAnywhere: 'أي مكان، أي مجال',
  readUseCase: 'اقرأ حالة الاستخدام',
  connectToYourWorld: 'اتصل بعالمكم',
  streamDataDirectly: 'قم ببث البيانات مباشرة إلى نظام إدارة علاقات العملاء (CRM) أو إدارة المشاريع أو أي نظام أتمتة.',
  readyToGoPaperless: 'هل أنت جاهز للتحول الرقمي؟',
  joinMobileFirst: 'انضم إلى ثورة الهاتف المحمول أولاً للعاملين الميدانيين.',
  contactUs: 'اتصل بنا',
  noCreditCard: 'لا حاجة لبطاقة ائتمان • تشمل فترة تجريبية لمدة 14 يومًا',

  // PWA/System
  pwaNewVersionTitle: 'نسخة جديدة متاحة',
  pwaNewVersionMessage: 'نسخة جديدة من التطبيق متاحة! انقر فوق موافق للتحديث الآن.',
  pwaOfflineReady: 'التطبيق جاهז للعمل دون اتصال بالإنترنت',
  pwaRegistered: 'تم تسجيل Service Worker بنجاح',
  pwaRegistrationError: 'خطأ في تسجيل Service Worker',

  failedToLoadForms: 'فشل تحميل النماذج',
  noFormsYetDescription: 'لم تقم بإنشاء أي نماذج بعد. ابدأ الآن.',
  deleteFormConfirm: 'هل تريد حذف هذا النموذج؟',
  noDescription: 'لا يوجد وصف لهذا النموذج.',
  onePage: 'صفحة واحدة',
  copyLink: 'نسخ الرابط',
  viewResponses: 'عرض الردود',
  fieldsCount: '{count} حقول',
  sendWhatsApp: 'إرسال عبر واتساب',

  // Onboarding Progress Checklist
  onboardingTitle: 'احصل على أقصى استفادة من RightFlow',
  onboardingCompleted: 'تم إكمال {completed} من {total}',
  onboardingCreateForm: 'إنشاء النموذج الأول الخاص بك',
  onboardingCustomize: 'تخصيص حقول النموذج',
  onboardingPublish: 'نشر النموذج',
  onboardingFirstResponse: 'تلقي أول استجابة',
  onboardingShare: 'مشاركة عبر واتساب',

  // Common (additional)
  'common.yes': 'نعم',
  'common.no': 'لا',

  // Workflow - Approval Chain
  'workflow.approval.chainSettings': 'إعدادات سلسلة الموافقات',
  'workflow.approval.overallTimeout': 'المهلة الإجمالية',
  'workflow.approval.hours': 'ساعات',
  'workflow.approval.onTimeout': 'عند انتهاء المهلة',
  'workflow.approval.timeout.fail': 'فشل',
  'workflow.approval.timeout.escalate': 'تصعيد',
  'workflow.approval.timeout.autoApprove': 'موافقة تلقائية',
  'workflow.approval.addLevel': 'إضافة مستوى',
  'workflow.approval.level': 'مستوى',
  'workflow.approval.approvalType': 'نوع الموافقة',
  'workflow.approval.approvalType.any': 'أي واحد (ANY)',
  'workflow.approval.approvalType.all': 'الكل (ALL)',
  'workflow.approval.approvalType.allDescription': 'يجب أن يوافق جميع الموافقين',
  'workflow.approval.approvalType.anyDescription': 'يكفي أن يوافق موافق واحد',
  'workflow.approval.approvers': 'الموافقون',
  'workflow.approval.addApprover': 'إضافة موافق',
  'workflow.approval.timeout': 'المهلة',
  'workflow.approval.escalation': 'التصعيد',
  'workflow.approval.escalation.timeoutHours': 'ساعات حتى التصعيد',
  'workflow.approval.escalation.escalateTo': 'تصعيد إلى',
  'workflow.approval.addEscalation': 'إضافة تصعيد',
  'workflow.approval.removeEscalation': 'إزالة التصعيد',
  'workflow.approval.approverType.user': 'مستخدم',
  'workflow.approval.approverType.role': 'دور',
  'workflow.approval.approverType.dynamic': 'ديناميكي',
  'workflow.approval.selectUser': 'اختر مستخدم',
  'workflow.approval.selectRole': 'اختر دور',

  // Workflow - Template Gallery
  'workflow.template.gallery': 'معرض القوالب',
  'workflow.template.searchPlaceholder': 'البحث عن قوالب...',
  'workflow.template.allCategories': 'جميع الفئات',
  'workflow.template.category.approval': 'الموافقات',
  'workflow.template.category.dataCollection': 'جمع البيانات',
  'workflow.template.category.automation': 'الأتمتة',
  'workflow.template.category.conditional': 'المنطق الشرطي',
  'workflow.template.category.integration': 'التكامل',
  'workflow.template.category.notification': 'الإشعارات',
  'workflow.template.category.custom': 'مخصص',
  'workflow.template.sortBy': 'ترتيب حسب',
  'workflow.template.sort.usageDesc': 'الأكثر استخدامًا',
  'workflow.template.sort.usageAsc': 'الأقل استخدامًا',
  'workflow.template.sort.dateDesc': 'الأحدث',
  'workflow.template.sort.dateAsc': 'الأقدم',
  'workflow.template.sort.nameAsc': 'الاسم (أ-ي)',
  'workflow.template.sort.nameDesc': 'الاسم (ي-أ)',
  'workflow.template.viewGrid': 'عرض شبكي',
  'workflow.template.viewList': 'عرض قائمة',
  'workflow.template.used': 'استخدم',
  'workflow.template.times': 'مرات',
  'workflow.template.useTemplate': 'استخدم القالب',
  'workflow.template.exportTemplate': 'تصدير القالب',
  'workflow.template.deleteTemplate': 'حذف القالب',
  'workflow.template.importTemplate': 'استيراد قالب',
  'workflow.template.storageUsed': 'المساحة المستخدمة',
  'workflow.template.storageWarning': 'المساحة تقترب من الحد الأقصى',
  'workflow.template.noTemplates': 'لم يتم العثور على قوالب',

  // Workflow - Conditional Logic
  'workflow.conditional.builder': 'منشئ المنطق الشرطي',
  'workflow.conditional.addGroup': 'إضافة مجموعة',
  'workflow.conditional.addRule': 'إضافة قاعدة',
  'workflow.conditional.operator.and': 'و (AND)',
  'workflow.conditional.operator.or': 'أو (OR)',
  'workflow.conditional.field': 'الحقل',
  'workflow.conditional.operator': 'المشغل',
  'workflow.conditional.value': 'القيمة',
  'workflow.conditional.op.eq': 'يساوي',
  'workflow.conditional.op.ne': 'لا يساوي',
  'workflow.conditional.op.gt': 'أكبر من',
  'workflow.conditional.op.lt': 'أقل من',
  'workflow.conditional.op.gte': 'أكبر من أو يساوي',
  'workflow.conditional.op.lte': 'أقل من أو يساوي',
  'workflow.conditional.op.contains': 'يحتوي على',
  'workflow.conditional.op.exists': 'موجود',
  'workflow.conditional.op.in': 'في',
  'workflow.conditional.op.notIn': 'ليس في',
  'workflow.conditional.removeRule': 'إزالة القاعدة',
  'workflow.conditional.removeGroup': 'إزالة المجموعة',
  'workflow.conditional.maxDepth': 'تم الوصول إلى أقصى عمق للتداخل (3 مستويات)',
};

const translations: Record<Language, Translations> = {
  he: hebrewTranslations,
  en: englishTranslations,
  ar: arabicTranslations,
};

export function getTranslations(language: Language): Translations {
  return translations[language];
}

export function t(language: Language, key: keyof Translations): string {
  return translations[language][key];
}
