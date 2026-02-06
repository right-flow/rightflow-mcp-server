// UsageContext Tests
// Created: 2026-02-05
// Purpose: Test UsageContext provider and useUsage hook

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { UsageProvider, useUsage } from './UsageContext';
import { billingApi } from '../api/billingApi';
import { Usage, QuotaStatus, QuotaCheckResult, UsageDetails } from '../api/types';

// Mock billingApi
jest.mock('../api/billingApi');
const mockBillingApi = billingApi as jest.Mocked<typeof billingApi>;

// Mock data
const mockUsage: Usage = {
  id: 'usage-123',
  orgId: 'org-456',
  billingPeriodStart: new Date('2026-02-01'),
  billingPeriodEnd: new Date('2026-03-01'),
  totalSubmissions: 75,
  quotaLimit: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockQuotaStatus: QuotaStatus = {
  totalSubmissions: 75,
  quotaLimit: 100,
  remaining: 25,
  percentUsed: 75,
  isExceeded: false,
  overageAmount: 0,
  canIncurOverage: true,
  planName: 'BASIC',
  subscriptionStatus: 'active',
  billingPeriodStart: new Date('2026-02-01'),
  billingPeriodEnd: new Date('2026-03-01'),
};

const mockUsageDetails: UsageDetails = {
  totalSubmissions: 75,
  quotaLimit: 100,
  remaining: 25,
  percentUsed: 75,
  overageAmount: 0,
  formsBreakdown: [
    { formId: 'form-1', formName: 'Contact Form', submissions: 40 },
    { formId: 'form-2', formName: 'Survey', submissions: 35 },
  ],
};

const mockQuotaCheckAllowed: QuotaCheckResult = {
  allowed: true,
  quotaInfo: {
    totalSubmissions: 75,
    quotaLimit: 100,
    remaining: 25,
    percentUsed: 75,
    overageAmount: 0,
  },
};

const mockQuotaCheckBlocked: QuotaCheckResult = {
  allowed: false,
  reason: 'quota_exceeded_free_plan',
  upgradeRequired: true,
  quotaInfo: {
    totalSubmissions: 50,
    quotaLimit: 50,
    remaining: 0,
    percentUsed: 100,
    overageAmount: 0,
  },
};

// Wrapper component for testing
const createWrapper = (orgId: string = 'org-456', autoLoad: boolean = false) => {
  return ({ children }: { children: React.ReactNode }) => (
    <UsageProvider orgId={orgId} autoLoad={autoLoad}>
      {children}
    </UsageProvider>
  );
};

describe('UsageContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useUsage hook', () => {
    it('throws error when used outside UsageProvider', () => {
      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useUsage());
      }).toThrow('useUsage must be used within a UsageProvider');

      spy.mockRestore();
    });

    it('provides context value when used within UsageProvider', () => {
      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toMatchObject({
        usage: null,
        quotaStatus: null,
        usageDetails: null,
        loading: false,
        error: null,
        refreshUsage: expect.any(Function),
        refreshQuotaStatus: expect.any(Function),
        refreshUsageDetails: expect.any(Function),
        checkQuota: expect.any(Function),
        incrementUsage: expect.any(Function),
        clearError: expect.any(Function),
      });
    });
  });

  describe('refreshUsage', () => {
    it('loads usage data successfully', async () => {
      mockBillingApi.getUsage.mockResolvedValueOnce(mockUsage);

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshUsage();
      });

      expect(mockBillingApi.getUsage).toHaveBeenCalledWith('org-456');
      expect(result.current.usage).toEqual(mockUsage);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch usage';
      mockBillingApi.getUsage.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshUsage();
      });

      expect(result.current.usage).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('refreshQuotaStatus', () => {
    it('loads quota status successfully', async () => {
      mockBillingApi.getQuotaStatus.mockResolvedValueOnce(mockQuotaStatus);

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshQuotaStatus();
      });

      expect(mockBillingApi.getQuotaStatus).toHaveBeenCalledWith('org-456');
      expect(result.current.quotaStatus).toEqual(mockQuotaStatus);
      expect(result.current.error).toBeNull();
    });
  });

  describe('refreshUsageDetails', () => {
    it('loads usage details successfully', async () => {
      mockBillingApi.getUsageDetails.mockResolvedValueOnce(mockUsageDetails);

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.refreshUsageDetails();
      });

      expect(mockBillingApi.getUsageDetails).toHaveBeenCalledWith('org-456');
      expect(result.current.usageDetails).toEqual(mockUsageDetails);
      expect(result.current.error).toBeNull();
    });
  });

  describe('checkQuota', () => {
    it('returns allowed result when under quota', async () => {
      mockBillingApi.checkQuota.mockResolvedValueOnce(mockQuotaCheckAllowed);

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      let checkResult;
      await act(async () => {
        checkResult = await result.current.checkQuota('form-123');
      });

      expect(mockBillingApi.checkQuota).toHaveBeenCalledWith('org-456', 'form-123');
      expect(checkResult).toEqual(mockQuotaCheckAllowed);
      expect(checkResult?.allowed).toBe(true);
    });

    it('returns blocked result when quota exceeded', async () => {
      mockBillingApi.checkQuota.mockResolvedValueOnce(mockQuotaCheckBlocked);

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      let checkResult;
      await act(async () => {
        checkResult = await result.current.checkQuota('form-123');
      });

      expect(checkResult).toEqual(mockQuotaCheckBlocked);
      expect(checkResult?.allowed).toBe(false);
      expect(checkResult?.upgradeRequired).toBe(true);
    });

    it('throws error when formId is missing', async () => {
      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.checkQuota('');
        })
      ).rejects.toThrow('Form ID is required');
    });
  });

  describe('incrementUsage', () => {
    it('increments usage and refreshes data', async () => {
      mockBillingApi.incrementUsage.mockResolvedValueOnce();
      mockBillingApi.getUsage.mockResolvedValueOnce({
        ...mockUsage,
        totalSubmissions: 76,
      });
      mockBillingApi.getQuotaStatus.mockResolvedValueOnce({
        ...mockQuotaStatus,
        totalSubmissions: 76,
        remaining: 24,
      });

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.incrementUsage('form-123');
      });

      expect(mockBillingApi.incrementUsage).toHaveBeenCalledWith('org-456', 'form-123');
      expect(mockBillingApi.getUsage).toHaveBeenCalled();
      expect(mockBillingApi.getQuotaStatus).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.usage?.totalSubmissions).toBe(76);
      });
    });

    it('throws error when formId is missing', async () => {
      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.incrementUsage('');
        })
      ).rejects.toThrow('Form ID is required');
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      mockBillingApi.getUsage.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      // Trigger error
      await act(async () => {
        await result.current.refreshUsage();
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
      mockBillingApi.getUsage.mockResolvedValueOnce(mockUsage);
      mockBillingApi.getQuotaStatus.mockResolvedValueOnce(mockQuotaStatus);

      renderHook(() => useUsage(), {
        wrapper: createWrapper('org-456', true),
      });

      await waitFor(() => {
        expect(mockBillingApi.getUsage).toHaveBeenCalledWith('org-456');
        expect(mockBillingApi.getQuotaStatus).toHaveBeenCalledWith('org-456');
      });
    });

    it('does not auto-load when autoLoad is false', () => {
      renderHook(() => useUsage(), {
        wrapper: createWrapper('org-456', false),
      });

      expect(mockBillingApi.getUsage).not.toHaveBeenCalled();
      expect(mockBillingApi.getQuotaStatus).not.toHaveBeenCalled();
    });
  });

  describe('window focus refresh', () => {
    it('refreshes data when window gains focus', async () => {
      mockBillingApi.getUsage.mockResolvedValue(mockUsage);
      mockBillingApi.getQuotaStatus.mockResolvedValue(mockQuotaStatus);

      renderHook(() => useUsage(), {
        wrapper: createWrapper('org-456', false),
      });

      // Clear initial calls
      jest.clearAllMocks();

      // Trigger focus event
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(mockBillingApi.getUsage).toHaveBeenCalled();
        expect(mockBillingApi.getQuotaStatus).toHaveBeenCalled();
      });
    });
  });
});
