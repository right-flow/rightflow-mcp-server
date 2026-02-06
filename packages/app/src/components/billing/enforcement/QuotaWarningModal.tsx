// QuotaWarningModal Component
// Created: 2026-02-05
// Purpose: Pre-submission warning modal for quota limits

import React, { useState } from 'react';
import { QuotaCheckResult } from '../../../api/types';
import { formatCurrency } from '../../../utils/formatCurrency';

interface QuotaWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onUpgrade: () => void;
  quotaResult: QuotaCheckResult | null;
  showDontShowAgain?: boolean;
  onDontShowAgainChange?: (checked: boolean) => void;
}

/**
 * Quota warning modal component
 * Displays pre-submission warnings when approaching or exceeding quota limits
 * Offers options to proceed, upgrade, or cancel
 */
export const QuotaWarningModal: React.FC<QuotaWarningModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  onUpgrade,
  quotaResult,
  showDontShowAgain = true,
  onDontShowAgainChange,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen || !quotaResult) return null;

  const { allowed, reason, upgradeRequired, willIncurOverage, estimatedOverageCost, quotaInfo } = quotaResult;

  const handleProceed = () => {
    if (onDontShowAgainChange && dontShowAgain) {
      onDontShowAgainChange(dontShowAgain);
    }
    onProceed();
  };

  const handleClose = () => {
    setDontShowAgain(false);
    onClose();
  };

  // Determine modal type based on quota result
  const isBlocked = !allowed;
  const isOverage = willIncurOverage && allowed;
  const isWarning = allowed && !willIncurOverage;

  // Color scheme based on severity
  const colorScheme = isBlocked
    ? { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' }
    : isOverage
    ? { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', button: 'bg-amber-600 hover:bg-amber-700' }
    : { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', button: 'bg-yellow-600 hover:bg-yellow-700' };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quota-warning-title"
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full ${colorScheme.bg} flex items-center justify-center`}>
                    {isBlocked ? (
                      <svg
                        className={`w-6 h-6 ${colorScheme.icon}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    ) : (
                      <svg
                        className={`w-6 h-6 ${colorScheme.icon}`}
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
                    )}
                  </div>
                  <div>
                    <h2 id="quota-warning-title" className="text-xl font-bold text-gray-900">
                      {isBlocked ? 'Quota Limit Reached' : isOverage ? 'Overage Warning' : 'Quota Warning'}
                    </h2>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Main message */}
              <div className={`mb-4 p-4 ${colorScheme.bg} border ${colorScheme.border} rounded-lg`}>
                <p className="text-sm font-medium text-gray-900">
                  {reason || (isBlocked ? 'You have reached your quota limit.' : 'You are approaching your quota limit.')}
                </p>
              </div>

              {/* Quota details */}
              {quotaInfo && (
                <div className="mb-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Current Usage:</h3>

                  {/* Forms */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Forms:</span>
                    <span className="font-medium text-gray-900">
                      {quotaInfo.formsUsed} / {quotaInfo.formsLimit === -1 ? 'Unlimited' : quotaInfo.formsLimit}
                    </span>
                  </div>

                  {/* Submissions */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Submissions (This Month):</span>
                    <span className="font-medium text-gray-900">
                      {quotaInfo.submissionsThisMonth} / {quotaInfo.submissionsLimit === -1 ? 'Unlimited' : quotaInfo.submissionsLimit}
                    </span>
                  </div>

                  {/* Storage */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Storage:</span>
                    <span className="font-medium text-gray-900">
                      {quotaInfo.storageUsedMB.toFixed(1)} MB / {quotaInfo.storageLimitMB === -1 ? 'Unlimited' : `${quotaInfo.storageLimitMB} MB`}
                    </span>
                  </div>
                </div>
              )}

              {/* Overage cost warning */}
              {isOverage && estimatedOverageCost !== undefined && estimatedOverageCost > 0 && (
                <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">Estimated overage cost:</span>{' '}
                    {formatCurrency(estimatedOverageCost)} will be added to your next bill.
                  </p>
                </div>
              )}

              {/* Upgrade required message */}
              {upgradeRequired && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700">
                    To continue, please upgrade your plan to increase your quota limits.
                  </p>
                </div>
              )}

              {/* Don't show again checkbox */}
              {showDontShowAgain && !isBlocked && onDontShowAgainChange && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Don't show this warning again for overage charges
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              {!isBlocked ? (
                <>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onUpgrade}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upgrade Plan
                  </button>
                  <button
                    onClick={handleProceed}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${colorScheme.button}`}
                  >
                    Proceed Anyway
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onUpgrade}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upgrade Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuotaWarningModal;
