// PlanCard Component
// Created: 2026-02-05
// Purpose: Display individual plan with pricing and features

import React from 'react';
import { Plan, PlanName } from '../../../api/types';
import { PlanFeatureList } from '../common';
import { formatCurrency, calculateYearlyDiscount } from '../../../utils/formatCurrency';

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  isYearly?: boolean;
  onSelect?: (planName: PlanName) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Plan card component
 * Displays plan details with pricing and feature list
 */
export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan = false,
  isYearly = false,
  onSelect,
  disabled = false,
  className = '',
}) => {
  const price = isYearly && plan.priceYearly !== null ? plan.priceYearly : plan.priceMonthly;
  const isFree = plan.priceMonthly === 0;
  const showYearlyDiscount = isYearly && plan.priceYearly !== null && plan.priceMonthly > 0;
  const yearlyDiscount = showYearlyDiscount
    ? calculateYearlyDiscount(plan.priceMonthly, plan.priceYearly!)
    : 0;

  const handleSelect = () => {
    if (!disabled && onSelect && !isCurrentPlan) {
      onSelect(plan.name);
    }
  };

  return (
    <div
      className={`relative bg-white rounded-lg border-2 p-6 transition-all flex flex-col ${
        isCurrentPlan
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={handleSelect}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      }}
      aria-label={`${plan.displayName} plan${isCurrentPlan ? ' (current plan)' : ''}`}
    >
      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
            Current Plan
          </span>
        </div>
      )}

      {/* Yearly Discount Badge */}
      {showYearlyDiscount && yearlyDiscount > 0 && !isCurrentPlan && (
        <div className="absolute -top-3 -right-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
            Save {yearlyDiscount}%
          </span>
        </div>
      )}

      {/* Plan Name */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900">{plan.displayName}</h3>
        <p className="text-sm text-gray-500 mt-1">{plan.name}</p>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        {isFree ? (
          <div className="text-3xl font-bold text-green-600">Free</div>
        ) : (
          <>
            {isYearly && plan.priceYearly !== null ? (
              // Yearly pricing: Show monthly price as main, total as secondary
              <>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(Math.round(price! / 12))}
                  </span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  סה"כ {formatCurrency(price!)}/year
                </p>
              </>
            ) : (
              // Monthly pricing: Show monthly price
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrency(price!)}
                </span>
                <span className="text-gray-500 ml-2">/month</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <PlanFeatureList plan={plan} className="mb-6 flex-grow" />

      {/* Select Button - aligned at bottom */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSelect();
        }}
        disabled={disabled || isCurrentPlan}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          isCurrentPlan
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        aria-label={`Select ${plan.displayName} plan`}
      >
        {isCurrentPlan ? 'Current Plan' : disabled ? 'Not Available' : 'Select Plan'}
      </button>
    </div>
  );
};

export default PlanCard;
