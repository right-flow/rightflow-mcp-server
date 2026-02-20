/**
 * Seed Script: MCP Starter Templates
 *
 * Creates 5 essential Hebrew document templates for the MCP Connector MVP:
 * 1. ייפוי כח (Power of Attorney) - legal
 * 2. חוזה העסקה (Employment Contract) - hr
 * 3. חשבונית (Invoice) - accounting
 * 4. חוזה שכירות (Rental Agreement) - real_estate
 * 5. טופס 101 (Form 101 - Tax Declaration) - hr
 *
 * Run: npx ts-node src/migrations/seed-mcp-templates.ts
 */

import { pool, query } from '../config/database';
import logger from '../utils/logger';

interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  label_he: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'currency' | 'textarea';
  required: boolean;
  placeholder?: string;
  placeholder_he?: string;
  validation?: {
    custom?: string;
    min_length?: number;
    max_length?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  options?: Array<{ value: string; label: string; label_he: string }>;
  crm_mapping?: {
    monday?: string;
    hubspot?: string;
    salesforce?: string;
  };
}

interface TemplateData {
  name: string;
  name_he: string;
  description: string;
  description_he: string;
  category: string;
  s3_key: string;
  fields: FieldDefinition[];
  supported_crms: string[];
  supported_erps: string[];
}

