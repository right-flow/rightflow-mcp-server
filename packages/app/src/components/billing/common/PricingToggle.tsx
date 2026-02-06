// PricingToggle Component
// Created: 2026-02-05
// Purpose: Toggle between monthly and yearly pricing

import React from 'react';

interface PricingToggleProps {
  isYearly: boolean;
  onChange: (isYearly: boolean) => void;
  yearlyDiscount?: number; // Discount percentage (e.g., 20 for 20% off)
  className?: string;
}

/**
 * Pricing toggle component for monthly/yearly selection
 * Shows yearly discount badge when available
 */
export const PricingToggle: React.FC<PricingToggleProps> = ({
  isYearly,
  onChange,
  yearlyDiscount,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          !isYearly
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-pressed={!isYearly}
      >
        Monthly
      </button>

      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
          isYearly
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-pressed={isYearly}
      >
        Yearly
        {yearlyDiscount && (
          <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {yearlyDiscount}% off
          </span>
        )}
      </button>
    </div>
  );
};

export default PricingToggle;
