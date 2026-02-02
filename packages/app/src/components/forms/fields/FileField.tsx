/**
 * FileField Component
 * Renders file upload field
 */

import React, { useRef, useState } from 'react';
import { FormField } from '../FormBuilder';

interface FileFieldProps {
  field: FormField;
  value: File | null;
  onChange: (value: File | null) => void;
  error?: string;
  readOnly?: boolean;
}

const FileField: React.FC<FileFieldProps> = ({
  field,
  value,
  onChange,
  error,
  readOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file && field.validation?.maxFileSize) {
      if (file.size > field.validation.maxFileSize) {
        const maxSizeMB = (field.validation.maxFileSize / 1024 / 1024).toFixed(2);
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        setSizeError(
          field.validation.customMessage ||
          `File size (${fileSizeMB} MB) exceeds maximum allowed size of ${maxSizeMB} MB`
        );
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onChange(null);
        return;
      }
    }

    setSizeError('');
    onChange(file);
  };

  const handleClear = () => {
    onChange(null);
    setSizeError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`mb-4 ${field.width === 'half' ? 'w-1/2' : field.width === 'third' ? 'w-1/3' : 'w-full'}`}>
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center space-x-2">
        <input
          ref={fileInputRef}
          id={field.id}
          type="file"
          name={field.name}
          onChange={handleFileChange}
          required={field.required && !value}
          disabled={readOnly}
          accept={field.validation?.pattern} // Can be used for file type restriction
          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${readOnly ? 'bg-gray-100' : ''}`}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
            disabled={readOnly}
          >
            Clear
          </button>
        )}
      </div>
      {value && (
        <p className="mt-1 text-sm text-gray-600">
          Selected: {value.name} ({(value.size / 1024).toFixed(2)} KB)
        </p>
      )}
      {field.helpText && (
        <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
      )}
      {field.validation?.maxFileSize && (
        <p className="mt-1 text-sm text-gray-500">
          Maximum file size: {(field.validation.maxFileSize / 1024 / 1024).toFixed(2)} MB
        </p>
      )}
      {(error || sizeError) && (
        <p className="mt-1 text-sm text-red-600">{error || sizeError}</p>
      )}
    </div>
  );
};

export default FileField;