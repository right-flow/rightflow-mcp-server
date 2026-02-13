// Team Performance Widget
// Created: 2026-02-07
// Updated: 2026-02-12 - Connected to real API with auth token
// Updated: 2026-02-12 - Added retry logic via useApiWithRetry hook
// Purpose: Display team member performance metrics for managers

import { useEffect, useState, useCallback, useRef } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useTranslation } from '../../../../i18n';
import { useApiWithRetry } from '../../../../hooks/useApiWithRetry';

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
}

interface TeamPerformanceData {
  totals: {
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
  };
  topPerformer: {
    userId: string;
    name: string;
    submissions: number;
  } | null;
  avgPerPerson: number;
  members: TeamMember[];
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function TeamPerformanceWidget() {
  const t = useTranslation();
  const { fetchWithRetry, abortAll } = useApiWithRetry({ maxRetries: 3 });
  const [data, setData] = useState<TeamPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const loadTeamPerformance = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const responseData = await fetchWithRetry<TeamPerformanceData>('/api/v1/analytics/team-performance');

      if (!isMounted.current) return;

      setData(responseData);
    } catch (err) {
      console.error('Failed to load team performance:', err);
      if (isMounted.current) setData(null);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [fetchWithRetry]);

  useEffect(() => {
    isMounted.current = true;
    loadTeamPerformance();

    const intervalId = setInterval(() => {
      loadTeamPerformance(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
      abortAll(); // Cancel any pending requests
    };
  }, [loadTeamPerformance, abortAll]);

  // Get initials from name or email
  const getInitials = (name: string, email: string) => {
    if (name && name !== email) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email[0].toUpperCase();
  };

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <MaterialIcon name="group" size="md" className="text-green-600 dark:text-green-400" />
            </span>
            {t['dashboard.widgets.teamPerformance.title']}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MaterialIcon name="group_off" size="lg" className="mb-2 opacity-50" />
            <p>{'אין חברי צוות להצגה'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <MaterialIcon name="group" size="md" className="text-green-600 dark:text-green-400" />
          </span>
          {t['dashboard.widgets.teamPerformance.title']}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.totals.totalSubmissions}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t['dashboard.widgets.teamPerformance.weeklySubmissions'] || 'הגשות ב-30 יום'}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.avgPerPerson.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t['dashboard.widgets.teamPerformance.avgPerPerson']}
            </div>
          </div>
        </div>

        {/* Top Performer */}
        {data.topPerformer && data.topPerformer.submissions > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
            <MaterialIcon name="emoji_events" size="md" className="text-amber-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.topPerformer.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {(t['dashboard.widgets.teamPerformance.topPerformer'] || '{count} הגשות')
                  .replace('{count}', data.topPerformer.submissions.toString())}
              </div>
            </div>
          </div>
        )}

        {/* Team Members List */}
        {data.members.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t['dashboard.widgets.teamPerformance.teamMembers'] || 'חברי צוות'}
            </div>
            {data.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                    {getInitials(member.name, member.email)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {member.name || member.email}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {member.pendingSubmissions} {'ממתינות'}
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {member.totalSubmissions}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {member.approvedSubmissions} {'אושרו'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <p className="text-sm">{'אין פעילות ב-30 יום האחרונים'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
