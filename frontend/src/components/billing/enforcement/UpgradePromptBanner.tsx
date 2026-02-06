// UpgradePromptBanner Component
// Created: 2026-02-05
// Purpose: Persistent banner for quota limit warnings

import React, { useState } from 'react';
import { QuotaStatus } from '../../../api/types';
import { getQuotaColor } from '../../../utils/quotaHelpers';

interface UpgradePromptBannerProps {
  quotaStatus: QuotaStatus | null;
  onUpgrade: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * Upgrade prompt banner component
 * Displays persistent warning banner when approaching or exceeding quota limits
 * Can be placed at top or bottom of page
 */
export const UpgradePromptBanner: React.FC<UpgradePromptBannerProps> = ({
  quotaStatus,
  onUpgrade,
  onDismiss,
  dismissible = true,
  position = 'top',
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!quotaStatus || isDismissed) return null;

  const { formsUsed, formsLimit, submissionsThisMonth, submissionsLimit, storageUsedMB, storageLimitMB } = quotaStatus;

  // Calculate percentages
  const formsPercentage = formsLimit === -1 ? 0 : (formsUsed / formsLimit) * 100;
  const submissionsPercentage = submissionsLimit === -1 ? 0 : (submissionsThisMonth / submissionsLimit) * 100;
  const storagePercentage = storageLimitMB === -1 ? 0 : (storageUsedMB / storageLimitMB) * 100;

  // Determine severity
  const maxPercentage = Math.max(formsPercentage, submissionsPercentage, storagePercentage);
  const isCritical = maxPercentage >= 90;
  const isWarning = maxPercentage >= 70 && maxPercentage < 90;

  // Don't show if under 70%
  if (!isCritical && !isWarning) return null;

  // Determine which quota is the problem
  const criticalQuotas: string[] = [];
  if (formsPercentage >= 90) criticalQuotas.push('forms');
  if (submissionsPercentage >= 90) criticalQuotas.push('submissions');
  if (storagePercentage >= 90) criticalQuotas.push('storage');

  const warningQuotas: string[] = [];
  if (formsPercentage >= 70 && formsPercentage < 90) warningQuotas.push('forms');
  if (submissionsPercentage >= 70 && submissionsPercentage < 90) warningQuotas.push('submissions');
  if (storagePercentage >= 70 && storagePercentage < 90) warningQuotas.push('storage');

  const problematicQuotas = criticalQuotas.length > 0 ? criticalQuotas : warningQuotas;

  // Generate message
  const getMessage = () => {
    if (isCritical) {
      if (criticalQuotas.length === 1) {
        return `Your ${criticalQuotas[0]} quota has been reached. Upgrade to continue.`;
      } else {
        return `You've reached your quota limits for ${criticalQuotas.join(', ')}. Upgrade to continue.`;
      }
    } else {
      if (warningQuotas.length === 1) {
        return `You're using over 70% of your ${warningQuotas[0]} quota. Consider upgrading.`;
      } else {
        return `You're approaching quota limits for ${warningQuotas.join(', ')}. Consider upgrading.`;
      }
    }
  };

  // Color scheme
  const colorScheme = isCritical
    ? {
        bg: 'bg-red-600',
        text: 'text-white',
        button: 'bg-white text-red-600 hover:bg-red-50',
        dismissButton: 'text-red-100 hover:text-white',
      }
    : {
        bg: 'bg-yellow-500',
        text: 'text-gray-900',
        button: 'bg-white text-yellow-700 hover:bg-yellow-50',
        dismissButton: 'text-gray-700 hover:text-gray-900',
      };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';

  return (
    <div
      className={`fixed left-0 right-0 ${positionClasses} z-30 ${colorScheme.bg} ${colorScheme.text} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between gap-4">
          {/* Icon and message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="flex-shrink-0">
              {isCritical ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            {/* Message */}
            <p className="text-sm font-medium truncate sm:whitespace-normal">{getMessage()}</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Upgrade button */}
            <button
              onClick={onUpgrade}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${colorScheme.button}`}
            >
              Upgrade Plan
            </button>

            {/* Dismiss button */}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className={`p-1 rounded-md transition-colors ${colorScheme.dismissButton}`}
                aria-label="Dismiss banner"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePromptBanner;
