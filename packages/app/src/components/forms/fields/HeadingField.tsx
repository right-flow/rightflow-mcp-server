/**
 * HeadingField Component
 * Renders heading/section title in form
 */

import React from 'react';
import { FormField } from '../FormBuilder';

interface HeadingFieldProps {
  field: FormField;
}

const HeadingField: React.FC<HeadingFieldProps> = ({ field }) => {
  return (
    <div className="mb-4 w-full">
      <h3 className="text-lg font-semibold text-gray-900">
        {field.label}
      </h3>
      {field.helpText && (
        <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
};

export default HeadingField;