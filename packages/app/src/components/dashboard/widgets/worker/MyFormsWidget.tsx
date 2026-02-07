// My Forms Widget
// Created: 2026-02-07
// Purpose: Display forms assigned to the current worker

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

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
  const [forms, setForms] = useState<AssignedForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignedForms();
  }, []);

  async function loadAssignedForms() {
    try {
      setLoading(true);
      // TODO: Replace with actual API call to /api/v1/forms?assigned=me

      // Mock data
      const mockForms: AssignedForm[] = [
        {
          id: 'form_1',
          name: 'דו"ח שירות יומי',
          description: 'דוח פעילות יומית',
          lastSubmitted: new Date(Date.now() - 24 * 60 * 60 * 1000),
          frequency: 'daily',
          status: 'pending',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
        {
          id: 'form_2',
          name: 'בדיקת ציוד שבועית',
          description: 'בדיקה ותחזוקת ציוד',
          lastSubmitted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          frequency: 'weekly',
          status: 'completed',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'form_3',
          name: 'דוח תקלה',
          description: 'דיווח על תקלות ובעיות',
          lastSubmitted: null,
          frequency: 'once',
          status: 'pending',
          dueDate: null,
        },
        {
          id: 'form_4',
          name: 'בקשת חופשה',
          description: 'הגשת בקשה לחופשה',
          lastSubmitted: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          frequency: 'once',
          status: 'completed',
          dueDate: null,
        },
      ];

      setForms(mockForms);
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
            <Clock className="w-3 h-3" />
            ממתין
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            הושלם
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            <AlertCircle className="w-3 h-3" />
            באיחור
          </span>
        );
    }
  }

  function getFrequencyLabel(frequency: AssignedForm['frequency']) {
    switch (frequency) {
      case 'daily':
        return 'יומי';
      case 'weekly':
        return 'שבועי';
      case 'monthly':
        return 'חודשי';
      case 'once':
        return 'חד פעמי';
    }
  }

  function formatDueDate(date: Date | null): string {
    if (!date) return '';
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 0) {
      return 'עבר המועד';
    } else if (diffHours < 1) {
      return 'בקרוב';
    } else if (diffHours < 24) {
      return `בעוד ${diffHours} שעות`;
    } else {
      return `בעוד ${diffDays} ימים`;
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingForms = forms.filter((f) => f.status === 'pending' || f.status === 'overdue');
  const completedForms = forms.filter((f) => f.status === 'completed');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          הטפסים שלי
          {pendingForms.length > 0 && (
            <span className="ms-auto px-2 py-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full">
              {pendingForms.length} ממתינים
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {forms.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">אין טפסים מוקצים</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Pending/Overdue forms first */}
            {pendingForms.map((form) => (
              <button
                key={form.id}
                onClick={() => navigate(`/fill/${form.id}`)}
                className="w-full flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-right touch-manipulation"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{form.name}</span>
                    {getStatusBadge(form.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getFrequencyLabel(form.frequency)}
                    {form.dueDate && ` • ${formatDueDate(form.dueDate)}`}
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            ))}

            {/* Completed forms */}
            {completedForms.length > 0 && pendingForms.length > 0 && (
              <div className="text-xs text-muted-foreground pt-2 pb-1">הושלמו לאחרונה</div>
            )}
            {completedForms.slice(0, 2).map((form) => (
              <button
                key={form.id}
                onClick={() => navigate(`/fill/${form.id}`)}
                className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors text-right opacity-70 touch-manipulation"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{form.name}</span>
                  <span className="text-xs text-muted-foreground">{getFrequencyLabel(form.frequency)}</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* View all link */}
        {forms.length > 4 && (
          <button
            onClick={() => navigate('/forms?assigned=me')}
            className="w-full mt-4 py-2 text-sm text-primary hover:underline"
          >
            צפה בכל {forms.length} הטפסים →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
