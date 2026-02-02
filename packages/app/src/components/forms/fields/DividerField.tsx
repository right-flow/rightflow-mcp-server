/**
 * DividerField Component
 * Renders horizontal divider in form
 */

import React from 'react';
import { FormField } from '../FormBuilder';

interface DividerFieldProps {
  field: FormField;
}

const DividerField: React.FC<DividerFieldProps> = ({ field }) => {
  return (
    <div className="my-6 w-full">
      <hr className="border-t border-gray-300" />
      {field.label && (
        <div className="relative -mt-3 text-center">
          <span className="bg-white px-3 text-sm text-gray-500">
            {field.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default DividerField;