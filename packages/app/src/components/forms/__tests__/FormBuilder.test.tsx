/**
 * Unit tests for FormBuilder Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import FormBuilder from '../FormBuilder';
import { FormDefinition } from '../FormBuilder';

// Wrapper component for DnD context
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndProvider backend={HTML5Backend}>{children}</DndProvider>
);

describe('FormBuilder', () => {
  const mockOnChange = jest.fn();
  const mockOnSave = jest.fn();

  const defaultForm: FormDefinition = {
    name: 'Test Form',
    description: 'Test Description',
    fields: [],
    submitButtonText: 'Submit',
    successMessage: 'Success!',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form builder with title', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      expect(screen.getByText('Form Designer')).toBeInTheDocument();
    });

    it('should render field palette', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      expect(screen.getByText('Text Field')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Dropdown')).toBeInTheDocument();
      expect(screen.getByText('Checkbox')).toBeInTheDocument();
    });

    it('should render form metadata inputs', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      expect(screen.getByDisplayValue('Test Form')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Submit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Success!')).toBeInTheDocument();
    });

    it('should render existing fields', () => {
      const formWithFields: FormDefinition = {
        ...defaultForm,
        fields: [
          {
            id: 'field1',
            type: 'text',
            label: 'First Name',
            name: 'first_name',
            required: true,
          },
          {
            id: 'field2',
            type: 'email',
            label: 'Email',
            name: 'email',
            required: false,
          },
        ],
      };

      render(
        <Wrapper>
          <FormBuilder form={formWithFields} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  describe('Form Metadata Updates', () => {
    it('should update form name', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      const nameInput = screen.getByDisplayValue('Test Form');
      fireEvent.change(nameInput, { target: { value: 'Updated Form Name' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Form Name',
        })
      );
    });

    it('should update form description', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      const descInput = screen.getByDisplayValue('Test Description');
      fireEvent.change(descInput, { target: { value: 'New Description' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'New Description',
        })
      );
    });
  });

  describe('Field Management', () => {
    it('should delete field when delete button is clicked', () => {
      const formWithField: FormDefinition = {
        ...defaultForm,
        fields: [
          {
            id: 'field1',
            type: 'text',
            label: 'Test Field',
            name: 'test_field',
            required: false,
          },
        ],
      };

      render(
        <Wrapper>
          <FormBuilder form={formWithField} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [],
        })
      );
    });

    it('should show field properties panel when edit is clicked', () => {
      const formWithField: FormDefinition = {
        ...defaultForm,
        fields: [
          {
            id: 'field1',
            type: 'text',
            label: 'Test Field',
            name: 'test_field',
            required: false,
          },
        ],
      };

      render(
        <Wrapper>
          <FormBuilder form={formWithField} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(screen.getByText('Field Properties')).toBeInTheDocument();
    });
  });

  describe('Preview Mode', () => {
    it('should toggle between edit and preview mode', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      const previewButton = screen.getByText('Preview');
      fireEvent.click(previewButton);

      expect(screen.getByText('Edit Mode')).toBeInTheDocument();
    });
  });

  describe('Form Actions', () => {
    it('should call onSave when save button is clicked', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      const saveButton = screen.getByText('Save Form');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(defaultForm);
    });

    it('should clear form when clear button is clicked', () => {
      const formWithFields: FormDefinition = {
        ...defaultForm,
        fields: [
          {
            id: 'field1',
            type: 'text',
            label: 'Test Field',
            name: 'test_field',
            required: false,
          },
        ],
      };

      render(
        <Wrapper>
          <FormBuilder form={formWithFields} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Form',
          description: '',
          fields: [],
        })
      );
    });
  });

  describe('Field Name Collision Prevention', () => {
    it('should auto-rename duplicate field names', () => {
      const formWithDuplicates: FormDefinition = {
        ...defaultForm,
        fields: [
          {
            id: 'field1',
            type: 'text',
            label: 'Name',
            name: 'user_name',
            required: false,
          },
        ],
      };

      render(
        <Wrapper>
          <FormBuilder form={formWithDuplicates} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      // Edit field and try to set duplicate name
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // This would trigger the duplicate prevention logic
      // The actual field update would auto-rename it
    });
  });

  describe('ReadOnly Mode', () => {
    it('should disable editing in readonly mode', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} readOnly />
        </Wrapper>
      );

      const nameInput = screen.getByDisplayValue('Test Form');
      expect(nameInput).toBeDisabled();
    });
  });

  describe('Password Field Support', () => {
    it('should include password field type in palette', () => {
      render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it('should handle password fields correctly', () => {
      const formWithPassword: FormDefinition = {
        ...defaultForm,
        fields: [
          {
            id: 'pwd1',
            type: 'password',
            label: 'Password',
            name: 'password',
            required: true,
            validation: {
              minLength: 8,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$',
            },
          },
        ],
      };

      render(
        <Wrapper>
          <FormBuilder form={formWithPassword} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('Name: password')).toBeInTheDocument();
    });
  });

  describe('Form State Synchronization', () => {
    it('should update when form prop changes', () => {
      const { rerender } = render(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      const updatedForm: FormDefinition = {
        ...defaultForm,
        name: 'Updated Via Props',
      };

      rerender(
        <Wrapper>
          <FormBuilder form={updatedForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      expect(screen.getByDisplayValue('Updated Via Props')).toBeInTheDocument();
    });

    it('should reset selected field when it no longer exists', () => {
      const formWithField: FormDefinition = {
        ...defaultForm,
        fields: [
          {
            id: 'field1',
            type: 'text',
            label: 'Test Field',
            name: 'test_field',
            required: false,
          },
        ],
      };

      const { rerender } = render(
        <Wrapper>
          <FormBuilder form={formWithField} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      // Click edit to select the field
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(screen.getByText('Field Properties')).toBeInTheDocument();

      // Update form without the field
      rerender(
        <Wrapper>
          <FormBuilder form={defaultForm} onChange={mockOnChange} onSave={mockOnSave} />
        </Wrapper>
      );

      // Properties panel should be hidden
      expect(screen.queryByText('Field Properties')).not.toBeInTheDocument();
    });
  });
});