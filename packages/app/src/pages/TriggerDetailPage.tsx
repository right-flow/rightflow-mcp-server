/**
 * Trigger Detail Page
 * Shows trigger details with actions and execution history
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { triggersApi, TriggerWithActions } from '../api/triggersApi';

export function TriggerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trigger, setTrigger] = useState<TriggerWithActions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTrigger();
    }
  }, [id]);

  const loadTrigger = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await triggersApi.getTrigger(id);
      setTrigger(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trigger');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading trigger...</div>
      </div>
    );
  }

  if (error || !trigger) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error || 'Trigger not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/triggers')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Triggers
          </button>
          <h1 className="text-3xl font-bold">{trigger.name}</h1>
          <p className="text-gray-600 mt-2">Event Type: {trigger.event_type}</p>
        </div>

        {/* Trigger Info */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trigger Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{trigger.status}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Priority</dt>
              <dd className="mt-1 text-sm text-gray-900">{trigger.priority}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Level</dt>
              <dd className="mt-1 text-sm text-gray-900">{trigger.level}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Error Handling</dt>
              <dd className="mt-1 text-sm text-gray-900">{trigger.error_handling}</dd>
            </div>
          </dl>
        </div>

        {/* Actions List */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Actions ({trigger.actions.length})</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Add Action
            </button>
          </div>

          {trigger.actions.length === 0 ? (
            <p className="text-gray-500">No actions configured yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {trigger.actions.map((action) => (
                <li key={action.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {action.order}. {action.action_type}
                      </p>
                      <p className="text-sm text-gray-500">
                        Timeout: {action.timeout_ms}ms
                        {action.is_critical && ' (Critical)'}
                      </p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-900">Edit</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Statistics */}
        {trigger.statistics && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Execution Statistics</h2>
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Executions</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {trigger.statistics.totalExecutions}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Success Rate</dt>
                <dd className="mt-1 text-2xl font-semibold text-green-600">
                  {trigger.statistics.successRate.toFixed(1)}%
                </dd>
              </div>
              {trigger.statistics.avgExecutionTime && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Avg Execution Time</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">
                    {trigger.statistics.avgExecutionTime.toFixed(0)}ms
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
