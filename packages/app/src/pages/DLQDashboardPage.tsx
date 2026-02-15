/**
 * Dead Letter Queue Dashboard
 * Shows failed action executions with retry functionality
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { triggersApi, DeadLetterQueueEntry, DLQStats } from '../api/triggersApi';
import { apiClient } from '../api/client';
import { DashboardLayout } from '../components/dashboard/layouts/DashboardLayout';
import { RoleProvider } from '../contexts/RoleContext';
import { useTranslation } from '../i18n';

export function DLQDashboardPage() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const t = useTranslation();

  // Show loading while organization loads
  if (!orgLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">{t['common.loading']}</p>
        </div>
      </div>
    );
  }

  // If no organization, redirect to dashboard
  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{t['dashboard.welcome.description']}</p>
          <a href="/dashboard" className="btn-primary">{t.overview}</a>
        </div>
      </div>
    );
  }

  return (
    <RoleProvider orgId={organization.id}>
      <DLQDashboardContent />
    </RoleProvider>
  );
}

function DLQDashboardContent() {
  const { getToken } = useAuth();
  const t = useTranslation();
  const [entries, setEntries] = useState<DeadLetterQueueEntry[]>([]);
  const [stats, setStats] = useState<DLQStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'processing' | 'resolved' | 'failed' | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Set auth token before making API calls
      const token = await getToken();
      apiClient.setAuthToken(token);

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
  }, [getToken, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetryEntry = async (entryId: string) => {
    try {
      const token = await getToken();
      apiClient.setAuthToken(token);

      await triggersApi.retryDLQEntry(entryId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to retry entry');
    }
  };

  const handleBulkRetry = async () => {
    if (selectedIds.size === 0) return;

    try {
      const token = await getToken();
      apiClient.setAuthToken(token);

      await triggersApi.bulkRetryDLQEntries(Array.from(selectedIds));
      setSelectedIds(new Set());
      await loadData();
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
      <DashboardLayout showSearch={false}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t['common.loading']}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showSearch={false}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
          {t['dlq.title'] || 'תור הודעות כושלות (DLQ)'}
        </h1>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['dlq.stats.total'] || 'סה"כ'}
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.total}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['dlq.stats.pending'] || 'ממתין'}
              </div>
              <div className="mt-1 text-2xl font-semibold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['dlq.stats.processing'] || 'מעבד'}
              </div>
              <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.processing}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['dlq.stats.resolved'] || 'הושלם'}
              </div>
              <div className="mt-1 text-2xl font-semibold text-green-600">{stats.resolved}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['dlq.stats.failed'] || 'נכשל'}
              </div>
              <div className="mt-1 text-2xl font-semibold text-red-600">{stats.failed}</div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            <option value="">{t['dlq.filter.allStatuses'] || 'כל הסטטוסים'}</option>
            <option value="pending">{t['dlq.status.pending'] || 'ממתין'}</option>
            <option value="processing">{t['dlq.status.processing'] || 'מעבד'}</option>
            <option value="resolved">{t['dlq.status.resolved'] || 'הושלם'}</option>
            <option value="failed">{t['dlq.status.failed'] || 'נכשל'}</option>
          </select>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkRetry}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              {t['dlq.bulkRetry'] || 'נסה שוב'} ({selectedIds.size})
            </button>
          )}
        </div>

        {/* DLQ Entries List */}
        <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {entries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-lg font-medium mb-2">{t['dlq.empty.title'] || 'אין הודעות כושלות'}</p>
              <p className="text-sm text-muted-foreground">{t['dlq.empty.description'] || 'כל הפעולות הושלמו בהצלחה'}</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-zinc-800">
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
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['dlq.table.failureReason'] || 'סיבת כישלון'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['dlq.table.failureCount'] || 'מספר ניסיונות'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['dlq.table.status'] || 'סטטוס'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['dlq.table.created'] || 'נוצר'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['dlq.table.actions'] || 'פעולות'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-gray-700">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry.id)}
                        onChange={() => toggleSelection(entry.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.failure_reason}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{entry.failure_count}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : entry.status === 'processing'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : entry.status === 'resolved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {entry.status === 'pending' ? (t['dlq.status.pending'] || 'ממתין') :
                         entry.status === 'processing' ? (t['dlq.status.processing'] || 'מעבד') :
                         entry.status === 'resolved' ? (t['dlq.status.resolved'] || 'הושלם') :
                         (t['dlq.status.failed'] || 'נכשל')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(entry.created_at).toLocaleString('he-IL')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => handleRetryEntry(entry.id)}
                        className="text-primary hover:text-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={entry.status === 'processing' || entry.status === 'resolved'}
                      >
                        {t['dlq.retry'] || 'נסה שוב'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
