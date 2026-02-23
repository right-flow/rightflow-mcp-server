# RightFlow MCP Server - API Reference

**Version:** 1.0.0
**Last Updated:** 2026-02-23
**Protocol:** Model Context Protocol (MCP)

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Tools Reference](#tools-reference)
  - [list_templates](#list_templates)
  - [get_template_fields](#get_template_fields)
  - [fill_pdf](#fill_pdf)
  - [list_categories](#list_categories)
- [Resources Reference](#resources-reference)
- [Type Definitions](#type-definitions)
- [Validation Rules](#validation-rules)
- [Hebrew/RTL Considerations](#hebrewrtl-considerations)

---

## Overview

The RightFlow MCP Server provides 4 tools and 2 resources for professional Hebrew PDF generation through the Model Context Protocol (MCP). All tools communicate with the RightFlow backend API at `http://localhost:3003/api/v1`.

### Base Configuration

```typescript
{
  apiUrl: string;        // Default: http://localhost:3003/api/v1
  apiKey: string;        // Required: RightFlow API key
  timeout: number;       // Default: 30000ms
  language: 'he' | 'en'; // Default: 'he'
}
```

---

## Authentication

All API requests require authentication via Bearer token.

### Headers

```http
Authorization: Bearer <RIGHTFLOW_API_KEY>
Content-Type: application/json
```

### Error Response (401 Unauthorized)

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

---

## Error Handling

### Standard Error Response Format

```typescript
interface ErrorResponse {
  error: string;           // Error type
  message: string;         // Human-readable message
  code?: string;           // Optional error code
  details?: unknown;       // Optional additional details
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_INPUT` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 404 | `NOT_FOUND` | Template or resource not found |
| 422 | `VALIDATION_ERROR` | Field validation failed |
| 429 | `RATE_LIMIT` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server-side error |
| 503 | `SERVICE_UNAVAILABLE` | Backend service unavailable |

### Error Handling Best Practices

```typescript
try {
  const result = await fillPdf({
    template_id: 'employment-contract-1',
    data: { /* ... */ }
  });
} catch (error) {
  if (error.response?.status === 404) {
    console.error('Template not found');
  } else if (error.response?.status === 400) {
    console.error('Invalid data:', error.response.data.details);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

## Tools Reference

### list_templates

List available PDF templates with optional filtering.

#### Input Schema

```typescript
interface ListTemplatesInput {
  category?: 'legal' | 'accounting' | 'hr' | 'real_estate' | 'general';
  search?: string;        // Search in name, name_he, description
  language?: 'he' | 'en'; // Default: 'he'
}
```

#### Output Schema

```typescript
interface ListTemplatesOutput {
  templates: Array<{
    id: string;                // Template unique identifier
    name: string;              // English name
    name_he: string;           // Hebrew name
    category: string;          // Category identifier
    description: string;       // English description
    description_he: string;    // Hebrew description
  }>;
  total: number;               // Total count of templates
}
```

#### Examples

**List all templates:**
```json
// Input
{}

// Output
{
  "templates": [
    {
      "id": "employment-contract-1",
      "name": "Employment Contract",
      "name_he": "חוזה עבודה",
      "category": "hr",
      "description": "Standard employment contract",
      "description_he": "חוזה עבודה סטנדרטי"
    }
  ],
  "total": 15
}
```

**Filter by category:**
```json
// Input
{
  "category": "hr"
}

// Output
{
  "templates": [ /* HR templates only */ ],
  "total": 5
}
```

**Search templates:**
```json
// Input
{
  "search": "contract"
}

// Output
{
  "templates": [ /* Templates matching "contract" */ ],
  "total": 3
}
```

**Hebrew search:**
```json
// Input
{
  "search": "עבודה"
}

// Output
{
  "templates": [ /* Templates matching "עבודה" */ ],
  "total": 2
}
```

#### Error Cases

| Status | Scenario | Response |
|--------|----------|----------|
| 400 | Invalid category value | `{ "error": "Invalid category" }` |
| 401 | Missing API key | `{ "error": "Unauthorized" }` |
| 500 | Backend error | `{ "error": "Internal server error" }` |

---

### get_template_fields

Retrieve field definitions for a specific template.

#### Input Schema

```typescript
interface GetTemplateFieldsInput {
  template_id: string;    // Required: Template identifier
  language?: 'he' | 'en'; // Default: 'he'
}
```

#### Output Schema

```typescript
interface GetTemplateFieldsOutput {
  id: string;                    // Template identifier
  name: string;                  // English template name
  name_he: string;               // Hebrew template name
  category: string;              // Category identifier
  description: string;           // English description
  description_he: string;        // Hebrew description
  fields: Array<{
    id: string;                  // Field identifier
    name: string;                // English field name
    name_he: string;             // Hebrew field name
    type: 'text' | 'number' | 'date' | 'textarea';
    required: boolean;           // Is field required?
    validation?: {
      pattern?: string;          // Regex pattern
      min?: number;              // Minimum value (number/date)
      max?: number;              // Maximum value (number/date)
      minLength?: number;        // Minimum string length
      maxLength?: number;        // Maximum string length
      validator?: string;        // Custom validator name
    };
    placeholder?: string;        // English placeholder
    placeholder_he?: string;     // Hebrew placeholder
    defaultValue?: string | number; // Default value
  }>;
}
```

#### Examples

**Get template fields:**
```json
// Input
{
  "template_id": "employment-contract-1"
}

// Output
{
  "id": "employment-contract-1",
  "name": "Employment Contract",
  "name_he": "חוזה עבודה",
  "category": "hr",
  "description": "Standard employment contract",
  "description_he": "חוזה עבודה סטנדרטי",
  "fields": [
    {
      "id": "employeeName",
      "name": "Employee Name",
      "name_he": "שם העובד",
      "type": "text",
      "required": true,
      "validation": {
        "minLength": 2,
        "maxLength": 100
      },
      "placeholder": "Full name",
      "placeholder_he": "שם מלא"
    },
    {
      "id": "employeeId",
      "name": "Employee ID",
      "name_he": "תעודת זהות",
      "type": "text",
      "required": true,
      "validation": {
        "pattern": "^\\d{9}$",
        "validator": "israeliId"
      },
      "placeholder": "9 digits",
      "placeholder_he": "9 ספרות"
    },
    {
      "id": "salary",
      "name": "Monthly Salary",
      "name_he": "שכר חודשי",
      "type": "number",
      "required": true,
      "validation": {
        "min": 0,
        "max": 1000000
      },
      "placeholder": "Amount in ILS",
      "placeholder_he": "סכום בשקלים"
    },
    {
      "id": "startDate",
      "name": "Start Date",
      "name_he": "תאריך התחלה",
      "type": "date",
      "required": true,
      "placeholder": "YYYY-MM-DD",
      "placeholder_he": "שנה-חודש-יום"
    }
  ]
}
```

#### Validation Rules

**Built-in Validators:**

| Validator | Description | Pattern |
|-----------|-------------|---------|
| `israeliId` | Israeli ID (9 digits with checksum) | `^\d{9}$` |
| `email` | Email address | RFC 5322 compliant |
| `phone` | Israeli phone number | `^0\d{1,2}-?\d{7}$` |
| `businessId` | Israeli business ID (9 digits) | `^\d{9}$` |
| `zipCode` | Israeli postal code (7 digits) | `^\d{7}$` |

#### Error Cases

| Status | Scenario | Response |
|--------|----------|----------|
| 400 | Missing template_id | `{ "error": "Missing required parameter: template_id" }` |
| 404 | Template not found | `{ "error": "Template not found", "template_id": "..." }` |
| 401 | Unauthorized | `{ "error": "Unauthorized" }` |

---

### fill_pdf

Generate a filled PDF from a template with Hebrew text support.

#### Input Schema

```typescript
interface FillPdfInput {
  template_id: string;           // Required: Template identifier
  data: Record<string, string | number>; // Required: Field values
  file_name?: string;            // Optional: Custom filename
  language?: 'he' | 'en';        // Default: 'he'
}
```

#### Output Schema

```typescript
interface FillPdfOutput {
  success: boolean;              // Generation success status
  pdf: string;                   // Base64-encoded PDF content
  fileName: string;              // Generated filename
  metadata: {
    templateId: string;          // Template used
    fieldsFilled: number;        // Number of fields filled
    errors: string[];            // Field-level errors (if any)
    warnings?: string[];         // Non-blocking warnings
    generatedAt: string;         // ISO timestamp
    fileSize?: number;           // PDF size in bytes
  };
}
```

#### Examples

**Generate employment contract:**
```json
// Input
{
  "template_id": "employment-contract-1",
  "data": {
    "employeeName": "יוסי כהן",
    "employeeId": "123456789",
    "salary": "25000",
    "startDate": "2024-03-01",
    "position": "מפתח סניור",
    "department": "פיתוח"
  },
  "file_name": "contract-yossi-cohen"
}

// Output
{
  "success": true,
  "pdf": "JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwov...",
  "fileName": "contract-yossi-cohen.pdf",
  "metadata": {
    "templateId": "employment-contract-1",
    "fieldsFilled": 6,
    "errors": [],
    "warnings": [],
    "generatedAt": "2024-03-01T14:30:00.000Z",
    "fileSize": 125840
  }
}
```

**Hebrew with nikud (vowel marks):**
```json
// Input
{
  "template_id": "tax-invoice-1",
  "data": {
    "customerName": "יוֹסֵף כֹּהֵן",
    "amount": "5000"
  }
}

// Output
{
  "success": true,
  "pdf": "...",
  "fileName": "tax-invoice-1-filled.pdf",
  "metadata": {
    "templateId": "tax-invoice-1",
    "fieldsFilled": 2,
    "errors": [],
    "generatedAt": "2024-03-01T14:35:00.000Z"
  }
}
```

**Mixed Hebrew/English:**
```json
// Input
{
  "template_id": "employment-contract-1",
  "data": {
    "employeeName": "John Cohen (ג'ון כהן)",
    "email": "john.cohen@example.com",
    "salary": "30000"
  }
}

// Output
{
  "success": true,
  "pdf": "...",
  "fileName": "employment-contract-1-filled.pdf",
  "metadata": {
    "templateId": "employment-contract-1",
    "fieldsFilled": 3,
    "errors": [],
    "generatedAt": "2024-03-01T14:40:00.000Z"
  }
}
```

**Validation errors:**
```json
// Input
{
  "template_id": "employment-contract-1",
  "data": {
    "employeeName": "יוסי",
    "employeeId": "invalid",
    "salary": "-5000"
  }
}

// Output (HTTP 422)
{
  "success": false,
  "pdf": "",
  "fileName": "",
  "metadata": {
    "templateId": "employment-contract-1",
    "fieldsFilled": 0,
    "errors": [
      "employeeId: Invalid Israeli ID format (expected 9 digits)",
      "salary: Value must be non-negative"
    ],
    "generatedAt": "2024-03-01T14:45:00.000Z"
  }
}
```

#### Field Value Types

**Text Fields:**
- Accept: `string`
- Hebrew support: Full Unicode support including nikud
- Max length: 2000 characters (configurable per field)
- Validation: Pattern matching, min/max length

**Number Fields:**
- Accept: `number` or numeric `string`
- Validation: min/max values
- Format: Decimal separator supported (`.` or `,`)

**Date Fields:**
- Accept: `string` in format `YYYY-MM-DD`
- Validation: Valid date, min/max range
- Display: Formatted according to language setting

**Textarea Fields:**
- Accept: `string`
- Hebrew support: Multiline RTL text
- Max length: 10000 characters (configurable)

#### Error Cases

| Status | Scenario | Response |
|--------|----------|----------|
| 400 | Missing template_id | `{ "error": "Missing required field: template_id" }` |
| 400 | Empty data object | `{ "error": "Missing required fields" }` |
| 404 | Template not found | `{ "error": "Template not found" }` |
| 422 | Validation failed | `{ "success": false, "metadata": { "errors": [...] } }` |
| 401 | Unauthorized | `{ "error": "Unauthorized" }` |
| 500 | PDF generation failed | `{ "error": "PDF generation failed", "details": "..." }` |

---

### list_categories

List all template categories with template counts.

#### Input Schema

```typescript
interface ListCategoriesInput {
  // No parameters required
}
```

#### Output Schema

```typescript
interface ListCategoriesOutput {
  categories: Array<{
    id: string;                // Category identifier
    name: string;              // English name
    name_he: string;           // Hebrew name
    description: string;       // English description
    description_he: string;    // Hebrew description
    count: number;             // Number of templates in category
    icon?: string;             // Optional icon identifier
  }>;
  total: number;               // Total number of categories
}
```

#### Examples

**List all categories:**
```json
// Input
{}

// Output
{
  "categories": [
    {
      "id": "hr",
      "name": "HR & Employment",
      "name_he": "משאבי אנוש ותעסוקה",
      "description": "Employment contracts, NDAs, termination letters",
      "description_he": "חוזי עבודה, הסכמי סודיות, מכתבי פיטורים",
      "count": 5,
      "icon": "briefcase"
    },
    {
      "id": "accounting",
      "name": "Accounting & Finance",
      "name_he": "חשבונאות ופיננסים",
      "description": "Tax invoices, receipts, expense reports",
      "description_he": "חשבוניות מס, קבלות, דוחות הוצאות",
      "count": 4,
      "icon": "calculator"
    },
    {
      "id": "legal",
      "name": "Legal Documents",
      "name_he": "מסמכים משפטיים",
      "description": "Contracts, agreements, legal notices",
      "description_he": "חוזים, הסכמים, הודעות משפטיות",
      "count": 3,
      "icon": "gavel"
    },
    {
      "id": "real_estate",
      "name": "Real Estate",
      "name_he": "נדל\"ן",
      "description": "Rental agreements, purchase contracts",
      "description_he": "הסכמי שכירות, חוזי רכישה",
      "count": 2,
      "icon": "home"
    },
    {
      "id": "general",
      "name": "General Documents",
      "name_he": "מסמכים כלליים",
      "description": "Letters, forms, certificates",
      "description_he": "מכתבים, טפסים, אישורים",
      "count": 1,
      "icon": "file-text"
    }
  ],
  "total": 5
}
```

#### Error Cases

| Status | Scenario | Response |
|--------|----------|----------|
| 401 | Unauthorized | `{ "error": "Unauthorized" }` |
| 500 | Backend error | `{ "error": "Internal server error" }` |

---

## Resources Reference

### rightflow://templates

Access all available templates as a resource.

**URI:** `rightflow://templates`

**Content Type:** `application/json`

**Schema:**
```typescript
interface TemplatesResource {
  uri: string;                // "rightflow://templates"
  name: string;               // "RightFlow Templates"
  templates: Array<Template>; // Full template list
  totalCount: number;
  lastUpdated: string;        // ISO timestamp
}
```

### rightflow://categories

Access template categories as a resource.

**URI:** `rightflow://categories`

**Content Type:** `application/json`

**Schema:**
```typescript
interface CategoriesResource {
  uri: string;                   // "rightflow://categories"
  name: string;                  // "RightFlow Categories"
  categories: Array<Category>;   // Full category list
  totalCount: number;
  lastUpdated: string;           // ISO timestamp
}
```

---

## Type Definitions

### Template

```typescript
interface Template {
  id: string;
  name: string;
  name_he: string;
  category: string;
  description: string;
  description_he: string;
  fields?: Array<TemplateField>;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}
```

### TemplateField

```typescript
interface TemplateField {
  id: string;
  name: string;
  name_he: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  required: boolean;
  validation?: FieldValidation;
  placeholder?: string;
  placeholder_he?: string;
  defaultValue?: string | number;
  helpText?: string;
  helpText_he?: string;
}
```

### FieldValidation

```typescript
interface FieldValidation {
  pattern?: string;           // Regex pattern
  min?: number;               // Minimum value
  max?: number;               // Maximum value
  minLength?: number;         // Minimum string length
  maxLength?: number;         // Maximum string length
  validator?: string;         // Custom validator name
  errorMessage?: string;      // English error message
  errorMessage_he?: string;   // Hebrew error message
}
```

### Category

```typescript
interface Category {
  id: string;
  name: string;
  name_he: string;
  description: string;
  description_he: string;
  count: number;
  icon?: string;
  order?: number;
}
```

---

## Validation Rules

### Israeli ID Validation

**Pattern:** `^\d{9}$`

**Checksum Algorithm:**
```typescript
function validateIsraeliId(id: string): boolean {
  if (!/^\d{9}$/.test(id)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let num = Number(id[i]) * ((i % 2) + 1);
    sum += num > 9 ? num - 9 : num;
  }

  return sum % 10 === 0;
}
```

### Date Validation

**Format:** `YYYY-MM-DD`

**Valid Range:** 1900-01-01 to 2100-12-31

**Examples:**
- ✅ `2024-03-01`
- ✅ `2025-12-31`
- ❌ `2024/03/01` (wrong separator)
- ❌ `01-03-2024` (wrong order)
- ❌ `2024-13-01` (invalid month)

### Phone Number Validation

**Pattern:** `^0\d{1,2}-?\d{7}$`

**Examples:**
- ✅ `03-1234567`
- ✅ `050-1234567`
- ✅ `031234567`
- ❌ `+972-3-1234567` (international format not supported)
- ❌ `3-1234567` (missing leading zero)

### Email Validation

**Pattern:** RFC 5322 compliant

**Examples:**
- ✅ `user@example.com`
- ✅ `john.doe+tag@company.co.il`
- ✅ `info@רייטפלו.co.il` (internationalized domain)
- ❌ `user@` (missing domain)
- ❌ `@example.com` (missing local part)

---

## Hebrew/RTL Considerations

### Text Direction

**Automatic Detection:** The backend automatically detects Hebrew text and applies RTL rendering.

**Manual Override:** Not recommended - let the backend handle directionality.

**Mixed Direction:** Supported - English within Hebrew text maintains correct order.

**Example:**
```
Input:  "שם: John Cohen"
Output: "John Cohen :שם" (PDF renders correctly RTL)
```

### Font Embedding

**Hebrew Font:** Noto Sans Hebrew (embedded in all PDFs)

**Character Support:**
- Hebrew letters (א-ת)
- Nikud (vowel marks): ָ ַ ֵ ֶ ִ ֹ ֻ
- Punctuation: ״ ׳ , . ! ?
- Parentheses: ( ) [ ] { }
- Numbers: 0-9 (rendered RTL in Hebrew context)

**Font Subsetting:** NOT used - full font embedded to ensure all Hebrew characters render correctly.

### Common Hebrew Characters

| Character | Unicode | Name | Example |
|-----------|---------|------|---------|
| א | U+05D0 | Alef | אָב |
| ב | U+05D1 | Bet | בַּיִת |
| ג | U+05D2 | Gimel | גָּמָל |
| ... | ... | ... | ... |
| ת | U+05EA | Tav | תּוֹרָה |
| ״ | U+05F4 | Gershayim | ת״א |
| ׳ | U+05F3 | Geresh | ש׳ |

### Hebrew Numerals

**Gematria Support:** Hebrew letter-based numerals supported.

**Examples:**
- א׳ (1)
- י׳ (10)
- ק׳ (100)
- תשפ״ד (2024)

### Edge Cases

**Parentheses in Hebrew:**
```
Input:  "טקסט (בסוגריים)"
Output: "(בסוגריים) טקסט" (parentheses flip direction)
```

**Email in Hebrew:**
```
Input:  "מייל: user@example.com"
Output: "user@example.com :מייל" (email stays LTR)
```

**Phone in Hebrew:**
```
Input:  "טלפון: 03-1234567"
Output: "03-1234567 :טלפון" (number stays LTR)
```

### Best Practices

1. **Always provide Hebrew text in logical order** (as typed)
2. **Don't reverse text manually** - backend handles it
3. **Use Unicode Hebrew characters** - don't use Latin transliteration
4. **Include nikud only when necessary** - increases font size
5. **Test with multiple PDF viewers** - rendering can vary

---

## Rate Limiting

**Limit:** 100 requests per minute per API key

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709305200
```

**Error Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "limit": 100,
  "resetAt": "2024-03-01T15:00:00Z"
}
```

---

## Versioning

**Current Version:** 1.0.0

**Version Header:**
```http
X-RightFlow-Version: 1.0.0
```

**Breaking Changes:** Will increment major version (2.0.0)

**New Features:** Will increment minor version (1.1.0)

**Bug Fixes:** Will increment patch version (1.0.1)

---

## Support

**Issues:** [GitHub Issues](https://github.com/your-org/rightflow/issues)

**Email:** support@rightflow.com

**Documentation:** [Full Documentation](./README.md)

**Testing Guide:** [TESTING.md](./TESTING.md)

---

**Last Updated:** 2026-02-23
**API Version:** 1.0.0
**MCP Protocol Version:** 2024-11-05
