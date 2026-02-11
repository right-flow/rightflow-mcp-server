// Team Performance Widget
// Created: 2026-02-07
// Purpose: Display team member performance metrics for managers

import { useEffect, useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useTranslation } from '../../../../i18n';

interface TeamMember {
  id: string;
  name: string;
  role: 'manager' | 'worker';
  submissionsToday: number;
  submissionsWeek: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface TeamPerformanceData {
  totalSubmissions: number;
  avgPerPerson: number;
  topPerformer: TeamMember | null;
  members: TeamMember[];
}

export function TeamPerformanceWidget() {
  const t = useTranslation();
  const [data, setData] = useState<TeamPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamPerformance();
  }, []);

  async function loadTeamPerformance() {
    try {
      setLoading(true);
      // Fetch team performance from API
      const response = await fetch('/api/v1/analytics/team-performance');
      if (response.ok) {
        const responseData = await response.json();
        setData(responseData);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Failed to load team performance:', err);
    } finally {
      setLoading(false);
    }
  }

  const getTrendIcon = (trend: TeamMember['trend']) => {
    switch (trend) {
      case 'up':
        return <MaterialIcon name="trending_up" size="xs" className="text-green-500" />;
      case 'down':
        return <MaterialIcon name="trending_down" size="xs" className="text-red-500" />;
      default:
        return <MaterialIcon name="trending_flat" size="xs" className="text-zinc-400" />;
    }
  };

  const getTrendColor = (trend: TeamMember['trend']) => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-zinc-500';
    }
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
    return null;
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
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalSubmissions}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t['dashboard.widgets.teamPerformance.weeklySubmissions']}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.avgPerPerson.toFixed(1)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t['dashboard.widgets.teamPerformance.avgPerPerson']}</div>
          </div>
        </div>

        {/* Top Performer */}
        {data.topPerformer && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
            <MaterialIcon name="emoji_events" size="md" className="text-amber-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.topPerformer.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t['dashboard.widgets.teamPerformance.topPerformer'].replace('{count}', data.topPerformer.submissionsWeek.toString())}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(data.topPerformer.trend)}
              <span className={`text-xs ${getTrendColor(data.topPerformer.trend)}`}>
                {data.topPerformer.trendPercent > 0 ? '+' : ''}{data.topPerformer.trendPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Team Members List */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t['dashboard.widgets.teamPerformance.teamMembers']}</div>
          {data.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {member.submissionsToday} {t['dashboard.widgets.teamPerformance.today']}
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{member.submissionsWeek}</div>
                <div className="flex items-center gap-1 justify-end">
                  {getTrendIcon(member.trend)}
                  <span className={`text-xs ${getTrendColor(member.trend)}`}>
                    {member.trendPercent !== 0 && (member.trendPercent > 0 ? '+' : '')}{member.trendPercent}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
