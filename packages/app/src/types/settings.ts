/**
 * Settings type definitions for field defaults
 */

export type CheckboxStyle = 'x' | 'check';
export type RadioOrientation = 'vertical' | 'horizontal';

export interface TextFieldSettings {
  font: string;
  fontSize: number;
  direction: 'ltr' | 'rtl';
}

export interface CheckboxFieldSettings {
  style: CheckboxStyle; // X or checkmark
}

export interface RadioFieldSettings {
  orientation: RadioOrientation;
  defaultButtonCount: number;
  spacing: number;
}

export interface DropdownFieldSettings {
  font: string;
  direction: 'ltr' | 'rtl';
}

export interface SignatureFieldSettings {
  defaultWidth: number; // In PDF points
  defaultHeight: number; // In PDF points
}

export type InsuranceBranch =
  | 'ביטוח אלמנטרי'
  | 'ביטוח חיים'
  | 'ביטוח בריאות'
  | 'פנסיה'
  | 'קופות גמל';

export interface FilenameTemplateSegment {
  type: 'parameter' | 'separator';
  value: string; // parameter name or separator string
}

export interface NamingSettings {
  insuranceCompany: string;
  insuranceBranch: InsuranceBranch;
  formName: string;
  filenameTemplate: FilenameTemplateSegment[];
}

export interface AppSettings {
  textField: TextFieldSettings;
  checkboxField: CheckboxFieldSettings;
  radioField: RadioFieldSettings;
  dropdownField: DropdownFieldSettings;
  signatureField: SignatureFieldSettings;
  naming: NamingSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  textField: {
    font: 'NotoSansHebrew',
    fontSize: 12,
    direction: 'rtl',
  },
  checkboxField: {
    style: 'check',
  },
  radioField: {
    orientation: 'vertical',
    defaultButtonCount: 3,
    spacing: 30,
  },
  dropdownField: {
    font: 'NotoSansHebrew',
    direction: 'rtl',
  },
  signatureField: {
    defaultWidth: 200, // ~70mm
    defaultHeight: 60,  // ~21mm
  },
  naming: {
    insuranceCompany: '',
    insuranceBranch: 'ביטוח אלמנטרי',
    formName: '',
    filenameTemplate: [
      { type: 'parameter', value: 'insuranceCompany' },
      { type: 'separator', value: '_' },
      { type: 'parameter', value: 'insuranceBranch' },
      { type: 'separator', value: '_' },
      { type: 'parameter', value: 'formName' },
    ],
  },
};
