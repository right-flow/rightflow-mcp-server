// QuotaStatusCard Component
// Created: 2026-02-05
// Purpose: Display quota status metrics with visual indicators

import React from 'react';
import { QuotaStatus } from '../../../api/types';
import { UsageProgressBar } from './UsageProgressBar';
import { getQuotaColor } from '../../../utils/quotaHelpers';

interface QuotaStatusCardProps {
  quotaStatus: QuotaStatus | null;
  loading?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * Quota status card component
 * Displays current quota metrics with progress bars
 * Shows upgrade prompt when approaching limits
 */
export const QuotaStatusCard: React.FC<QuotaStatusCardProps> = ({
  quotaStatus,
  loading = false,
  onUpgrade,
  className = '',
}) => {
  // Loading skeleton
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!quotaStatus) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No quota data available</p>
        </div>
      </div>
    );
  }

  const { formsUsed, formsLimit, submissionsThisMonth, submissionsLimit, storageUsedMB, storageLimitMB } = quotaStatus;

  // Calculate percentages
  const formsPercentage = formsLimit === -1 ? 0 : (formsUsed / formsLimit) * 100;
  const submissionsPercentage = submissionsLimit === -1 ? 0 : (submissionsThisMonth / submissionsLimit) * 100;
  const storagePercentage = storageLimitMB === -1 ? 0 : (storageUsedMB / storageLimitMB) * 100;

  // Determine if any quota is critical (>= 90%)
  const hasCriticalQuota =
    (formsLimit !== -1 && formsPercentage >= 90) ||
    (submissionsLimit !== -1 && submissionsPercentage >= 90) ||
    (storageLimitMB !== -1 && storagePercentage >= 90);

  const hasWarningQuota =
    (formsLimit !== -1 && formsPercentage >= 70 && formsPercentage < 90) ||
    (submissionsLimit !== -1 && submissionsPercentage >= 70 && submissionsPercentage < 90) ||
    (storageLimitMB !== -1 && storagePercentage >= 70 && storagePercentage < 90);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Quota Status</h2>

        {/* Status indicator */}
        {hasCriticalQuota ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Critical
          </span>
        ) : hasWarningQuota ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Warning
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Healthy
          </span>
        )}
      </div>

      {/* Progress bars */}
      <div className="space-y-6">
        {/* Forms quota */}
        <div>
          <UsageProgressBar
            current={formsUsed}
            limit={formsLimit}
            label="Forms"
            showPercentage={true}
            showNumbers={true}
            size="md"
          />
        </div>

        {/* Submissions quota */}
        <div>
          <UsageProgressBar
            current={submissionsThisMonth}
            limit={submissionsLimit}
            label="Submissions (This Month)"
            showPercentage={true}
            showNumbers={true}
            size="md"
          />
        </div>

        {/* Storage quota */}
        <div>
          <UsageProgressBar
            current={Math.round(storageUsedMB)}
            limit={storageLimitMB === -1 ? -1 : Math.round(storageLimitMB)}
            label="Storage (MB)"
            showPercentage={true}
            showNumbers={true}
            size="md"
          />
        </div>
      </div>

      {/* Upgrade prompt */}
      {hasCriticalQuota && onUpgrade && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Quota limit reached</h3>
              <p className="mt-1 text-sm text-red-700">
                You've reached or exceeded your quota limits. Upgrade your plan to continue using all features.
              </p>
              <button
                onClick={onUpgrade}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {hasWarningQuota && !hasCriticalQuota && onUpgrade && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Approaching quota limits</h3>
              <p className="mt-1 text-sm text-yellow-700">
                You're using over 70% of your quota. Consider upgrading to avoid interruptions.
              </p>
              <button
                onClick={onUpgrade}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition-colors"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotaStatusCard;
