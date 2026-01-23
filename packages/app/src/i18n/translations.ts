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
  overview: 'סקירה כללית',
  myForms: 'הטפסים שלי',
  responses: 'תגובות',
  helpCenter: 'מרכז עזרה',
  noFormsFound: 'לא נמצאו טפסים',
  createNewForm: 'יצירת טופס חדש',
  createFirstForm: 'צור את הטופס הראשון שלך',
  searchFormsPlaceholder: 'חיפוש טפסים...',
  manageFormsDescription: 'ניהול ומעקב אחר טפסי ה-PDF שלך.',
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
  featureHebrewTitle: 'עברית שפת אם',
  featureHebrewDesc: 'תמיכה מלאה ב-RTL עם רינדור מושלם וטיפול דו-כיווני (Bidi).',
  featureAiTitle: 'דיגיטציה ב-AI',
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
  overview: 'Overview',
  myForms: 'My Forms',
  responses: 'Responses',
  helpCenter: 'Help Center',
  noFormsFound: 'No forms found',
  createNewForm: 'Create New Form',
  createFirstForm: 'Create Your First Form',
  searchFormsPlaceholder: 'Search your forms...',
  manageFormsDescription: 'Manage and monitor your Hebrew PDF forms.',
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
  featureHebrewTitle: 'Native Hebrew',
  featureHebrewDesc: 'Full RTL support with perfect rendering and bidirectional text handling.',
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
};

const translations: Record<Language, Translations> = {
  he: hebrewTranslations,
  en: englishTranslations,
};

export function getTranslations(language: Language): Translations {
  return translations[language];
}

export function t(language: Language, key: keyof Translations): string {
  return translations[language][key];
}
