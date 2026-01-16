/**
 * HTML Form Generation Types
 * Types for converting PDF field definitions to HTML forms
 */
/**
 * Default generation options
 */
export const DEFAULT_HTML_GENERATION_OPTIONS = {
    language: 'hebrew',
    rtl: true,
    theme: {
        primaryColor: '#003399',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        spacing: 'normal',
        style: 'modern',
    },
    includeValidation: true,
    generationMethod: 'auto',
    welcomePage: { enabled: true }, // Welcome page enabled by default
};
//# sourceMappingURL=types.js.map