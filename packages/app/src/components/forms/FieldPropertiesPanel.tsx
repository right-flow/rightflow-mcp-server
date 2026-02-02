/**
 * FieldPropertiesPanel Component
 * Panel for editing form field properties
 */

import React, { useEffect, useState } from 'react';
import { FormField, FieldType, FieldOption } from './FormBuilder';

interface FieldPropertiesPanelProps {
  field: FormField;
  existingFieldNames?: string[];
  onUpdate: (field: FormField) => void;
  onClose: () => void;
}

const FieldPropertiesPanel: React.FC<FieldPropertiesPanelProps> = ({
  field,
  existingFieldNames = [],
  onUpdate,
  onClose,
}) => {
  const [localField, setLocalField] = useState<FormField>(field);
  const [nameError, setNameError] = useState<string>('');
  const [patternError, setPatternError] = useState<string>('');

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  const updateProperty = (property: keyof FormField, value: any) => {
    // Validate field name for duplicates
    if (property === 'name' && value) {
      if (existingFieldNames.includes(value)) {
        setNameError('This field name is already in use. It will be auto-renamed when saved.');
      } else {
        setNameError('');
      }
    }

    const updated = { ...localField, [property]: value };
    setLocalField(updated);
  };

  const updateValidation = (property: string, value: any) => {
    // Validate regex pattern if updating pattern
    if (property === 'pattern' && value) {
      try {
        new RegExp(value);
        setPatternError('');
      } catch (e) {
        setPatternError('Invalid regex pattern. Please check the syntax.');
      }
    }

    const updated = {
      ...localField,
      validation: {
        ...localField.validation,
        [property]: value,
      },
    };
    setLocalField(updated);
  };

  const updateOption = (index: number, property: keyof FieldOption, value: string) => {
    const options = [...(localField.options || [])];
    options[index] = { ...options[index], [property]: value };
    setLocalField({ ...localField, options });
  };

  const addOption = () => {
    const options = [...(localField.options || [])];
    options.push({
      value: `option${options.length + 1}`,
      label: `Option ${options.length + 1}`
    });
    setLocalField({ ...localField, options });
  };

  const removeOption = (index: number) => {
    const options = [...(localField.options || [])];
    options.splice(index, 1);
    setLocalField({ ...localField, options });
  };

  const handleSave = () => {
    onUpdate(localField);
  };

  const showOptionsEditor = ['dropdown', 'radio', 'checkbox'].includes(localField.type);
  const showValidation = !['heading', 'divider'].includes(localField.type);
  const showPlaceholder = ['text', 'password', 'email', 'phone', 'number', 'textarea', 'dropdown'].includes(localField.type);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Field Properties</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Properties Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Basic Properties */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Properties</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Type
                </label>
                <select
                  value={localField.type}
                  onChange={(e) => updateProperty('type', e.target.value as FieldType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="password">Password</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="date">Date</option>
                  <option value="time">Time</option>
                  <option value="datetime">Date & Time</option>
                  <option value="textarea">Text Area</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="radio">Radio Buttons</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="file">File Upload</option>
                  <option value="signature">Signature</option>
                  <option value="heading">Heading</option>
                  <option value="divider">Divider</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={localField.label}
                  onChange={(e) => updateProperty('label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!['heading', 'divider'].includes(localField.type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Name (for data)
                  </label>
                  <input
                    type="text"
                    value={localField.name}
                    onChange={(e) => updateProperty('name', e.target.value.replace(/\s+/g, '_'))}
                    className={`w-full px-3 py-2 border ${
                      nameError ? 'border-orange-400' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm`}
                    placeholder="field_name"
                  />
                  {nameError && (
                    <p className="mt-1 text-sm text-orange-600">{nameError}</p>
                  )}
                </div>
              )}

              {showPlaceholder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={localField.placeholder || ''}
                    onChange={(e) => updateProperty('placeholder', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Help Text
                </label>
                <textarea
                  value={localField.helpText || ''}
                  onChange={(e) => updateProperty('helpText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <select
                  value={localField.width || 'full'}
                  onChange={(e) => updateProperty('width', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full">Full Width</option>
                  <option value="half">Half Width</option>
                  <option value="third">Third Width</option>
                </select>
              </div>

              {!['heading', 'divider'].includes(localField.type) && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="required"
                    checked={localField.required || false}
                    onChange={(e) => updateProperty('required', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="required" className="text-sm font-medium text-gray-700">
                    Required Field
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Options Editor */}
          {showOptionsEditor && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Options</h4>
              <div className="space-y-2">
                {localField.options?.map((option, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={option.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="Value"
                    />
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="Label"
                    />
                    <button
                      onClick={() => removeOption(index)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className="w-full px-3 py-2 border border-gray-300 border-dashed rounded-md text-sm text-gray-600 hover:bg-gray-50"
                >
                  + Add Option
                </button>
              </div>
            </div>
          )}

          {/* Validation Rules */}
          {showValidation && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Validation Rules</h4>
              <div className="space-y-3">
                {['text', 'password', 'textarea', 'email', 'phone'].includes(localField.type) && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Min Length
                      </label>
                      <input
                        type="number"
                        value={localField.validation?.minLength || ''}
                        onChange={(e) => updateValidation('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Max Length
                      </label>
                      <input
                        type="number"
                        value={localField.validation?.maxLength || ''}
                        onChange={(e) => updateValidation('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </>
                )}

                {['number', 'date', 'time', 'datetime'].includes(localField.type) && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Minimum Value
                      </label>
                      <input
                        type={localField.type === 'number' ? 'number' : localField.type}
                        value={localField.validation?.min || ''}
                        onChange={(e) => updateValidation('min', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Maximum Value
                      </label>
                      <input
                        type={localField.type === 'number' ? 'number' : localField.type}
                        value={localField.validation?.max || ''}
                        onChange={(e) => updateValidation('max', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {['text', 'password', 'email', 'phone'].includes(localField.type) && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Pattern (RegEx)
                    </label>
                    <input
                      type="text"
                      value={localField.validation?.pattern || ''}
                      onChange={(e) => updateValidation('pattern', e.target.value || undefined)}
                      className={`w-full px-3 py-2 border ${
                        patternError ? 'border-red-400' : 'border-gray-300'
                      } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm`}
                      placeholder="^[A-Z]{2}[0-9]{4}$"
                    />
                    {patternError && (
                      <p className="mt-1 text-sm text-red-600">{patternError}</p>
                    )}
                  </div>
                )}

                {localField.type === 'file' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Allowed File Types
                      </label>
                      <input
                        type="text"
                        value={localField.validation?.pattern || ''}
                        onChange={(e) => updateValidation('pattern', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder=".pdf,.doc,.docx"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Maximum File Size (MB)
                      </label>
                      <input
                        type="number"
                        value={localField.validation?.maxFileSize ? (localField.validation.maxFileSize / 1024 / 1024) : ''}
                        onChange={(e) => {
                          const mb = parseFloat(e.target.value);
                          updateValidation('maxFileSize', mb > 0 ? mb * 1024 * 1024 : undefined);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5"
                        min="0.1"
                        step="0.1"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Custom Error Message
                  </label>
                  <input
                    type="text"
                    value={localField.validation?.customMessage || ''}
                    onChange={(e) => updateValidation('customMessage', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional Display */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Conditional Display</h4>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500">
                Configure when this field should be shown based on other field values.
                (Coming soon)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Changes
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldPropertiesPanel;