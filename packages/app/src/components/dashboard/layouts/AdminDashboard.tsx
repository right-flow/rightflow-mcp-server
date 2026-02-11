// Admin Dashboard
// Created: 2026-02-07
// Updated: 2026-02-11 - Match Dashboard1.html mockup design (removed Forms section)
// Purpose: Dashboard view for admin users with full organizational overview

import { useState } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { StatsCard, StatsGrid } from '../widgets/shared/StatsCard';
import { UsageTrendsChart } from '../widgets/shared/UsageTrendsChart';
import { RecentActivityWidget } from '../widgets/shared/RecentActivityWidget';
import { FormPerformanceWidget } from '../widgets/shared/FormPerformanceWidget';
import { useTranslation } from '../../../i18n';

export function AdminDashboard() {
  const t = useTranslation();

  // Stats state - will be replaced with API data
  const [stats] = useState({
    monthlyViews: 12450,
    monthlyViewsTrend: { direction: 'up' as const, percentage: 12 },
    conversionRate: 68,
    conversionRateTrend: { direction: 'down' as const, percentage: 2 },
    completedForms: 842,
    completedFormsTrend: { direction: 'up' as const, percentage: 5 },
  });

  return (
    <DashboardLayout>
      {/* Stats Cards Row - matching Dashboard1.html */}
      <div className="mb-8">
        <StatsGrid columns={3}>
          <StatsCard
            icon="visibility"
            iconColor="blue"
            label={t['dashboard.stats.monthlyViews']}
            value={stats.monthlyViews.toLocaleString()}
            trend={stats.monthlyViewsTrend}
          />
          <StatsCard
            icon="conversion_path"
            iconColor="orange"
            label={t['dashboard.stats.conversionRate']}
            value={`${stats.conversionRate}%`}
            trend={stats.conversionRateTrend}
          />
          <StatsCard
            icon="check_circle"
            iconColor="green"
            label={t['dashboard.stats.completedForms']}
            value={stats.completedForms.toLocaleString()}
            trend={stats.completedFormsTrend}
          />
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
