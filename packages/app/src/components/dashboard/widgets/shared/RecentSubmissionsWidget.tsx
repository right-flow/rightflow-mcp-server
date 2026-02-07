// Recent Submissions Widget
// Created: 2026-02-07
// Purpose: Display recent form submissions with quick actions

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Clock, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

interface Submission {
  id: string;
  formId: string;
  formName: string;
  submitterName: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

interface RecentSubmissionsWidgetProps {
  limit?: number;
}

export function RecentSubmissionsWidget({ limit = 10 }: RecentSubmissionsWidgetProps) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentSubmissions();
  }, [limit]);

  async function loadRecentSubmissions() {
    try {
      setLoading(true);
      // TODO: Replace with actual API call to /api/v1/submissions?limit={limit}

      // Mock data
      const mockSubmissions: Submission[] = [
        {
          id: '1',
          formId: 'form_1',
          formName: 'דו"ח שירות יומי',
          submitterName: 'יעל כהן',
          submittedAt: new Date(Date.now() - 15 * 60 * 1000),
          status: 'pending',
        },
        {
          id: '2',
          formId: 'form_2',
          formName: 'טופס בדיקת ציוד',
          submitterName: 'דני לוי',
          submittedAt: new Date(Date.now() - 45 * 60 * 1000),
          status: 'approved',
        },
        {
          id: '3',
          formId: 'form_1',
          formName: 'דו"ח שירות יומי',
          submitterName: 'מיכל אברהם',
          submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'approved',
        },
        {
          id: '4',
          formId: 'form_3',
          formName: 'דו"ח תקלה',
          submitterName: 'אורי דוד',
          submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          status: 'rejected',
        },
        {
          id: '5',
          formId: 'form_2',
          formName: 'טופס בדיקת ציוד',
          submitterName: 'נועה גולן',
          submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
          status: 'approved',
        },
      ];
      setSubmissions(mockSubmissions.slice(0, limit));
    } catch (err) {
      console.error('Failed to load recent submissions:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `לפני ${diffDays} ימים`;
    if (diffHours > 0) return `לפני ${diffHours} שעות`;
    if (diffMins > 0) return `לפני ${diffMins} דקות`;
    return 'עכשיו';
  }

  function getStatusBadge(status: Submission['status']) {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
            ממתין
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
            אושר
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            נדחה
          </span>
        );
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="h-14 bg-zinc-200 dark:bg-zinc-700 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            הגשות אחרונות
          </CardTitle>
          <button
            onClick={() => navigate('/responses')}
            className="text-sm text-primary hover:underline"
          >
            הכל →
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">אין הגשות אחרונות</p>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((submission) => (
              <button
                key={submission.id}
                onClick={() => navigate(`/responses/${submission.formId}?submission=${submission.id}`)}
                className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{submission.formName}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{submission.submitterName}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(submission.submittedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(submission.status)}
                  <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
