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
  textDirectionRtl: string;
  textDirectionHint: string;
  selectFontHint: string;
  fontSizeRange: string;
  pageLabel: string;
  typeLabel: string;
  widthLabel: string;
  heightLabel: string;

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
}

const hebrewTranslations: Translations = {
  // Header
  appTitle: 'RightFlow PDF to HTML Convertor',
  poweredBy: 'Powered by DocsFlow',

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
  spacingHint: 'המרחק בין כל כפתור לשכנו (0-50 נקודות, 1pt ≈ 0.35mm)',
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
  textDirectionRtl: 'כיוון טקסט מימין לשמאל',
  textDirectionHint: 'RTL עבור עברית, LTR עבור אנגלית',
  selectFontHint: 'בחר Noto Sans Hebrew לטקסט עברי',
  fontSizeRange: 'טווח: 8-24 נקודות (pt)',
  pageLabel: 'עמוד',
  typeLabel: 'סוג',
  widthLabel: 'רוחב',
  heightLabel: 'גובה',

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
};

const englishTranslations: Translations = {
  // Header
  appTitle: 'RightFlow PDF to HTML Convertor',
  poweredBy: 'Powered by DocsFlow',

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
  spacingHint: 'Distance between each button (0-50 points, 1pt ≈ 0.35mm)',
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
  textDirectionRtl: 'Text Direction Right-to-Left',
  textDirectionHint: 'RTL for Hebrew, LTR for English',
  selectFontHint: 'Select Noto Sans Hebrew for Hebrew text',
  fontSizeRange: 'Range: 8-24 points (pt)',
  pageLabel: 'Page',
  typeLabel: 'Type',
  widthLabel: 'Width',
  heightLabel: 'Height',

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
