// Worker Dashboard
// Created: 2026-02-07
// Updated: 2026-02-08 - Removed QuickActionsWidget, simplified layout
// Purpose: Mobile-first dashboard for field workers with assigned forms

import { DashboardLayout } from './DashboardLayout';
import { WelcomeCard } from '../widgets/shared/WelcomeCard';
import { MyFormsWidget } from '../widgets/worker/MyFormsWidget';
import { RecentSubmissionsWidget } from '../widgets/shared/RecentSubmissionsWidget';

export function WorkerDashboard() {
  return (
    <DashboardLayout showSearch={false}>
      {/* Welcome - simplified for workers */}
      <WelcomeCard />

      {/* My Assigned Forms - single column for mobile */}
      <div className="mb-6">
        <MyFormsWidget />
      </div>

      {/* Recent Submissions - limited for workers */}
      {/* TODO: Add user filtering when API supports ?user=me parameter */}
      <div className="mb-6">
        <RecentSubmissionsWidget limit={5} />
      </div>
    </DashboardLayout>
  );
}
