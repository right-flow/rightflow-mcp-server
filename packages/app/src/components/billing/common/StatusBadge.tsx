// StatusBadge Component
// Created: 2026-02-05
// Purpose: Display subscription status with color coding

import React from 'react';
import { SubscriptionStatus } from '../../../api/types';
import { useTranslation } from '../../../i18n';

interface StatusBadgeProps {
  status: SubscriptionStatus;
  className?: string;
}

/**
 * Status badge component for subscription status
 * Displays color-coded badge with status label
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const t = useTranslation();

  const getStatusConfig = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return {
          labelKey: 'billing.status.active',
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'grace_period':
        return {
          labelKey: 'billing.status.gracePeriod',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'suspended':
        return {
          labelKey: 'billing.status.suspended',
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      case 'cancelled':
        return {
          labelKey: 'billing.status.cancelled',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
      default:
        return {
          labelKey: status,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const config = getStatusConfig(status);
  const label = t[config.labelKey as keyof typeof t] as string;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
      role="status"
      aria-label={`${t['billing.status.subscriptionStatus']}: ${label}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
