# RightFlow MCP Server - Usage Examples

Comprehensive examples for using the RightFlow MCP Server with Claude Desktop.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Examples](#basic-examples)
  - [Listing Templates](#listing-templates)
  - [Getting Template Fields](#getting-template-fields)
  - [Filling a PDF](#filling-a-pdf)
  - [Browsing Categories](#browsing-categories)
- [Advanced Examples](#advanced-examples)
  - [Error Handling](#error-handling)
  - [Hebrew Text with Nikud](#hebrew-text-with-nikud)
  - [Mixed Direction Content](#mixed-direction-content)
  - [Batch PDF Generation](#batch-pdf-generation)
  - [Custom Validation](#custom-validation)
- [Real-World Use Cases](#real-world-use-cases)
  - [HR: Generate Employment Contracts](#hr-generate-employment-contracts)
  - [Accounting: Create Tax Invoices](#accounting-create-tax-invoices)
  - [Legal: NDA Generation](#legal-nda-generation)
- [Workflow Examples](#workflow-examples)
  - [Complete Workflow: From Discovery to PDF](#complete-workflow-from-discovery-to-pdf)
  - [Multi-Document Generation](#multi-document-generation)
- [Troubleshooting Examples](#troubleshooting-examples)
- [Integration Examples](#integration-examples)

---

## Getting Started

### Prerequisites

Before running these examples, ensure:

1. **RightFlow Backend** is running on `http://localhost:3003`
2. **Claude Desktop** is installed and configured
3. **MCP Server** is added to Claude Desktop config
4. You have a valid **API Key**

### Configuration Check

**You (User):**
> "Are you connected to the RightFlow MCP server?"

**Claude:**
> Yes! I have access to the RightFlow Hebrew PDF generation tools:
> - list_templates - Browse available PDF templates
> - get_template_fields - Get field definitions
> - fill_pdf - Generate filled PDFs with Hebrew text
> - list_categories - View template categories
>
> Ready to help with Hebrew PDF generation!

---

## Basic Examples

### Listing Templates

#### Example 1: List All Templates

**You:**
> "What PDF templates are available?"

**Claude:**
> I'll fetch the available templates for you.
>
> [Calls `list_templates` with no parameters]
>
> **Available Templates (15 total):**
>
> **HR & Employment (5 templates):**
> 1. Employment Contract (חוזה עבודה)
> 2. NDA (הסכם סודיות)
> 3. Termination Letter (מכתב פיטורים)
> 4. Salary Certificate (אישור שכר)
> 5. Hourly Employment Contract (חוזה עבודה שעתי)
>
> **Accounting (4 templates):**
> 1. Tax Invoice (חשבונית מס)
> 2. Receipt (קבלה)
> 3. Donation Receipt (קבלה לתרומה)
> 4. Expense Report (דוח הוצאות)
>
> [...continues...]

---

#### Example 2: Filter by Category

**You:**
> "Show me only accounting templates"

**Claude:**
> I'll filter templates by the accounting category.
>
> [Calls `list_templates` with `category: "accounting"`]
>
> **Accounting Templates (4 available):**
>
> 1. **Tax Invoice** (חשבונית מס)
>    - Israeli tax invoice with VAT
>
> 2. **Receipt** (קבלה)
>    - Standard receipt for payments
>
> 3. **Donation Receipt** (קבלה לתרומה)
>    - Tax-deductible donation receipt
>
> 4. **Expense Report** (דוח הוצאות)
>    - Business expense summary

---

#### Example 3: Search Templates

**You:**
> "Find templates with 'contract' in the name"

**Claude:**
> I'll search for templates containing "contract".
>
> [Calls `list_templates` with `search: "contract"`]
>
> **Found 3 templates:**
>
> 1. **Employment Contract** (חוזה עבודה) - HR
> 2. **Hourly Employment Contract** (חוזה עבודה שעתי) - HR
> 3. **Service Contract** (חוזה שירות) - Legal

---

#### Example 4: Hebrew Search

**You:**
> "חפש תבניות עם 'חוזה'"

**Claude:**
> I'll search for templates with "חוזה" (contract).
>
> [Calls `list_templates` with `search: "חוזה"`]
>
> **נמצאו 5 תבניות:**
>
> 1. חוזה עבודה (Employment Contract)
> 2. חוזה עבודה שעתי (Hourly Employment Contract)
> 3. חוזה שכירות (Rental Agreement)
> 4. חוזה קבלנות (Contractor Agreement)
> 5. חוזה שירות (Service Contract)

---

### Getting Template Fields

#### Example 5: View Template Fields

**You:**
> "What fields does the employment contract template have?"

**Claude:**
> I'll get the field definitions for the employment contract.
>
> [Calls `get_template_fields` with `template_id: "employment-contract-1"`]
>
> **Employment Contract Fields:**
>
> **Required Fields:**
> 1. **Employee Name** (שם העובד) - Text
>    - Min length: 2, Max length: 100
>
> 2. **Employee ID** (תעודת זהות) - Text
>    - Must be 9 digits (Israeli ID with checksum)
>
> 3. **Salary** (שכר חודשי) - Number
>    - Range: 0 - 1,000,000 ILS
>
> 4. **Start Date** (תאריך התחלה) - Date
>    - Format: YYYY-MM-DD
>
> **Optional Fields:**
> 5. **Position** (תפקיד) - Text
> 6. **Department** (מחלקה) - Text
> 7. **Direct Manager** (מנהל ישיר) - Text
> 8. **Notes** (הערות) - Textarea

---

### Filling a PDF

#### Example 6: Generate Simple Employment Contract

**You:**
> "Create an employment contract for Yossi Cohen, ID 123456789, salary 25,000 ILS, starting March 1st, 2024"

**Claude:**
> I'll generate the employment contract with those details.
>
> [Calls `fill_pdf` with:
> ```json
> {
>   "template_id": "employment-contract-1",
>   "data": {
>     "employeeName": "יוסי כהן",
>     "employeeId": "123456789",
>     "salary": "25000",
>     "startDate": "2024-03-01"
>   }
> }
> ```]
>
> ✅ **Employment contract generated successfully!**
>
> **Details:**
> - Employee: יוסי כהן
> - ID: 123456789
> - Salary: 25,000 ILS
> - Start Date: March 1, 2024
> - Fields filled: 4
> - File: employment-contract-1-filled.pdf
>
> The PDF has been generated with proper Hebrew text rendering and RTL support.

---

#### Example 7: Generate with All Fields

**You:**
> "Create an employment contract for Dana Levy, ID 987654321, salary 30,000, start date 2024-04-01, position Senior Developer, department R&D, manager David Cohen"

**Claude:**
> I'll create a complete employment contract with all the details.
>
> [Calls `fill_pdf` with:
> ```json
> {
>   "template_id": "employment-contract-1",
>   "data": {
>     "employeeName": "דנה לוי",
>     "employeeId": "987654321",
>     "salary": "30000",
>     "startDate": "2024-04-01",
>     "position": "מפתחת סניור",
>     "department": "מחקר ופיתוח",
>     "manager": "דוד כהן"
>   },
>   "file_name": "contract-dana-levy"
> }
> ```]
>
> ✅ **Complete employment contract generated!**
>
> **Contract Details:**
> - Employee: דנה לוי (Dana Levy)
> - ID: 987654321
> - Position: מפתחת סניור (Senior Developer)
> - Department: מחקר ופיתוח (R&D)
> - Salary: 30,000 ILS
> - Start Date: April 1, 2024
> - Direct Manager: דוד כהן (David Cohen)
>
> - Fields filled: 7 of 8
> - Filename: contract-dana-levy.pdf
> - File size: 126 KB

---

### Browsing Categories

#### Example 8: List All Categories

**You:**
> "What types of document templates are available?"

**Claude:**
> I'll show you all available template categories.
>
> [Calls `list_categories`]
>
> **Available Categories (5 total):**
>
> 1. **HR & Employment** (משאבי אנוש ותעסוקה)
>    - 5 templates
>    - Employment contracts, NDAs, termination letters
>
> 2. **Accounting & Finance** (חשבונאות ופיננסים)
>    - 4 templates
>    - Tax invoices, receipts, expense reports
>
> 3. **Legal Documents** (מסמכים משפטיים)
>    - 3 templates
>    - Contracts, agreements, legal notices
>
> 4. **Real Estate** (נדל"ן)
>    - 2 templates
>    - Rental agreements, purchase contracts
>
> 5. **General Documents** (מסמכים כלליים)
>    - 1 template
>    - Letters, forms, certificates

---

## Advanced Examples

### Error Handling

#### Example 9: Handling Missing Required Fields

**You:**
> "Create an employment contract with just the name 'Moshe Cohen'"

**Claude:**
> I'll try to create the contract, but some required fields are missing.
>
> [Calls `fill_pdf` and receives validation errors]
>
> ❌ **Unable to generate PDF - Missing required fields:**
>
> - **Employee ID** (תעודת זהות) - Required
> - **Salary** (שכר חודשי) - Required
> - **Start Date** (תאריך התחלה) - Required
>
> Please provide the missing information:
> 1. Employee ID (9-digit Israeli ID)
> 2. Monthly salary in ILS
> 3. Start date (YYYY-MM-DD format)

**You:**
> "OK, ID is 111222333, salary 20000, start date 2024-05-01"

**Claude:**
> Perfect! I'll generate the contract now.
>
> [Calls `fill_pdf` with complete data]
>
> ✅ **Employment contract created successfully!**

---

#### Example 10: Invalid Israeli ID

**You:**
> "Create employment contract for Avi Shamir, ID 123456789, salary 15000, start 2024-06-01"

**Claude:**
> I'll try to create the contract.
>
> [Calls `fill_pdf` and receives validation error]
>
> ⚠️ **Validation error:**
>
> - **Employee ID** (תעודת זהות): Invalid Israeli ID format
>   - The ID checksum is incorrect
>   - Expected valid 9-digit Israeli ID
>
> Would you like to:
> 1. Verify the ID number is correct
> 2. Use a different ID
> 3. Skip ID validation (if this is a test document)

---

### Hebrew Text with Nikud

#### Example 11: Hebrew Names with Vowel Marks

**You:**
> "Create a certificate with the name 'יוֹסֵף כֹּהֵן' (with nikud)"

**Claude:**
> I'll generate a certificate with Hebrew nikud (vowel marks).
>
> [Calls `fill_pdf` with nikud text]
>
> ✅ **Certificate generated with nikud support!**
>
> **Name rendered:** יוֹסֵף כֹּהֵן (Yosef Kohen)
>
> The PDF correctly displays:
> - Hebrew letters: י ו ס ף כ ה ן
> - Nikud marks: ֹ ֵ ֹ ֵ
> - Proper RTL direction
>
> Note: Nikud increases PDF file size due to full font embedding.

---

### Mixed Direction Content

#### Example 12: Hebrew with English Names

**You:**
> "Create contract for 'John Cohen (ג'ון כהן)' working in 'R&D (מו\"פ)'"

**Claude:**
> I'll create a contract with mixed Hebrew/English content.
>
> [Calls `fill_pdf` with mixed direction text]
>
> ✅ **Contract generated with BiDi (bidirectional) text!**
>
> **How it's rendered:**
> - Name: John Cohen (ג'ון כהן) - English name with Hebrew transliteration
> - Department: R&D (מו"פ) - Acronym with Hebrew equivalent
>
> The PDF maintains:
> - English text in LTR (left-to-right)
> - Hebrew text in RTL (right-to-left)
> - Proper parentheses direction handling
> - Correct spacing between mixed content

---

#### Example 13: Hebrew with Email and Phone

**You:**
> "Generate invoice for customer 'משה לוי', email moshe@example.com, phone 03-1234567"

**Claude:**
> I'll create an invoice with contact details.
>
> [Calls `fill_pdf` with Hebrew + contact info]
>
> ✅ **Tax invoice generated!**
>
> **Contact details rendered correctly:**
> - Name: משה לוי (RTL)
> - Email: moshe@example.com (LTR, maintained in logical order)
> - Phone: 03-1234567 (LTR, as expected in Israel)
>
> The PDF preserves:
> - Email domain names in correct order
> - Phone number digit sequence
> - @ symbol position
> - Hyphen in phone number

---

### Batch PDF Generation

#### Example 14: Generate Multiple Contracts

**You:**
> "I need to create employment contracts for 3 new employees:
> 1. Yossi Cohen, ID 111222333, 25k, start 2024-03-01
> 2. Dana Levy, ID 444555666, 30k, start 2024-03-15
> 3. Avi Shamir, ID 777888999, 28k, start 2024-04-01"

**Claude:**
> I'll generate all three employment contracts for you.
>
> [Calls `fill_pdf` three times in sequence]
>
> ✅ **All 3 employment contracts generated!**
>
> **1. Yossi Cohen**
> - ID: 111222333
> - Salary: 25,000 ILS
> - Start: March 1, 2024
> - File: employment-contract-yossi-cohen.pdf
>
> **2. Dana Levy**
> - ID: 444555666
> - Salary: 30,000 ILS
> - Start: March 15, 2024
> - File: employment-contract-dana-levy.pdf
>
> **3. Avi Shamir**
> - ID: 777888999
> - Salary: 28,000 ILS
> - Start: April 1, 2024
> - File: employment-contract-avi-shamir.pdf
>
> All contracts ready for review and signing!

---

### Custom Validation

#### Example 15: Israeli Business ID Validation

**You:**
> "Create tax invoice for business ID 512345678"

**Claude:**
> I'll create the invoice and validate the business ID.
>
> [Calls `fill_pdf` with business ID]
>
> ✅ **Tax invoice generated!**
>
> **Validation:**
> - Business ID: 512345678 (Valid Israeli Business ID)
> - Checksum: ✓ Passed
> - Format: 9 digits ✓
>
> The invoice is ready for submission to tax authorities.

---

## Real-World Use Cases

### HR: Generate Employment Contracts

#### Scenario: Onboarding New Employees

**You:**
> "I'm onboarding 5 new software engineers next month. What's the process to generate their contracts?"

**Claude:**
> I'll guide you through generating employment contracts efficiently.
>
> **Step 1: Check the employment contract template**
> [Calls `get_template_fields` for employment-contract-1]
>
> **Required Information Per Employee:**
> - Full name (Hebrew)
> - Israeli ID (9 digits)
> - Monthly salary
> - Start date
> - Position
> - Department
>
> **Step 2: Generate contracts**
> Please provide the details for each employee, and I'll generate their contracts. You can give me:
> - All at once (I'll batch process)
> - One by one (interactive)
> - Via spreadsheet (copy-paste table)
>
> **Step 3: Review and download**
> Each PDF will be generated with:
> - Proper Hebrew rendering
> - All legal clauses included
> - Ready for e-signature
>
> How would you like to provide the employee data?

**You:**
> "Here's the data:
> | Name | ID | Salary | Start | Position | Dept |
> |------|---------|--------|-----------|----------|------|
> | דוד כהן | 111222333 | 28000 | 2024-04-01 | Backend Dev | R&D |
> | שרה לוי | 444555666 | 30000 | 2024-04-01 | Frontend Dev | R&D |
> | יוסף מזרחי | 777888999 | 26000 | 2024-04-01 | QA Engineer | QA |
> | רחל אברהם | 123321123 | 32000 | 2024-04-01 | DevOps | Ops |
> | משה דהן | 456654456 | 29000 | 2024-04-01 | Full Stack | R&D |"

**Claude:**
> Perfect! I'll generate all 5 contracts now.
>
> [Generates 5 PDFs in sequence]
>
> ✅ **All 5 employment contracts generated!**
>
> **Summary:**
> 1. דוד כהן - Backend Developer - 28k - contract-david-cohen.pdf
> 2. שרה לוי - Frontend Developer - 30k - contract-sarah-levy.pdf
> 3. יוסף מזרחי - QA Engineer - 26k - contract-yosef-mizrachi.pdf
> 4. רחל אברהם - DevOps Engineer - 32k - contract-rachel-abraham.pdf
> 5. משה דהן - Full Stack Developer - 29k - contract-moshe-dahan.pdf
>
> **Next Steps:**
> 1. Review each PDF for accuracy
> 2. Send to employees for e-signature
> 3. Store signed copies in HR system
>
> All contracts use proper Hebrew font embedding and RTL text direction.

---

### Accounting: Create Tax Invoices

#### Scenario: Monthly Invoice Generation

**You:**
> "I need to create tax invoices for this month's clients. Show me the invoice template first."

**Claude:**
> I'll show you the tax invoice template details.
>
> [Calls `get_template_fields` for tax-invoice-1]
>
> **Tax Invoice Template Fields:**
>
> **Required:**
> - Invoice Number (מספר חשבונית)
> - Invoice Date (תאריך)
> - Customer Name (שם לקוח)
> - Customer ID/Business ID (ת.ז./ח.פ.)
> - Items (פריטים) - Description, quantity, price
> - Subtotal (סכום לפני מע"מ)
> - VAT Rate (מע"מ) - Default 17%
> - Total (סכום כולל)
>
> **Optional:**
> - Payment Terms (תנאי תשלום)
> - Notes (הערות)
> - Due Date (תאריך תשלום)
>
> Ready to create invoices!

**You:**
> "Create invoice #2024-001 for customer 'חברת טכנולוגיה בע\"מ', business ID 512345678, for software development services, amount 10,000 ILS + VAT, date 2024-03-01"

**Claude:**
> I'll generate the tax invoice.
>
> [Calls `fill_pdf` with invoice data]
>
> ✅ **Tax Invoice Generated!**
>
> **Invoice Details:**
> - Number: 2024-001
> - Date: March 1, 2024
> - Customer: חברת טכנולוגיה בע"מ
> - Business ID: 512345678 (Valid ✓)
> - Description: Software development services
> - Subtotal: 10,000 ILS
> - VAT (17%): 1,700 ILS
> - **Total: 11,700 ILS**
>
> File: tax-invoice-2024-001.pdf
>
> The invoice meets Israeli tax authority requirements:
> - Proper Hebrew formatting
> - Valid business ID
> - VAT calculation included
> - All required fields present

---

### Legal: NDA Generation

#### Scenario: Confidentiality Agreements

**You:**
> "I need to create an NDA (non-disclosure agreement) for a contractor. What info do I need?"

**Claude:**
> I'll check the NDA template requirements.
>
> [Calls `get_template_fields` for nda-1]
>
> **NDA Template Requirements:**
>
> **Parties:**
> - Disclosing Party (company name)
> - Receiving Party (contractor name)
> - Contractor ID
>
> **Agreement Terms:**
> - Effective Date
> - Duration (months/years)
> - Purpose (project description)
>
> **Optional:**
> - Exclusions (public information, prior knowledge)
> - Permitted disclosures
> - Governing law jurisdiction
>
> What are the details for this NDA?

**You:**
> "Company: 'RightFlow Ltd', contractor: 'יוסי כהן', ID 123456789, effective 2024-03-01, duration 2 years, purpose 'Software development for PDF generation system'"

**Claude:**
> I'll generate the NDA with those terms.
>
> [Calls `fill_pdf` for NDA]
>
> ✅ **NDA Generated!**
>
> **Agreement Details:**
> - Disclosing Party: RightFlow Ltd
> - Receiving Party: יוסי כהן (Yossi Cohen)
> - ID: 123456789
> - Effective Date: March 1, 2024
> - Duration: 2 years (expires March 1, 2026)
> - Purpose: Software development for PDF generation system
>
> **Confidentiality Terms Include:**
> - Non-disclosure obligations
> - Return of materials clause
> - Remedies for breach
> - Governing law: Israeli law
>
> File: nda-yossi-cohen-2024.pdf
>
> Ready for both parties to sign!

---

## Workflow Examples

### Complete Workflow: From Discovery to PDF

#### Full Journey Example

**You:**
> "I need to create some HR documents but I'm not sure what's available"

**Claude:**
> Let me help you discover available HR templates.
>
> **Step 1: Browse HR category**
> [Calls `list_templates` with category: "hr"]
>
> **HR Templates Available:**
> 1. Employment Contract (חוזה עבודה)
> 2. NDA (הסכם סודיות)
> 3. Termination Letter (מכתב פיטורים)
> 4. Salary Certificate (אישור שכר)
> 5. Hourly Employment Contract (חוזה עבודה שעתי)
>
> Which type of document do you need?

**You:**
> "I need an employment contract"

**Claude:**
> Great! Let me show you what information the employment contract needs.
>
> **Step 2: View template fields**
> [Calls `get_template_fields` for employment-contract-1]
>
> **Employment Contract Fields:**
> - Employee Name ✱
> - Employee ID ✱
> - Monthly Salary ✱
> - Start Date ✱
> - Position (optional)
> - Department (optional)
> - Manager (optional)
> - Notes (optional)
>
> ✱ = Required field
>
> Please provide the employee details.

**You:**
> "Employee: 'תמר שפירא', ID '135792468', salary 27000, start date 2024-04-15, position 'Product Manager', department 'Product'"

**Claude:**
> Perfect! I'll generate the employment contract now.
>
> **Step 3: Generate PDF**
> [Calls `fill_pdf` with provided data]
>
> ✅ **Employment Contract Generated!**
>
> **Summary:**
> - Employee: תמר שפירא (Tamar Shapira)
> - ID: 135792468 (Valid Israeli ID ✓)
> - Position: Product Manager
> - Department: Product
> - Salary: 27,000 ILS/month
> - Start Date: April 15, 2024
>
> - File: employment-contract-tamar-shapira.pdf
> - Size: 128 KB
> - Fields filled: 6 of 8
> - Hebrew rendering: ✓ Proper RTL
> - Font embedding: ✓ Full Hebrew support
>
> **Next steps:**
> 1. Review the PDF
> 2. Send to employee for signature
> 3. Store in HR system
>
> Would you like to create another document?

---

### Multi-Document Generation

#### Scenario: New Employee Onboarding Package

**You:**
> "I need a complete onboarding package for a new employee: employment contract, NDA, and salary certificate. Can you create all three?"

**Claude:**
> Absolutely! I'll create a complete onboarding package.
>
> First, let me gather the employee information:
>
> **Required Information:**
> - Employee name
> - Israeli ID
> - Position/title
> - Department
> - Monthly salary
> - Start date
> - Manager name
>
> Please provide these details.

**You:**
> "Name: 'רון שמעון', ID '246813579', position 'Software Architect', dept 'Engineering', salary 35000, start 2024-05-01, manager 'יעל כהן'"

**Claude:**
> Perfect! I'll create all three documents now.
>
> **Document 1: Employment Contract**
> [Calls `fill_pdf` for employment-contract-1]
> ✅ Generated: employment-contract-ron-shimeon.pdf
>
> **Document 2: NDA**
> [Calls `fill_pdf` for nda-1]
> ✅ Generated: nda-ron-shimeon.pdf
>
> **Document 3: Salary Certificate**
> [Calls `fill_pdf` for salary-certificate-1]
> ✅ Generated: salary-certificate-ron-shimeon.pdf
>
> 🎉 **Complete Onboarding Package Ready!**
>
> **Package Contents:**
> 1. **Employment Contract**
>    - Position: Software Architect
>    - Salary: 35,000 ILS
>    - Start: May 1, 2024
>    - Manager: יעל כהן
>
> 2. **Non-Disclosure Agreement**
>    - Effective: May 1, 2024
>    - Duration: 2 years
>    - Company confidentiality terms
>
> 3. **Salary Certificate**
>    - Monthly salary: 35,000 ILS
>    - Annual salary: 420,000 ILS
>    - Valid for bank/government use
>
> All documents:
> - Hebrew text properly rendered
> - RTL direction correct
> - Ready for e-signature
> - Legally compliant
>
> Total package size: 385 KB

---

## Troubleshooting Examples

### Example 16: Backend Connection Issues

**You:**
> "Can you create an employment contract for David?"

**Claude:**
> I'll try to create the contract.
>
> [Attempts to call `fill_pdf` but backend is unreachable]
>
> ❌ **Connection Error**
>
> I'm unable to connect to the RightFlow backend server.
>
> **Troubleshooting Steps:**
> 1. Verify the backend is running:
>    ```bash
>    curl http://localhost:3003/api/v1/health
>    ```
>
> 2. Check the MCP server configuration:
>    - Expected URL: `http://localhost:3003/api/v1`
>    - Check `claude_desktop_config.json`
>
> 3. Verify your API key is correct:
>    - Environment variable: `RIGHTFLOW_API_KEY`
>
> 4. Check for firewall/network issues:
>    - Port 3003 should be open
>    - No VPN blocking localhost
>
> Once the backend is running, I'll be able to generate the contract.

---

### Example 17: Invalid Template ID

**You:**
> "Use the 'super-contract' template"

**Claude:**
> I'll try to use that template.
>
> [Calls `fill_pdf` with template_id: "super-contract"]
>
> ❌ **Template Not Found**
>
> The template ID "super-contract" doesn't exist in the system.
>
> **Available templates:**
> [Calls `list_templates`]
>
> I found these similar templates:
> - employment-contract-1 (Employment Contract)
> - hourly-contract-1 (Hourly Employment Contract)
> - service-contract-1 (Service Contract)
>
> Did you mean one of these? Or would you like to see all available templates?

---

## Integration Examples

### Example 18: Workflow with External Data

**Scenario:** Generate contracts from CSV/spreadsheet data

**You:**
> "I have employee data in a spreadsheet. Can you process it?"

**Claude:**
> Yes! Please paste your spreadsheet data (CSV format or table), and I'll generate contracts for all employees.
>
> Expected format:
> ```
> Name, ID, Salary, Start Date, Position, Department
> ```

**You:**
> "Name,ID,Salary,StartDate,Position,Dept
> אבי לוי,111222333,25000,2024-06-01,Developer,R&D
> שרה כהן,444555666,28000,2024-06-01,Designer,UX
> דוד מזרחי,777888999,30000,2024-06-01,Manager,Product"

**Claude:**
> Perfect! I'll process all 3 employees.
>
> [Parses CSV and generates 3 PDFs]
>
> ✅ **Batch Processing Complete!**
>
> **Results:**
> 1. ✅ אבי לוי - Developer - contract-avi-levy.pdf
> 2. ✅ שרה כהן - Designer - contract-sarah-cohen.pdf
> 3. ✅ דוד מזרחי - Manager - contract-david-mizrachi.pdf
>
> **Summary:**
> - Total processed: 3
> - Successful: 3
> - Failed: 0
> - Total size: 378 KB
>
> All contracts ready for distribution!

---

### Example 19: Monthly Recurring Documents

**Scenario:** Generate monthly salary certificates

**You:**
> "I need to generate salary certificates every month for the same 10 employees. Can you streamline this?"

**Claude:**
> Absolutely! I can help set up a monthly workflow.
>
> **One-Time Setup:**
> 1. Save employee list with template data
> 2. Create naming convention for files
> 3. Set up batch generation process
>
> **Monthly Execution:**
> Just tell me "Generate monthly salary certificates" and I'll:
> - Use saved employee data
> - Update dates to current month
> - Generate all 10 PDFs
> - Name them with month-year pattern
>
> Would you like to save the employee list now?

---

## Tips & Best Practices

### Tip 1: Always Verify IDs

Israeli IDs have checksums. If you're unsure about an ID:

**You:**
> "Is 123456789 a valid Israeli ID?"

**Claude:**
> Let me verify that ID.
>
> [Checks ID checksum algorithm]
>
> ✅ **Valid Israeli ID**
> - ID: 123456789
> - Checksum: Valid
> - Can be used in official documents

---

### Tip 2: Use Descriptive Filenames

**Good:**
```json
{
  "file_name": "employment-contract-yossi-cohen-2024-03"
}
```

**Avoid:**
```json
{
  "file_name": "contract1"
}
```

---

### Tip 3: Preview Fields Before Filling

Always call `get_template_fields` before `fill_pdf` to:
- See all required fields
- Check validation rules
- Understand field types
- Read field descriptions

---

### Tip 4: Handle Hebrew Input Carefully

**Do:**
- Use logical order (as typed): "שלום עולם"
- Include nikud only when necessary
- Test with PDF viewer before finalizing

**Don't:**
- Manually reverse text: "םלוע םולש" ❌
- Use Latin transliteration: "shalom olam" ❌
- Mix encoding formats

---

## Next Steps

- Read [API_REFERENCE.md](./API_REFERENCE.md) for complete API documentation
- See [README.md](./README.md) for installation and configuration
- Check [TESTING.md](./TESTING.md) for test coverage details

---

**Last Updated:** 2026-02-23
