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
  teamManagement: string;
  billing: string;
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
