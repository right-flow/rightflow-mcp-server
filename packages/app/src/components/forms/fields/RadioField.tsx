/**
 * RadioField Component
 * Renders radio button group field
 */

import React from 'react';
import { FormField } from '../FormBuilder';

interface RadioFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly?: boolean;
}

const RadioField: React.FC<RadioFieldProps> = ({
  field,
  value,
  onChange,
  error,
  readOnly = false,
}) => {
  return (
    <div className={`mb-4 ${field.width === 'half' ? 'w-1/2' : field.width === 'third' ? 'w-1/3' : 'w-full'}`}>
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </legend>
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name={field.name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                disabled={readOnly}
                required={field.required && !value}
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

export default RadioField;