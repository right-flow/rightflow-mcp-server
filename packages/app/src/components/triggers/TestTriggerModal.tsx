/**
 * Test Trigger Modal
 * Modal for testing a trigger with sample event data
 */

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { triggersApi, TriggerAction, EventType } from '../../api/triggersApi';
import { apiClient } from '../../api/client';
import { useTranslation } from '../../i18n';

interface TestTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerId: string;
  eventType: EventType;
}

interface TestResult {
  matched: boolean;
  conditionsEvaluated: Array<{
    field: string;
    operator: string;
    expected: any;
    actual: any;
    result: boolean;
  }>;
  actionsToExecute: TriggerAction[];
  estimatedDuration: number;
}

// Sample event data generators based on event type
const getSampleEventData = (eventType: EventType): Record<string, any> => {
  switch (eventType) {
    case 'form.submitted':
    case 'form.approved':
    case 'form.rejected':
      return {
        formId: 'form_123',
        formName: 'Sample Form',
        submittedBy: 'user_456',
        submittedAt: new Date().toISOString(),
        fields: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+972501234567',
        },
      };
    case 'user.created':
    case 'user.updated':
    case 'user.deleted':
      return {
        userId: 'user_789',
        email: 'user@example.com',
        name: 'Test User',
        role: 'worker',
        createdAt: new Date().toISOString(),
      };
    case 'workflow.started':
    case 'workflow.completed':
    case 'workflow.failed':
      return {
        workflowId: 'wf_101',
        workflowName: 'Sample Workflow',
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    case 'integration.sync_started':
    case 'integration.sync_completed':
    case 'integration.sync_failed':
      return {
        integrationId: 'int_202',
        integrationType: 'crm',
        provider: 'salesforce',
        recordsProcessed: 100,
        syncedAt: new Date().toISOString(),
      };
    default:
      return {
        id: 'sample_id',
        timestamp: new Date().toISOString(),
      };
  }
};

export function TestTriggerModal({
  isOpen,
  onClose,
  triggerId,
  eventType,
}: TestTriggerModalProps) {
  const { getToken } = useAuth();
  const t = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Event data state - initialized with sample data
  const [eventDataJson, setEventDataJson] = useState(() =>
    JSON.stringify(getSampleEventData(eventType), null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const labels = {
    title: t['triggers.testTrigger'] || 'בדיקת טריגר',
    description:
      t['triggers.testTriggerDescription'] ||
      'בדוק את הטריגר עם נתוני אירוע לדוגמה כדי לראות אילו פעולות יופעלו',
    eventData: t['triggers.eventData'] || 'נתוני אירוע (JSON)',
    runTest: t['triggers.runTest'] || 'הרץ בדיקה',
    running: t['triggers.running'] || 'מריץ...',
    close: t.close || 'סגור',
    results: t['triggers.testResults'] || 'תוצאות הבדיקה',
    matched: t['triggers.matched'] || 'התאמה נמצאה',
    notMatched: t['triggers.notMatched'] || 'אין התאמה',
    conditionsEvaluated: t['triggers.conditionsEvaluated'] || 'תנאים שנבדקו',
    actionsToExecute: t['triggers.actionsToExecute'] || 'פעולות שיופעלו',
    estimatedDuration: t['triggers.estimatedDuration'] || 'זמן משוער',
    noConditions: t['triggers.noConditions'] || 'אין תנאים מוגדרים',
    noActions: t['triggers.noActionsToExecute'] || 'אין פעולות להפעלה',
    invalidJson: t['triggers.invalidJson'] || 'JSON לא תקין',
    resetToSample: t['triggers.resetToSample'] || 'אפס לנתוני דוגמה',
    field: t['triggers.field'] || 'שדה',
    operator: t['triggers.operator'] || 'אופרטור',
    expected: t['triggers.expected'] || 'צפוי',
    actual: t['triggers.actual'] || 'בפועל',
    result: t['triggers.result'] || 'תוצאה',
    passed: t['triggers.passed'] || 'עבר',
    failed: t['triggers.failed'] || 'נכשל',
  };

  const validateJson = (json: string): boolean => {
    try {
      JSON.parse(json);
      setJsonError(null);
      return true;
    } catch {
      setJsonError(labels.invalidJson);
      return false;
    }
  };

  const handleTest = async () => {
    if (!validateJson(eventDataJson)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTestResult(null);

      const token = await getToken();
      apiClient.setAuthToken(token);

      const eventData = JSON.parse(eventDataJson);
      const result = await triggersApi.testTrigger(triggerId, eventData);

      setTestResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to test trigger');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToSample = () => {
    setEventDataJson(JSON.stringify(getSampleEventData(eventType), null, 2));
    setJsonError(null);
  };

  const handleClose = () => {
    setTestResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {labels.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {labels.description}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Event Data JSON Editor */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {labels.eventData}
              </label>
              <button
                type="button"
                onClick={handleResetToSample}
                className="text-xs text-primary hover:text-orange-600 transition-colors"
              >
                {labels.resetToSample}
              </button>
            </div>
            <textarea
              value={eventDataJson}
              onChange={(e) => {
                setEventDataJson(e.target.value);
                if (jsonError) validateJson(e.target.value);
              }}
              rows={10}
              className={`w-full px-3 py-2 border rounded-lg font-mono text-sm
                       focus:ring-2 focus:ring-primary/50 focus:border-primary
                       bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100
                       ${jsonError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              disabled={loading}
              dir="ltr"
            />
            {jsonError && (
              <p className="text-red-500 text-xs mt-1">{jsonError}</p>
            )}
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {labels.results}
              </h3>

              {/* Match Status */}
              <div
                className={`p-4 rounded-lg ${
                  testResult.matched
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {testResult.matched ? '✅' : '⚠️'}
                  </span>
                  <span
                    className={`font-medium ${
                      testResult.matched
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    {testResult.matched ? labels.matched : labels.notMatched}
                  </span>
                </div>
              </div>

              {/* Conditions Evaluated */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {labels.conditionsEvaluated}
                </h4>
                {testResult.conditionsEvaluated.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {labels.noConditions}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-zinc-800">
                        <tr>
                          <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            {labels.field}
                          </th>
                          <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            {labels.operator}
                          </th>
                          <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            {labels.expected}
                          </th>
                          <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            {labels.actual}
                          </th>
                          <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            {labels.result}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {testResult.conditionsEvaluated.map((condition, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">
                              {condition.field}
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              {condition.operator}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">
                              {JSON.stringify(condition.expected)}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">
                              {JSON.stringify(condition.actual)}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  condition.result
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {condition.result ? labels.passed : labels.failed}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actions to Execute */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {labels.actionsToExecute} ({testResult.actionsToExecute.length})
                </h4>
                {testResult.actionsToExecute.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {labels.noActions}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {testResult.actionsToExecute.map((action, idx) => (
                      <li
                        key={action.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                      >
                        <span className="text-gray-400">{idx + 1}.</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {t[`triggers.actionTypes.${action.action_type}`] ||
                            action.action_type}
                        </span>
                        {action.is_critical && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                            {t['triggers.critical'] || 'קריטי'}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Estimated Duration */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>⏱️</span>
                <span>{labels.estimatedDuration}:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {testResult.estimatedDuration}ms
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800
                       transition-colors font-medium"
            >
              {labels.close}
            </button>
            <button
              type="button"
              onClick={handleTest}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 transition-colors disabled:opacity-50
                       flex items-center justify-center gap-2"
              disabled={loading || !!jsonError}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {labels.running}
                </>
              ) : (
                <>
                  <span>🧪</span>
                  {labels.runTest}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}