// Team Overview Widget
// Created: 2026-02-07
// Purpose: Display team statistics and quick user management access

import { useEffect, useState } from 'react';
import { Users, UserCheck, Activity, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

interface TeamStats {
  totalUsers: number;
  roleDistribution: {
    admin: number;
    manager: number;
    worker: number;
  };
  activeToday: number;
  submissionsToday: number;
}

export function TeamOverviewWidget() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeamStats();
  }, []);

  async function loadTeamStats() {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/users/stats');
      // const data = await response.json();

      // Mock data
      setStats({
        totalUsers: 12,
        roleDistribution: {
          admin: 2,
          manager: 3,
          worker: 7,
        },
        activeToday: 8,
        submissionsToday: 23,
      });
    } catch (err) {
      setError('שגיאה בטעינת נתוני צוות');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="text-red-500 text-sm">{error || 'אין נתונים'}</div>
        </CardContent>
      </Card>
    );
  }

  const avgSubmissionsPerPerson =
    stats.activeToday > 0 ? (stats.submissionsToday / stats.activeToday).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          סיכום צוות
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total Users */}
        <div className="text-center mb-4 pb-4 border-b border-border">
          <div className="text-3xl font-bold text-foreground">{stats.totalUsers}</div>
          <div className="text-sm text-muted-foreground">סה"כ משתמשים</div>
        </div>

        {/* Role Distribution */}
        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-border">
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="font-bold text-red-600 dark:text-red-400">{stats.roleDistribution.admin}</div>
            <div className="text-xs text-muted-foreground">Admin</div>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="font-bold text-blue-600 dark:text-blue-400">{stats.roleDistribution.manager}</div>
            <div className="text-xs text-muted-foreground">Manager</div>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="font-bold text-green-600 dark:text-green-400">{stats.roleDistribution.worker}</div>
            <div className="text-xs text-muted-foreground">Worker</div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">פעילים היום</span>
            </div>
            <span className="font-semibold">{stats.activeToday}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">הגשות היום</span>
            </div>
            <span className="font-semibold">
              {stats.submissionsToday}{' '}
              <span className="text-xs text-muted-foreground">(ממוצע: {avgSubmissionsPerPerson} לאיש)</span>
            </span>
          </div>
        </div>

        {/* Manage Users Button */}
        <button
          onClick={() => navigate('/organization/users')}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <UserCheck className="w-4 h-4" />
          ניהול משתמשים
          <ChevronRight className="w-4 h-4 mr-auto rtl:mr-0 rtl:ml-auto" />
        </button>
      </CardContent>
    </Card>
  );
}
