// Team Overview Widget
// Created: 2026-02-07
// Purpose: Display team statistics and quick user management access

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
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
      // Fetch team stats from API
      const response = await fetch('/api/v1/users/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setStats(null);
      }
    } catch (err) {
      setError('שגיאה בטעינת נתוני צוות');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="text-red-500 dark:text-red-400 text-sm">{error || 'אין נתונים'}</div>
        </CardContent>
      </Card>
    );
  }

  const avgSubmissionsPerPerson =
    stats.activeToday > 0 ? (stats.submissionsToday / stats.activeToday).toFixed(1) : 0;

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <MaterialIcon name="group" size="md" className="text-purple-600 dark:text-purple-400" />
          </span>
          סיכום צוות
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total Users */}
        <div className="text-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">סה"כ משתמשים</div>
        </div>

        {/* Role Distribution */}
        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="font-bold text-gray-900 dark:text-gray-100">{stats.roleDistribution.admin}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="font-bold text-gray-900 dark:text-gray-100">{stats.roleDistribution.manager}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Manager</div>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="font-bold text-gray-900 dark:text-gray-100">{stats.roleDistribution.worker}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Worker</div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-500 dark:text-gray-400">פעילים היום</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.activeToday}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MaterialIcon name="activity" size="sm" className="text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">הגשות היום</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {stats.submissionsToday}{' '}
              <span className="text-xs text-gray-500 dark:text-gray-400">(ממוצע: {avgSubmissionsPerPerson} לאיש)</span>
            </span>
          </div>
        </div>

        {/* Manage Users Button */}
        <button
          onClick={() => navigate('/organization/users')}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-gray-700 dark:text-gray-300"
        >
          <MaterialIcon name="how_to_reg" size="sm" />
          ניהול משתמשים
          <MaterialIcon name="chevron_right" size="sm" className="mr-auto rtl:mr-0 rtl:ml-auto" />
        </button>
      </CardContent>
    </Card>
  );
}
