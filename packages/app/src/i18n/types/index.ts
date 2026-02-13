/**
 * Aggregated namespace types
 * Central export for all translation type definitions
 */
export type { CommonTranslations } from './common.types';
export type { DashboardTranslations } from './dashboard.types';
export type { BillingTranslations } from './billing.types';
export type { WorkflowTranslations } from './workflow.types';
export type { EditorTranslations } from './editor.types';
export type { HelpTranslations } from './help.types';


import type { CommonTranslations } from './common.types';
import type { DashboardTranslations } from './dashboard.types';
import type { BillingTranslations } from './billing.types';
import type { WorkflowTranslations } from './workflow.types';
import type { EditorTranslations } from './editor.types';
import type { HelpTranslations } from './help.types';

/**
 * All available namespaces
 */
export type TranslationNamespace =
  | 'common'
  | 'dashboard'
  | 'billing'
  | 'workflow'
  | 'editor'
  | 'help';

/**
 * Namespace to type mapping
 */
export interface NamespaceTypeMap {
  common: CommonTranslations;
  dashboard: DashboardTranslations;
  billing: BillingTranslations;
  workflow: WorkflowTranslations;
  editor: EditorTranslations;
  help: HelpTranslations;
}

/**
 * Get translation type for a specific namespace
 */
export type NamespaceTranslations<N extends TranslationNamespace> = NamespaceTypeMap[N];

/**
 * Supported languages
 */
export type Language = 'he' | 'en' | 'ar';

/**
 * Language configuration
 */
export interface LanguageConfig {
  name: string;
  direction: 'rtl' | 'ltr';
  locale: string;
}

/**
 * Language configurations
 */
export const languageConfig: Record<Language, LanguageConfig> = {
  he: { name: 'עברית', direction: 'rtl', locale: 'he-IL' },
  en: { name: 'English', direction: 'ltr', locale: 'en-US' },
  ar: { name: 'العربية', direction: 'rtl', locale: 'ar-SA' },
};
