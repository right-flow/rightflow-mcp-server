/**
 * DropdownField Component
 * Renders select dropdown field
 */

import React from 'react';
import { FormField } from '../FormBuilder';

interface DropdownFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly?: boolean;
}

const DropdownField: React.FC<DropdownFieldProps> = ({
  field,
  value,
  onChange,
  error,
  readOnly = false,
}) => {
  return (
    <div className={`mb-4 ${field.width === 'half' ? 'w-1/2' : field.width === 'third' ? 'w-1/3' : 'w-full'}`}>
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={field.id}
        name={field.name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        disabled={readOnly}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${readOnly ? 'bg-gray-100' : ''}`}
      >
        <option value="">
          {field.placeholder || 'Select an option...'}
        </option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.helpText && (
        <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default DropdownField;