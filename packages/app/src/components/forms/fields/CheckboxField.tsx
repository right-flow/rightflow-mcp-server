/**
 * CheckboxField Component
 * Renders checkbox field (single or multiple)
 */

import React from 'react';
import { FormField } from '../FormBuilder';

interface CheckboxFieldProps {
  field: FormField;
  value: boolean | string[];
  onChange: (value: boolean | string[]) => void;
  error?: string;
  readOnly?: boolean;
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  field,
  value,
  onChange,
  error,
  readOnly = false,
}) => {
  // Single checkbox (boolean value)
  if (!field.options || field.options.length === 0) {
    return (
      <div className={`mb-4 ${field.width === 'half' ? 'w-1/2' : field.width === 'third' ? 'w-1/3' : 'w-full'}`}>
        <label className="flex items-start">
          <input
            type="checkbox"
            id={field.id}
            name={field.name}
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
            required={field.required && !value}
            className="mt-1 mr-2 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </span>
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
          </div>
        </label>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  // Multiple checkboxes (array value)
  const arrayValue = Array.isArray(value) ? value : [];

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...arrayValue, optionValue]);
    } else {
      onChange(arrayValue.filter(v => v !== optionValue));
    }
  };

  return (
    <div className={`mb-4 ${field.width === 'half' ? 'w-1/2' : field.width === 'third' ? 'w-1/3' : 'w-full'}`}>
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </legend>
        <div className="space-y-2">
          {field.options.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="checkbox"
                name={`${field.name}[]`}
                value={option.value}
                checked={arrayValue.includes(option.value)}
                onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                disabled={readOnly}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {field.helpText && (
        <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CheckboxField;