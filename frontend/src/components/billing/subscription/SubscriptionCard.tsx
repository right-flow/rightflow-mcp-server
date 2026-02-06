// SubscriptionCard Component
// Created: 2026-02-05
// Purpose: Display current subscription plan details

import React from 'react';
import { Subscription } from '../../../api/types';
import { StatusBadge } from '../common';
import { formatCurrency } from '../../../utils/formatCurrency';

interface SubscriptionCardProps {
  subscription: Subscription | null;
  onUpgrade?: () => void;
  onDowngrade?: () => void;
  onCancel?: () => void;
  onViewPlans?: () => void;
  loading?: boolean;
}

/**
 * Subscription card component
 * Displays current plan with actions (upgrade, downgrade, cancel)
 */
export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onUpgrade,
  onDowngrade,
  onCancel,
  onViewPlans,
  loading = false,
}) => {
  if (loading) {
    return <SubscriptionCardSkeleton />;
  }

  if (!subscription || !subscription.plan) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No subscription found</p>
      </div>
    );
  }

  const { plan, status, billingCycle, currentPeriodEnd, cancelledAt } = subscription;
  const isYearly = billingCycle === 'yearly';
  const price = isYearly ? plan.priceYearly : plan.priceMonthly;
  const isCancelled = status === 'cancelled';
  const isSuspended = status === 'suspended';
  const isGracePeriod = status === 'grace_period';

  // Determine if upgrade/downgrade buttons should show
  const canUpgrade = !isCancelled && plan.name !== 'ENTERPRISE';
  const canDowngrade = !isCancelled && plan.name !== 'FREE';
  const canCancel = !isCancelled;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{plan.displayName}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Current billing cycle: {isYearly ? 'Yearly' : 'Monthly'}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Price */}
      {price !== null && price > 0 && (
        <div className="mb-4">
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(price)}
            <span className="text-lg font-normal text-gray-500">
              /{isYearly ? 'year' : 'month'}
            </span>
          </div>
          {isYearly && plan.priceMonthly > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {formatCurrency(Math.round(price / 12))}/month billed annually
            </p>
          )}
        </div>
      )}

      {plan.name === 'FREE' && (
        <div className="mb-4">
          <div className="text-3xl font-bold text-green-600">Free Forever</div>
        </div>
      )}

      {/* Plan Limits */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Forms</p>
          <p className="text-lg font-semibold text-gray-900">{plan.maxForms}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Submissions</p>
          <p className="text-lg font-semibold text-gray-900">
            {plan.maxSubmissionsPerMonth.toLocaleString()}/mo
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Storage</p>
          <p className="text-lg font-semibold text-gray-900">
            {(plan.maxStorageMB / 1024).toFixed(0)} GB
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Team Members</p>
          <p className="text-lg font-semibold text-gray-900">{plan.maxMembers}</p>
        </div>
      </div>

      {/* Billing Period */}
      <div className="mb-6 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-medium">Current period:</span>{' '}
          {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        {isCancelled && cancelledAt && (
          <p className="text-sm text-red-600 mt-1">
            <span className="font-medium">Cancelled on:</span>{' '}
            {new Date(cancelledAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Warning Banners */}
      {isGracePeriod && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900">
            ⚠️ Your subscription is in grace period. Please update your payment method to
            continue service.
          </p>
        </div>
      )}

      {isSuspended && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900">
            🚫 Your subscription is suspended. Please contact support or upgrade to restore
            access.
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            Your subscription will remain active until the end of the current billing period.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canUpgrade && (
          <button
            onClick={onUpgrade}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Upgrade Plan
          </button>
        )}

        {canDowngrade && (
          <button
            onClick={onDowngrade}
            className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Downgrade Plan
          </button>
        )}

        {onViewPlans && (
          <button
            onClick={onViewPlans}
            className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            View All Plans
          </button>
        )}
      </div>

      {canCancel && onCancel && (
        <button
          onClick={onCancel}
          className="w-full mt-3 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:underline"
        >
          Cancel Subscription
        </button>
      )}
    </div>
  );
};

/**
 * Loading skeleton for SubscriptionCard
 */
const SubscriptionCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded"></div>
        ))}
      </div>
      <div className="h-12 bg-gray-100 rounded mb-6"></div>
      <div className="flex gap-3">
        <div className="flex-1 h-10 bg-gray-200 rounded"></div>
        <div className="flex-1 h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
