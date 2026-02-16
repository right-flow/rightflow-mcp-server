/**
 * Trigger Detail Page
 * Shows trigger details with actions and execution history
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { triggersApi, TriggerWithActions, TriggerAction } from '../api/triggersApi';
import { apiClient } from '../api/client';
import { DashboardLayout } from '../components/dashboard/layouts/DashboardLayout';
import { RoleProvider } from '../contexts/RoleContext';
import { useTranslation } from '../i18n';
import { AddActionModal } from '../components/triggers/AddActionModal';
import { TestTriggerModal } from '../components/triggers/TestTriggerModal';

export function TriggerDetailPage() {
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
      <TriggerDetailContent />
    </RoleProvider>
  );
}

function TriggerDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const t = useTranslation();
  const [trigger, setTrigger] = useState<TriggerWithActions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  const handleActionAdded = (_newAction: TriggerAction) => {
    setShowAddActionModal(false);
    // Reload trigger to get updated actions list
    loadTrigger();
  };

  const loadTrigger = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Set auth token before making API call
      const token = await getToken();
      apiClient.setAuthToken(token);

      const data = await triggersApi.getTrigger(id);
      setTrigger(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trigger');
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    if (id) {
      loadTrigger();
    }
  }, [id, loadTrigger]);

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

  if (error || !trigger) {
    return (
      <DashboardLayout showSearch={false}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-red-500 text-lg">{error || 'Trigger not found'}</p>
            <button
              onClick={() => navigate('/triggers')}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600"
            >
              {t['triggers.backToList'] || 'חזרה לרשימה'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showSearch={false}>
      {/* Add Action Modal */}
      {id && (
        <AddActionModal
          isOpen={showAddActionModal}
          onClose={() => setShowAddActionModal(false)}
          triggerId={id}
          onActionAdded={handleActionAdded}
        />
      )}

      {/* Test Trigger Modal */}
      {id && trigger && (
        <TestTriggerModal
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
          triggerId={id}
          eventType={trigger.event_type}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/triggers')}
            className="text-primary hover:text-orange-600 mb-4 flex items-center gap-2 transition-colors"
          >
            ← {t['triggers.backToList'] || 'חזרה לרשימת הטריגרים'}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{trigger.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t['triggers.eventType'] || 'סוג אירוע'}: {t[`triggers.eventTypes.${trigger.event_type}`] || trigger.event_type}
          </p>
        </div>

        {/* Trigger Info */}
        <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {t['triggers.details'] || 'פרטי הטריגר'}
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['triggers.table.status'] || 'סטטוס'}
              </dt>
              <dd className="mt-1">
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
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['triggers.table.priority'] || 'עדיפות'}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{trigger.priority}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['triggers.level'] || 'רמה'}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {t[`triggers.levels.${trigger.level}`] || trigger.level}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t['triggers.errorHandlingLabel'] || 'טיפול בשגיאות'}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {t[`triggers.errorHandling.${trigger.error_handling}`] || trigger.error_handling}
              </dd>
            </div>
          </dl>
        </div>

        {/* Actions List */}
        <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t['triggers.actions'] || 'פעולות'} ({trigger.actions.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTestModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <span>🧪</span>
                {t['triggers.testTrigger'] || 'בדיקה'}
              </button>
              <button
                onClick={() => setShowAddActionModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                {t['triggers.addAction'] || 'הוסף פעולה'}
              </button>
            </div>
          </div>

          {trigger.actions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">⚙️</div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{t['triggers.noActions'] || 'עדיין לא הוגדרו פעולות'}</p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  ⚠️ {t['triggers.warning.noActionsCannotActivate'] || 'לא ניתן להפעיל טריגר ללא פעולות. יש להוסיף לפחות פעולה אחת.'}
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {trigger.actions.map((action) => (
                <li key={action.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {action.order}. {t[`triggers.actionTypes.${action.action_type}`] || action.action_type}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t['triggers.timeout'] || 'זמן מקסימלי'}: {action.timeout_ms}ms
                        {action.is_critical && (
                          <span className="mx-2 px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                            {t['triggers.critical'] || 'קריטי'}
                          </span>
                        )}
                      </p>
                    </div>
                    <button className="text-primary hover:text-orange-600 transition-colors">
                      {t['common.edit'] || 'עריכה'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Statistics */}
        {trigger.statistics && (
          <div className="bg-white dark:bg-zinc-900 shadow-md rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {t['triggers.executionStats'] || 'סטטיסטיקות הרצה'}
            </h2>
            <dl className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t['triggers.totalExecutions'] || 'סה"כ הרצות'}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {trigger.statistics.totalExecutions}
                </dd>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t['triggers.successRate'] || 'אחוז הצלחה'}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-green-600">
                  {trigger.statistics.successRate.toFixed(1)}%
                </dd>
              </div>
              {trigger.statistics.avgExecutionTime && (
                <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t['triggers.avgTime'] || 'זמן ממוצע'}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {trigger.statistics.avgExecutionTime.toFixed(0)}ms
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
