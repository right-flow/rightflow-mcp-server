/**
 * NodePalette Component
 * Drag and drop palette for workflow nodes
 */

import React from 'react';

interface NodeType {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const nodeTypes: NodeType[] = [
  {
    type: 'form',
    label: 'Form',
    description: 'Collect data from users',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'blue',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch based on conditions',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'amber',
  },
  {
    type: 'action',
    label: 'Action',
    description: 'Perform automated actions',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'purple',
  },
  {
    type: 'wait',
    label: 'Wait',
    description: 'Delay or wait for events',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'gray',
  },
  {
    type: 'approval',
    label: 'Approval',
    description: 'Request approval from users',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'rose',
  },
];

const NodePalette: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
      rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Node Palette</h3>
        <p className="text-sm text-gray-500 mt-1">Drag nodes to the canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {nodeTypes.map((node) => {
            const colors = getColorClasses(node.color);
            return (
              <div
                key={node.type}
                className={`${colors.bg} ${colors.border} border-2 rounded-lg p-3 cursor-move hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
              >
                <div className="flex items-start space-x-3">
                  <div className={`${colors.text} mt-0.5`}>{node.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {node.label}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {node.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Tips</h4>
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Drag nodes to the canvas to add them</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Connect nodes by dragging from handle to handle</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Select a node to edit its properties</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Press Delete to remove selected items</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">•</span>
              <span>Ctrl+S to save your workflow</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodePalette;