/**
 * Application Router (Phase 1)
 * Defines all routes for the self-serve platform
 */

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { DashboardPage } from './pages/DashboardPage';
import { FormViewerPage } from './pages/FormViewerPage';
import { LandingPage } from './pages/LandingPage';
import { ResponsesPage } from './pages/ResponsesPage';
import { ResponsesListPage } from './pages/ResponsesListPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/editor',
    element: <EditorPage />,
  },
  {
    path: '/editor/:formId',
    element: <EditorPage />,
  },
  {
    path: '/f/:slug',
    element: <FormViewerPage />,
  },
  {
    path: '/responses',
    element: <ResponsesListPage />,
  },
  {
    path: '/responses/:formId',
    element: <ResponsesPage />,
  },
  {
    path: '*',
    element: (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-gray-600 mb-4">Page not found</p>
          <a href="/" className="text-blue-600 hover:underline">
            Go back home
          </a>
        </div>
      </div>
    ),
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
