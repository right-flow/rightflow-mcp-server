/**
 * Editor namespace - PDF editor, field operations, settings
 * Used by form editor and field management
 */
export interface EditorTranslations {
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

  // Messages
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

  // Validation
  fieldValidation: string;
  active: string;
  suggestedType: string;
  apply: string;
  validationType: string;
  noValidation: string;
  enableValidation: string;
  validators: string;
  validationMultiHint: string;

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

  // Form Management
  noFormsFound: string;
  createNewForm: string;
  createFirstForm: string;
  searchFormsPlaceholder: string;
  manageFormsDescription: string;
  viewAllFormsCount: string;
  noResultsFor: string;
  viewHistory: string;
  currentDocument: string;
  noFormsYetDescription: string;
  deleteFormConfirm: string;
  noDescription: string;
  onePage: string;
  copyLink: string;
  viewResponses: string;
  fieldsCount: string;
  sendWhatsApp: string;

  // Onboarding
  onboardingTitle: string;
  onboardingCompleted: string;
  onboardingCreateForm: string;
  onboardingCustomize: string;
  onboardingPublish: string;
  onboardingFirstResponse: string;
  onboardingShare: string;

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
}
