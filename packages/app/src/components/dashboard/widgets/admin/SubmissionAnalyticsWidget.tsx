// Submission Analytics Widget
// Created: 2026-02-07
// Purpose: Display submission trends and popular forms

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Flame, CheckCircle } from 'lucide-react';
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
      // TODO: Replace with actual API call to /api/v1/analytics/submissions

      // Mock data
      setData({
        today: 23,
        thisWeek: 145,
        thisMonth: 412,
        popularForm: {
          name: 'דו"ח שירות',
          submissions: 45,
        },
        completionRate: 87,
        trendData: [18, 22, 15, 28, 25, 20, 23], // Last 7 days
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
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
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
            <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          אנליטיקס הגשות
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{data.today}</div>
            <div className="text-xs text-muted-foreground">היום</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{data.thisWeek}</div>
            <div className="text-xs text-muted-foreground">השבוע</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{data.thisMonth}</div>
            <div className="text-xs text-muted-foreground">החודש</div>
          </div>
        </div>

        {/* Mini Trend Chart */}
        <div className="mb-4 pb-4 border-b border-border">
          <div className="text-xs text-muted-foreground mb-2">מגמת 7 ימים אחרונים</div>
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
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>לפני 7 ימים</span>
            <span>היום</span>
          </div>
        </div>

        {/* Popular Form */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">טופס פופולרי:</span>
          </div>
          <div className="text-sm font-medium">
            "{data.popularForm.name}" ({data.popularForm.submissions} הגשות)
          </div>
        </div>

        {/* Completion Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">שיעור השלמה:</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">{data.completionRate}%</span>
            <TrendingUp className="w-3 h-3 text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
