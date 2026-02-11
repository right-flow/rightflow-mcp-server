// Recent Submissions Widget
// Created: 2026-02-07
// Purpose: Display recent form submissions with quick actions

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useTranslation } from '../../../../i18n';

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
  const t = useTranslation();
  const { getToken } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentSubmissions();
  }, [limit]);

  async function loadRecentSubmissions() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setSubmissions([]);
        return;
      }
      const response = await fetch(`/api/v1/submissions?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        // API returns { data: [...] } format
        setSubmissions(result.data || []);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.error('Failed to load recent submissions:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return t['dashboard.time.ago'].replace('{time}', `${diffDays} ${t['dashboard.time.days']}`);
    if (diffHours > 0) return t['dashboard.time.ago'].replace('{time}', `${diffHours} ${t['dashboard.time.hours']}`);
    if (diffMins > 0) return t['dashboard.time.ago'].replace('{time}', `${diffMins} ${t['dashboard.time.mins']}`);
    return t['dashboard.time.now'];
  }

  function getStatusBadge(status: Submission['status']) {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
            {t['dashboard.status.pending']}
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
            {t['dashboard.status.approved']}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            {t['dashboard.status.rejected']}
          </span>
        );
    }
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <MaterialIcon name="description" size="md" className="text-blue-600 dark:text-blue-400" />
            </span>
            {t['dashboard.widgets.recentSubmissions.title']}
          </CardTitle>
          <button
            onClick={() => navigate('/responses')}
            className="text-sm text-primary hover:underline"
          >
            {t['dashboard.common.viewAll']} →
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <MaterialIcon name="description" size="xl" className="text-gray-400 dark:text-gray-500 mx-auto mb-3 opacity-50" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t['dashboard.widgets.recentSubmissions.empty']}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((submission) => (
              <button
                key={submission.id}
                onClick={() => navigate(`/responses/${submission.formId}?submission=${submission.id}`)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MaterialIcon name="description" size="md" className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{submission.formName}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{submission.submitterName}</span>
                      <span>•</span>
                      <MaterialIcon name="schedule" size="xs" />
                      <span>{formatTimeAgo(submission.submittedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(submission.status)}
                  <MaterialIcon name="visibility" size="sm" className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MaterialIcon name="chevron_left" size="sm" className="text-gray-400 dark:text-gray-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
