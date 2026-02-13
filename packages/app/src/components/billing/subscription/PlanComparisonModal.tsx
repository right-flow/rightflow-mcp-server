// PlanComparisonModal Component
// Created: 2026-02-05
// Purpose: Modal for comparing and selecting subscription plans

import React, { useState } from 'react';
import { Plan, PlanName } from '../../../api/types';
import { PlanCard } from './PlanCard';
import { PricingToggle } from '../common';
import { useTranslation, useDirection } from '../../../i18n';

interface PlanComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: Plan[];
  currentPlanName?: PlanName;
  onSelectPlan: (planName: PlanName) => void;
  loading?: boolean;
}

/**
 * Plan comparison modal component
 * Displays all available plans in a grid with monthly/yearly toggle
 */
export const PlanComparisonModal: React.FC<PlanComparisonModalProps> = ({
  isOpen,
  onClose,
  plans,
  currentPlanName,
  onSelectPlan,
  loading = false,
}) => {
  const t = useTranslation();
  const direction = useDirection();
  const isRtl = direction === 'rtl';
  const [isYearly, setIsYearly] = useState(false);

  if (!isOpen) return null;

  // Sort plans by price (FREE -> BASIC -> EXPANDED -> ENTERPRISE)
  // Handle null prices (ENTERPRISE) as highest value
  // Grid will use dir="rtl" for right-to-left display
  const sortedPlans = [...plans].sort((a, b) => {
    const priceA = a.priceMonthly ?? Infinity; // null = highest price
    const priceB = b.priceMonthly ?? Infinity;
    return priceA - priceB;
  });

  // Calculate yearly discount for display
  const hasYearlyOption = plans.some((p) => p.priceYearly !== null && p.priceMonthly > 0);
  const avgDiscount =
    hasYearlyOption && plans.filter((p) => p.priceYearly !== null && p.priceMonthly > 0).length > 0
      ? Math.round(
          plans
            .filter((p) => p.priceYearly !== null && p.priceMonthly > 0)
            .reduce((acc, p) => {
              const yearlyFromMonthly = p.priceMonthly * 12;
              const discount = ((yearlyFromMonthly - p.priceYearly!) / yearlyFromMonthly) * 100;
              return acc + discount;
            }, 0) /
            plans.filter((p) => p.priceYearly !== null && p.priceMonthly > 0).length
        )
      : 0;

  const handleSelectPlan = (planName: PlanName) => {
    onSelectPlan(planName);
    // Don't close modal here - let parent handle it after API call
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-comparison-title"
        dir={direction}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="plan-comparison-title" className="text-2xl font-bold text-gray-900">
                    {t['billing.comparison.title']}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {t['billing.comparison.description']}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={t['billing.comparison.close'] as string}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Pricing Toggle */}
              {hasYearlyOption && (
                <div className="mt-4 flex justify-center">
                  <PricingToggle
                    isYearly={isYearly}
                    onChange={setIsYearly}
                    yearlyDiscount={avgDiscount}
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-8 overflow-y-auto flex-1 min-h-0">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Plans Grid - RTL for Hebrew */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" dir="rtl">
                    {sortedPlans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        isCurrentPlan={plan.name === currentPlanName}
                        isYearly={isYearly}
                        onSelect={handleSelectPlan}
                        disabled={loading}
                      />
                    ))}
                  </div>

                  {/* Enterprise Contact */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center border border-blue-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t['billing.comparison.customPlanTitle']}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {t['billing.comparison.customPlanDescription']}
                    </p>
                    <button
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      onClick={() => {
                        window.location.href = 'mailto:sales@rightflow.com';
                      }}
                    >
                      {t['billing.comparison.contactSales']}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end items-center text-sm text-gray-500">
                <button
                  onClick={onClose}
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  {t['billing.comparison.cancel']}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlanComparisonModal;
