// Dashboard Page with Role-Based Routing
// Created: 2026-02-07
// Purpose: Routes users to appropriate dashboard based on their role

import { useOrganization, CreateOrganization } from '@clerk/clerk-react';
import { RoleProvider, useRole } from '../contexts/RoleContext';
import { AdminDashboard } from '../components/dashboard/layouts/AdminDashboard';
import { ManagerDashboard } from '../components/dashboard/layouts/ManagerDashboard';
import { WorkerDashboard } from '../components/dashboard/layouts/WorkerDashboard';
import { HelpWidget } from '../components/onboarding/HelpWidget';
import { SmartUpgradeManager } from '../components/onboarding/SmartUpgradeManager';

/**
 * Dashboard Page Entry Point
 * Wraps content with RoleProvider for RBAC functionality
 */
export function DashboardPage() {
  // Note: AuthGuard already handles authentication redirect
  // This component only renders when user is authenticated
  const { organization, isLoaded: orgLoaded } = useOrganization();

  // Show loading while Clerk organization loads
  if (!orgLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  // If no organization, show create organization screen
  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary/30">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">ברוכים הבאים ל-RightFlow</h1>
            <p className="text-muted-foreground">
              כדי להתחיל, יש ליצור ארגון או להצטרף לארגון קיים
            </p>
          </div>
          <CreateOrganization
            afterCreateOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'shadow-xl rounded-xl overflow-hidden border border-border',
                card: 'bg-white dark:bg-black',
              },
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <RoleProvider orgId={organization.id}>
      <DashboardContent />
    </RoleProvider>
  );
}

/**
 * Dashboard Content - Renders role-specific dashboard
 * Currently supports Admin dashboard, with Manager/Worker coming in future phases
 */
function DashboardContent() {
  const { role, loading: roleLoading, error: roleError } = useRole();

  // Loading state - Role loading
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">טוען לוח בקרה...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (roleError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive text-lg font-semibold">שגיאה בטעינת פרופיל</div>
          <p className="text-muted-foreground text-sm">{roleError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  // Render dashboard based on role
  const renderDashboard = () => {
    switch (role) {
      case 'admin':
        return <AdminDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'worker':
        return <WorkerDashboard />;
      default:
        // Fallback to Admin dashboard if role is unknown
        return <AdminDashboard />;
    }
  };

  return (
    <>
      {renderDashboard()}

      {/* Onboarding Components - shown on all dashboards */}
      {/* TODO: Re-enable SmartUpgradeManager when billing routes are mounted
      <SmartUpgradeManager />
      */}
      <HelpWidget onRestartTutorial={() => console.log('Tutorial restarted')} />
    </>
  );
}
