/**
 * Dead Letter Queue Dashboard
 * Shows failed action executions with retry functionality
 */

import { useEffect, useState } from 'react';
import { triggersApi, DeadLetterQueueEntry, DLQStats } from '../api/triggersApi';

export function DLQDashboardPage() {
  const [entries, setEntries] = useState<DeadLetterQueueEntry[]>([]);
  const [stats, setStats] = useState<DLQStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'processing' | 'resolved' | 'failed' | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [entriesData, statsData] = await Promise.all([
        triggersApi.listDLQEntries({
          status: statusFilter || undefined,
        }),
        triggersApi.getDLQStats(),
      ]);

      setEntries(entriesData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load DLQ data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryEntry = async (entryId: string) => {
    try {
      await triggersApi.retryDLQEntry(entryId);
      await loadData(); // Reload data
    } catch (err: any) {
      setError(err.message || 'Failed to retry entry');
    }
  };

  const handleBulkRetry = async () => {
    if (selectedIds.size === 0) return;

    try {
      await triggersApi.bulkRetryDLQEntries(Array.from(selectedIds));
      setSelectedIds(new Set());
      await loadData(); // Reload data
    } catch (err: any) {
      setError(err.message || 'Failed to bulk retry');
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading DLQ data...</div>
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
        <h1 className="text-3xl font-bold mb-8">Dead Letter Queue</h1>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-white shadow-md rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Total</div>
              <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
            </div>
            <div className="bg-white shadow-md rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Pending</div>
              <div className="mt-1 text-2xl font-semibold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white shadow-md rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Processing</div>
              <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.processing}</div>
            </div>
            <div className="bg-white shadow-md rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Resolved</div>
              <div className="mt-1 text-2xl font-semibold text-green-600">{stats.resolved}</div>
            </div>
            <div className="bg-white shadow-md rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Failed</div>
              <div className="mt-1 text-2xl font-semibold text-red-600">{stats.failed}</div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="mb-6 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="resolved">Resolved</option>
            <option value="failed">Failed</option>
          </select>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Bulk Retry ({selectedIds.size})
            </button>
          )}
        </div>

        {/* DLQ Entries List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No DLQ entries found.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(entries.map(e => e.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      checked={selectedIds.size === entries.length && entries.length > 0}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failure Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failure Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry.id)}
                        onChange={() => toggleSelection(entry.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{entry.failure_reason}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{entry.failure_count}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : entry.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : entry.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => handleRetryEntry(entry.id)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={entry.status === 'processing' || entry.status === 'resolved'}
                      >
                        Retry
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
