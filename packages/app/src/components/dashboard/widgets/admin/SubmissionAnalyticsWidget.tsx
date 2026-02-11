// Submission Analytics Widget
// Created: 2026-02-07
// Purpose: Display submission trends and popular forms

import { useEffect, useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

interface AnalyticsData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  popularForm: {
    name: string;
    submissions: number;
  };
  completionRate: number;
  trendData: number[]; // Last 7 days
}

export function SubmissionAnalyticsWidget() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      // Fetch analytics from API
      const response = await fetch('/api/v1/analytics/submissions');
      if (response.ok) {
        const responseData = await response.json();
        setData(responseData);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
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
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Simple bar chart visualization
  const maxValue = Math.max(...data.trendData);

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <MaterialIcon name="analytics" size="md" className="text-green-600 dark:text-green-400" />
          </span>
          אנליטיקס הגשות
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.today}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">היום</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.thisWeek}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">השבוע</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.thisMonth}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">החודש</div>
          </div>
        </div>

        {/* Mini Trend Chart */}
        <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">מגמת 7 ימים אחרונים</div>
          <div className="flex items-end justify-between h-16 gap-1">
            {data.trendData.map((value, index) => (
              <div
                key={index}
                className="flex-1 bg-primary/20 dark:bg-primary/30 rounded-t transition-all hover:bg-primary/40"
                style={{ height: `${(value / maxValue) * 100}%` }}
                title={`${value} הגשות`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            <span>לפני 7 ימים</span>
            <span>היום</span>
          </div>
        </div>

        {/* Popular Form */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MaterialIcon name="local_fire_department" size="sm" className="text-orange-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">טופס פופולרי:</span>
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            "{data.popularForm.name}" ({data.popularForm.submissions} הגשות)
          </div>
        </div>

        {/* Completion Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="check_circle" size="sm" className="text-green-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">שיעור השלמה:</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.completionRate}%</span>
            <MaterialIcon name="trending_up" size="xs" className="text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
