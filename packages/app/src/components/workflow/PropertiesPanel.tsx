/**
 * PropertiesPanel Component
 * Panel for editing properties of selected nodes and edges
 */

import React, { useEffect, useState } from 'react';
import { Node, Edge } from 'reactflow';

interface PropertiesPanelProps {
  selectedNode?: Node | null;
  selectedEdge?: Edge | null;
  onNodeChange: (nodeId: string, changes: any) => void;
  onEdgeChange: (edgeId: string, changes: any) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  selectedEdge,
  onNodeChange,
  onEdgeChange,
}) => {
  const [localData, setLocalData] = useState<any>({});

  useEffect(() => {
    if (selectedNode) {
      setLocalData(selectedNode.data || {});
    } else if (selectedEdge) {
      setLocalData(selectedEdge.data || {});
    } else {
      setLocalData({});
    }
  }, [selectedNode, selectedEdge]);

  const handleInputChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);

    if (selectedNode) {
      onNodeChange(selectedNode.id, { data: newData });
    } else if (selectedEdge) {
      onEdgeChange(selectedEdge.id, { data: newData });
    }
  };

  const renderNodeProperties = () => {
    if (!selectedNode) return null;

    switch (selectedNode.type) {
      case 'form':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Name
              </label>
              <input
                type="text"
                value={localData.label || ''}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter form name"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form ID
              </label>
              <input
                type="text"
                value={localData.formId || ''}
                onChange={(e) => handleInputChange('formId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="form-123"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Fields
              </label>
              <textarea
                value={localData.requiredFields?.join(', ') || ''}
                onChange={(e) =>
                  handleInputChange('requiredFields',
                    e.target.value.split(',').map(f => f.trim()).filter(f => f)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name, email, phone"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate field names with commas
              </p>
            </div>
          </>
        );

      case 'condition':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition Name
              </label>
              <input
                type="text"
                value={localData.label || ''}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter condition name"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field to Check
              </label>
              <input
                type="text"
                value={localData.field || ''}
                onChange={(e) => handleInputChange('field', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="age"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                value={localData.operator || 'equals'}
                onChange={(e) => handleInputChange('operator', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="gte">Greater or Equal</option>
                <option value="lte">Less or Equal</option>
                <option value="contains">Contains</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>
            {localData.operator !== 'is_empty' && localData.operator !== 'is_not_empty' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={localData.value || ''}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter value"
                />
              </div>
            )}
          </>
        );

      case 'action':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Name
              </label>
              <input
                type="text"
                value={localData.label || ''}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter action name"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={localData.actionType || 'email'}
                onChange={(e) => handleInputChange('actionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Send Email</option>
                <option value="whatsapp">Send WhatsApp</option>
                <option value="webhook">Call Webhook</option>
                <option value="pdf">Generate PDF</option>
                <option value="database">Database Query</option>
                <option value="task">Create Task</option>
                <option value="notification">Send Notification</option>
              </select>
            </div>
            {renderActionConfig()}
          </>
        );

      case 'wait':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wait Name
              </label>
              <input
                type="text"
                value={localData.label || ''}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter wait name"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wait Type
              </label>
              <select
                value={localData.waitType || 'duration'}
                onChange={(e) => handleInputChange('waitType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="duration">Fixed Duration</option>
                <option value="until">Until Date/Time</option>
                <option value="event">Until Event</option>
                <option value="condition">Until Condition</option>
              </select>
            </div>
            {localData.waitType === 'duration' && (
              <>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={localData.duration || 5}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </>
            )}
            {localData.waitType === 'event' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  value={localData.eventName || ''}
                  onChange={(e) => handleInputChange('eventName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="payment_received"
                />
              </div>
            )}
          </>
        );

      case 'approval':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval Name
              </label>
              <input
                type="text"
                value={localData.label || ''}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter approval name"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approver Type
              </label>
              <select
                value={localData.approverType || 'user'}
                onChange={(e) => handleInputChange('approverType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">Specific Users</option>
                <option value="role">By Role</option>
                <option value="dynamic">Dynamic (from data)</option>
              </select>
            </div>
            {localData.approverType === 'role' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={localData.approverRole || ''}
                  onChange={(e) => handleInputChange('approverRole', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="manager"
                />
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval Options
              </label>
              <textarea
                value={localData.options?.join(', ') || 'Approve, Reject'}
                onChange={(e) =>
                  handleInputChange('options',
                    e.target.value.split(',').map(o => o.trim()).filter(o => o)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Approve, Reject, Need More Info"
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate options with commas
              </p>
            </div>
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localData.enableEscalation || false}
                  onChange={(e) => handleInputChange('enableEscalation', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable Escalation
                </span>
              </label>
            </div>
            {localData.enableEscalation && (
              <>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Escalate After (hours)
                  </label>
                  <input
                    type="number"
                    value={localData.escalation?.timeout ? localData.escalation.timeout / 3600000 : 24}
                    onChange={(e) => handleInputChange('escalation', {
                      ...localData.escalation,
                      timeout: parseInt(e.target.value) * 3600000
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Escalate To
                  </label>
                  <input
                    type="text"
                    value={localData.escalation?.escalateTo || ''}
                    onChange={(e) => handleInputChange('escalation', {
                      ...localData.escalation,
                      escalateTo: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="senior-manager"
                  />
                </div>
              </>
            )}
          </>
        );

      case 'start':
      case 'end':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Node Type
            </label>
            <div className="bg-gray-100 px-3 py-2 rounded-md">
              {selectedNode.type === 'start' ? 'Workflow Start' : 'Workflow End'}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {selectedNode.type === 'start'
                ? 'This is where the workflow begins'
                : 'This is where the workflow completes'}
            </p>
          </div>
        );

      default:
        return <div>No properties available for this node type</div>;
    }
  };

  const renderActionConfig = () => {
    const actionType = localData.actionType;

    switch (actionType) {
      case 'email':
        return (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <input
                type="text"
                value={localData.config?.to || ''}
                onChange={(e) => handleInputChange('config', {
                  ...localData.config,
                  to: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="{{email}} or user@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{{field}}'} for dynamic values
              </p>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={localData.config?.subject || ''}
                onChange={(e) => handleInputChange('config', {
                  ...localData.config,
                  subject: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Form Submission Received"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body Template
              </label>
              <textarea
                value={localData.config?.body || ''}
                onChange={(e) => handleInputChange('config', {
                  ...localData.config,
                  body: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hello {{name}},&#10;&#10;Your form has been received..."
                rows={4}
              />
            </div>
          </>
        );

      case 'whatsapp':
        return (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={localData.config?.phone || ''}
                onChange={(e) => handleInputChange('config', {
                  ...localData.config,
                  phone: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="{{phone}} or +972501234567"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{{field}}'} for dynamic values
              </p>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Template
              </label>
              <textarea
                value={localData.config?.message || ''}
                onChange={(e) => handleInputChange('config', {
                  ...localData.config,
                  message: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="שלום {{name}},&#10;&#10;הטופס שלך התקבל בהצלחה..."
                rows={4}
              />
            </div>
          </>
        );

      case 'webhook':
        return (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="text"
                value={localData.config?.url || ''}
                onChange={(e) => handleInputChange('config', {
                  ...localData.config,
                  url: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Method
              </label>
              <select
                value={localData.config?.method || 'POST'}
                onChange={(e) => handleInputChange('config', {
                  ...localData.config,
                  method: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Headers (JSON)
              </label>
              <textarea
                value={localData.config?.headers || '{}'}
                onChange={(e) => handleInputChange('config', {
                  ...localData.config,
                  headers: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder='{"Authorization": "Bearer {{token}}"}'
                rows={3}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const renderEdgeProperties = () => {
    if (!selectedEdge) return null;

    return (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connection Label
          </label>
          <input
            type="text"
            value={localData.label || ''}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional label"
          />
        </div>
        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localData.conditional || false}
              onChange={(e) => handleInputChange('conditional', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">
              Conditional Connection
            </span>
          </label>
        </div>
        {localData.conditional && (
          <>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition Expression
              </label>
              <input
                type="text"
                value={localData.condition || ''}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="age >= 18"
              />
              <p className="text-xs text-gray-500 mt-1">
                This connection will only be followed if the condition is true
              </p>
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Properties
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {selectedNode ? `${selectedNode.type} node` :
           selectedEdge ? 'Connection' :
           'Select an element'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!selectedNode && !selectedEdge ? (
          <div className="text-center text-gray-500 py-8">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No element selected</p>
            <p className="text-sm mt-2">
              Click on a node or edge to edit its properties
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedNode && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Node ID
                  </label>
                  <div className="bg-gray-100 px-3 py-2 rounded-md font-mono text-sm">
                    {selectedNode.id}
                  </div>
                </div>
                {renderNodeProperties()}
              </>
            )}
            {selectedEdge && renderEdgeProperties()}
          </div>
        )}
      </div>

      {(selectedNode || selectedEdge) && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => {
                console.log('Properties saved:', localData);
              }}
            >
              Apply Changes
            </button>
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              onClick={() => {
                if (selectedNode) {
                  setLocalData(selectedNode.data || {});
                } else if (selectedEdge) {
                  setLocalData(selectedEdge.data || {});
                }
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;