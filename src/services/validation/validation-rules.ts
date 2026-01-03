/**
 * Validation Rules Configuration
 * Based on Documents/Planning/Validation_Rules/ValidationRules.json
 */

import type { ValidationRulesConfig } from './validation-rules.types';

/**
 * Validation rules for Israeli form fields
 * Each field type has label patterns to match and validators to apply
 */
export const validationRules: ValidationRulesConfig = {
  version: '1.0.0',
  fieldTypes: {
    'identity.israeli_id': {
      labelPatterns: ['תעודת זהות', 'ת.ז', 'מספר זהות', 'ת"ז'],
      htmlTypes: ['text'],
      validators: [
        'required',
        'digits_only',
        { name: 'length_between', params: { min: 8, max: 9 } },
        'pad_id_to_9',
        'israeli_id_checksum',
      ],
    },
    'identity.first_name': {
      labelPatterns: ['שם פרטי', 'שם המבוטח', 'שם העמית'],
      htmlTypes: ['text'],
      validators: [
        'required',
        { name: 'length_min', params: { min: 2 } },
        { name: 'regex', params: { pattern: "^[א-תA-Za-z '\\-]+$" } },
      ],
    },
    'identity.last_name': {
      labelPatterns: ['שם משפחה'],
      htmlTypes: ['text'],
      validators: [
        'required',
        { name: 'length_min', params: { min: 2 } },
        { name: 'regex', params: { pattern: "^[א-תA-Za-z '\\-]+$" } },
      ],
    },
    'contact.mobile_il': {
      labelPatterns: ['טלפון נייד', 'מספר נייד', 'פלאפון', 'נייד'],
      htmlTypes: ['tel', 'text'],
      validators: [
        'required',
        'digits_only',
        { name: 'regex', params: { pattern: '^05[0-9]{8}$' } },
      ],
    },
    'contact.phone_il': {
      labelPatterns: ['טלפון', 'טלפון קווי', 'מספר טלפון נוסף'],
      htmlTypes: ['tel', 'text'],
      validators: [
        'digits_only',
        { name: 'length_between', params: { min: 9, max: 10 } },
      ],
    },
    'contact.email': {
      labelPatterns: ['דואר אלקטרוני', 'אימייל', 'Email', 'כתובת מייל', 'מייל'],
      htmlTypes: ['email', 'text'],
      validators: [
        'required',
        { name: 'regex', params: { pattern: '^\\S+@\\S+\\.\\S+$' } },
      ],
    },
    'contact.postal_code_il': {
      labelPatterns: ['מיקוד'],
      htmlTypes: ['text'],
      validators: [
        'digits_only',
        { name: 'length_exact', params: { length: 7 } },
      ],
    },
    'contact.address': {
      labelPatterns: ['כתובת', 'רחוב'],
      htmlTypes: ['text'],
      validators: [
        'required',
        { name: 'length_min', params: { min: 3 } },
      ],
    },
    'date.birthdate': {
      labelPatterns: ['תאריך לידה', 'ת. לידה'],
      htmlTypes: ['date', 'text'],
      validators: [
        'required',
        'valid_date',
        { name: 'age_between', params: { min: 18, max: 120 } },
      ],
    },
    'date.signature': {
      labelPatterns: ['תאריך חתימה', 'תאריך ההצהרה', 'תאריך'],
      htmlTypes: ['date', 'text'],
      validators: ['required', 'valid_date', 'not_in_future'],
    },
    'bank.bank_code': {
      labelPatterns: ['בנק', 'קוד בנק', 'מספר בנק'],
      htmlTypes: ['text', 'number', 'select'],
      validators: [
        'required',
        'digits_only',
        { name: 'in_list', params: { listName: 'il_bank_codes' } },
      ],
    },
    'bank.branch_code': {
      labelPatterns: ['סניף', 'קוד סניף', 'מספר סניף'],
      htmlTypes: ['text', 'number'],
      validators: [
        'required',
        'digits_only',
        { name: 'length_between', params: { min: 3, max: 4 } },
      ],
    },
    'bank.account_number': {
      labelPatterns: ['מספר חשבון', 'חשבון בנק'],
      htmlTypes: ['text', 'number'],
      validators: [
        'required',
        'digits_only',
        { name: 'length_between', params: { min: 6, max: 10 } },
      ],
    },
    'employment.employer_id': {
      labelPatterns: ['מספר מעסיק', 'ח.פ. מעסיק', 'עוסק מורשה', 'ח.פ'],
      htmlTypes: ['text'],
      validators: [
        'required',
        'digits_only',
        { name: 'length_between', params: { min: 8, max: 9 } },
      ],
    },
    'employment.salary': {
      labelPatterns: ['שכר מבוטח', 'שכר', 'שכר קובע', 'משכורת'],
      htmlTypes: ['text', 'number'],
      validators: [
        'required',
        'numeric',
        { name: 'greater_than', params: { min: 0 } },
      ],
    },
    'insurance.beneficiary_name': {
      labelPatterns: ['שם מוטב', 'שם המוטב'],
      htmlTypes: ['text'],
      validators: [
        'required',
        { name: 'length_min', params: { min: 2 } },
      ],
    },
    'insurance.beneficiary_id': {
      labelPatterns: ['ת.ז מוטב', 'תעודת זהות מוטב', 'מספר זהות מוטב'],
      htmlTypes: ['text'],
      validators: [
        'required',
        'digits_only',
        { name: 'length_between', params: { min: 8, max: 9 } },
        'pad_id_to_9',
        'israeli_id_checksum',
      ],
    },
    'insurance.beneficiary_percentage': {
      labelPatterns: ['אחוז', 'שיעור', '% למוטב', 'אחוז למוטב'],
      htmlTypes: ['text', 'number'],
      validators: [
        'required',
        'numeric',
        { name: 'range', params: { min: 0, max: 100 } },
      ],
    },
    'consent.mandatory_checkbox': {
      labelPatterns: ['אני מאשר', 'אני מצהיר', 'קראתי ואני מסכים', 'אני מסכים'],
      htmlTypes: ['checkbox'],
      validators: ['required_checked'],
    },
  },
};

/**
 * Get all field type IDs
 */
export function getFieldTypeIds(): string[] {
  return Object.keys(validationRules.fieldTypes);
}

/**
 * Get field type definition by ID
 */
export function getFieldTypeById(fieldTypeId: string) {
  return validationRules.fieldTypes[fieldTypeId] || null;
}
