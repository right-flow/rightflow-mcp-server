// SubscriptionPage Component
// Created: 2026-02-05
// Purpose: Container page for subscription management

import React, { useState } from 'react';
import { useBilling } from '../../../contexts/BillingContext';
import { useToast } from '../../../hooks/useToast';
import { PlanName, DowngradeResult } from '../../../api/types';
import { requiresDowngradeConfirmation } from '../../../api/billingApi';
import { useTranslation } from '../../../i18n';

import { SubscriptionCard } from './SubscriptionCard';
import { PlanComparisonModal } from './PlanComparisonModal';
import { DowngradeConfirmationModal } from './DowngradeConfirmationModal';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { ToastContainer } from '../common';

/**
 * Subscription page container
 * Manages subscription state and modal flows
 */
export const SubscriptionPage: React.FC = () => {
  const t = useTranslation();
  const { subscription, plans, loading, upgradeSubscription, downgradeSubscription, cancelSubscription } = useBilling();
  const { success, error: showError } = useToast();

  // Modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Downgrade flow state
  const [downgradeData, setDowngradeData] = useState<{
    targetPlan: PlanName;
    formsToArchive: any[];
    formsToArchiveCount: number;
    warning: string;
  } | null>(null);

  // Loading states
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  /**
   * Handle plan selection from comparison modal
   * Determines if upgrade or downgrade
   */
  const handleSelectPlan = async (targetPlan: PlanName) => {
    if (!subscription) return;

    const currentPlan = subscription.plan?.name;
    if (!currentPlan) return;

    // Determine if upgrade or downgrade based on plan order
    const planOrder: PlanName[] = ['FREE', 'BASIC', 'EXPANDED', 'ENTERPRISE'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(targetPlan);

    if (targetIndex > currentIndex) {
      // Upgrade
      await handleUpgrade(targetPlan);
    } else if (targetIndex < currentIndex) {
      // Downgrade
      await handleDowngradeInitiate(targetPlan);
    }
  };

  /**
   * Handle upgrade flow
   */
  const handleUpgrade = async (targetPlan: PlanName) => {
    try {
      setIsUpgrading(true);
      await upgradeSubscription(targetPlan);
      setShowPlanModal(false);
      success((t['billing.subscription.upgradedSuccess'] as string).replace('{plan}', targetPlan));
    } catch (err) {
      showError(err instanceof Error ? err.message : t['billing.subscription.failedUpgrade']);
    } finally {
      setIsUpgrading(false);
    }
  };

  /**
   * Initiate downgrade flow (check for form archiving)
   */
  const handleDowngradeInitiate = async (targetPlan: PlanName) => {
    if (!subscription) return;

    try {
      setIsDowngrading(true);

      // Call downgrade API without confirmation to check if forms will be archived
      const result: DowngradeResult = await downgradeSubscription(targetPlan, false);

      if (requiresDowngradeConfirmation(result)) {
        // Forms will be archived - show confirmation modal
        setDowngradeData({
          targetPlan,
          formsToArchive: result.formsToArchive || [],
          formsToArchiveCount: result.formsToArchiveCount || 0,
          warning: result.warning || '',
        });
        setShowPlanModal(false);
        setShowDowngradeModal(true);
      } else {
        // No forms to archive - downgrade completed
        setShowPlanModal(false);
        success((t['billing.subscription.downgradedSuccess'] as string).replace('{plan}', targetPlan));
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t['billing.subscription.failedDowngrade']);
    } finally {
      setIsDowngrading(false);
    }
  };

  /**
   * Confirm downgrade after user accepts archive warning
   */
  const handleDowngradeConfirm = async () => {
    if (!downgradeData) return;

    try {
      setIsDowngrading(true);

      // Call downgrade API with confirmation
      const result = await downgradeSubscription(downgradeData.targetPlan, true);

      if (result.success) {
        setShowDowngradeModal(false);
        setDowngradeData(null);
        const msg = (t['billing.subscription.downgradedSuccess'] as string).replace('{plan}', downgradeData.targetPlan) +
          ' ' + (t['billing.subscription.formsArchived'] as string).replace('{count}', String(downgradeData.formsToArchiveCount));
        success(msg);
      } else {
        showError(result.error || t['billing.subscription.failedDowngrade']);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t['billing.subscription.failedDowngrade']);
    } finally {
      setIsDowngrading(false);
    }
  };

  /**
   * Handle subscription cancellation
   */
  const handleCancelConfirm = async () => {
    try {
      setIsCancelling(true);
      const result = await cancelSubscription();

      if (result.success) {
        setShowCancelModal(false);
        success(t['billing.subscription.cancelledSuccess']);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t['billing.subscription.failedCancel']);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t['billing.subscription.title']}</h1>
        <p className="text-gray-600 mt-2">
          {t['billing.subscription.description']}
        </p>
      </div>

      {/* Subscription Card */}
      <SubscriptionCard
        subscription={subscription}
        onUpgrade={() => setShowPlanModal(true)}
        onDowngrade={() => setShowPlanModal(true)}
        onCancel={() => setShowCancelModal(true)}
        onViewPlans={() => setShowPlanModal(true)}
        loading={loading}
      />

      {/* Plan Comparison Modal */}
      <PlanComparisonModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        plans={plans}
        currentPlanName={subscription?.plan?.name}
        onSelectPlan={handleSelectPlan}
        loading={isUpgrading || isDowngrading}
      />

      {/* Downgrade Confirmation Modal */}
      {downgradeData && (
        <DowngradeConfirmationModal
          isOpen={showDowngradeModal}
          onClose={() => {
            setShowDowngradeModal(false);
            setDowngradeData(null);
          }}
          onConfirm={handleDowngradeConfirm}
          targetPlan={downgradeData.targetPlan}
          currentPlan={subscription?.plan?.name || 'UNKNOWN'}
          formsToArchive={downgradeData.formsToArchive}
          formsToArchiveCount={downgradeData.formsToArchiveCount}
          warning={downgradeData.warning}
          loading={isDowngrading}
        />
      )}

      {/* Cancel Subscription Modal */}
      {subscription && (
        <CancelSubscriptionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelConfirm}
          planName={subscription.plan?.displayName || 'Unknown'}
          effectiveDate={subscription.currentPeriodEnd}
          loading={isCancelling}
        />
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default SubscriptionPage;
