// UsageProgressBar Component
// Created: 2026-02-05
// Purpose: Visual progress bar for usage quota with color coding

import React from 'react';
import { getQuotaColor, QuotaColor } from '../../../utils/quotaHelpers';

interface UsageProgressBarProps {
  current: number;
  limit: number;
  label?: string;
  showPercentage?: boolean;
  showNumbers?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Usage progress bar component
 * Displays current usage vs limit with color-coded bar
 * - Green: < 70%
 * - Yellow: 70-90%
 * - Red: >= 90%
 */
export const UsageProgressBar: React.FC<UsageProgressBarProps> = ({
  current,
  limit,
  label,
  showPercentage = true,
  showNumbers = true,
  size = 'md',
  className = '',
}) => {
  // Calculate percentage (handle unlimited case)
  const percentage = limit === -1 ? 0 : Math.min((current / limit) * 100, 100);
  const quotaColor = getQuotaColor(percentage);
  const isUnlimited = limit === -1;

  // Size variants
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Color classes
  const colorClasses: Record<QuotaColor, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label and stats row */}
      {(label || showPercentage || showNumbers) && (
        <div className={`flex items-center justify-between mb-1 ${textSizeClasses[size]}`}>
          {/* Label */}
          {label && (
            <span className="font-medium text-gray-700">{label}</span>
          )}

          {/* Stats */}
          <div className="flex items-center gap-2">
            {showNumbers && (
              <span className="text-gray-600">
                {isUnlimited ? (
                  <span>
                    {formatNumber(current)} <span className="text-gray-400">/ Unlimited</span>
                  </span>
                ) : (
                  <span>
                    {formatNumber(current)} <span className="text-gray-400">/ {formatNumber(limit)}</span>
                  </span>
                )}
              </span>
            )}
            {showPercentage && !isUnlimited && (
              <span className={`font-semibold ${
                quotaColor === 'green' ? 'text-green-600' :
                quotaColor === 'yellow' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClasses[size]}`}
        role="progressbar"
        aria-valuenow={isUnlimited ? undefined : current}
        aria-valuemin={0}
        aria-valuemax={isUnlimited ? undefined : limit}
        aria-label={label || 'Usage progress'}
      >
        <div
          className={`${colorClasses[quotaColor]} ${heightClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: isUnlimited ? '0%' : `${percentage}%` }}
        />
      </div>

      {/* Warning message for high usage */}
      {!isUnlimited && percentage >= 90 && (
        <p className={`mt-1 ${textSizeClasses[size]} text-red-600`}>
          {percentage >= 100 ? 'Quota exceeded' : 'Approaching quota limit'}
        </p>
      )}
    </div>
  );
};

export default UsageProgressBar;
