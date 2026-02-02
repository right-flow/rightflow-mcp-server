/**
 * PDF Field Mapper Service
 * Maps form data to PDF fields and handles field extraction
 */

import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFField } from 'pdf-lib';
import { FormField, FormDefinition } from '../components/forms/FormBuilder';

export interface PDFFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature' | 'unknown';
  required?: boolean;
  readOnly?: boolean;
  value?: any;
  options?: string[];
  multiline?: boolean;
  maxLength?: number;
}

export interface FieldMapping {
  formFieldName: string;
  pdfFieldName: string;
  transformer?: (value: any) => any;
}

export interface MappingProfile {
  id: string;
  name: string;
  pdfFileName?: string;
  mappings: FieldMapping[];
  createdAt: string;
  updatedAt: string;
}

class PDFFieldMapperService {
  /**
   * Extract field information from a PDF document
   */
  async extractPDFFields(pdfBytes: ArrayBuffer): Promise<PDFFieldInfo[]> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    return fields.map(field => {
      const fieldInfo: PDFFieldInfo = {
        name: field.getName(),
        type: this.getPDFFieldType(field),
        required: false,
        readOnly: field.isReadOnly(),
      };

      // Extract type-specific information
      if (field instanceof PDFTextField) {
        fieldInfo.multiline = field.isMultiline();
        fieldInfo.maxLength = field.getMaxLength();
        fieldInfo.value = field.getText();
      } else if (field instanceof PDFCheckBox) {
        fieldInfo.value = field.isChecked();
      } else if (field instanceof PDFRadioGroup) {
        fieldInfo.options = field.getOptions();
        fieldInfo.value = field.getSelected();
      } else if (field instanceof PDFDropdown) {
        fieldInfo.options = field.getOptions();
        fieldInfo.value = field.getSelected();
      }

      return fieldInfo;
    });
  }

  /**
   * Determine PDF field type
   */
  private getPDFFieldType(field: PDFField): PDFFieldInfo['type'] {
    if (field instanceof PDFTextField) return 'text';
    if (field instanceof PDFCheckBox) return 'checkbox';
    if (field instanceof PDFRadioGroup) return 'radio';
    if (field instanceof PDFDropdown) return 'dropdown';
    return 'unknown';
  }

  /**
   * Auto-map form fields to PDF fields based on name similarity
   */
  autoMapFields(formFields: FormField[], pdfFields: PDFFieldInfo[]): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    formFields.forEach(formField => {
      // Try exact match first
      let pdfField = pdfFields.find(pdf =>
        this.normalizeFieldName(pdf.name) === this.normalizeFieldName(formField.name)
      );

      // Try partial match if no exact match
      if (!pdfField) {
        pdfField = pdfFields.find(pdf => {
          const normalizedPdf = this.normalizeFieldName(pdf.name);
          const normalizedForm = this.normalizeFieldName(formField.name);
          return normalizedPdf.includes(normalizedForm) || normalizedForm.includes(normalizedPdf);
        });
      }

      if (pdfField) {
        mappings.push({
          formFieldName: formField.name,
          pdfFieldName: pdfField.name,
          transformer: this.getDefaultTransformer(formField.type, pdfField.type)
        });
      }
    });

    return mappings;
  }

  /**
   * Normalize field names for comparison
   */
  private normalizeFieldName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
  }

  /**
   * Get default transformer based on field types
   */
  private getDefaultTransformer(formType: string, pdfType: string) {
    // Handle boolean conversions
    if (pdfType === 'checkbox') {
      return (value: any) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
        }
        return !!value;
      };
    }

    // Handle date formatting
    if (formType === 'date' && pdfType === 'text') {
      return (value: string) => {
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleDateString('en-US');
      };
    }

    // Handle phone formatting
    if (formType === 'phone' && pdfType === 'text') {
      return (value: string) => {
        if (!value) return '';
        // Remove all non-digits
        const digits = value.replace(/\D/g, '');
        // Format as (XXX) XXX-XXXX if US phone
        if (digits.length === 10) {
          return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return value;
      };
    }

    // Default: return as-is
    return undefined;
  }

  /**
   * Fill PDF with form data using mappings
   */
  async fillPDF(
    pdfBytes: ArrayBuffer,
    formData: Record<string, any>,
    mappings: FieldMapping[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Apply each mapping
    for (const mapping of mappings) {
      try {
        const value = formData[mapping.formFieldName];
        if (value === undefined || value === null) continue;

        const transformedValue = mapping.transformer
          ? mapping.transformer(value)
          : value;

        const field = form.getField(mapping.pdfFieldName);

        // Set value based on field type
        if (field instanceof PDFTextField) {
          field.setText(String(transformedValue));
        } else if (field instanceof PDFCheckBox) {
          if (transformedValue) {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFRadioGroup) {
          field.select(String(transformedValue));
        } else if (field instanceof PDFDropdown) {
          field.select(String(transformedValue));
        }
      } catch (error) {
        console.error(`Error setting field ${mapping.pdfFieldName}:`, error);
      }
    }

    // Handle Hebrew text direction if needed
    this.handleHebrewText(form);

    return pdfDoc.save();
  }

  /**
   * Handle Hebrew text direction in PDF fields
   */
  private handleHebrewText(form: any): void {
    const fields = form.getFields();

    fields.forEach((field: PDFField) => {
      if (field instanceof PDFTextField) {
        const text = field.getText();
        if (text && this.containsHebrew(text)) {
          // Add RTL markers if needed
          // Note: This is a simplified approach, actual implementation
          // may require more sophisticated BiDi handling
          try {
            // Some PDF libraries support RTL direction setting
            // This is pseudo-code as pdf-lib doesn't directly support this
            // You might need to use alternative approaches or libraries
            console.log(`Hebrew text detected in field: ${field.getName()}`);
          } catch (error) {
            console.error('Error handling Hebrew text:', error);
          }
        }
      }
    });
  }

  /**
   * Check if text contains Hebrew characters
   */
  private containsHebrew(text: string): boolean {
    return /[\u0590-\u05FF]/.test(text);
  }

  /**
   * Save mapping profile to localStorage
   */
  saveMappingProfile(profile: Omit<MappingProfile, 'id' | 'createdAt' | 'updatedAt'>): MappingProfile {
    const profiles = this.getMappingProfiles();

    const newProfile: MappingProfile = {
      ...profile,
      id: `profile_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    profiles.push(newProfile);
    localStorage.setItem('pdf_mapping_profiles', JSON.stringify(profiles));

    return newProfile;
  }

  /**
   * Get all mapping profiles
   */
  getMappingProfiles(): MappingProfile[] {
    try {
      const stored = localStorage.getItem('pdf_mapping_profiles');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading mapping profiles:', error);
      return [];
    }
  }

  /**
   * Get mapping profile by ID
   */
  getMappingProfile(id: string): MappingProfile | null {
    const profiles = this.getMappingProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  /**
   * Update mapping profile
   */
  updateMappingProfile(id: string, updates: Partial<MappingProfile>): MappingProfile | null {
    const profiles = this.getMappingProfiles();
    const index = profiles.findIndex(p => p.id === id);

    if (index === -1) return null;

    profiles[index] = {
      ...profiles[index],
      ...updates,
      id: profiles[index].id,
      createdAt: profiles[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('pdf_mapping_profiles', JSON.stringify(profiles));
    return profiles[index];
  }

  /**
   * Delete mapping profile
   */
  deleteMappingProfile(id: string): boolean {
    const profiles = this.getMappingProfiles();
    const filtered = profiles.filter(p => p.id !== id);

    if (filtered.length === profiles.length) return false;

    localStorage.setItem('pdf_mapping_profiles', JSON.stringify(filtered));
    return true;
  }

  /**
   * Create form definition from PDF fields
   */
  createFormFromPDF(pdfFields: PDFFieldInfo[]): FormDefinition {
    const formFields: FormField[] = pdfFields.map((pdfField, index) => {
      const formField: FormField = {
        id: `field_${index}`,
        name: pdfField.name,
        label: this.humanizeFieldName(pdfField.name),
        type: this.mapPDFTypeToFormType(pdfField.type),
        required: pdfField.required || false,
        defaultValue: pdfField.value,
      };

      // Add options for dropdowns and radios
      if (pdfField.options && pdfField.options.length > 0) {
        formField.options = pdfField.options.map(opt => ({
          value: opt,
          label: opt,
        }));
      }

      // Add validation for text fields
      if (pdfField.type === 'text' && pdfField.maxLength) {
        formField.validation = { maxLength: pdfField.maxLength };
      }

      return formField;
    });

    return {
      name: 'PDF Generated Form',
      description: 'Form generated from PDF fields',
      fields: formFields,
      submitButtonText: 'Fill PDF',
      successMessage: 'PDF filled successfully!',
    };
  }

  /**
   * Convert PDF field type to form field type
   */
  private mapPDFTypeToFormType(pdfType: PDFFieldInfo['type']): FormField['type'] {
    switch (pdfType) {
      case 'text': return 'text';
      case 'checkbox': return 'checkbox';
      case 'radio': return 'radio';
      case 'dropdown': return 'dropdown';
      case 'signature': return 'signature';
      default: return 'text';
    }
  }

  /**
   * Humanize field name for label
   */
  private humanizeFieldName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\./g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Validate form data against PDF requirements
   */
  validateFormData(
    formData: Record<string, any>,
    pdfFields: PDFFieldInfo[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    pdfFields.forEach(field => {
      const value = formData[field.name];

      // Check required fields
      if (field.required && !value) {
        errors.push(`${field.name} is required`);
      }

      // Check max length
      if (field.maxLength && value && String(value).length > field.maxLength) {
        errors.push(`${field.name} exceeds maximum length of ${field.maxLength}`);
      }

      // Check valid options
      if (field.options && value && !field.options.includes(String(value))) {
        errors.push(`${field.name} has invalid value`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const pdfFieldMapper = new PDFFieldMapperService();