/**
 * Create Trigger Modal
 * Modal for creating new event triggers
 */

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { triggersApi, EventTrigger, EventType } from '../../api/triggersApi';
import { apiClient } from '../../api/client';

interface CreateTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (trigger: EventTrigger) => void;
}

// Hebrew translations for triggers (until added to i18n)
const labels = {
  createNew: 'צור טריגר חדש',
  name: 'שם הטריגר',
  namePlaceholder: 'הזן שם לטריגר...',
  eventType: 'סוג אירוע',
  priority: 'עדיפות',
  priorityHint: 'מספר גבוה יותר = עדיפות גבוהה יותר',
  createHint: 'הטריגר ייווצר במצב לא פעיל. תוכל להוסיף פעולות ותנאים בדף הטריגר.',
  cancel: 'ביטול',
  creating: 'יוצר...',
  create: 'צור טריגר',
  nameRequired: 'שם הטריגר הוא שדה חובה',
  createFailed: 'יצירת הטריגר נכשלה',
  events: {
    'form.submitted': 'טופס נשלח',
    'form.approved': 'טופס אושר',
    'form.rejected': 'טופס נדחה',
    'user.created': 'משתמש נוצר',
    'user.updated': 'משתמש עודכן',
    'user.deleted': 'משתמש נמחק',
    'workflow.started': 'תהליך התחיל',
    'workflow.completed': 'תהליך הושלם',
    'workflow.failed': 'תהליך נכשל',
  } as Record<EventType, string>,
};

export function CreateTriggerModal({ isOpen, onClose, onCreated }: CreateTriggerModalProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<EventType>('form.submitted');
  const [priority, setPriority] = useState(0);

  const eventTypes: EventType[] = [
    'form.submitted',
    'form.approved',
    'form.rejected',
    'user.created',
    'user.updated',
    'user.deleted',
    'workflow.started',
    'workflow.completed',
    'workflow.failed',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(labels.nameRequired);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      apiClient.setAuthToken(token);

      const newTrigger = await triggersApi.createTrigger({
        name: name.trim(),
        event_type: eventType,
        priority,
        status: 'inactive', // Start as inactive
        scope: 'all_forms',
        conditions: [],
        error_handling: 'stop_on_first_error',
      });

      // Reset form
      setName('');
      setEventType('form.submitted');
      setPriority(0);

      onCreated(newTrigger);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : labels.createFailed;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-lg w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {labels.createNew}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {labels.name} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={labels.namePlaceholder}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         focus:ring-2 focus:ring-primary/50 focus:border-primary
                         bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                disabled={loading}
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {labels.eventType} *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         focus:ring-2 focus:ring-primary/50 focus:border-primary
                         bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                disabled={loading}
              >
                {eventTypes.map((et) => (
                  <option key={et} value={et}>
                    {labels.events[et]}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {labels.priority}
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         focus:ring-2 focus:ring-primary/50 focus:border-primary
                         bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {labels.priorityHint}
              </p>
            </div>

            {/* Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {labels.createHint}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                disabled={loading}
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {labels.creating}
                  </span>
                ) : (
                  labels.create
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
