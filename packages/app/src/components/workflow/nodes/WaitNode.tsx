/**
 * WaitNode Component
 * Represents a wait/delay node in the workflow
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface WaitNodeData {
  label?: string;
  waitType?: 'time' | 'event' | 'condition';
  duration?: number;
  eventType?: string;
}

const WaitNode: React.FC<NodeProps<WaitNodeData>> = ({ data, selected }) => {
  const borderColor = selected ? 'border-indigo-600' : 'border-gray-300';

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const getWaitIcon = () => {
    switch (data.waitType) {
      case 'time':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'event':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case 'condition':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`bg-gray-100 border-2 ${borderColor} rounded-lg shadow-lg p-3 min-w-[140px] transition-all duration-200 ${
        selected ? 'shadow-xl scale-105' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-500"
      />

      <div className="flex items-center mb-2">
        <div className="text-gray-600">
          {getWaitIcon()}
        </div>
        <div className="font-semibold text-gray-800 ml-2">
          {data.label || 'Wait'}
        </div>
      </div>

      <div className="text-xs text-gray-600">
        {data.waitType === 'time' && data.duration && (
          <div className="flex items-center">
            <span className="mr-1">⏱</span>
            {formatDuration(data.duration)}
          </div>
        )}
        {data.waitType === 'event' && (
          <div className="flex items-center">
            <span className="mr-1">📨</span>
            {data.eventType || 'Event'}
          </div>
        )}
        {data.waitType === 'condition' && (
          <div className="flex items-center">
            <span className="mr-1">🔄</span>
            Until condition
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-500"
      />
    </div>
  );
};

export default memo(WaitNode);