const starterTemplates: TemplateData[] = [
  // 1. Power of Attorney (ייפוי כח)
  {
    name: 'Power of Attorney',
    name_he: 'ייפוי כח',
    description: 'Standard power of attorney document for legal representation',
    description_he: 'מסמך ייפוי כח סטנדרטי לייצוג משפטי',
    category: 'legal',
    s3_key: 'templates/legal/power-of-attorney-v1.pdf',
    supported_crms: ['monday', 'hubspot'],
    supported_erps: ['priority', 'sap'],
    fields: [
      {
        id: 'grantor_name',
        name: 'grantor_name',
        label: 'Grantor Full Name',
        label_he: 'שם מלא של מייפה הכח',
        type: 'text',
        required: true,
        placeholder: 'Enter full name',
        placeholder_he: 'הזן שם מלא',
        validation: { min_length: 2, max_length: 100 },
        crm_mapping: { monday: 'name', hubspot: 'firstname' },
      },
      {
        id: 'grantor_id',
        name: 'grantor_id',
        label: 'Grantor ID Number',
        label_he: 'מספר ת.ז. מייפה הכח',
        type: 'text',
        required: true,
        placeholder: '000000000',
        placeholder_he: '000000000',
        validation: { custom: 'israeli_id' },
      },
      {
        id: 'grantor_address',
        name: 'grantor_address',
        label: 'Grantor Address',
        label_he: 'כתובת מייפה הכח',
        type: 'textarea',
        required: true,
        placeholder_he: 'רחוב, מספר, עיר',
        validation: { max_length: 500 },
      },
      {
        id: 'attorney_name',
        name: 'attorney_name',
        label: 'Attorney Full Name',
        label_he: 'שם מלא של מיופה הכח',
        type: 'text',
        required: true,
        validation: { min_length: 2, max_length: 100 },
      },
      {
        id: 'attorney_id',
        name: 'attorney_id',
        label: 'Attorney ID Number',
        label_he: 'מספר ת.ז. מיופה הכח',
        type: 'text',
        required: true,
        validation: { custom: 'israeli_id' },
      },
      {
        id: 'scope',
        name: 'scope',
        label: 'Power Scope',
        label_he: 'היקף הסמכות',
        type: 'select',
        required: true,
        options: [
          { value: 'general', label: 'General', label_he: 'כללי' },
          { value: 'financial', label: 'Financial', label_he: 'פיננסי' },
          { value: 'legal', label: 'Legal proceedings', label_he: 'הליכים משפטיים' },
          { value: 'property', label: 'Property', label_he: 'נכסים' },
        ],
      },
      {
        id: 'effective_date',
        name: 'effective_date',
        label: 'Effective Date',
        label_he: 'תאריך תחילה',
        type: 'date',
        required: true,
      },
      {
        id: 'expiry_date',
        name: 'expiry_date',
        label: 'Expiry Date',
        label_he: 'תאריך תפוגה',
        type: 'date',
        required: false,
      },
    ],
  },

  // 2. Employment Contract (חוזה העסקה)
  {
    name: 'Employment Contract',
    name_he: 'חוזה העסקה',
    description: 'Standard employment contract according to Israeli labor law',
    description_he: 'חוזה העסקה סטנדרטי בהתאם לחוק העבודה הישראלי',
    category: 'hr',
    s3_key: 'templates/hr/employment-contract-v1.pdf',
    supported_crms: ['monday', 'hubspot'],
    supported_erps: ['priority', 'sap', 'netsuite'],
    fields: [
      {
        id: 'employee_name',
        name: 'employee_name',
        label: 'Employee Full Name',
        label_he: 'שם מלא של העובד',
        type: 'text',
        required: true,
        validation: { min_length: 2, max_length: 100 },
        crm_mapping: { monday: 'name', hubspot: 'firstname' },
      },
      {
        id: 'employee_id',
        name: 'employee_id',
        label: 'Employee ID Number',
        label_he: 'מספר ת.ז.',
        type: 'text',
        required: true,
        validation: { custom: 'israeli_id' },
      },
      {
        id: 'employee_address',
        name: 'employee_address',
        label: 'Employee Address',
        label_he: 'כתובת העובד',
        type: 'textarea',
        required: true,
        validation: { max_length: 500 },
      },
      {
        id: 'employer_name',
        name: 'employer_name',
        label: 'Employer Name',
        label_he: 'שם המעסיק',
        type: 'text',
        required: true,
        validation: { min_length: 2, max_length: 200 },
      },
      {
        id: 'employer_id',
        name: 'employer_id',
        label: 'Employer ID/Company Number',
        label_he: 'ח.פ./ע.מ.',
        type: 'text',
        required: true,
        validation: { min_length: 8, max_length: 9 },
      },
      {
        id: 'job_title',
        name: 'job_title',
        label: 'Job Title',
        label_he: 'תפקיד',
        type: 'text',
        required: true,
        validation: { max_length: 100 },
        crm_mapping: { monday: 'job_title', hubspot: 'jobtitle' },
      },
      {
        id: 'start_date',
        name: 'start_date',
        label: 'Start Date',
        label_he: 'תאריך תחילת עבודה',
        type: 'date',
        required: true,
      },
      {
        id: 'salary',
        name: 'salary',
        label: 'Monthly Salary (ILS)',
        label_he: 'שכר חודשי (ש"ח)',
        type: 'currency',
        required: true,
        validation: { min: 5880, max: 500000 },
      },
      {
        id: 'work_hours',
        name: 'work_hours',
        label: 'Weekly Work Hours',
        label_he: 'שעות עבודה שבועיות',
        type: 'number',
        required: true,
        validation: { min: 1, max: 45 },
      },
      {
        id: 'vacation_days',
        name: 'vacation_days',
        label: 'Annual Vacation Days',
        label_he: 'ימי חופשה שנתיים',
        type: 'number',
        required: true,
        validation: { min: 12, max: 30 },
      },
      {
        id: 'probation_months',
        name: 'probation_months',
        label: 'Probation Period (months)',
        label_he: 'תקופת ניסיון (חודשים)',
        type: 'number',
        required: false,
        validation: { min: 0, max: 6 },
      },
    ],
  },

  // 3. Invoice (חשבונית)
  {
    name: 'Invoice',
    name_he: 'חשבונית מס',
    description: 'Tax invoice according to Israeli VAT requirements',
    description_he: 'חשבונית מס בהתאם לדרישות מע"מ',
    category: 'accounting',
    s3_key: 'templates/accounting/invoice-v1.pdf',
    supported_crms: ['monday', 'hubspot', 'salesforce'],
    supported_erps: ['priority', 'sap', 'netsuite', 'hashavshevet'],
    fields: [
      {
        id: 'invoice_number',
        name: 'invoice_number',
        label: 'Invoice Number',
        label_he: 'מספר חשבונית',
        type: 'text',
        required: true,
        validation: { pattern: '^[0-9]{1,10}$' },
      },
      {
        id: 'invoice_date',
        name: 'invoice_date',
        label: 'Invoice Date',
        label_he: 'תאריך חשבונית',
        type: 'date',
        required: true,
      },
      {
        id: 'seller_name',
        name: 'seller_name',
        label: 'Seller/Business Name',
        label_he: 'שם העסק',
        type: 'text',
        required: true,
        validation: { max_length: 200 },
      },
      {
        id: 'seller_id',
        name: 'seller_id',
        label: 'Seller Tax ID',
        label_he: 'עוסק מורשה/ח.פ.',
        type: 'text',
        required: true,
        validation: { min_length: 8, max_length: 9 },
      },
      {
        id: 'seller_address',
        name: 'seller_address',
        label: 'Seller Address',
        label_he: 'כתובת העסק',
        type: 'textarea',
        required: true,
        validation: { max_length: 500 },
      },
      {
        id: 'buyer_name',
        name: 'buyer_name',
        label: 'Buyer Name',
        label_he: 'שם הלקוח',
        type: 'text',
        required: true,
        validation: { max_length: 200 },
        crm_mapping: { monday: 'name', hubspot: 'company', salesforce: 'Account.Name' },
      },
      {
        id: 'buyer_id',
        name: 'buyer_id',
        label: 'Buyer Tax ID',
        label_he: 'ח.פ./ע.מ. לקוח',
        type: 'text',
        required: false,
      },
      {
        id: 'description',
        name: 'description',
        label: 'Description',
        label_he: 'תיאור',
        type: 'textarea',
        required: true,
        validation: { max_length: 1000 },
      },
      {
        id: 'amount_before_vat',
        name: 'amount_before_vat',
        label: 'Amount Before VAT',
        label_he: 'סכום לפני מע"מ',
        type: 'currency',
        required: true,
        validation: { min: 0 },
      },
      {
        id: 'vat_rate',
        name: 'vat_rate',
        label: 'VAT Rate (%)',
        label_he: 'שיעור מע"מ (%)',
        type: 'number',
        required: true,
        validation: { min: 0, max: 18 },
      },
      {
        id: 'total_amount',
        name: 'total_amount',
        label: 'Total Amount',
        label_he: 'סכום כולל',
        type: 'currency',
        required: true,
        validation: { min: 0 },
      },
      {
        id: 'payment_terms',
        name: 'payment_terms',
        label: 'Payment Terms',
        label_he: 'תנאי תשלום',
        type: 'select',
        required: true,
        options: [
          { value: 'immediate', label: 'Immediate', label_he: 'מיידי' },
          { value: 'net30', label: 'Net 30', label_he: 'שוטף + 30' },
          { value: 'net60', label: 'Net 60', label_he: 'שוטף + 60' },
          { value: 'net90', label: 'Net 90', label_he: 'שוטף + 90' },
        ],
      },
    ],
  },

  // 4. Rental Agreement (חוזה שכירות)
  {
    name: 'Rental Agreement',
    name_he: 'חוזה שכירות',
    description: 'Residential or commercial rental agreement',
    description_he: 'חוזה שכירות למגורים או לעסק',
    category: 'real_estate',
    s3_key: 'templates/real-estate/rental-agreement-v1.pdf',
    supported_crms: ['monday', 'hubspot'],
    supported_erps: [],
    fields: [
      {
        id: 'landlord_name',
        name: 'landlord_name',
        label: 'Landlord Name',
        label_he: 'שם המשכיר',
        type: 'text',
        required: true,
        validation: { min_length: 2, max_length: 100 },
      },
      {
        id: 'landlord_id',
        name: 'landlord_id',
        label: 'Landlord ID',
        label_he: 'ת.ז. המשכיר',
        type: 'text',
        required: true,
        validation: { custom: 'israeli_id' },
      },
      {
        id: 'tenant_name',
        name: 'tenant_name',
        label: 'Tenant Name',
        label_he: 'שם השוכר',
        type: 'text',
        required: true,
        validation: { min_length: 2, max_length: 100 },
        crm_mapping: { monday: 'name', hubspot: 'firstname' },
      },
      {
        id: 'tenant_id',
        name: 'tenant_id',
        label: 'Tenant ID',
        label_he: 'ת.ז. השוכר',
        type: 'text',
        required: true,
        validation: { custom: 'israeli_id' },
      },
      {
        id: 'property_address',
        name: 'property_address',
        label: 'Property Address',
        label_he: 'כתובת הנכס',
        type: 'textarea',
        required: true,
        validation: { max_length: 500 },
      },
      {
        id: 'property_type',
        name: 'property_type',
        label: 'Property Type',
        label_he: 'סוג הנכס',
        type: 'select',
        required: true,
        options: [
          { value: 'apartment', label: 'Apartment', label_he: 'דירה' },
          { value: 'house', label: 'House', label_he: 'בית פרטי' },
          { value: 'office', label: 'Office', label_he: 'משרד' },
          { value: 'store', label: 'Store/Shop', label_he: 'חנות' },
          { value: 'warehouse', label: 'Warehouse', label_he: 'מחסן' },
        ],
      },
      {
        id: 'rental_start_date',
        name: 'rental_start_date',
        label: 'Rental Start Date',
        label_he: 'תאריך תחילת שכירות',
        type: 'date',
        required: true,
      },
      {
        id: 'rental_end_date',
        name: 'rental_end_date',
        label: 'Rental End Date',
        label_he: 'תאריך סיום שכירות',
        type: 'date',
        required: true,
      },
      {
        id: 'monthly_rent',
        name: 'monthly_rent',
        label: 'Monthly Rent (ILS)',
        label_he: 'שכ"ד חודשי (ש"ח)',
        type: 'currency',
        required: true,
        validation: { min: 0 },
      },
      {
        id: 'payment_day',
        name: 'payment_day',
        label: 'Payment Day of Month',
        label_he: 'יום תשלום בחודש',
        type: 'number',
        required: true,
        validation: { min: 1, max: 31 },
      },
      {
        id: 'deposit_amount',
        name: 'deposit_amount',
        label: 'Security Deposit (ILS)',
        label_he: 'פיקדון (ש"ח)',
        type: 'currency',
        required: true,
        validation: { min: 0 },
      },
      {
        id: 'includes_utilities',
        name: 'includes_utilities',
        label: 'Includes Utilities',
        label_he: 'כולל חשבונות',
        type: 'checkbox',
        required: false,
      },
    ],
  },

  // 5. Form 101 (טופס 101)
  {
    name: 'Form 101',
    name_he: 'טופס 101',
    description: 'Tax declaration form for new employees (Mas Hachnasa)',
    description_he: 'טופס הצהרה למס הכנסה לעובד חדש',
    category: 'hr',
    s3_key: 'templates/hr/form-101-v1.pdf',
    supported_crms: ['monday'],
    supported_erps: ['priority', 'sap', 'hashavshevet'],
    fields: [
      {
        id: 'employee_name',
        name: 'employee_name',
        label: 'Full Name',
        label_he: 'שם מלא',
        type: 'text',
        required: true,
        validation: { min_length: 2, max_length: 100 },
        crm_mapping: { monday: 'name' },
      },
      {
        id: 'employee_id',
        name: 'employee_id',
        label: 'ID Number',
        label_he: 'מספר ת.ז.',
        type: 'text',
        required: true,
        validation: { custom: 'israeli_id' },
      },
      {
        id: 'birth_date',
        name: 'birth_date',
        label: 'Date of Birth',
        label_he: 'תאריך לידה',
        type: 'date',
        required: true,
      },
      {
        id: 'address',
        name: 'address',
        label: 'Address',
        label_he: 'כתובת',
        type: 'textarea',
        required: true,
        validation: { max_length: 500 },
      },
      {
        id: 'marital_status',
        name: 'marital_status',
        label: 'Marital Status',
        label_he: 'מצב משפחתי',
        type: 'select',
        required: true,
        options: [
          { value: 'single', label: 'Single', label_he: 'רווק/ה' },
          { value: 'married', label: 'Married', label_he: 'נשוי/אה' },
          { value: 'divorced', label: 'Divorced', label_he: 'גרוש/ה' },
          { value: 'widowed', label: 'Widowed', label_he: 'אלמן/ה' },
        ],
      },
      {
        id: 'spouse_working',
        name: 'spouse_working',
        label: 'Spouse Working',
        label_he: 'בן/בת הזוג עובד/ת',
        type: 'checkbox',
        required: false,
      },
      {
        id: 'num_children',
        name: 'num_children',
        label: 'Number of Children',
        label_he: 'מספר ילדים',
        type: 'number',
        required: true,
        validation: { min: 0, max: 20 },
      },
      {
        id: 'bank_name',
        name: 'bank_name',
        label: 'Bank Name',
        label_he: 'שם הבנק',
        type: 'text',
        required: true,
        validation: { max_length: 100 },
      },
      {
        id: 'bank_branch',
        name: 'bank_branch',
        label: 'Bank Branch',
        label_he: 'מספר סניף',
        type: 'text',
        required: true,
        validation: { pattern: '^[0-9]{1,4}$' },
      },
      {
        id: 'bank_account',
        name: 'bank_account',
        label: 'Account Number',
        label_he: 'מספר חשבון',
        type: 'text',
        required: true,
        validation: { pattern: '^[0-9]{1,12}$' },
      },
      {
        id: 'other_income',
        name: 'other_income',
        label: 'Other Income Sources',
        label_he: 'הכנסות נוספות',
        type: 'checkbox',
        required: false,
      },
      {
        id: 'pension_fund',
        name: 'pension_fund',
        label: 'Pension Fund Name',
        label_he: 'שם קרן הפנסיה',
        type: 'text',
        required: false,
        validation: { max_length: 100 },
      },
      {
        id: 'declaration_date',
        name: 'declaration_date',
        label: 'Declaration Date',
        label_he: 'תאריך הצהרה',
        type: 'date',
        required: true,
      },
    ],
  },
];

