/**
 * FormPreview Component
 * Renders form in preview/runtime mode
 */

import React, { useState } from 'react';
import { FormDefinition, FormField } from './FormBuilder';
import {
  TextField,
  TextAreaField,
  DropdownField,
  RadioField,
  CheckboxField,
  FileField,
  SignatureField,
  HeadingField,
  DividerField
} from './fields';

interface FormPreviewProps {
  form: FormDefinition;
  onSubmit?: (data: Record<string, any>) => void;
  readOnly?: boolean;
  initialData?: Record<string, any>;
}

const FormPreview: React.FC<FormPreviewProps> = ({
  form,
  onSubmit,
  readOnly = false,
  initialData = {}
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Sync form data when initialData prop changes
  React.useEffect(() => {
    setFormData(initialData);
    setErrors({});
    setSubmitted(false);
  }, [initialData]);

  // Reset form when form definition changes significantly
  React.useEffect(() => {
    setErrors({});
    setSubmitted(false);
  }, [form]);

  // Update field value
  const updateFieldValue = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Validate single field
  const validateField = (field: FormField): string | undefined => {
    const value = formData[field.name];

    // Required validation
    if (field.required && !value) {
      return field.validation?.customMessage || `${field.label} is required`;
    }

    // Special password confirmation validation
    if (field.name === 'confirm_password' || field.name === 'password_confirm') {
      const passwordField = form.fields.find(f => f.name === 'password');
      if (passwordField && formData['password'] !== value) {
        return 'Passwords do not match';
      }
    }

    // Type-specific validation
    if (value && field.validation) {
      const { min, max, minLength, maxLength, pattern } = field.validation;

      // Length validation
      if (typeof value === 'string') {
        if (minLength && value.length < minLength) {
          return field.validation.customMessage || `${field.label} must be at least ${minLength} characters`;
        }
        if (maxLength && value.length > maxLength) {
          return field.validation.customMessage || `${field.label} must be at most ${maxLength} characters`;
        }

        // Pattern validation
        if (pattern) {
          try {
            const regex = new RegExp(pattern);
            if (!regex.test(value)) {
              return field.validation.customMessage || `${field.label} format is invalid`;
            }
          } catch (e) {
            // If pattern is invalid, log error and skip validation
            console.error(`Invalid regex pattern for field ${field.name}: ${pattern}`, e);
            // Optionally, you could return an error message to inform about the invalid pattern
            // return `Configuration error: Invalid pattern for ${field.label}`;
          }
        }
      }

      // Number validation
      if (typeof value === 'number' || field.type === 'number') {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (min !== undefined && numValue < min) {
          return field.validation.customMessage || `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && numValue > max) {
          return field.validation.customMessage || `${field.label} must be at most ${max}`;
        }
      }

      // Email validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return field.validation.customMessage || 'Please enter a valid email address';
        }
      }

      // Phone validation
      if (field.type === 'phone' && value) {
        const phoneRegex = /^[\d\s\-+()]+$/;
        if (!phoneRegex.test(value)) {
          return field.validation.customMessage || 'Please enter a valid phone number';
        }
      }
    }

    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    form.fields.forEach(field => {
      if (!['heading', 'divider'].includes(field.type)) {
        const error = validateField(field);
        if (error) {
          newErrors[field.name] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setSubmitted(true);
      onSubmit?.(formData);
    }
  };

  // Check if field should be displayed (conditional logic)
  const shouldShowField = (field: FormField): boolean => {
    if (!field.conditional) return true;

    const { fieldId, operator, value } = field.conditional;

    // Find the source field by ID to get its name
    const sourceField = form.fields.find(f => f.id === fieldId);
    if (!sourceField) {
      // If source field not found, show the field by default
      console.warn(`Conditional logic references non-existent field ID: ${fieldId}`);
      return true;
    }

    // Get the field value using the source field's name (formData is keyed by name, not ID)
    const fieldValue = formData[sourceField.name];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue || '').includes(value);
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      default:
        return true;
    }
  };

  // Render field component based on type
  const renderField = (field: FormField) => {
    if (!shouldShowField(field)) return null;

    const commonProps = {
      field,
      value: formData[field.name],
      onChange: (value: any) => updateFieldValue(field.name, value),
      error: errors[field.name],
      readOnly
    };

    switch (field.type) {
      case 'text':
      case 'password':
      case 'number':
      case 'email':
      case 'phone':
      case 'date':
      case 'time':
      case 'datetime':
        return <TextField key={field.id} {...commonProps} />;

      case 'textarea':
        return <TextAreaField key={field.id} {...commonProps} />;

      case 'dropdown':
        return <DropdownField key={field.id} {...commonProps} />;

      case 'radio':
        return <RadioField key={field.id} {...commonProps} />;

      case 'checkbox':
        return <CheckboxField key={field.id} {...commonProps} />;

      case 'file':
        return <FileField key={field.id} {...commonProps} />;

      case 'signature':
        return <SignatureField key={field.id} {...commonProps} />;

      case 'heading':
        return <HeadingField key={field.id} field={field} />;

      case 'divider':
        return <DividerField key={field.id} field={field} />;

      default:
        return null;
    }
  };

  // Show success message if submitted
  if (submitted && form.successMessage) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Success!</h3>
              <p className="text-green-700">{form.successMessage}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Form Header */}
        {(form.name || form.description) && (
          <div className="mb-8">
            {form.name && (
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.name}</h2>
            )}
            {form.description && (
              <p className="text-gray-600">{form.description}</p>
            )}
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-6">
          {form.fields.map(field => renderField(field))}
        </div>

        {/* Form Actions */}
        {!readOnly && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              {form.submitButtonText || 'Submit'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default FormPreview;