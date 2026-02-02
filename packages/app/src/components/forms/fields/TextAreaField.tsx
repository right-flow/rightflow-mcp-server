/**
 * TextAreaField Component
 * Renders multi-line text input field
 */

import React from 'react';
import { FormField } from '../FormBuilder';
import { sanitizeTextInput, getTextDirection } from '../utils/sanitization';

interface TextAreaFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly?: boolean;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({
  field,
  value,
  onChange,
  error,
  readOnly = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const sanitizedValue = sanitizeTextInput(e.target.value);
    onChange(sanitizedValue);
  };

  const textDirection = getTextDirection(value);
  return (
    <div className={`mb-4 ${field.width === 'half' ? 'w-1/2' : field.width === 'third' ? 'w-1/3' : 'w-full'}`}>
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={field.id}
        name={field.name}
        value={value || ''}
        onChange={handleChange}
        placeholder={field.placeholder}
        required={field.required}
        readOnly={readOnly}
        dir={textDirection}
        minLength={field.validation?.minLength}
        maxLength={field.validation?.maxLength}
        rows={4}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${readOnly ? 'bg-gray-100' : ''}`}
        aria-describedby={`${field.id}-help ${field.id}-error`}
        aria-invalid={!!error}
      />
      {field.helpText && (
        <p id={`${field.id}-help`} className="mt-1 text-sm text-gray-500">{field.helpText}</p>
      )}
      {error && (
        <p id={`${field.id}-error`} className="mt-1 text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
};

export default TextAreaField;