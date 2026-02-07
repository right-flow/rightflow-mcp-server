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
import { AuthGuard } from './components/auth/AuthGuard';

// Lazy load pages with TypeScript compilation issues (excluded from build)
const EditorPageV2 = lazy(() => import('./pages/EditorPageV2').then(m => ({ default: m.EditorPageV2 })));
const BillingPage = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })));
const SubscriptionPage = lazy(() => import('./components/billing/subscription/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const UsageDashboard = lazy(() => import('./components/billing/usage/UsageDashboard').then(m => ({ default: m.UsageDashboard })));

// Landing URL from environment variable
const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://rightflow.co.il';

const router = createBrowserRouter([
  // Root redirect to dashboard (for authenticated users)
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },

  // Public authentication routes (Clerk with Virtual Routing)
  {
    path: '/sign-in/*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="max-w-md w-full space-y-8">
          <SignIn
            routing="virtual"
            afterSignInUrl="/dashboard"
            appearance={{
              elements: {
                footer: {
                  display: 'none', // Hide default footer to add custom link
                },
                rootBox: 'shadow-xl rounded-xl overflow-hidden border border-border',
                card: 'bg-white dark:bg-black',
              },
            }}
          />
          <div className="mt-6 text-center">
            <a
              href={LANDING_URL}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <span>←</span>
              <span>חזרה לדף הבית למידע נוסף</span>
            </a>
          </div>
        </div>
      </div>
    ),
  },
  {
    path: '/sign-up/*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="max-w-md w-full space-y-8">
          <SignUp
            routing="virtual"
            afterSignUpUrl="/dashboard"
            appearance={{
              elements: {
                footer: {
                  display: 'none',
                },
                rootBox: 'shadow-xl rounded-xl overflow-hidden border border-border',
                card: 'bg-white dark:bg-black',
              },
            }}
          />
          <div className="mt-6 text-center">
            <a
              href={LANDING_URL}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <span>←</span>
              <span>חזרה לדף הבית למידע נוסף</span>
            </a>
          </div>
        </div>
      </div>
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

  // 404 Not Found
  {
    path: '*',
    element: (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-6">
          <h1 className="text-8xl font-black text-foreground opacity-20">404</h1>
          <p className="text-xl text-muted-foreground mb-4">הדף שחיפשת לא נמצא</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="bg-primary text-primary-foreground hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold px-8 py-3 rounded-lg transition-all active:scale-[0.98]"
            >
              חזרה לדשבורד
            </a>
            <a
              href={LANDING_URL}
              className="bg-secondary hover:bg-zinc-200 dark:hover:bg-zinc-800 text-foreground font-bold px-8 py-3 rounded-lg transition-all border border-border"
            >
              חזרה לדף הבית
            </a>
          </div>
        </div>
      </div>
    ),
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
