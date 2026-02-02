/**
 * ConditionNode Component
 * Represents a conditional branching node in the workflow
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ConditionNodeData {
  label?: string;
  conditions?: any[];
  operator?: 'AND' | 'OR';
}

const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({ data, selected }) => {
  const borderColor = selected ? 'border-indigo-600' : 'border-gray-300';

  return (
    <div className="relative">
      {/* Diamond shape using CSS */}
      <div
        className={`bg-amber-100 border-2 ${borderColor} shadow-lg p-4 w-32 h-32 transform rotate-45 transition-all duration-200 ${
          selected ? 'shadow-xl scale-105' : ''
        }`}
        style={{
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        }}
      >
        <div className="transform -rotate-45 flex flex-col items-center justify-center h-full">
          <svg className="w-6 h-6 text-amber-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="text-xs font-semibold text-amber-900 text-center">
            {data.label || 'Condition'}
          </div>
          {data.operator && (
            <div className="text-xs text-amber-700 mt-1">
              {data.operator}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-amber-500"
        style={{ top: -6 }}
      />

      {/* True output */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 !bg-green-500"
        style={{ right: -6, top: '50%' }}
      />
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs text-green-600 font-semibold">
        ✓
      </div>

      {/* False output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 !bg-red-500"
        style={{ bottom: -6 }}
      />
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-red-600 font-semibold">
        ✗
      </div>
    </div>
  );
};

export default memo(ConditionNode);