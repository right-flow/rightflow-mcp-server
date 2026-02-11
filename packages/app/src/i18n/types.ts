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
  'common.loading': string;
  'common.tryAgain': string;
  'common.yes': string;
  'common.no': string;
  'common.true': string;
  'common.false': string;
  'common.clearSearch': string;

  // Navigation & Common UI (Used in Dashboard Sidebar)
  overview: string;
  myForms: string;
  analytics: string;
  responses: string;
  automation: string;
  teamManagement: string;
  billing: string;
  settingsTitle: string; // Renamed to avoid 'settings' collision
  helpCenter: string;
  untitledForm: string;

  // Language names
  language: string;
  hebrew: string;
  english: string;
  arabic: string;
  featuresLabel: string;
  useCasesLabel: string;
  integrationsLabel: string;
  loginLabel: string;
  getStarted: string;
  heroTitle: string;
  heroSubtitle: string;
  viewDemo: string;
  satisfiedTeams: string;
  trulyIntelligentForms: string;
  offlineReady: string;
  rightToolsForField: string;
  builtFromScratch: string;
  anyNicheAnywhere: string;
  readUseCase: string;
  connectToYourWorld: string;
  streamDataDirectly: string;
  socialProofTitle: string;
  readyToGoPaperless: string;
  joinMobileFirst: string;
  contactUs: string;
  noCreditCard: string;

  // Theme
  darkMode: string;
  lightMode: string;

  // Dashboard Page & Initialization
  'dashboard.header.search': string;
  'dashboard.loading': string;
  'dashboard.loadingDashboard': string;
  'dashboard.errorLoadingProfile': string;
  'dashboard.welcome.title': string;
  'dashboard.welcome.description': string;
  'dashboard.welcome.createOrg': string;
  'dashboard.sidebar.version': string;
  'dashboard.sidebar.upgradeNow': string;
  'dashboard.sidebar.smartFormManagement': string;
  'dashboard.sidebar.packageUsage': string;
  'dashboard.sidebar.forms': string;
  'dashboard.sidebar.submissions': string;
  'dashboard.sidebar.storage': string;
  'dashboard.error.formsLimit': string;
  'dashboard.error.submissionsLimit': string;
  'dashboard.error.storageLimit': string;
  'dashboard.errors.failedToLoadForms': string;
  'dashboard.errors.failedToCreateForm': string;
  'dashboard.errors.generic': string;

  // Dashboard Stats
  'dashboard.stats.totalSubmissions': string;
  'dashboard.stats.monthlyViews': string;
  'dashboard.stats.activeForms': string;
  'dashboard.stats.completedForms': string;
  'dashboard.stats.completionRate': string;
  'dashboard.stats.conversionRate': string;
  'dashboard.stats.avgResponseTime': string;
  'dashboard.stats.growth': string;
  'dashboard.stats.sinceLastMonth': string;

  // Admin Dashboard
  'dashboard.admin.totalOrganizations': string;
  'dashboard.admin.systemHealth': string;
  'dashboard.admin.activeUsers': string;
  'dashboard.admin.newSubmissions': string;
  'dashboard.admin.completionRate': string;
  'dashboard.admin.pendingApprovals': string;
  'dashboard.admin.usageTrends': string;
  'dashboard.admin.recentActivity': string;
  'dashboard.admin.formPerformance': string;
  'dashboard.header.sendFormLink': string;
  'dashboard.sidebar.ofQuota': string;
  'dashboard.formPerformance.title': string;
  'dashboard.recentActivity.title': string;
  'dashboard.usageTrends.title': string;
  'dashboard.usageTrends.dateRange': string;
  'dashboard.usageTrends.exportReport': string;

  // Demo data - Recent Activity
  'dashboard.demo.activity.formCompleted': string;
  'dashboard.demo.activity.formCompletedBy': string;
  'dashboard.demo.activity.linkSent': string;
  'dashboard.demo.activity.linkSentDetails': string;
  'dashboard.demo.activity.automationUpdate': string;
  'dashboard.demo.activity.automationDetails': string;

  // Activity titles (i18n-compatible)
  'dashboard.activity.submitted': string;
  'dashboard.activity.approved': string;
  'dashboard.activity.rejected': string;
  'dashboard.activity.draft': string;
  'dashboard.activity.anonymousUser': string;

  // Demo data - Form Performance
  'dashboard.demo.forms.serviceJoin': string;
  'dashboard.demo.forms.techSupport': string;
  'dashboard.demo.forms.satisfaction': string;
  'dashboard.demo.forms.jobApplication': string;

  // Months
  'dashboard.months.january': string;
  'dashboard.months.february': string;
  'dashboard.months.march': string;
  'dashboard.months.april': string;
  'dashboard.months.may': string;
  'dashboard.months.june': string;
  'dashboard.months.july': string;
  'dashboard.months.august': string;
  'dashboard.months.september': string;
  'dashboard.months.october': string;
  'dashboard.months.november': string;
  'dashboard.months.december': string;

  // Greetings & Role specific
  'dashboard.greeting.morning': string;
  'dashboard.greeting.afternoon': string;
  'dashboard.greeting.evening': string;
  'dashboard.greeting.defaultUser': string;
  'dashboard.greeting.adminMessage': string;
  'dashboard.greeting.managerMessage': string;
  'dashboard.greeting.workerMessage': string;
  'dashboard.role.admin': string;
  'dashboard.role.manager': string;
  'dashboard.role.worker': string;
  'dashboard.role.user': string;

  // My Forms Widget
  'dashboard.myForms.title': string;
  'dashboard.myForms.pending': string;
  'dashboard.myForms.pendingCount': string;
  'dashboard.myForms.completed': string;
  'dashboard.myForms.overdue': string;
  'dashboard.myForms.noForms': string;
  'dashboard.myForms.completedRecently': string;
  'dashboard.myForms.viewAll': string;
  'dashboard.myForms.daily': string;
  'dashboard.myForms.weekly': string;
  'dashboard.myForms.monthly': string;
  'dashboard.myForms.once': string;
  'dashboard.myForms.soon': string;
  'dashboard.myForms.inHours': string;
  'dashboard.myForms.inDays': string;
  'dashboard.myForms.overduePast': string;

  // Shared Widget Status & Time
  'dashboard.status.pending': string;
  'dashboard.status.approved': string;
  'dashboard.status.rejected': string;
  'dashboard.time.now': string;
  'dashboard.time.ago': string;
  'dashboard.time.mins': string;
  'dashboard.time.hours': string;
  'dashboard.time.days': string;
  'dashboard.common.viewAll': string;
  loadingDashboard: string; // Added for compatibility with some components

  // Widgets
  'dashboard.widgets.recentSubmissions.title': string;
  'dashboard.widgets.recentSubmissions.empty': string;
  'dashboard.widgets.quickActions.title': string;
  'dashboard.widgets.quickActions.newForm': string;
  'dashboard.widgets.quickActions.newFormDesc': string;
  'dashboard.widgets.quickActions.responses': string;
  'dashboard.widgets.quickActions.responsesDesc': string;
  'dashboard.widgets.quickActions.myForms': string;
  'dashboard.widgets.quickActions.myFormsDesc': string;
  'dashboard.widgets.teamPerformance.title': string;
  'dashboard.widgets.teamPerformance.weeklySubmissions': string;
  'dashboard.widgets.teamPerformance.avgPerPerson': string;
  'dashboard.widgets.teamPerformance.topPerformer': string;
  'dashboard.widgets.teamPerformance.teamMembers': string;
  'dashboard.widgets.teamPerformance.today': string;
  'dashboard.widgets.pendingApprovals.title': string;
  'dashboard.widgets.pendingApprovals.urgent': string;
  'dashboard.widgets.pendingApprovals.low': string;
  'dashboard.widgets.pendingApprovals.approvedToday': string;
  'dashboard.widgets.pendingApprovals.rejectedToday': string;
  'dashboard.widgets.pendingApprovals.empty': string;
  'dashboard.widgets.pendingApprovals.viewAll': string;
  'dashboard.widgets.userManagement.title': string;
  'dashboard.widgets.userManagement.invite': string;
  'dashboard.widgets.userManagement.admins': string;
  'dashboard.widgets.userManagement.managers': string;
  'dashboard.widgets.userManagement.workers': string;
  'dashboard.widgets.userManagement.empty': string;
  'dashboard.widgets.userManagement.removeUser.title': string;
  'dashboard.widgets.userManagement.removeUser.confirm': string;
  'dashboard.widgets.userManagement.removeUser.description': string;
  'dashboard.widgets.userManagement.removeUser.removing': string;
  'dashboard.widgets.userManagement.removeUser.error': string;
  'dashboard.widgets.userManagement.noName': string;
  'dashboard.widgets.userManagement.addUser.title': string;
  'dashboard.widgets.userManagement.addUser.emailLabel': string;
  'dashboard.widgets.userManagement.addUser.roleLabel': string;
  'dashboard.widgets.userManagement.addUser.emailRequired': string;
  'dashboard.widgets.userManagement.addUser.error': string;
  'dashboard.widgets.userManagement.addUser.success': string;
  'dashboard.widgets.userManagement.addUser.sending': string;
  'dashboard.widgets.userManagement.addUser.send': string;
  'dashboard.widgets.userManagement.editRole.title': string;
  'dashboard.widgets.userManagement.editRole.saving': string;
  'dashboard.widgets.userManagement.editRole.save': string;
  'dashboard.widgets.userManagement.editRole.error': string;

  // Messages (Restored from previous)
  noPdfLoaded: string;
  noFieldsToSave: string;
  noFieldsToExport: string;
  pdfLoadError: string;
  invalidPdfFile: string;
  fieldsFound: string;
  fieldsImported: string;
  downloadSuccess: string;

  // Settings Panel
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

  // Field List & Sections
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
  addSection: string;
  renameSection: string;
  deleteSection: string;
  ungrouped: string;

  // Field Properties
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

  // Static Text
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

  // Recovery & Dialogs
  recoveryTitle: string;
  recoveryMessage: string;
  restore: string;
  discard: string;
  uploadWarningTitle: string;
  uploadWarningMessage: string;
  newDocument: string;
  newVersion: string;
  deleteConfirmMessage: string;

  // AI & HTML
  aiExtractionTitle: string;
  aiExtractionInProgress: string;
  aiExtractionSuccess: string;
  aiExtractionError: string;
  replaceOrMerge: string;
  replace: string;
  merge: string;
  htmlPreviewTitle: string;
  downloadHtml: string;
  copyHtml: string;
  copied: string;
  reprocessPage: string;
  reprocessConfirm: string;
  reprocessSuccess: string;

  // Multi-edit
  multiEdit: string;
  fieldsSelected: string;
  fieldTypes: string;
  willUpdateAllFields: string;
  textProperties: string;
  appliesToTextFieldsOnly: string;
  appliesToRadioFieldsOnly: string;
  mixed: string;
  multiSelectTip: string;

  // Sidebar Tabs
  extractedFields: string;
  jsonView: string;
  documentHistory: string;
  jsonReadOnly: string;
  copyJson: string;
  jsonCopied: string;
  noFieldsForJson: string;
  sortRTL: string;
  sorted: string;
  sortByPosition: string;
  showOriginalOrder: string;

  // Document History
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

  // Validation & Bull/Workflow
  fieldValidation: string;
  active: string;
  suggestedType: string;
  apply: string;
  validationType: string;
  noValidation: string;
  enableValidation: string;
  validators: string;
  validationMultiHint: string;

  // Dashboard Miscellaneous
  backToDashboard: string;
  backToSettings: string;
  noFormsFound: string;
  createNewForm: string;
  createFirstForm: string;
  searchFormsPlaceholder: string;
  manageFormsDescription: string;
  freePlan: string;
  viewAllFormsCount: string;
  noResultsFor: string;
  viewHistory: string;
  publish: string;
  publishing: string;
  currentDocument: string;
  draft: string;
  published: string;
  archived: string;
  export: string;

  // Conditional Logic (Workflow)
  conditionalLogic: string;
  addRule: string;
  when: string;
  equals: string;
  notEquals: string;
  // contains: string; // Already defined above
  isEmpty: string;
  isNotEmpty: string;
  then: string;
  show: string;
  hide: string;
  require: string;
  unrequire: string;
  // selectField: string; // Already defined above
  // enterValue: string; // Already defined above
  and: string;
  or: string;
  defaultVisibility: string;
  visible: string;
  hidden: string;
  noRules: string;

  // Offline/PWA (Legacy items used by some logic)
  online: string;
  offline: string;
  pendingItems: string;
  syncNow: string;
  syncNowLower?: string;
  syncError: string;
  lastSynced: string;
  noConnection: string;
  connectionRestored: string;
  itemsWaitingToSync: string;

  // WhatsApp Widget
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

  // Onboarding
  onboardingTitle: string;
  onboardingCompleted: string;
  onboardingCreateForm: string;
  onboardingCustomize: string;
  onboardingPublish: string;
  onboardingFirstResponse: string;
  onboardingShare: string;

  // Form Management (Additional)
  noFormsYetDescription: string;
  deleteFormConfirm: string;
  noDescription: string;
  onePage: string;
  copyLink: string;
  viewResponses: string;
  fieldsCount: string;
  sendWhatsApp: string;

  // Workflow (Additional)
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

  // Workflow Template
  'workflow.template.gallery': string;
  'workflow.template.searchPlaceholder': string;
  'workflow.template.allCategories': string;
  'workflow.template.category.all': string;
  'workflow.template.category.approval': string;
  'workflow.template.category.dataCollection': string;
  'workflow.template.category.data-collection': string;
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
  'workflow.template.sort.mostUsed': string;
  'workflow.template.sort.leastUsed': string;
  'workflow.template.sort.newest': string;
  'workflow.template.sort.oldest': string;
  'workflow.template.sort.nameAZ': string;
  'workflow.template.sort.nameZA': string;
  'workflow.template.viewGrid': string;
  'workflow.template.viewList': string;
  'workflow.template.used': string;
  'workflow.template.times': string;
  'workflow.template.useTemplate': string;
  'workflow.template.exportTemplate': string;
  'workflow.template.deleteTemplate': string;
  'workflow.template.importTemplate': string;
  'workflow.template.search': string;
  'workflow.template.noTemplates': string;
  'workflow.template.noResults': string;
  'workflow.template.empty': string;
  'workflow.template.system': string;
  'workflow.template.storageUsed': string;
  'workflow.template.storageWarning': string;

  // Workflow Condition (Builder)
  'workflow.condition.rootGroup': string;
  'workflow.condition.nestedGroup': string;
  'workflow.condition.addCondition': string;
  'workflow.condition.addGroup': string;
  'workflow.condition.operator.eq': string;
  'workflow.condition.operator.ne': string;
  'workflow.condition.operator.gt': string;
  'workflow.condition.operator.lt': string;
  'workflow.condition.operator.gte': string;
  'workflow.condition.operator.lte': string;
  'workflow.condition.operator.contains': string;
  'workflow.condition.operator.exists': string;
  'workflow.condition.operator.in': string;
  'workflow.condition.operator.notIn': string;
  'workflow.condition.selectField': string;
  'workflow.condition.enterValue': string;

  // Language Auto Detect
  'language.autoDetect.title': string;
  'language.autoDetect.message': string;
  'language.autoDetect.dontAskAgain': string;

  // PWA/Update
  pwaNewVersionTitle: string;
  pwaNewVersionMessage: string;
  pwaOfflineReady: string;
  pwaRegistered: string;
  pwaRegistrationError: string;
  syncing: string;
  // Placeholder keys for compatibility
  contains: string;
  selectField: string;
  enterValue: string;
}
