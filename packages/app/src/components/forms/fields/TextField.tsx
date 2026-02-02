/**
 * TextField Component
 * Renders text input field with validation
 */

import React from 'react';
import { FormField } from '../FormBuilder';
import { sanitizeTextInput, sanitizeEmail, sanitizePhone, getTextDirection } from '../utils/sanitization';

interface TextFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly?: boolean;
}

const TextField: React.FC<TextFieldProps> = ({
  field,
  value,
  onChange,
  error,
  readOnly = false,
}) => {
  const getInputType = () => {
    switch (field.type) {
      case 'password':
        return 'password';
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'text';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Apply sanitization based on field type
    switch (field.type) {
      case 'email':
        newValue = sanitizeEmail(newValue);
        break;
      case 'phone':
        newValue = sanitizePhone(newValue);
        break;
      case 'text':
        newValue = sanitizeTextInput(newValue);
        break;
      case 'password':
        // Don't sanitize passwords as it might break valid passwords
        break;
      default:
        // For other types (number, date, etc.), no sanitization needed
        break;
    }

    onChange(newValue);
  };

  // Determine text direction for Hebrew/RTL support
  const textDirection = getTextDirection(value);

  return (
    <div className={`mb-4 ${field.width === 'half' ? 'w-1/2' : field.width === 'third' ? 'w-1/3' : 'w-full'}`}>
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={field.id}
        type={getInputType()}
        name={field.name}
        value={value || ''}
        onChange={handleChange}
        placeholder={field.placeholder}
        required={field.required}
        readOnly={readOnly}
        dir={textDirection}
        min={field.validation?.min}
        max={field.validation?.max}
        minLength={field.validation?.minLength}
        maxLength={field.validation?.maxLength}
        pattern={field.validation?.pattern}
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

export default TextField;