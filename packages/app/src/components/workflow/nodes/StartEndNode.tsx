/**
 * StartEndNode Component
 * Represents start and end nodes in the workflow
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const StartEndNode: React.FC<NodeProps> = ({ data, type, selected }) => {
  const isStart = type === 'start';
  const bgColor = isStart ? 'bg-green-500' : 'bg-red-500';
  const borderColor = selected ? 'border-indigo-600' : 'border-gray-300';

  return (
    <div
      className={`px-4 py-2 rounded-full shadow-lg ${bgColor} text-white border-2 ${borderColor} transition-all duration-200 ${
        selected ? 'shadow-xl scale-105' : ''
      }`}
    >
      <div className="flex items-center">
        <div className="text-lg font-bold">
          {isStart ? (
            <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {data.label || (isStart ? 'Start' : 'End')}
        </div>
      </div>

      {isStart ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-green-700"
        />
      ) : (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-red-700"
        />
      )}
    </div>
  );
};

export default memo(StartEndNode);