async function seedTemplates(): Promise<void> {
  logger.info('🌱 Seeding MCP starter templates...');

  try {
    // Get first organization to use as template owner
    // In production, these should be system/public templates
    let systemOrgId: string;

    const existingOrg = await query<{ id: string }>(
      `SELECT id FROM organizations ORDER BY created_at LIMIT 1`,
    );

    if (existingOrg.length > 0) {
      systemOrgId = existingOrg[0].id;
      logger.info(`Using organization: ${systemOrgId}`);
    } else {
      logger.error('No organizations found. Please create an organization first.');
      process.exit(1);
    }

    // Insert templates
    for (const template of starterTemplates) {
      // Check if template already exists
      const existing = await query(
        `SELECT id FROM mcp_templates
         WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL`,
        [systemOrgId, template.name],
      );

      if (existing.length > 0) {
        logger.info(`⏭️  Skipping ${template.name_he} (already exists)`);
        continue;
      }

      await query(
        `INSERT INTO mcp_templates (
          organization_id,
          name,
          name_he,
          description,
          description_he,
          category,
          s3_key,
          s3_bucket,
          fields,
          supported_crms,
          supported_erps,
          language,
          is_active,
          is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          systemOrgId,
          template.name,
          template.name_he,
          template.description,
          template.description_he,
          template.category,
          template.s3_key,
          'rightflow-templates',
          JSON.stringify(template.fields),
          template.supported_crms,
          template.supported_erps,
          'he',
          true,
          true, // Public templates
        ],
      );

      logger.info(`✅ Created template: ${template.name_he}`);
    }

    logger.info('✅ All starter templates seeded successfully');

    // Print summary
    const count = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM mcp_templates WHERE organization_id = $1 AND deleted_at IS NULL`,
      [systemOrgId],
    );
    logger.info(`📊 Total MCP templates: ${count[0].count}`);

    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Failed to seed templates', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run seeder
seedTemplates();
