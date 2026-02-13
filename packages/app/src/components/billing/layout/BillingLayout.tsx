// BillingLayout Component
// Created: 2026-02-05
// Purpose: Layout wrapper with navigation for billing pages

import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation, useDirection } from '../../../i18n';

interface BillingLayoutProps {
  className?: string;
}

interface NavItem {
  nameKey: string;
  path: string;
  icon: React.ReactNode;
}

/**
 * Billing layout component
 * Provides navigation tabs and container for billing pages
 */
export const BillingLayout: React.FC<BillingLayoutProps> = ({ className = '' }) => {
  const t = useTranslation();
  const direction = useDirection();
  const isRtl = direction === 'rtl';
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      nameKey: 'billing.nav.subscription',
      path: '/billing/subscription',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      nameKey: 'billing.nav.usage',
      path: '/billing/usage',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      nameKey: 'billing.nav.history',
      path: '/billing/history',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`} dir={direction}>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className={`flex items-center ${isRtl ? 'gap-x-4' : 'gap-x-4'}`}>
              <button
                onClick={() => navigate('/dashboard')}
                className={`flex items-center text-gray-600 hover:text-gray-900 transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}
                aria-label={t.backToDashboard}
              >
                <svg
                  className={`w-5 h-5 ${isRtl ? 'rotate-180 ml-1' : 'mr-1'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">{t.backToDashboard}</span>
              </button>
              <div className={`h-6 w-px bg-gray-300 ${isRtl ? 'mr-2' : 'ml-2'}`} />
              <h1 className="text-2xl font-bold text-gray-900">{t['billing.title']}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className={`flex ${isRtl ? 'space-x-reverse space-x-8' : 'space-x-8'}`} aria-label="Billing navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`${isRtl ? 'ml-2' : 'mr-2'} ${
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {t[item.nameKey as keyof typeof t]}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default BillingLayout;
