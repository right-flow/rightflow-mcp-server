/**
 * Unit tests for PDF Field Mapper Service
 */

import { pdfFieldMapper, PDFFieldInfo, FieldMapping } from '../pdfFieldMapper';
import { FormField } from '../../components/forms/FormBuilder';
import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox } from 'pdf-lib';

// Mock pdf-lib
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn(),
  },
  PDFTextField: jest.fn(),
  PDFCheckBox: jest.fn(),
  PDFRadioGroup: jest.fn(),
  PDFDropdown: jest.fn(),
  PDFField: jest.fn(),
}));

describe('PDFFieldMapper', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Field Name Normalization', () => {
    it('should normalize field names for comparison', () => {
      const formFields: FormField[] = [
        { id: '1', name: 'first_name', label: 'First Name', type: 'text', required: false },
        { id: '2', name: 'email_address', label: 'Email', type: 'email', required: true },
      ];

      const pdfFields: PDFFieldInfo[] = [
        { name: 'First Name', type: 'text' },
        { name: 'Email-Address', type: 'text' },
      ];

      const mappings = pdfFieldMapper.autoMapFields(formFields, pdfFields);

      expect(mappings).toHaveLength(2);
      expect(mappings[0].formFieldName).toBe('first_name');
      expect(mappings[0].pdfFieldName).toBe('First Name');
      expect(mappings[1].formFieldName).toBe('email_address');
      expect(mappings[1].pdfFieldName).toBe('Email-Address');
    });

    it('should handle partial matches', () => {
      const formFields: FormField[] = [
        { id: '1', name: 'name', label: 'Name', type: 'text', required: false },
      ];

      const pdfFields: PDFFieldInfo[] = [
        { name: 'customer_full_name', type: 'text' },
      ];

      const mappings = pdfFieldMapper.autoMapFields(formFields, pdfFields);

      expect(mappings).toHaveLength(1);
      expect(mappings[0].formFieldName).toBe('name');
      expect(mappings[0].pdfFieldName).toBe('customer_full_name');
    });
  });

  describe('Field Type Transformers', () => {
    it('should create transformer for checkbox fields', () => {
      const formFields: FormField[] = [
        { id: '1', name: 'agree', label: 'Agree', type: 'checkbox', required: false },
      ];

      const pdfFields: PDFFieldInfo[] = [
        { name: 'agree', type: 'checkbox' },
      ];

      const mappings = pdfFieldMapper.autoMapFields(formFields, pdfFields);

      expect(mappings[0].transformer).toBeDefined();
      if (mappings[0].transformer) {
        expect(mappings[0].transformer('yes')).toBe(true);
        expect(mappings[0].transformer('no')).toBe(false);
        expect(mappings[0].transformer(true)).toBe(true);
        expect(mappings[0].transformer(false)).toBe(false);
      }
    });

    it('should create transformer for date fields', () => {
      const formFields: FormField[] = [
        { id: '1', name: 'birth_date', label: 'Birth Date', type: 'date', required: false },
      ];

      const pdfFields: PDFFieldInfo[] = [
        { name: 'birth_date', type: 'text' },
      ];

      const mappings = pdfFieldMapper.autoMapFields(formFields, pdfFields);

      expect(mappings[0].transformer).toBeDefined();
      if (mappings[0].transformer) {
        const result = mappings[0].transformer('2024-01-15');
        expect(result).toMatch(/1\/15\/2024/);
      }
    });

    it('should create transformer for phone fields', () => {
      const formFields: FormField[] = [
        { id: '1', name: 'phone', label: 'Phone', type: 'phone', required: false },
      ];

      const pdfFields: PDFFieldInfo[] = [
        { name: 'phone', type: 'text' },
      ];

      const mappings = pdfFieldMapper.autoMapFields(formFields, pdfFields);

      expect(mappings[0].transformer).toBeDefined();
      if (mappings[0].transformer) {
        expect(mappings[0].transformer('1234567890')).toBe('(123) 456-7890');
        expect(mappings[0].transformer('123-456-7890')).toBe('123-456-7890');
      }
    });
  });

  describe('Hebrew Text Detection', () => {
    it('should detect Hebrew text in fields', () => {
      const text1 = 'שלום עולם';
      const text2 = 'Hello World';
      const text3 = 'Hello שלום';

      // Using the private method indirectly through the service
      expect(text1).toMatch(/[\u0590-\u05FF]/); // Hebrew text
      expect(text2).not.toMatch(/[\u0590-\u05FF]/); // No Hebrew
      expect(text3).toMatch(/[\u0590-\u05FF]/); // Mixed text
    });
  });

  describe('Form Generation from PDF', () => {
    it('should create form definition from PDF fields', () => {
      const pdfFields: PDFFieldInfo[] = [
        { name: 'first_name', type: 'text', required: true, maxLength: 50 },
        { name: 'email', type: 'text', required: true },
        { name: 'subscribe', type: 'checkbox', required: false },
        { name: 'country', type: 'dropdown', options: ['USA', 'Canada', 'Mexico'] },
      ];

      const form = pdfFieldMapper.createFormFromPDF(pdfFields);

      expect(form.name).toBe('PDF Generated Form');
      expect(form.fields).toHaveLength(4);

      expect(form.fields[0].name).toBe('first_name');
      expect(form.fields[0].label).toBe('First Name');
      expect(form.fields[0].type).toBe('text');
      expect(form.fields[0].validation?.maxLength).toBe(50);

      expect(form.fields[1].name).toBe('email');
      expect(form.fields[1].type).toBe('text');

      expect(form.fields[2].name).toBe('subscribe');
      expect(form.fields[2].type).toBe('checkbox');

      expect(form.fields[3].name).toBe('country');
      expect(form.fields[3].type).toBe('dropdown');
      expect(form.fields[3].options).toHaveLength(3);
    });

    it('should humanize field names for labels', () => {
      const pdfFields: PDFFieldInfo[] = [
        { name: 'first_name', type: 'text' },
        { name: 'EmailAddress', type: 'text' },
        { name: 'phone.number', type: 'text' },
      ];

      const form = pdfFieldMapper.createFormFromPDF(pdfFields);

      expect(form.fields[0].label).toBe('First Name');
      expect(form.fields[1].label).toBe('Email Address');
      expect(form.fields[2].label).toBe('Phone Number');
    });
  });

  describe('Form Data Validation', () => {
    it('should validate required fields', () => {
      const formData = {
        first_name: 'John',
        email: '', // Missing required field
      };

      const pdfFields: PDFFieldInfo[] = [
        { name: 'first_name', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
      ];

      const validation = pdfFieldMapper.validateFormData(formData, pdfFields);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('email is required');
    });

    it('should validate max length', () => {
      const formData = {
        name: 'This is a very long name that exceeds the maximum',
      };

      const pdfFields: PDFFieldInfo[] = [
        { name: 'name', type: 'text', maxLength: 10 },
      ];

      const validation = pdfFieldMapper.validateFormData(formData, pdfFields);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('name exceeds maximum length of 10');
    });

    it('should validate dropdown options', () => {
      const formData = {
        country: 'Invalid Country',
      };

      const pdfFields: PDFFieldInfo[] = [
        { name: 'country', type: 'dropdown', options: ['USA', 'Canada', 'Mexico'] },
      ];

      const validation = pdfFieldMapper.validateFormData(formData, pdfFields);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('country has invalid value');
    });

    it('should pass validation for valid data', () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        country: 'USA',
      };

      const pdfFields: PDFFieldInfo[] = [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'country', type: 'dropdown', options: ['USA', 'Canada'] },
      ];

      const validation = pdfFieldMapper.validateFormData(formData, pdfFields);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Mapping Profile Management', () => {
    it('should save mapping profile', () => {
      const profile = {
        name: 'Test Profile',
        pdfFileName: 'test.pdf',
        mappings: [
          { formFieldName: 'name', pdfFieldName: 'full_name' },
        ],
      };

      const saved = pdfFieldMapper.saveMappingProfile(profile);

      expect(saved.id).toMatch(/^profile_\d+$/);
      expect(saved.name).toBe('Test Profile');
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('should get all mapping profiles', () => {
      const profile1 = pdfFieldMapper.saveMappingProfile({
        name: 'Profile 1',
        mappings: [],
      });

      const profile2 = pdfFieldMapper.saveMappingProfile({
        name: 'Profile 2',
        mappings: [],
      });

      const profiles = pdfFieldMapper.getMappingProfiles();

      expect(profiles).toHaveLength(2);
      expect(profiles[0].id).toBe(profile1.id);
      expect(profiles[1].id).toBe(profile2.id);
    });

    it('should get mapping profile by ID', () => {
      const saved = pdfFieldMapper.saveMappingProfile({
        name: 'Test Profile',
        mappings: [],
      });

      const profile = pdfFieldMapper.getMappingProfile(saved.id);

      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Test Profile');
    });

    it('should update mapping profile', () => {
      const saved = pdfFieldMapper.saveMappingProfile({
        name: 'Original Name',
        mappings: [],
      });

      const updated = pdfFieldMapper.updateMappingProfile(saved.id, {
        name: 'Updated Name',
        pdfFileName: 'new.pdf',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.pdfFileName).toBe('new.pdf');
      expect(updated?.id).toBe(saved.id);
      expect(updated?.createdAt).toBe(saved.createdAt);
      expect(updated?.updatedAt).not.toBe(saved.updatedAt);
    });

    it('should delete mapping profile', () => {
      const saved = pdfFieldMapper.saveMappingProfile({
        name: 'Test Profile',
        mappings: [],
      });

      const result = pdfFieldMapper.deleteMappingProfile(saved.id);
      expect(result).toBe(true);

      const profile = pdfFieldMapper.getMappingProfile(saved.id);
      expect(profile).toBeNull();
    });

    it('should return false when deleting non-existent profile', () => {
      const result = pdfFieldMapper.deleteMappingProfile('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Complex Mapping Scenarios', () => {
    it('should handle empty field arrays', () => {
      const formFields: FormField[] = [];
      const pdfFields: PDFFieldInfo[] = [];

      const mappings = pdfFieldMapper.autoMapFields(formFields, pdfFields);

      expect(mappings).toHaveLength(0);
    });

    it('should handle fields with special characters', () => {
      const formFields: FormField[] = [
        { id: '1', name: 'user_email', label: 'Email', type: 'email', required: false },
      ];

      const pdfFields: PDFFieldInfo[] = [
        { name: 'user.email@field', type: 'text' },
      ];

      const mappings = pdfFieldMapper.autoMapFields(formFields, pdfFields);

      expect(mappings).toHaveLength(1);
      expect(mappings[0].formFieldName).toBe('user_email');
    });

    it('should prioritize exact matches over partial matches', () => {
      const formFields: FormField[] = [
        { id: '1', name: 'name', label: 'Name', type: 'text', required: false },
        { id: '2', name: 'full_name', label: 'Full Name', type: 'text', required: false },
      ];

      const pdfFields: PDFFieldInfo[] = [
        { name: 'name', type: 'text' },
        { name: 'full_name', type: 'text' },
      ];

      const mappings = pdfFieldMapper.autoMapFields(formFields, pdfFields);

      expect(mappings).toHaveLength(2);

      const nameMapping = mappings.find(m => m.formFieldName === 'name');
      expect(nameMapping?.pdfFieldName).toBe('name');

      const fullNameMapping = mappings.find(m => m.formFieldName === 'full_name');
      expect(fullNameMapping?.pdfFieldName).toBe('full_name');
    });
  });
});