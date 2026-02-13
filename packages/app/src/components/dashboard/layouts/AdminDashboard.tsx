// Admin Dashboard
// Created: 2026-02-07
// Updated: 2026-02-11 - Match Dashboard1.html mockup design (removed Forms section)
// Updated: 2026-02-12 - Connected to real API data via /api/v1/analytics/dashboard-stats
// Purpose: Dashboard view for admin users with full organizational overview

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { DashboardLayout } from './DashboardLayout';
import { StatsCard, StatsGrid } from '../widgets/shared/StatsCard';
import { UsageTrendsChart } from '../widgets/shared/UsageTrendsChart';
import { RecentActivityWidget } from '../widgets/shared/RecentActivityWidget';
import { FormPerformanceWidget } from '../widgets/shared/FormPerformanceWidget';
import { useTranslation } from '../../../i18n';

interface DashboardStats {
  monthlySubmissions: { value: number; trend: number; label: string };
  completionRate: { value: number; trend: number; label: string };
  activeForms: { value: number; label: string };
  activeUsers: { value: number; label: string };
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function AdminDashboard() {
  const t = useTranslation();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  // Load dashboard stats from API
  const loadStats = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);

    try {
      const token = await getToken();
      if (!token || !isMounted.current) return;

      const response = await fetch('/api/v1/analytics/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!isMounted.current) return;

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [getToken]);

  // Initial load and refresh interval
  useEffect(() => {
    isMounted.current = true;
    loadStats();

    const intervalId = setInterval(() => {
      loadStats(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, []);

  // Format trend for StatsCard
  const formatTrend = (trend: number) => ({
    direction: trend >= 0 ? 'up' as const : 'down' as const,
    percentage: Math.abs(trend),
  });

  return (
    <DashboardLayout>
      {/* Stats Cards Row - matching Dashboard1.html */}
      <div className="mb-8">
        <StatsGrid columns={3}>
          {isLoading ? (
            <>
              <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl h-32 border border-gray-100 dark:border-gray-700" />
              <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl h-32 border border-gray-100 dark:border-gray-700" />
              <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl h-32 border border-gray-100 dark:border-gray-700" />
            </>
          ) : (
            <>
              <StatsCard
                icon="description"
                iconColor="blue"
                label={stats?.monthlySubmissions.label || t['dashboard.stats.monthlyViews']}
                value={stats?.monthlySubmissions.value.toLocaleString() || '0'}
                trend={formatTrend(stats?.monthlySubmissions.trend || 0)}
              />
              <StatsCard
                icon="conversion_path"
                iconColor="orange"
                label={stats?.completionRate.label || t['dashboard.stats.conversionRate']}
                value={`${stats?.completionRate.value || 0}%`}
                trend={formatTrend(stats?.completionRate.trend || 0)}
              />
              <StatsCard
                icon="check_circle"
                iconColor="green"
                label={stats?.activeForms.label || t['dashboard.stats.completedForms']}
                value={stats?.activeForms.value.toLocaleString() || '0'}
              />
            </>
          )}
        </StatsGrid>
      </div>

      {/* Usage Trends Chart */}
      <div className="mb-8">
        <UsageTrendsChart />
      </div>

      {/* Two Column Layout - Activity & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentActivityWidget />
        <FormPerformanceWidget />
      </div>
    </DashboardLayout>
  );
}
