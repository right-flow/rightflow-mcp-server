/**
 * Triggers List Page
 * Shows all event triggers with filtering and search
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { triggersApi, EventTrigger, EventType, TriggerStatus } from '../api/triggersApi';
import { apiClient } from '../api/client';
import { DashboardLayout } from '../components/dashboard/layouts/DashboardLayout';
import { RoleProvider } from '../contexts/RoleContext';
import { useTranslation } from '../i18n';
import { CreateTriggerModal } from '../components/triggers/CreateTriggerModal';

export function TriggersListPage() {
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
      <TriggersListContent />
    </RoleProvider>
  );
}

function TriggersListContent() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const t = useTranslation();
  const [triggers, setTriggers] = useState<EventTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TriggerStatus | ''>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTriggers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Set auth token before making API call
      const token = await getToken();
      apiClient.setAuthToken(token);

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
  }, [getToken, statusFilter, eventTypeFilter, searchQuery]);

  useEffect(() => {
    loadTriggers();
  }, [loadTriggers]);

  const handleToggleTrigger = async (triggerId: string) => {
    try {
      // Ensure token is set
      const token = await getToken();
      apiClient.setAuthToken(token);

      await triggersApi.toggleTrigger(triggerId);
      await loadTriggers(); // Reload list
    } catch (err: any) {
      setError(err.message || 'Failed to toggle trigger');
    }
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t.automation}</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {t['triggers.createNew'] || 'צור טריגר חדש'}
          </button>
        </div>

        {/* Create Trigger Modal */}
        <CreateTriggerModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newTrigger) => {
            setShowCreateModal(false);
            loadTriggers();
            navigate(`/triggers/${newTrigger.id}`);
          }}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder={t['triggers.search'] || 'חיפוש טריגרים...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TriggerStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            <option value="">{t['triggers.allStatuses'] || 'כל הסטטוסים'}</option>
            <option value="active">{t['triggers.status.active'] || 'פעיל'}</option>
            <option value="inactive">{t['triggers.status.inactive'] || 'לא פעיל'}</option>
            <option value="draft">{t['triggers.status.draft'] || 'טיוטה'}</option>
          </select>

          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value as EventType | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            <option value="">{t['triggers.allEventTypes'] || 'כל סוגי האירועים'}</option>
            <option value="form.submitted">{t['triggers.event.formSubmitted'] || 'טופס נשלח'}</option>
            <option value="form.approved">{t['triggers.event.formApproved'] || 'טופס אושר'}</option>
            <option value="form.rejected">{t['triggers.event.formRejected'] || 'טופס נדחה'}</option>
            <option value="user.created">{t['triggers.event.userCreated'] || 'משתמש נוצר'}</option>
          </select>
        </div>

        {/* Triggers List */}
        <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {triggers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">⚡</div>
              <p className="text-lg font-medium mb-2">{t['triggers.empty.title'] || 'אין טריגרים עדיין'}</p>
              <p className="text-sm text-muted-foreground">{t['triggers.empty.description'] || 'צור את הטריגר הראשון שלך כדי להתחיל באוטומציה'}</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['triggers.table.name'] || 'שם'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['triggers.table.eventType'] || 'סוג אירוע'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['triggers.table.status'] || 'סטטוס'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['triggers.table.priority'] || 'עדיפות'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t['triggers.table.actions'] || 'פעולות'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-gray-700">
                {triggers.map((trigger) => (
                  <tr
                    key={trigger.id}
                    className="hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    onClick={() => navigate(`/triggers/${trigger.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{trigger.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{trigger.event_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trigger.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : trigger.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {trigger.status === 'active' ? (t['triggers.status.active'] || 'פעיל') :
                         trigger.status === 'inactive' ? (t['triggers.status.inactive'] || 'לא פעיל') :
                         (t['triggers.status.draft'] || 'טיוטה')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {trigger.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTrigger(trigger.id);
                        }}
                        className="text-primary hover:text-orange-600 transition-colors"
                      >
                        {trigger.status === 'active' ? (t['triggers.action.deactivate'] || 'השבת') : (t['triggers.action.activate'] || 'הפעל')}
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
