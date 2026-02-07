// Team Performance Widget
// Created: 2026-02-07
// Purpose: Display team member performance metrics for managers

import { useEffect, useState } from 'react';
import { Users, TrendingUp, TrendingDown, Award, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

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
  const [data, setData] = useState<TeamPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamPerformance();
  }, []);

  async function loadTeamPerformance() {
    try {
      setLoading(true);
      // TODO: Replace with actual API call to /api/v1/analytics/team-performance

      // Mock data
      const mockMembers: TeamMember[] = [
        { id: '1', name: 'יעל כהן', role: 'worker', submissionsToday: 8, submissionsWeek: 42, trend: 'up', trendPercent: 15 },
        { id: '2', name: 'דני לוי', role: 'worker', submissionsToday: 6, submissionsWeek: 35, trend: 'stable', trendPercent: 0 },
        { id: '3', name: 'מיכל אברהם', role: 'worker', submissionsToday: 5, submissionsWeek: 28, trend: 'down', trendPercent: -8 },
        { id: '4', name: 'אורי דוד', role: 'worker', submissionsToday: 4, submissionsWeek: 25, trend: 'up', trendPercent: 12 },
      ];

      setData({
        totalSubmissions: 145,
        avgPerPerson: 36.25,
        topPerformer: mockMembers[0],
        members: mockMembers,
      });
    } catch (err) {
      console.error('Failed to load team performance:', err);
    } finally {
      setLoading(false);
    }
  }

  const getTrendIcon = (trend: TeamMember['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return <Activity className="w-3 h-3 text-zinc-400" />;
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
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          ביצועי צוות
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-border">
          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{data.totalSubmissions}</div>
            <div className="text-xs text-muted-foreground">הגשות השבוע</div>
          </div>
          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{data.avgPerPerson.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">ממוצע לאיש</div>
          </div>
        </div>

        {/* Top Performer */}
        {data.topPerformer && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Award className="w-5 h-5 text-amber-500" />
            <div className="flex-1">
              <div className="text-sm font-medium">{data.topPerformer.name}</div>
              <div className="text-xs text-muted-foreground">
                מוביל/ה השבוע עם {data.topPerformer.submissionsWeek} הגשות
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
          <div className="text-xs text-muted-foreground mb-2">חברי צוות</div>
          {data.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-medium">{member.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {member.submissionsToday} היום
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">{member.submissionsWeek}</div>
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
