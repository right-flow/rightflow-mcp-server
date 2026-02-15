/**
 * Application Router (Railway Deployment)
 * Defines all routes for the app.rightflow.co.il subdomain
 * Landing page now served separately from rightflow.co.il
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { EditorPage } from './pages/EditorPage';
import { DashboardPage } from './pages/DashboardPage';
import { FormViewerPage } from './pages/FormViewerPage';
import { ResponsesPage } from './pages/ResponsesPage';
import { ResponsesListPage } from './pages/ResponsesListPage';
import { OrganizationSettingsPage } from './pages/OrganizationSettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import WhatsAppChannelsPage from './pages/WhatsAppChannelsPage';
import { BillingHistoryPage } from './components/billing/history/BillingHistoryPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { TriggersListPage } from './pages/TriggersListPage';
import { TriggerDetailPage } from './pages/TriggerDetailPage';
import { DLQDashboardPage } from './pages/DLQDashboardPage';
import { AuthGuard } from './components/auth/AuthGuard';
import { AuthPageWrapper } from './components/auth/AuthPageWrapper';
import { NotFoundPage } from './pages/NotFoundPage';

// Lazy load pages with TypeScript compilation issues (excluded from build)
const EditorPageV2 = lazy(() => import('./pages/EditorPageV2').then(m => ({ default: m.EditorPageV2 })));
const BillingPage = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })));
const SubscriptionPage = lazy(() => import('./components/billing/subscription/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const UsageDashboard = lazy(() => import('./components/billing/usage/UsageDashboard').then(m => ({ default: m.UsageDashboard })));

const router = createBrowserRouter([
  // Root redirect - AuthGuard will handle auth check and redirect if needed
  {
    path: '/',
    element: (
      <AuthGuard>
        <Navigate to="/dashboard" replace />
      </AuthGuard>
    ),
  },

  // Legacy login route redirect
  {
    path: '/login',
    element: <Navigate to="/sign-in" replace />,
  },

  // Public authentication routes (Clerk with Virtual Routing)
  {
    path: '/sign-in/*',
    element: (
      <AuthPageWrapper>
        <SignIn
          routing="virtual"
          afterSignInUrl="/dashboard"
          appearance={{
            elements: {
              footer: { display: 'none' },
              rootBox: 'shadow-xl rounded-xl overflow-hidden border border-border',
              card: 'bg-white dark:bg-black',
            },
          }}
        />
      </AuthPageWrapper>
    ),
  },
  {
    path: '/sign-up/*',
    element: (
      <AuthPageWrapper>
        <SignUp
          routing="virtual"
          afterSignUpUrl="/dashboard"
          appearance={{
            elements: {
              footer: { display: 'none' },
              rootBox: 'shadow-xl rounded-xl overflow-hidden border border-border',
              card: 'bg-white dark:bg-black',
            },
          }}
        />
      </AuthPageWrapper>
    ),
  },

  // Public form viewer (no auth required)
  {
    path: '/f/:slug',
    element: <FormViewerPage />,
  },

  // Protected routes (require authentication)
  {
    path: '/dashboard',
    element: (
      <AuthGuard>
        <DashboardPage />
      </AuthGuard>
    ),
  },
  {
    path: '/editor',
    element: (
      <AuthGuard>
        <EditorPage />
      </AuthGuard>
    ),
  },
  {
    path: '/editor/:formId',
    element: (
      <AuthGuard>
        <EditorPage />
      </AuthGuard>
    ),
  },
  {
    path: '/editor-v2',
    element: (
      <AuthGuard>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
          <EditorPageV2 />
        </Suspense>
      </AuthGuard>
    ),
  },
  {
    path: '/editor-v2/:formId',
    element: (
      <AuthGuard>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
          <EditorPageV2 />
        </Suspense>
      </AuthGuard>
    ),
  },
  {
    path: '/responses',
    element: (
      <AuthGuard>
        <ResponsesListPage />
      </AuthGuard>
    ),
  },
  {
    path: '/responses/:formId',
    element: (
      <AuthGuard>
        <ResponsesPage />
      </AuthGuard>
    ),
  },
  {
    path: '/organization',
    element: (
      <AuthGuard>
        <OrganizationSettingsPage />
      </AuthGuard>
    ),
  },
  {
    path: '/organization/whatsapp',
    element: (
      <AuthGuard>
        <WhatsAppChannelsPage />
      </AuthGuard>
    ),
  },
  // User management page (Admin only)
  {
    path: '/organization/users',
    element: (
      <AuthGuard>
        <UserManagementPage />
      </AuthGuard>
    ),
  },
  {
    path: '/reports',
    element: (
      <AuthGuard>
        <ReportsPage />
      </AuthGuard>
    ),
  },

  // Billing routes
  {
    path: '/billing',
    element: (
      <AuthGuard>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
          <BillingPage />
        </Suspense>
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/billing/subscription" replace />,
      },
      {
        path: 'subscription',
        element: (
          <Suspense fallback={<div className="p-8 text-center">טוען...</div>}>
            <SubscriptionPage />
          </Suspense>
        ),
      },
      {
        path: 'usage',
        element: (
          <Suspense fallback={<div className="p-8 text-center">טוען...</div>}>
            <UsageDashboard />
          </Suspense>
        ),
      },
      {
        path: 'history',
        element: <BillingHistoryPage />,
      },
    ],
  },

  // Event Triggers routes
  {
    path: '/triggers',
    element: (
      <AuthGuard>
        <TriggersListPage />
      </AuthGuard>
    ),
  },
  {
    path: '/triggers/:id',
    element: (
      <AuthGuard>
        <TriggerDetailPage />
      </AuthGuard>
    ),
  },

  // Dead Letter Queue Dashboard
  {
    path: '/dlq',
    element: (
      <AuthGuard>
        <DLQDashboardPage />
      </AuthGuard>
    ),
  },

  // 404 Not Found
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
