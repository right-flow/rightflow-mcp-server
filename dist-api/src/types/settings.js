/**
 * Settings type definitions for field defaults
 */
export const DEFAULT_SETTINGS = {
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
        defaultHeight: 60, // ~21mm
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
//# sourceMappingURL=settings.js.map