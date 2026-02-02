/**
 * ApprovalNode Component
 * Represents an approval/decision node in the workflow
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ApprovalNodeData {
  label?: string;
  approverType?: 'user' | 'role' | 'dynamic';
  approverRole?: string;
  approverIds?: string[];
  options?: string[];
  escalation?: {
    timeout: number;
    escalateTo: string;
  };
}

const ApprovalNode: React.FC<NodeProps<ApprovalNodeData>> = ({ data, selected }) => {
  const borderColor = selected ? 'border-indigo-600' : 'border-gray-300';

  const getApproverDisplay = () => {
    if (data.approverType === 'role') {
      return data.approverRole || 'Role';
    }
    if (data.approverType === 'user' && data.approverIds && data.approverIds.length > 0) {
      return `${data.approverIds.length} User${data.approverIds.length > 1 ? 's' : ''}`;
    }
    if (data.approverType === 'dynamic') {
      return 'Dynamic';
    }
    return 'Approver';
  };

  return (
    <div className="relative">
      <div
        className={`bg-rose-100 border-2 ${borderColor} rounded-lg shadow-lg p-3 min-w-[180px] transition-all duration-200 ${
          selected ? 'shadow-xl scale-105' : ''
        }`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-rose-500"
        />

        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-semibold text-rose-900 ml-2">
            {data.label || 'Approval'}
          </div>
        </div>

        <div className="text-xs text-rose-700 mb-2">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {getApproverDisplay()}
          </div>
        </div>

        {data.options && data.options.length > 0 && (
          <div className="text-xs text-gray-600 border-t border-rose-200 pt-2 mt-2">
            <div className="font-medium mb-1">Options:</div>
            <div className="flex flex-wrap gap-1">
              {data.options.map((option, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-white rounded text-xs text-gray-700"
                >
                  {option}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.escalation && (
          <div className="text-xs text-amber-600 mt-2 pt-2 border-t border-rose-200">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Escalates after {Math.floor(data.escalation.timeout / 60000)}m
            </div>
          </div>
        )}

        {/* Approved output */}
        <Handle
          type="source"
          position={Position.Right}
          id="approved"
          className="w-3 h-3 !bg-green-500"
          style={{ right: -6 }}
        />
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-xs text-green-600 font-semibold">
          ✓
        </div>

        {/* Rejected output */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="rejected"
          className="w-3 h-3 !bg-red-500"
        />
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-red-600 font-semibold">
          ✗
        </div>
      </div>
    </div>
  );
};

export default memo(ApprovalNode);