// DowngradeConfirmationModal Component
// Created: 2026-02-05
// Purpose: Confirmation modal for downgrade with archive warning

import React, { useState } from 'react';
import { PlanName, FormToArchive } from '../../../api/types';

interface DowngradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetPlan: PlanName;
  currentPlan: PlanName;
  formsToArchive: FormToArchive[];
  formsToArchiveCount: number;
  warning: string;
  loading?: boolean;
}

/**
 * Downgrade confirmation modal component
 * Shows warning about forms that will be archived
 * Requires explicit user confirmation
 */
export const DowngradeConfirmationModal: React.FC<DowngradeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetPlan,
  currentPlan,
  formsToArchive,
  formsToArchiveCount,
  warning,
  loading = false,
}) => {
  const [confirmChecked, setConfirmChecked] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmChecked && !loading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setConfirmChecked(false);
      onClose();
    }
  };

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
        aria-labelledby="downgrade-modal-title"
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-amber-600"
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
                  </div>
                  <div>
                    <h2 id="downgrade-modal-title" className="text-xl font-bold text-gray-900">
                      Confirm Downgrade
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {currentPlan} → {targetPlan}
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                {!loading && (
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
                )}
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {/* Warning Message */}
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900 font-medium">{warning}</p>
              </div>

              {/* Explanation */}
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  Downgrading to the <span className="font-semibold">{targetPlan}</span> plan will
                  archive the following forms:
                </p>
                <p className="text-xs text-gray-500">
                  Archived forms are preserved and can be restored by upgrading your plan later.
                  Forms are archived oldest first.
                </p>
              </div>

              {/* Forms to Archive List */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Forms to be archived ({formsToArchiveCount})
                </h3>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-60 overflow-y-auto">
                  {formsToArchive.slice(0, 10).map((form) => (
                    <div key={form.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{form.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Created: {new Date(form.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-amber-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                  {formsToArchiveCount > 10 && (
                    <div className="px-4 py-3 bg-gray-50 text-center">
                      <p className="text-sm text-gray-600">
                        and {formsToArchiveCount - 10} more forms...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-900">
                    I understand that{' '}
                    <span className="font-semibold">{formsToArchiveCount} forms</span> will be
                    archived (oldest first). These forms can be restored by upgrading later.
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!confirmChecked || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Confirm Downgrade to ${targetPlan}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DowngradeConfirmationModal;
