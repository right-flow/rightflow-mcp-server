/**
 * SmartUpgradeManager Component
 * Intelligent upgrade logic with usage-based triggers
 * Date: 2026-02-06
 */

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  calculateDaysSince,
  getQuotaPercentage,
  shouldShowQuotaWarning,
  isPowerUser,
  shouldShowHybridPrompt,
} from '@/utils/onboardingHelpers';
import { QuotaWarningBanner } from './QuotaWarningBanner';
import { PowerUserPrompt } from './PowerUserPrompt';
import { GentleUpgradeNudge } from './GentleUpgradeNudge';

// Analytics stub - replace with actual analytics service (Mixpanel, Amplitude, etc.)
const analytics = {
  track: (event: string, metadata?: any) => {
    console.log('[Analytics]', event, metadata);
    // TODO: Replace with actual analytics service
  },
};

interface Subscription {
  plan: {
    name: string;
    maxResponses: number;
    maxForms: number;
  };
}

interface Usage {
  responsesUsed: number;
  formsCreated: number;
}

type TriggerType = 'quota-warning' | 'power-user' | 'hybrid' | null;

export function SmartUpgradeManager() {
  const { user, isLoaded } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [triggerType, setTriggerType] = useState<TriggerType>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    const orgId = user.organizationMemberships?.[0]?.organization?.id;
    if (!orgId) {
      setLoading(false);
      return;
    }

    loadData(orgId);
  }, [user, isLoaded]);

  // Track when upgrade prompts are shown
  useEffect(() => {
    if (!triggerType || !user || !subscription || !usage) {
      return;
    }

    const daysSinceSignup = user.createdAt ? calculateDaysSince(user.createdAt) : 0;

    analytics.track('upgrade_prompt_shown', {
      triggerType,
      daysSinceSignup,
      usage: {
        forms: usage.formsCreated,
        responses: usage.responsesUsed,
      },
    });
  }, [triggerType, user, subscription, usage]);

  async function loadData(orgId: string) {
    try {
      // Load subscription
      const subResponse = await fetch(`/api/v1/billing/subscriptions/${orgId}`);
      if (!subResponse.ok) {
        setLoading(false);
        return;
      }
      const subData = await subResponse.json();
      setSubscription(subData);

      // Load usage
      const usageResponse = await fetch(`/api/v1/billing/usage/${orgId}`);
      if (!usageResponse.ok) {
        setLoading(false);
        return;
      }
      const usageData = await usageResponse.json();
      setUsage(usageData);

      // Determine trigger
      determineTrigger(subData, usageData);
      setLoading(false);
    } catch (error) {
      // Fail silently - no upgrade prompts on error
      setLoading(false);
    }
  }

  function determineTrigger(sub: Subscription, usage: Usage) {
    // Only show prompts for FREE plan
    if (!sub || sub.plan.name !== 'FREE') {
      setTriggerType(null);
      return;
    }

    // Check if user has valid createdAt
    if (!user?.createdAt) {
      setTriggerType(null);
      return;
    }

    const daysSinceSignup = calculateDaysSince(user.createdAt);
    const responsePercentage = getQuotaPercentage(usage.responsesUsed, sub.plan.maxResponses);
    const formCount = usage.formsCreated || 0;
    const responseCount = usage.responsesUsed || 0;

    // Priority 1: Quota Warning (80%+ usage)
    if (shouldShowQuotaWarning(responsePercentage)) {
      setTriggerType('quota-warning');
      return;
    }

    // Priority 2: Power User (high engagement)
    if (isPowerUser(formCount, responseCount)) {
      setTriggerType('power-user');
      return;
    }

    // Priority 3: Hybrid (time + engagement)
    if (shouldShowHybridPrompt(daysSinceSignup, formCount, responseCount)) {
      setTriggerType('hybrid');
      return;
    }

    // No trigger
    setTriggerType(null);
  }

  // Don't render anything while loading or if no trigger
  if (loading || !triggerType || !subscription || !usage) {
    return null;
  }

  // Render appropriate prompt based on trigger type
  return (
    <>
      {triggerType === 'quota-warning' && (
        <QuotaWarningBanner usage={usage} subscription={subscription} />
      )}
      {triggerType === 'power-user' && <PowerUserPrompt usage={usage} />}
      {triggerType === 'hybrid' && <GentleUpgradeNudge />}
    </>
  );
}
