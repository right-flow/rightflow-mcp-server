// My Forms Widget
// Created: 2026-02-07
// Updated: 2026-02-08 - Added i18n support
// Purpose: Display forms assigned to the current worker

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useTranslation } from '../../../../i18n';

interface AssignedForm {
  id: string;
  name: string;
  description: string;
  lastSubmitted: Date | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  status: 'pending' | 'completed' | 'overdue';
  dueDate: Date | null;
}

export function MyFormsWidget() {
  const navigate = useNavigate();
  const t = useTranslation();
  const { getToken } = useAuth();
  const [forms, setForms] = useState<AssignedForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignedForms();
  }, []);

  async function loadAssignedForms() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setForms([]);
        return;
      }
      const response = await fetch('/api/v1/forms?assigned=me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        // API returns { data: [...] } format
        setForms(result.data || []);
      } else {
        setForms([]);
      }
    } catch (err) {
      console.error('Failed to load assigned forms:', err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: AssignedForm['status']) {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
            <MaterialIcon name="schedule" size="xs" />
            {t['dashboard.myForms.pending']}
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
            <MaterialIcon name="check_circle" size="xs" />
            {t['dashboard.myForms.completed']}
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            <MaterialIcon name="error" size="xs" />
            {t['dashboard.myForms.overdue']}
          </span>
        );
    }
  }

  function getFrequencyLabel(frequency: AssignedForm['frequency']) {
    switch (frequency) {
      case 'daily':
        return t['dashboard.myForms.daily'];
      case 'weekly':
        return t['dashboard.myForms.weekly'];
      case 'monthly':
        return t['dashboard.myForms.monthly'];
      case 'once':
        return t['dashboard.myForms.once'];
    }
  }

  function formatDueDate(date: Date | null): string {
    if (!date) return '';
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 0) {
      return t['dashboard.myForms.overduePast'];
    } else if (diffHours < 1) {
      return t['dashboard.myForms.soon'];
    } else if (diffHours < 24) {
      return t['dashboard.myForms.inHours'].replace('{count}', String(diffHours));
    } else {
      return t['dashboard.myForms.inDays'].replace('{count}', String(diffDays));
    }
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingForms = forms.filter((f) => f.status === 'pending' || f.status === 'overdue');
  const completedForms = forms.filter((f) => f.status === 'completed');

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <MaterialIcon name="description" size="md" className="text-blue-600 dark:text-blue-400" />
          </span>
          {t['dashboard.myForms.title']}
          {pendingForms.length > 0 && (
            <span className="ms-auto px-2 py-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full">
              {pendingForms.length} {t['dashboard.myForms.pendingCount']}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {forms.length === 0 ? (
          <div className="text-center py-8">
            <MaterialIcon name="description" size="xl" className="text-gray-400 dark:text-gray-500 mx-auto mb-3 opacity-50" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t['dashboard.myForms.noForms']}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Pending/Overdue forms first */}
            {pendingForms.map((form) => (
              <button
                key={form.id}
                onClick={() => navigate(`/fill/${form.id}`)}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-right touch-manipulation"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <MaterialIcon name="description" size="lg" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">{form.name}</span>
                    {getStatusBadge(form.status)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {getFrequencyLabel(form.frequency)}
                    {form.dueDate && ` • ${formatDueDate(form.dueDate)}`}
                  </div>
                </div>
                <MaterialIcon name="chevron_left" size="md" className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </button>
            ))}

            {/* Completed forms */}
            {completedForms.length > 0 && pendingForms.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 pb-1">{t['dashboard.myForms.completedRecently']}</div>
            )}
            {completedForms.slice(0, 2).map((form) => (
              <button
                key={form.id}
                onClick={() => navigate(`/fill/${form.id}`)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors text-right opacity-70 touch-manipulation"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
                  <MaterialIcon name="check_circle" size="md" className="text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block text-gray-900 dark:text-gray-100">{form.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{getFrequencyLabel(form.frequency)}</span>
                </div>
                <MaterialIcon name="chevron_left" size="sm" className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* View all link */}
        {forms.length > 4 && (
          <button
            onClick={() => navigate('/responses')}
            className="w-full mt-4 py-2 text-sm text-primary hover:underline"
          >
            {t['dashboard.myForms.viewAll'].replace('{count}', String(forms.length))} →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
