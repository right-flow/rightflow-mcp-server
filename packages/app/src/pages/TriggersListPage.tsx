/**
 * Triggers List Page
 * Shows all event triggers with filtering and search
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggersApi, EventTrigger, EventType, TriggerStatus } from '../api/triggersApi';

export function TriggersListPage() {
  const navigate = useNavigate();
  const [triggers, setTriggers] = useState<EventTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TriggerStatus | ''>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTriggers();
  }, [statusFilter, eventTypeFilter, searchQuery]);

  const loadTriggers = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await triggersApi.listTriggers({
        status: statusFilter || undefined,
        event_type: eventTypeFilter || undefined,
        search: searchQuery || undefined,
      });

      setTriggers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load triggers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTrigger = async (triggerId: string) => {
    try {
      await triggersApi.toggleTrigger(triggerId);
      await loadTriggers(); // Reload list
    } catch (err: any) {
      setError(err.message || 'Failed to toggle trigger');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading triggers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Event Triggers</h1>
          <button
            onClick={() => navigate('/triggers/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Trigger
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search triggers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TriggerStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value as EventType | '')}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Event Types</option>
            <option value="form.submitted">Form Submitted</option>
            <option value="form.approved">Form Approved</option>
            <option value="user.created">User Created</option>
          </select>
        </div>

        {/* Triggers List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {triggers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No triggers found. Create your first trigger to get started.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {triggers.map((trigger) => (
                  <tr
                    key={trigger.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/triggers/${trigger.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{trigger.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{trigger.event_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trigger.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : trigger.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {trigger.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trigger.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTrigger(trigger.id);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
