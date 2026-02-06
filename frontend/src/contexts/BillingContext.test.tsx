// BillingContext Tests
// Created: 2026-02-05
// Purpose: Test BillingContext provider and useBilling hook

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { BillingProvider, useBilling } from './BillingContext';
import { billingApi } from '../api/billingApi';
import { Subscription, Plan, PlanName } from '../api/types';

// Mock billingApi
jest.mock('../api/billingApi');
const mockBillingApi = billingApi as jest.Mocked<typeof billingApi>;

// Mock data
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
  plan: {
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
  },
};

const mockPlans: Plan[] = [
  {
    id: 'plan-free',
    name: 'FREE',
    displayName: 'Free Plan',
    priceMonthly: 0,
    priceYearly: null,
    maxForms: 3,
    maxSubmissionsPerMonth: 50,
    maxStorageMB: 1024,
    maxMembers: 1,
    features: {},
    isActive: true,
    createdAt: new Date('2025-01-01'),
  },
  {
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
  },
];

// Wrapper component for testing
const createWrapper = (orgId: string = 'org-456', autoLoad: boolean = false) => {
  return ({ children }: { children: React.ReactNode }) => (
    <BillingProvider orgId={orgId} autoLoad={autoLoad}>
      {children}
    </BillingProvider>
  );
};

describe('BillingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useBilling hook', () => {
    it('throws error when used outside BillingProvider', () => {
      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useBilling());
      }).toThrow('useBilling must be used within a BillingProvider');

      spy.mockRestore();
    });

    it('provides context value when used within BillingProvider', () => {
      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toMatchObject({
        subscription: null,
        plans: [],
        loading: false,
        error: null,
        refreshSubscription: expect.any(Function),
        refreshPlans: expect.any(Function),
        upgradeSubscription: expect.any(Function),
        downgradeSubscription: expect.any(Function),
        cancelSubscription: expect.any(Function),
        clearError: expect.any(Function),
      });
    });
  });

  describe('refreshSubscription', () => {
    it('loads subscription data successfully', async () => {
      mockBillingApi.getSubscription.mockResolvedValueOnce(mockSubscription);

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshSubscription();
      });

      expect(mockBillingApi.getSubscription).toHaveBeenCalledWith('org-456');
      expect(result.current.subscription).toEqual(mockSubscription);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch subscription';
      mockBillingApi.getSubscription.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshSubscription();
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('refreshPlans', () => {
    it('loads plans successfully', async () => {
      mockBillingApi.getAllPlans.mockResolvedValueOnce(mockPlans);

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshPlans();
      });

      expect(mockBillingApi.getAllPlans).toHaveBeenCalled();
      expect(result.current.plans).toEqual(mockPlans);
      expect(result.current.error).toBeNull();
    });
  });

  describe('upgradeSubscription', () => {
    it('upgrades subscription successfully', async () => {
      const upgradedSubscription = {
        ...mockSubscription,
        planId: 'plan-expanded',
        plan: { ...mockSubscription.plan!, name: 'EXPANDED' as PlanName },
      };

      mockBillingApi.upgradeSubscription.mockResolvedValueOnce(upgradedSubscription);

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.upgradeSubscription('EXPANDED');
      });

      expect(mockBillingApi.upgradeSubscription).toHaveBeenCalledWith('org-456', 'EXPANDED');
      expect(result.current.subscription).toEqual(upgradedSubscription);
      expect(result.current.error).toBeNull();
    });

    it('handles upgrade errors', async () => {
      const errorMessage = 'Upgrade failed';
      mockBillingApi.upgradeSubscription.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.upgradeSubscription('EXPANDED');
        })
      ).rejects.toThrow();

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('downgradeSubscription', () => {
    it('downgrades subscription without archive', async () => {
      const downgradeResult = {
        success: true,
        data: { ...mockSubscription, planId: 'plan-free' },
      };

      mockBillingApi.downgradeSubscription.mockResolvedValueOnce(downgradeResult);

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      let resultValue;
      await act(async () => {
        resultValue = await result.current.downgradeSubscription('FREE', false);
      });

      expect(mockBillingApi.downgradeSubscription).toHaveBeenCalledWith('org-456', 'FREE', false);
      expect(resultValue).toEqual(downgradeResult);
      expect(result.current.subscription?.planId).toBe('plan-free');
    });

    it('returns confirmation required result', async () => {
      const confirmationResult = {
        success: false,
        error: 'Confirmation required',
        warning: '5 forms will be archived',
        formsToArchiveCount: 5,
      };

      mockBillingApi.downgradeSubscription.mockResolvedValueOnce(confirmationResult);

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      let resultValue;
      await act(async () => {
        resultValue = await result.current.downgradeSubscription('FREE', false);
      });

      expect(resultValue).toEqual(confirmationResult);
      expect(result.current.subscription).toBeNull(); // Not updated
    });
  });

  describe('cancelSubscription', () => {
    it('cancels subscription successfully', async () => {
      const cancelResult = {
        success: true,
        message: 'Subscription cancelled',
        effectiveDate: new Date('2026-03-01'),
      };

      const cancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled' as const,
        cancelledAt: new Date(),
      };

      mockBillingApi.cancelSubscription.mockResolvedValueOnce(cancelResult);
      mockBillingApi.getSubscription.mockResolvedValueOnce(cancelledSubscription);

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      let resultValue;
      await act(async () => {
        resultValue = await result.current.cancelSubscription();
      });

      await waitFor(() => {
        expect(result.current.subscription?.status).toBe('cancelled');
      });

      expect(mockBillingApi.cancelSubscription).toHaveBeenCalledWith('org-456');
      expect(resultValue).toEqual(cancelResult);
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      mockBillingApi.getSubscription.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useBilling(), {
        wrapper: createWrapper(),
      });

      // Trigger error
      await act(async () => {
        await result.current.refreshSubscription();
      });

      expect(result.current.error).not.toBeNull();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('autoLoad', () => {
    it('auto-loads data when autoLoad is true', async () => {
      mockBillingApi.getSubscription.mockResolvedValueOnce(mockSubscription);
      mockBillingApi.getAllPlans.mockResolvedValueOnce(mockPlans);

      renderHook(() => useBilling(), {
        wrapper: createWrapper('org-456', true),
      });

      await waitFor(() => {
        expect(mockBillingApi.getSubscription).toHaveBeenCalledWith('org-456');
        expect(mockBillingApi.getAllPlans).toHaveBeenCalled();
      });
    });

    it('does not auto-load when autoLoad is false', () => {
      renderHook(() => useBilling(), {
        wrapper: createWrapper('org-456', false),
      });

      expect(mockBillingApi.getSubscription).not.toHaveBeenCalled();
      expect(mockBillingApi.getAllPlans).not.toHaveBeenCalled();
    });
  });
});
