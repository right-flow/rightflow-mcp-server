/**
 * FormBuilder Component
 * Visual form designer with drag-and-drop field creation
 */

import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import FieldPropertiesPanel from './FieldPropertiesPanel';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { FIELD_TYPE_ICONS } from '@/utils/iconMapping';

// Field type definitions
export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  validation?: FieldValidation;
  options?: FieldOption[];
  defaultValue?: any;
  helpText?: string;
  width?: 'full' | 'half' | 'third';
  conditional?: ConditionalRule;
}

export type FieldType =
  | 'text'
  | 'password'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'datetime'
  | 'textarea'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'signature'
  | 'heading'
  | 'divider';

export interface FieldValidation {
  min?: number | string; // string for date min
  max?: number | string; // string for date max
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  maxFileSize?: number; // in bytes
  customMessage?: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface FormDefinition {
  id?: string;
  name: string;
  description?: string;
  fields: FormField[];
  submitButtonText?: string;
  successMessage?: string;
  redirectUrl?: string;
}

interface FormBuilderProps {
  form?: FormDefinition;
  onSave: (form: FormDefinition) => void;
  onChange?: (form: FormDefinition) => void;
  readOnly?: boolean;
}

// Field palette items - using Material Symbol names
const FIELD_TYPES = [
  { type: 'text', label: 'Text Field', icon: 'edit_note' },
  { type: 'password', label: 'Password', icon: 'lock' },
  { type: 'number', label: 'Number', icon: 'tag' },
  { type: 'email', label: 'Email', icon: 'mail' },
  { type: 'phone', label: 'Phone', icon: 'phone_iphone' },
  { type: 'date', label: 'Date', icon: 'calendar_today' },
  { type: 'time', label: 'Time', icon: 'schedule' },
  { type: 'datetime', label: 'Date & Time', icon: 'event' },
  { type: 'textarea', label: 'Text Area', icon: 'article' },
  { type: 'dropdown', label: 'Dropdown', icon: 'arrow_drop_down' },
  { type: 'radio', label: 'Radio Buttons', icon: 'radio_button_checked' },
  { type: 'checkbox', label: 'Checkbox', icon: 'check_box' },
  { type: 'file', label: 'File Upload', icon: 'attach_file' },
  { type: 'signature', label: 'Signature', icon: 'draw' },
  { type: 'heading', label: 'Heading', icon: 'title' },
  { type: 'divider', label: 'Divider', icon: 'horizontal_rule' },
] as const;

// Draggable field type from palette
const DraggableFieldType: React.FC<{ fieldType: typeof FIELD_TYPES[number] }> = ({ fieldType }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: { type: fieldType.type, isNew: true },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`bg-white border-2 border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <MaterialIcon name={fieldType.icon} size="lg" className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{fieldType.label}</span>
      </div>
    </div>
  );
};

// Draggable form field
const DraggableFormField: React.FC<{
  field: FormField;
  index: number;
  onEdit: (field: FormField) => void;
  onDelete: (fieldId: string) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
}> = ({ field, index, onEdit, onDelete, onMove }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: { index, field, isNew: false },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'field',
    hover: (item: { index?: number; isNew: boolean }) => {
      if (!item.isNew && item.index !== undefined && item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  });

  const ref = React.useRef<HTMLDivElement>(null);
  drag(drop(ref));

  const getFieldIconName = () => {
    return FIELD_TYPE_ICONS[field.type] || 'edit_note';
  };

  return (
    <div
      ref={ref}
      className={`bg-white border-2 border-gray-200 rounded-lg p-4 mb-3 ${
        isDragging ? 'opacity-50' : ''
      } hover:border-blue-400 transition-colors`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
            <MaterialIcon name={getFieldIconName()} size="md" className="text-gray-500" />
            <h4 className="font-semibold text-gray-900">{field.label || 'Untitled Field'}</h4>
            {field.required && <span className="text-red-500">*</span>}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Name:</span> {field.name || 'unnamed'}
            {field.placeholder && (
              <>
                {' • '}
                <span className="font-medium">Placeholder:</span> {field.placeholder}
              </>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(field)}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(field.id)}
            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Main FormBuilder component
const FormBuilder: React.FC<FormBuilderProps> = ({
  form: initialForm,
  onSave,
  onChange,
  readOnly = false,
}) => {
  const [form, setForm] = useState<FormDefinition>(
    initialForm || {
      name: 'New Form',
      description: '',
      fields: [],
      submitButtonText: 'Submit',
      successMessage: 'Thank you for your submission!',
    }
  );

  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Sync internal state when prop changes
  React.useEffect(() => {
    if (initialForm) {
      setForm(initialForm);
      // Reset selected field if it's no longer in the form
      if (selectedField && !initialForm.fields.find(f => f.id === selectedField.id)) {
        setSelectedField(null);
      }
    }
  }, [initialForm, selectedField]);

  // Generate unique field ID
  const generateFieldId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check if field name is unique (excluding the current field)
  const isFieldNameUnique = useCallback((name: string, excludeFieldId?: string) => {
    return !form.fields.some(field =>
      field.name === name && field.id !== excludeFieldId
    );
  }, [form.fields]);

  // Generate unique field name
  const generateUniqueFieldName = useCallback((baseName: string): string => {
    if (isFieldNameUnique(baseName)) {
      return baseName;
    }

    let counter = 1;
    let uniqueName = `${baseName}_${counter}`;
    while (!isFieldNameUnique(uniqueName)) {
      counter++;
      uniqueName = `${baseName}_${counter}`;
    }
    return uniqueName;
  }, [isFieldNameUnique]);

  // Drop zone for new fields
  const [, drop] = useDrop({
    accept: 'field',
    drop: (item: { type?: FieldType; field?: FormField; isNew: boolean }) => {
      if (item.isNew && item.type) {
        const newField: FormField = {
          id: generateFieldId(),
          type: item.type,
          label: `New ${item.type} field`,
          name: generateUniqueFieldName(`field_${form.fields.length + 1}`),
          required: false,
        };

        // Add default options for select fields
        if (['dropdown', 'radio'].includes(item.type)) {
          newField.options = [
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
            { value: 'option3', label: 'Option 3' },
          ];
        }

        const updatedForm = {
          ...form,
          fields: [...form.fields, newField],
        };
        setForm(updatedForm);
        onChange?.(updatedForm);
        setSelectedField(newField);
      }
    },
  });

  // Update form field
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    // If updating name, ensure it's unique
    if (updates.name) {
      if (!isFieldNameUnique(updates.name, fieldId)) {
        // Generate a unique name if there's a collision
        updates.name = generateUniqueFieldName(updates.name);
      }
    }

    const updatedForm = {
      ...form,
      fields: form.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    };
    setForm(updatedForm);
    onChange?.(updatedForm);
  }, [form, onChange, isFieldNameUnique, generateUniqueFieldName]);

  // Delete form field
  const deleteField = useCallback((fieldId: string) => {
    const updatedForm = {
      ...form,
      fields: form.fields.filter(field => field.id !== fieldId),
    };
    setForm(updatedForm);
    onChange?.(updatedForm);
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  }, [form, onChange, selectedField]);

  // Move field (reorder)
  const moveField = useCallback((dragIndex: number, hoverIndex: number) => {
    const draggedField = form.fields[dragIndex];
    const newFields = [...form.fields];
    newFields.splice(dragIndex, 1);
    newFields.splice(hoverIndex, 0, draggedField);

    const updatedForm = {
      ...form,
      fields: newFields,
    };
    setForm(updatedForm);
    onChange?.(updatedForm);
  }, [form, onChange]);

  // Update form metadata
  const updateFormMetadata = (updates: Partial<FormDefinition>) => {
    const updatedForm = { ...form, ...updates };
    setForm(updatedForm);
    onChange?.(updatedForm);
  };

  const handleSave = () => {
    onSave(form);
  };

  if (readOnly) {
    return <div>Form preview in read-only mode</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex">
        {/* Left Panel - Field Palette */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Field Types</h3>
            <div className="space-y-2">
              {FIELD_TYPES.map(fieldType => (
                <DraggableFieldType key={fieldType.type} fieldType={fieldType} />
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Drag fields to the canvas to add them to your form
              </p>
            </div>
          </div>
        </div>

        {/* Center - Form Canvas */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Form Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Form Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateFormMetadata({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description || ''}
                    onChange={(e) => updateFormMetadata({ description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div
              ref={drop}
              className={`min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 ${
                form.fields.length === 0 ? 'flex items-center justify-center' : ''
              }`}
            >
              {form.fields.length === 0 ? (
                <div className="text-center">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <p className="text-gray-500">Drag fields here to build your form</p>
                </div>
              ) : (
                <div>
                  {form.fields.map((field, index) => (
                    <DraggableFormField
                      key={field.id}
                      field={field}
                      index={index}
                      onEdit={setSelectedField}
                      onDelete={deleteField}
                      onMove={moveField}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Form Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Submit Button Text
                  </label>
                  <input
                    type="text"
                    value={form.submitButtonText || 'Submit'}
                    onChange={(e) => updateFormMetadata({ submitButtonText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Success Message
                  </label>
                  <input
                    type="text"
                    value={form.successMessage || ''}
                    onChange={(e) => updateFormMetadata({ successMessage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  {showPreview ? 'Edit Mode' : 'Preview'}
                </button>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setForm({
                    name: 'New Form',
                    description: '',
                    fields: [],
                    submitButtonText: 'Submit',
                    successMessage: 'Thank you for your submission!',
                  })}
                  className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Form
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        {selectedField && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <FieldPropertiesPanel
              field={selectedField}
              existingFieldNames={form.fields
                .filter(f => f.id !== selectedField.id)
                .map(f => f.name)}
              onUpdate={(updatedField) => {
                updateField(selectedField.id, updatedField);
                setSelectedField(updatedField);
              }}
              onClose={() => setSelectedField(null)}
            />
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default FormBuilder;