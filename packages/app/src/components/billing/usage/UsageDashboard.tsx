// UsageDashboard Component
// Created: 2026-02-05
// Purpose: Container page for usage monitoring and quota tracking

import React, { useEffect, useState } from 'react';
import { useUsage } from '../../../contexts/UsageContext';
import { useBilling } from '../../../contexts/BillingContext';
import { QuotaStatusCard } from './QuotaStatusCard';
import { UsageBreakdownTable } from './UsageBreakdownTable';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useDirection } from '../../../i18n';

interface UsageDashboardProps {
  className?: string;
}

/**
 * Usage dashboard page component
 * Orchestrates usage monitoring components
 * Provides overview of current usage, quotas, and detailed breakdown
 */
export const UsageDashboard: React.FC<UsageDashboardProps> = ({ className = '' }) => {
  const t = useTranslation();
  const direction = useDirection();
  const isRtl = direction === 'rtl';
  const navigate = useNavigate();
  const { usage, quotaStatus, usageDetails, loading, error, refreshUsage, refreshQuotaStatus, refreshUsageDetails } = useUsage();
  const { subscription } = useBilling();

  const [refreshing, setRefreshing] = useState(false);

  // Auto-load on mount
  useEffect(() => {
    refreshUsageDetails();
  }, [refreshUsageDetails]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUsage(),
        refreshQuotaStatus(),
        refreshUsageDetails(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Navigate to subscription page
  const handleUpgrade = () => {
    navigate('/billing/subscription');
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`} dir={direction}>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t['billing.usage.title']}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {t['billing.usage.description']}
            </p>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`${isRtl ? '-mr-1 ml-2' : '-ml-1 mr-2'} h-5 w-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? t['billing.usage.refreshing'] : t['billing.usage.refresh']}
          </button>
        </div>

        {/* Current plan badge */}
        {subscription && subscription.plan && (
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {t['billing.usage.currentPlan']}: {subscription.plan.displayName}
            </span>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className={isRtl ? 'mr-3' : 'ml-3'}>
              <h3 className="text-sm font-medium text-red-800">{t['billing.usage.failedToLoad']}</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-900"
              >
                {t['billing.usage.tryAgain']}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard content */}
      <div className="space-y-6">
        {/* Quota status card */}
        <QuotaStatusCard
          quotaStatus={quotaStatus}
          loading={loading}
          onUpgrade={handleUpgrade}
        />

        {/* Usage statistics summary */}
        {usage && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Forms stat */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className={isRtl ? 'mr-4' : 'ml-4'}>
                  <h3 className="text-sm font-medium text-gray-500">{t['billing.usage.totalForms']}</h3>
                  <p className="text-2xl font-bold text-gray-900">{usage.formsCreated ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Submissions stat */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className={isRtl ? 'mr-4' : 'ml-4'}>
                  <h3 className="text-sm font-medium text-gray-500">{t['billing.usage.thisMonth']}</h3>
                  <p className="text-2xl font-bold text-gray-900">{usage.submissionsThisMonth ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Storage stat */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                      />
                    </svg>
                  </div>
                </div>
                <div className={isRtl ? 'mr-4' : 'ml-4'}>
                  <h3 className="text-sm font-medium text-gray-500">{t['billing.usage.storageUsed']}</h3>
                  <p className="text-2xl font-bold text-gray-900">{(usage.storageUsedMB ?? 0).toFixed(1)} MB</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage breakdown table */}
        <UsageBreakdownTable usageDetails={usageDetails} loading={loading} />
      </div>
    </div>
  );
};

export default UsageDashboard;
