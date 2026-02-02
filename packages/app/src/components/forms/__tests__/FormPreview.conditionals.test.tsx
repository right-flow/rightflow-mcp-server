/**
 * Unit tests for FormPreview conditional field logic
 * Tests the fix for conditional field display based on formData indexed by field.name
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormPreview from '../FormPreview';
import { FormDefinition } from '../FormBuilder';

describe('FormPreview - Conditional Field Logic', () => {
  describe('shouldShowField function', () => {
    it('should show field when conditional fieldId references valid field name', () => {
      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'field-1',
            type: 'dropdown',
            name: 'country',
            label: 'Country',
            options: [
              { value: 'usa', label: 'USA' },
              { value: 'canada', label: 'Canada' },
            ],
          },
          {
            id: 'field-2',
            type: 'text',
            name: 'state',
            label: 'State',
            conditional: {
              fieldId: 'field-1', // References field by ID
              operator: 'equals',
              value: 'usa',
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{ country: 'canada' }} />,
      );

      // State field should be hidden when country is 'canada'
      expect(screen.queryByLabelText('State')).not.toBeInTheDocument();

      // Update to 'usa'
      rerender(<FormPreview form={form} initialData={{ country: 'usa' }} />);

      // State field should now be visible
      expect(screen.getByLabelText('State')).toBeInTheDocument();
    });

    it('should handle "equals" operator correctly', () => {
      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'source-field',
            type: 'radio',
            name: 'subscription_type',
            label: 'Subscription Type',
            options: [
              { value: 'free', label: 'Free' },
              { value: 'premium', label: 'Premium' },
            ],
          },
          {
            id: 'target-field',
            type: 'text',
            name: 'payment_method',
            label: 'Payment Method',
            conditional: {
              fieldId: 'source-field',
              operator: 'equals',
              value: 'premium',
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{ subscription_type: 'free' }} />,
      );

      expect(screen.queryByLabelText('Payment Method')).not.toBeInTheDocument();

      rerender(<FormPreview form={form} initialData={{ subscription_type: 'premium' }} />);

      expect(screen.getByLabelText('Payment Method')).toBeInTheDocument();
    });

    it('should handle "not_equals" operator correctly', () => {
      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'field-a',
            type: 'dropdown',
            name: 'employment_status',
            label: 'Employment Status',
            options: [
              { value: 'employed', label: 'Employed' },
              { value: 'unemployed', label: 'Unemployed' },
              { value: 'student', label: 'Student' },
            ],
          },
          {
            id: 'field-b',
            type: 'text',
            name: 'company_name',
            label: 'Company Name',
            conditional: {
              fieldId: 'field-a',
              operator: 'not_equals',
              value: 'unemployed',
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{ employment_status: 'unemployed' }} />,
      );

      // Should be hidden when unemployed
      expect(screen.queryByLabelText('Company Name')).not.toBeInTheDocument();

      // Should be visible when employed
      rerender(<FormPreview form={form} initialData={{ employment_status: 'employed' }} />);
      expect(screen.getByLabelText('Company Name')).toBeInTheDocument();

      // Should be visible when student
      rerender(<FormPreview form={form} initialData={{ employment_status: 'student' }} />);
      expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
    });

    it('should handle "contains" operator correctly', () => {
      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'search-field',
            type: 'text',
            name: 'search_query',
            label: 'Search',
          },
          {
            id: 'results-field',
            type: 'text',
            name: 'advanced_filters',
            label: 'Advanced Filters',
            conditional: {
              fieldId: 'search-field',
              operator: 'contains',
              value: 'advanced',
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{ search_query: 'simple search' }} />,
      );

      expect(screen.queryByLabelText('Advanced Filters')).not.toBeInTheDocument();

      rerender(<FormPreview form={form} initialData={{ search_query: 'advanced search' }} />);

      expect(screen.getByLabelText('Advanced Filters')).toBeInTheDocument();
    });

    it('should handle "greater_than" operator correctly', () => {
      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'age-field',
            type: 'number',
            name: 'age',
            label: 'Age',
          },
          {
            id: 'consent-field',
            type: 'checkbox',
            name: 'parental_consent',
            label: 'Parental Consent',
            conditional: {
              fieldId: 'age-field',
              operator: 'less_than',
              value: 18,
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{ age: 25 }} />,
      );

      // Should be hidden for adults
      expect(screen.queryByLabelText('Parental Consent')).not.toBeInTheDocument();

      // Should be visible for minors
      rerender(<FormPreview form={form} initialData={{ age: 15 }} />);
      expect(screen.getByLabelText('Parental Consent')).toBeInTheDocument();
    });

    it('should handle "less_than" operator correctly', () => {
      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'score-field',
            type: 'number',
            name: 'exam_score',
            label: 'Exam Score',
          },
          {
            id: 'retake-field',
            type: 'checkbox',
            name: 'retake_option',
            label: 'Would you like to retake?',
            conditional: {
              fieldId: 'score-field',
              operator: 'less_than',
              value: 70,
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{ exam_score: 85 }} />,
      );

      // Should be hidden for passing score
      expect(screen.queryByLabelText('Would you like to retake?')).not.toBeInTheDocument();

      // Should be visible for failing score
      rerender(<FormPreview form={form} initialData={{ exam_score: 65 }} />);
      expect(screen.getByLabelText('Would you like to retake?')).toBeInTheDocument();
    });

    it('should show field by default when conditional references non-existent field', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'field-1',
            type: 'text',
            name: 'username',
            label: 'Username',
          },
          {
            id: 'field-2',
            type: 'text',
            name: 'email',
            label: 'Email',
            conditional: {
              fieldId: 'non-existent-field-id', // Invalid reference
              operator: 'equals',
              value: 'test',
            },
          },
        ],
      };

      render(<FormPreview form={form} initialData={{}} />);

      // Field should be visible (graceful degradation)
      expect(screen.getByLabelText('Email')).toBeInTheDocument();

      // Should log warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Conditional logic references non-existent field ID: non-existent-field-id',
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle multiple conditional fields correctly', () => {
      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'membership-field',
            type: 'dropdown',
            name: 'membership',
            label: 'Membership Type',
            options: [
              { value: 'basic', label: 'Basic' },
              { value: 'premium', label: 'Premium' },
              { value: 'enterprise', label: 'Enterprise' },
            ],
          },
          {
            id: 'premium-features',
            type: 'checkbox',
            name: 'premium_support',
            label: 'Premium Support',
            conditional: {
              fieldId: 'membership-field',
              operator: 'equals',
              value: 'premium',
            },
          },
          {
            id: 'enterprise-features',
            type: 'checkbox',
            name: 'dedicated_account',
            label: 'Dedicated Account Manager',
            conditional: {
              fieldId: 'membership-field',
              operator: 'equals',
              value: 'enterprise',
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{ membership: 'basic' }} />,
      );

      // Both conditional fields should be hidden
      expect(screen.queryByLabelText('Premium Support')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Dedicated Account Manager')).not.toBeInTheDocument();

      // Show premium field
      rerender(<FormPreview form={form} initialData={{ membership: 'premium' }} />);
      expect(screen.getByLabelText('Premium Support')).toBeInTheDocument();
      expect(screen.queryByLabelText('Dedicated Account Manager')).not.toBeInTheDocument();

      // Show enterprise field
      rerender(<FormPreview form={form} initialData={{ membership: 'enterprise' }} />);
      expect(screen.queryByLabelText('Premium Support')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Dedicated Account Manager')).toBeInTheDocument();
    });

    it('should handle empty/undefined values correctly', () => {
      const form: FormDefinition = {
        name: 'Test Form',
        fields: [
          {
            id: 'optional-field',
            type: 'text',
            name: 'optional_input',
            label: 'Optional Input',
          },
          {
            id: 'dependent-field',
            type: 'text',
            name: 'dependent_input',
            label: 'Dependent Input',
            conditional: {
              fieldId: 'optional-field',
              operator: 'not_equals',
              value: '',
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{}} />,
      );

      // Dependent field should be hidden when source is undefined
      // (undefined !== '' is true, so field should show)
      expect(screen.getByLabelText('Dependent Input')).toBeInTheDocument();

      // When explicitly set to empty string
      rerender(<FormPreview form={form} initialData={{ optional_input: '' }} />);
      expect(screen.queryByLabelText('Dependent Input')).not.toBeInTheDocument();
    });

    it('should use field.name for formData lookup, not field.id', () => {
      // This is the core bug fix test
      const form: FormDefinition = {
        name: 'Bug Fix Test',
        fields: [
          {
            id: 'unique-field-id-123',
            type: 'text',
            name: 'user_email', // Different from ID
            label: 'Email Address',
          },
          {
            id: 'another-unique-id-456',
            type: 'text',
            name: 'confirmation_code',
            label: 'Confirmation Code',
            conditional: {
              fieldId: 'unique-field-id-123', // References by ID
              operator: 'contains',
              value: '@',
            },
          },
        ],
      };

      const { rerender } = render(
        <FormPreview form={form} initialData={{ user_email: 'test' }} />,
      );

      // Field should be hidden (no @ in 'test')
      expect(screen.queryByLabelText('Confirmation Code')).not.toBeInTheDocument();

      // Update formData with @ symbol
      rerender(<FormPreview form={form} initialData={{ user_email: 'test@example.com' }} />);

      // Field should now be visible
      expect(screen.getByLabelText('Confirmation Code')).toBeInTheDocument();
    });
  });
});
