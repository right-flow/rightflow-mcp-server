// SubscriptionCard Component
// Created: 2026-02-05
// Purpose: Display current subscription plan details

import React from 'react';
import { Subscription } from '../../../api/types';
import { StatusBadge } from '../common';
import { formatCurrency } from '../../../utils/formatCurrency';
import { useTranslation, useDirection } from '../../../i18n';

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
  const t = useTranslation();
  const direction = useDirection();
  const locale = direction === 'rtl' ? 'he-IL' : 'en-US';

  if (loading) {
    return <SubscriptionCardSkeleton />;
  }

  if (!subscription || !subscription.plan) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">{t['billing.card.noSubscription']}</p>
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
            {t['billing.card.billingCycle']}: {isYearly ? t['billing.card.yearly'] : t['billing.card.monthly']}
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
              /{isYearly ? t['billing.card.year'] : t['billing.card.month']}
            </span>
          </div>
          {isYearly && plan.priceMonthly > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {(t['billing.card.billedAnnually'] as string).replace('{price}', formatCurrency(Math.round(price / 12)))}
            </p>
          )}
        </div>
      )}

      {plan.name === 'FREE' && (
        <div className="mb-4">
          <div className="text-3xl font-bold text-green-600">{t['billing.card.freeForever']}</div>
        </div>
      )}

      {/* Plan Limits */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t['billing.card.forms']}</p>
          <p className="text-lg font-semibold text-gray-900">{plan.maxForms}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t['billing.card.submissions']}</p>
          <p className="text-lg font-semibold text-gray-900">
            {plan.maxSubmissionsPerMonth.toLocaleString()}{t['billing.card.perMonth']}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t['billing.card.storage']}</p>
          <p className="text-lg font-semibold text-gray-900">
            {(plan.maxStorageMB / 1024).toFixed(0)} GB
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t['billing.card.teamMembers']}</p>
          <p className="text-lg font-semibold text-gray-900">{plan.maxMembers}</p>
        </div>
      </div>

      {/* Billing Period */}
      <div className="mb-6 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-medium">{t['billing.card.currentPeriod']}:</span>{' '}
          {new Date(currentPeriodEnd).toLocaleDateString(locale, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        {isCancelled && cancelledAt && (
          <p className="text-sm text-red-600 mt-1">
            <span className="font-medium">{t['billing.card.cancelledOn']}:</span>{' '}
            {new Date(cancelledAt).toLocaleDateString(locale, {
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
            {t['billing.card.gracePeriodWarning']}
          </p>
        </div>
      )}

      {isSuspended && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900">
            {t['billing.card.suspendedWarning']}
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            {t['billing.card.cancelledInfo']}
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
            {t['billing.card.upgradePlan']}
          </button>
        )}

        {canDowngrade && (
          <button
            onClick={onDowngrade}
            className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {t['billing.card.downgradePlan']}
          </button>
        )}

        {onViewPlans && (
          <button
            onClick={onViewPlans}
            className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            {t['billing.card.viewAllPlans']}
          </button>
        )}
      </div>

      {canCancel && onCancel && (
        <button
          onClick={onCancel}
          className="w-full mt-3 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:underline"
        >
          {t['billing.card.cancelSubscription']}
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
