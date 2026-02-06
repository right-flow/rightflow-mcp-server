// SubscriptionCard Tests
// Created: 2026-02-05
// Purpose: Test SubscriptionCard component rendering and interactions

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubscriptionCard } from './SubscriptionCard';
import { Subscription, Plan } from '../../../api/types';

// Mock data
const mockPlan: Plan = {
  id: 'plan-basic',
  name: 'BASIC',
  displayName: 'Basic Plan',
  priceMonthly: 30000,
  priceYearly: 288000,
  maxForms: 10,
  maxSubmissionsPerMonth: 100,
  maxStorageMB: 5120,
  maxMembers: 3,
  features: {},
  isActive: true,
  createdAt: new Date('2025-01-01'),
};

const mockSubscription: Subscription = {
  id: 'sub-123',
  orgId: 'org-456',
  planId: 'plan-basic',
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: new Date('2026-02-01'),
  currentPeriodEnd: new Date('2026-03-01'),
  growCustomerId: 'grow-789',
  growSubscriptionId: null,
  cancelledAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  plan: mockPlan,
};

describe('SubscriptionCard', () => {
  const mockHandlers = {
    onUpgrade: jest.fn(),
    onDowngrade: jest.fn(),
    onCancel: jest.fn(),
    onViewPlans: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders subscription details correctly', () => {
    render(<SubscriptionCard subscription={mockSubscription} {...mockHandlers} />);

    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('₪300.00')).toBeInTheDocument();
    expect(screen.getByText('/month')).toBeInTheDocument();
  });

  it('displays plan limits correctly', () => {
    render(<SubscriptionCard subscription={mockSubscription} {...mockHandlers} />);

    expect(screen.getByText('10')).toBeInTheDocument(); // Forms
    expect(screen.getByText('100/mo')).toBeInTheDocument(); // Submissions
    expect(screen.getByText('5 GB')).toBeInTheDocument(); // Storage
    expect(screen.getByText('3')).toBeInTheDocument(); // Team Members
  });

  it('shows upgrade button for non-ENTERPRISE plans', () => {
    render(<SubscriptionCard subscription={mockSubscription} {...mockHandlers} />);

    const upgradeButton = screen.getByText('Upgrade Plan');
    expect(upgradeButton).toBeInTheDocument();

    fireEvent.click(upgradeButton);
    expect(mockHandlers.onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('shows downgrade button for non-FREE plans', () => {
    render(<SubscriptionCard subscription={mockSubscription} {...mockHandlers} />);

    const downgradeButton = screen.getByText('Downgrade Plan');
    expect(downgradeButton).toBeInTheDocument();

    fireEvent.click(downgradeButton);
    expect(mockHandlers.onDowngrade).toHaveBeenCalledTimes(1);
  });

  it('shows cancel button and triggers cancel handler', () => {
    render(<SubscriptionCard subscription={mockSubscription} {...mockHandlers} />);

    const cancelButton = screen.getByText('Cancel Subscription');
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(mockHandlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it('displays FREE plan correctly', () => {
    const freePlan: Plan = {
      ...mockPlan,
      name: 'FREE',
      displayName: 'Free Plan',
      priceMonthly: 0,
      priceYearly: null,
    };

    const freeSubscription: Subscription = {
      ...mockSubscription,
      plan: freePlan,
    };

    render(<SubscriptionCard subscription={freeSubscription} {...mockHandlers} />);

    expect(screen.getByText('Free Forever')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade Plan')).toBeInTheDocument();
    expect(screen.queryByText('Downgrade Plan')).not.toBeInTheDocument();
  });

  it('displays yearly pricing when billing cycle is yearly', () => {
    const yearlySubscription: Subscription = {
      ...mockSubscription,
      billingCycle: 'yearly',
    };

    render(<SubscriptionCard subscription={yearlySubscription} {...mockHandlers} />);

    expect(screen.getByText('₪2,880.00')).toBeInTheDocument();
    expect(screen.getByText('/year')).toBeInTheDocument();
    expect(screen.getByText('₪240.00/month billed annually')).toBeInTheDocument();
  });

  it('shows grace period warning', () => {
    const gracePeriodSubscription: Subscription = {
      ...mockSubscription,
      status: 'grace_period',
    };

    render(<SubscriptionCard subscription={gracePeriodSubscription} {...mockHandlers} />);

    expect(screen.getByText('Grace Period')).toBeInTheDocument();
    expect(
      screen.getByText(/Your subscription is in grace period/i)
    ).toBeInTheDocument();
  });

  it('shows suspended warning', () => {
    const suspendedSubscription: Subscription = {
      ...mockSubscription,
      status: 'suspended',
    };

    render(<SubscriptionCard subscription={suspendedSubscription} {...mockHandlers} />);

    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(screen.getByText(/Your subscription is suspended/i)).toBeInTheDocument();
  });

  it('shows cancelled status and hides action buttons', () => {
    const cancelledSubscription: Subscription = {
      ...mockSubscription,
      status: 'cancelled',
      cancelledAt: new Date('2026-02-15'),
    };

    render(<SubscriptionCard subscription={cancelledSubscription} {...mockHandlers} />);

    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(
      screen.getByText(/Your subscription will remain active until/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Downgrade Plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel Subscription')).not.toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(<SubscriptionCard subscription={null} loading={true} />);

    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders empty state when no subscription', () => {
    render(<SubscriptionCard subscription={null} {...mockHandlers} />);

    expect(screen.getByText('No subscription found')).toBeInTheDocument();
  });

  it('does not show upgrade button for ENTERPRISE plan', () => {
    const enterprisePlan: Plan = {
      ...mockPlan,
      name: 'ENTERPRISE',
      displayName: 'Enterprise Plan',
    };

    const enterpriseSubscription: Subscription = {
      ...mockSubscription,
      plan: enterprisePlan,
    };

    render(<SubscriptionCard subscription={enterpriseSubscription} {...mockHandlers} />);

    expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
  });

  it('shows View All Plans button when handler provided', () => {
    render(<SubscriptionCard subscription={mockSubscription} {...mockHandlers} />);

    const viewPlansButton = screen.getByText('View All Plans');
    expect(viewPlansButton).toBeInTheDocument();

    fireEvent.click(viewPlansButton);
    expect(mockHandlers.onViewPlans).toHaveBeenCalledTimes(1);
  });
});
