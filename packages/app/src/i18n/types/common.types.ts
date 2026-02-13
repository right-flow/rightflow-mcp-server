/**
 * Common namespace - shared UI elements across all features
 * Includes: actions, navigation, language, theme, PWA
 */
export interface CommonTranslations {
  // Header
  appTitle: string;
  poweredBy: string;

  // Common actions
  save: string;
  cancel: string;
  delete: string;
  confirm: string;
  close: string;
  add: string;
  remove: string;
  edit: string;
  loading: string;
  tryAgain: string;
  yes: string;
  no: string;
  true: string;
  false: string;
  clearSearch: string;

  // Navigation & Common UI
  overview: string;
  myForms: string;
  analytics: string;
  responses: string;
  automation: string;
  teamManagement: string;
  billing: string;
  settingsTitle: string;
  helpCenter: string;
  untitledForm: string;

  // Language names
  language: string;
  hebrew: string;
  english: string;
  arabic: string;

  // Theme
  darkMode: string;
  lightMode: string;

  // Landing page
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

  // Offline/PWA
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
  syncing: string;

  // PWA/Update
  pwaNewVersionTitle: string;
  pwaNewVersionMessage: string;
  pwaOfflineReady: string;
  pwaRegistered: string;
  pwaRegistrationError: string;

  // Language Auto Detect
  autoDetectTitle: string;
  autoDetectMessage: string;
  autoDetectDontAskAgain: string;

  // Dashboard Miscellaneous (shared)
  backToDashboard: string;
  backToSettings: string;
  loadingDashboard: string;
  freePlan: string;
  publish: string;
  publishing: string;
  draft: string;
  published: string;
  archived: string;
  export: string;
}
