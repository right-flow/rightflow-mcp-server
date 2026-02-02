/**
 * FormNode Component
 * Represents a form filling node in the workflow
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface FormNodeData {
  label?: string;
  formId?: string;
  formName?: string;
  required?: string[];
}

const FormNode: React.FC<NodeProps<FormNodeData>> = ({ data, selected }) => {
  const borderColor = selected ? 'border-indigo-600' : 'border-gray-300';

  return (
    <div
      className={`bg-blue-100 border-2 ${borderColor} rounded-lg shadow-lg p-3 min-w-[180px] transition-all duration-200 ${
        selected ? 'shadow-xl scale-105' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />

      <div className="flex items-center mb-2">
        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="font-semibold text-blue-900">
          {data.label || 'Form'}
        </div>
      </div>

      {data.formName && (
        <div className="text-xs text-blue-700 mb-1">
          📄 {data.formName}
        </div>
      )}

      {data.required && data.required.length > 0 && (
        <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-blue-200">
          <div className="font-medium mb-1">Required Fields:</div>
          <div className="space-y-0.5">
            {data.required.slice(0, 3).map((field, index) => (
              <div key={index} className="text-xs text-gray-500 truncate">
                • {field}
              </div>
            ))}
            {data.required.length > 3 && (
              <div className="text-xs text-gray-400 italic">
                +{data.required.length - 3} more...
              </div>
            )}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
};

export default memo(FormNode);