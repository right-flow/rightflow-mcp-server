/**
 * Application Router (Railway Deployment)
 * Defines all routes for the app.rightflow.co.il subdomain
 * Landing page now served separately from rightflow.co.il
 */

import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { EditorPage } from './pages/EditorPage';
import { DashboardPage } from './pages/DashboardPage';
import { FormViewerPage } from './pages/FormViewerPage';
import { ResponsesPage } from './pages/ResponsesPage';
import { ResponsesListPage } from './pages/ResponsesListPage';
import { OrganizationSettingsPage } from './pages/OrganizationSettingsPage';
import { AuthGuard } from './components/auth/AuthGuard';

// Landing URL from environment variable
const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://rightflow.co.il';

const router = createBrowserRouter([
  // Root redirect to dashboard (for authenticated users)
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },

  // Public authentication routes
  {
    path: '/sign-in',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full space-y-8">
          <SignIn
            routing="path"
            path="/sign-in"
            afterSignInUrl="/dashboard"
            appearance={{
              elements: {
                footer: {
                  display: 'none', // Hide default footer to add custom link
                },
              },
            }}
          />
          <div className="mt-6 text-center">
            <a
              href={LANDING_URL}
              className="text-sm text-slate-600 hover:text-[#FF6100] transition-colors flex items-center justify-center gap-2"
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
    path: '/sign-up',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full space-y-8">
          <SignUp
            routing="path"
            path="/sign-up"
            afterSignUpUrl="/dashboard"
            appearance={{
              elements: {
                footer: {
                  display: 'none',
                },
              },
            }}
          />
          <div className="mt-6 text-center">
            <a
              href={LANDING_URL}
              className="text-sm text-slate-600 hover:text-[#FF6100] transition-colors flex items-center justify-center gap-2"
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

  // 404 Not Found
  {
    path: '*',
    element: (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-black text-[#0A1551]">404</h1>
          <p className="text-xl text-slate-600 mb-4">הדף שחיפשת לא נמצא</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="bg-[#FF6100] hover:bg-[#E65700] text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              חזרה לדשבורד
            </a>
            <a
              href={LANDING_URL}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-3 rounded-xl transition-colors"
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
