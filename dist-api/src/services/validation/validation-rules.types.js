/**
 * TypeScript types for ValidationRules.json schema
 */
/**
 * Display names for field types (Hebrew)
 */
export const FIELD_TYPE_DISPLAY_NAMES = {
    'identity.israeli_id': 'תעודת זהות ישראלית',
    'identity.first_name': 'שם פרטי',
    'identity.last_name': 'שם משפחה',
    'contact.mobile_il': 'טלפון נייד',
    'contact.phone_il': 'טלפון קווי',
    'contact.email': 'דואר אלקטרוני',
    'contact.postal_code_il': 'מיקוד',
    'contact.address': 'כתובת',
    'date.birthdate': 'תאריך לידה',
    'date.signature': 'תאריך חתימה',
    'bank.bank_code': 'קוד בנק',
    'bank.branch_code': 'קוד סניף',
    'bank.account_number': 'מספר חשבון',
    'employment.employer_id': 'מספר מעסיק',
    'employment.salary': 'שכר',
    'insurance.beneficiary_name': 'שם מוטב',
    'insurance.beneficiary_id': 'ת.ז מוטב',
    'insurance.beneficiary_percentage': 'אחוז למוטב',
    'consent.mandatory_checkbox': 'אישור/הצהרה',
};
/**
 * Error messages for validators (Hebrew)
 */
export const VALIDATOR_ERROR_MESSAGES = {
    required: 'שדה חובה',
    digits_only: 'יש להזין ספרות בלבד',
    numeric: 'יש להזין מספר',
    length_min: 'אורך מינימלי: {min} תווים',
    length_between: 'אורך חייב להיות בין {min} ל-{max} תווים',
    length_exact: 'אורך חייב להיות {length} תווים',
    regex: 'פורמט לא תקין',
    israeli_id_checksum: 'מספר תעודת זהות לא תקין',
    valid_date: 'תאריך לא תקין',
    age_between: 'גיל חייב להיות בין {min} ל-{max}',
    not_in_future: 'תאריך לא יכול להיות בעתיד',
    in_list: 'ערך לא תקין',
    greater_than: 'ערך חייב להיות גדול מ-{min}',
    range: 'ערך חייב להיות בין {min} ל-{max}',
    required_checked: 'יש לסמן את התיבה',
    email: 'כתובת אימייל לא תקינה',
    mobile_il: 'מספר נייד לא תקין (05XXXXXXXX)',
};
//# sourceMappingURL=validation-rules.types.js.map