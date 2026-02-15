/**
 * Add Action Modal
 * Modal for adding a new action to a trigger
 */

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { triggersApi, TriggerAction, ActionType } from '../../api/triggersApi';
import { apiClient } from '../../api/client';
import { useTranslation } from '../../i18n';

interface AddActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerId: string;
  onActionAdded: (action: TriggerAction) => void;
}

const ACTION_TYPES: { value: ActionType; labelKey: string; defaultLabel: string }[] = [
  { value: 'send_webhook', labelKey: 'triggers.actionType.webhook', defaultLabel: 'שליחת Webhook' },
  { value: 'send_email', labelKey: 'triggers.actionType.email', defaultLabel: 'שליחת אימייל' },
  { value: 'send_sms', labelKey: 'triggers.actionType.sms', defaultLabel: 'שליחת SMS' },
  { value: 'update_crm', labelKey: 'triggers.actionType.crm', defaultLabel: 'עדכון CRM' },
  { value: 'trigger_workflow', labelKey: 'triggers.actionType.workflow', defaultLabel: 'הפעלת Workflow' },
];

export function AddActionModal({ isOpen, onClose, triggerId, onActionAdded }: AddActionModalProps) {
  const { getToken } = useAuth();
  const t = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [actionType, setActionType] = useState<ActionType>('send_webhook');
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [isCritical, setIsCritical] = useState(false);

  // Config based on action type
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookMethod, setWebhookMethod] = useState<'GET' | 'POST' | 'PUT'>('POST');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsTo, setSmsTo] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  const labels = {
    title: t['triggers.addAction'] || 'הוסף פעולה',
    actionType: t['triggers.actionType'] || 'סוג פעולה',
    timeout: t['triggers.timeout'] || 'זמן מקסימלי (מילישניות)',
    critical: t['triggers.critical'] || 'פעולה קריטית',
    criticalHelp: t['triggers.criticalHelp'] || 'אם פעולה קריטית נכשלת, כל הטריגר ייכשל',
    webhookUrl: t['triggers.webhookUrl'] || 'כתובת URL',
    webhookMethod: t['triggers.webhookMethod'] || 'שיטת HTTP',
    emailTo: t['triggers.emailTo'] || 'כתובת אימייל',
    emailSubject: t['triggers.emailSubject'] || 'נושא',
    emailBody: t['triggers.emailBody'] || 'תוכן ההודעה',
    smsTo: t['triggers.smsTo'] || 'מספר טלפון',
    smsMessage: t['triggers.smsMessage'] || 'הודעה',
    cancel: t['common.cancel'] || 'ביטול',
    add: t['common.add'] || 'הוסף',
    adding: t['common.adding'] || 'מוסיף...',
    urlRequired: t['triggers.error.urlRequired'] || 'נדרשת כתובת URL',
    emailRequired: t['triggers.error.emailRequired'] || 'נדרשת כתובת אימייל',
    phoneRequired: t['triggers.error.phoneRequired'] || 'נדרש מספר טלפון',
  };

  const buildConfig = (): Record<string, any> => {
    switch (actionType) {
      case 'send_webhook':
        return {
          url: webhookUrl,
          method: webhookMethod,
          headers: { 'Content-Type': 'application/json' },
        };
      case 'send_email':
        return {
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
        };
      case 'send_sms':
        return {
          to: smsTo,
          message: smsMessage,
        };
      case 'update_crm':
        return {
          operation: 'create',
          entityType: 'contact',
        };
      case 'trigger_workflow':
        return {
          workflowId: '',
        };
      default:
        return {};
    }
  };

  const validateForm = (): boolean => {
    switch (actionType) {
      case 'send_webhook':
        if (!webhookUrl.trim()) {
          setError(labels.urlRequired);
          return false;
        }
        break;
      case 'send_email':
        if (!emailTo.trim()) {
          setError(labels.emailRequired);
          return false;
        }
        break;
      case 'send_sms':
        if (!smsTo.trim()) {
          setError(labels.phoneRequired);
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      apiClient.setAuthToken(token);

      const newAction = await triggersApi.createAction(triggerId, {
        action_type: actionType,
        config: buildConfig(),
        timeout_ms: timeoutMs,
        is_critical: isCritical,
      });

      // Reset form
      setActionType('send_webhook');
      setTimeoutMs(30000);
      setIsCritical(false);
      setWebhookUrl('');
      setWebhookMethod('POST');
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      setSmsTo('');
      setSmsMessage('');

      onActionAdded(newAction);
    } catch (err: any) {
      setError(err.message || 'Failed to add action');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {labels.title}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {labels.actionType} *
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       focus:ring-2 focus:ring-primary/50 focus:border-primary
                       bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
              disabled={loading}
            >
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {t[type.labelKey] || type.defaultLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Config Fields based on Action Type */}
          {actionType === 'send_webhook' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.webhookUrl} *
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-primary/50 focus:border-primary
                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.webhookMethod}
                </label>
                <select
                  value={webhookMethod}
                  onChange={(e) => setWebhookMethod(e.target.value as 'GET' | 'POST' | 'PUT')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-primary/50 focus:border-primary
                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
            </>
          )}

          {actionType === 'send_email' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.emailTo} *
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-primary/50 focus:border-primary
                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.emailSubject}
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-primary/50 focus:border-primary
                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.emailBody}
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-primary/50 focus:border-primary
                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {actionType === 'send_sms' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.smsTo} *
                </label>
                <input
                  type="tel"
                  value={smsTo}
                  onChange={(e) => setSmsTo(e.target.value)}
                  placeholder="+972501234567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-primary/50 focus:border-primary
                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.smsMessage}
                </label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-primary/50 focus:border-primary
                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {labels.timeout}
            </label>
            <input
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 30000)}
              min={1000}
              max={300000}
              step={1000}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       focus:ring-2 focus:ring-primary/50 focus:border-primary
                       bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
              disabled={loading}
            />
          </div>

          {/* Critical Flag */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isCritical"
              checked={isCritical}
              onChange={(e) => setIsCritical(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              disabled={loading}
            />
            <div>
              <label htmlFor="isCritical" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {labels.critical}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {labels.criticalHelp}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800
                       transition-colors font-medium"
              disabled={loading}
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium
                       hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? labels.adding : labels.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
