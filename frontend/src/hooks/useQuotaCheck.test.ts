// useQuotaCheck Hook Tests
// Created: 2026-02-05
// Purpose: Test useQuotaCheck hook functionality

import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuotaCheck, setQuotaWarningPreference, getQuotaWarningPreference, clearQuotaWarningPreference } from './useQuotaCheck';
import { useUsage } from '../contexts/UsageContext';
import { QuotaCheckResult } from '../api/types';

// Mock UsageContext
jest.mock('../contexts/UsageContext');
const mockUseUsage = useUsage as jest.MockedFunction<typeof useUsage>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock data
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

const mockQuotaCheckOverage: QuotaCheckResult = {
  allowed: true,
  willIncurOverage: true,
  estimatedOverageCost: 300,
  quotaInfo: {
    totalSubmissions: 105,
    quotaLimit: 100,
    remaining: -5,
    percentUsed: 105,
    overageAmount: 5,
  },
};

describe('useQuotaCheck', () => {
  let mockCheckQuota: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    mockCheckQuota = jest.fn();
    mockUseUsage.mockReturnValue({
      checkQuota: mockCheckQuota,
      usage: null,
      quotaStatus: null,
      usageDetails: null,
      loading: false,
      error: null,
      refreshUsage: jest.fn(),
      refreshQuotaStatus: jest.fn(),
      refreshUsageDetails: jest.fn(),
      incrementUsage: jest.fn(),
      clearError: jest.fn(),
    });
  });

  describe('checkBeforeSubmit', () => {
    it('allows submission when under quota', async () => {
      mockCheckQuota.mockResolvedValueOnce(mockQuotaCheckAllowed);

      const { result } = renderHook(() => useQuotaCheck('form-123'));

      let canSubmit = false;
      await act(async () => {
        canSubmit = await result.current.checkBeforeSubmit();
      });

      expect(mockCheckQuota).toHaveBeenCalledWith('form-123');
      expect(canSubmit).toBe(true);
      expect(result.current.showWarning).toBe(false);
    });

    it('blocks submission when quota exceeded (FREE plan)', async () => {
      mockCheckQuota.mockResolvedValueOnce(mockQuotaCheckBlocked);

      const { result } = renderHook(() => useQuotaCheck('form-123'));

      let canSubmit = true;
      await act(async () => {
        canSubmit = await result.current.checkBeforeSubmit();
      });

      expect(mockCheckQuota).toHaveBeenCalledWith('form-123');
      expect(canSubmit).toBe(false);
      expect(result.current.showWarning).toBe(true);
      expect(result.current.quotaResult?.upgradeRequired).toBe(true);
    });

    it('shows warning for overage (paid plan)', async () => {
      mockCheckQuota.mockResolvedValueOnce(mockQuotaCheckOverage);

      const { result } = renderHook(() => useQuotaCheck('form-123'));

      let canSubmit = true;
      await act(async () => {
        canSubmit = await result.current.checkBeforeSubmit();
      });

      expect(canSubmit).toBe(false); // Pauses for confirmation
      expect(result.current.showWarning).toBe(true);
      expect(result.current.quotaResult?.willIncurOverage).toBe(true);
      expect(result.current.quotaResult?.estimatedOverageCost).toBe(300);
    });

    it('bypasses warning when "don\'t show again" is set', async () => {
      mockCheckQuota.mockResolvedValueOnce(mockQuotaCheckOverage);
      setQuotaWarningPreference(true);

      const { result } = renderHook(() => useQuotaCheck('form-123'));

      let canSubmit = false;
      await act(async () => {
        canSubmit = await result.current.checkBeforeSubmit();
      });

      expect(canSubmit).toBe(true); // Allowed without showing modal
      expect(result.current.showWarning).toBe(false);
    });

    it('blocks submission on API error (fail-safe)', async () => {
      mockCheckQuota.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useQuotaCheck('form-123'));

      let canSubmit = true;
      await act(async () => {
        canSubmit = await result.current.checkBeforeSubmit();
      });

      expect(canSubmit).toBe(false); // Blocked on error
    });

    it('returns false when formId is empty', async () => {
      const { result } = renderHook(() => useQuotaCheck(''));

      let canSubmit = true;
      await act(async () => {
        canSubmit = await result.current.checkBeforeSubmit();
      });

      expect(canSubmit).toBe(false);
      expect(mockCheckQuota).not.toHaveBeenCalled();
    });
  });

  describe('closeWarning', () => {
    it('closes warning modal and clears result', async () => {
      mockCheckQuota.mockResolvedValueOnce(mockQuotaCheckBlocked);

      const { result } = renderHook(() => useQuotaCheck('form-123'));

      // Trigger warning
      await act(async () => {
        await result.current.checkBeforeSubmit();
      });

      expect(result.current.showWarning).toBe(true);
      expect(result.current.quotaResult).not.toBeNull();

      // Close warning
      act(() => {
        result.current.closeWarning();
      });

      expect(result.current.showWarning).toBe(false);
      expect(result.current.quotaResult).toBeNull();
    });
  });

  describe('checking state', () => {
    it('sets checking to true during API call', async () => {
      mockCheckQuota.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockQuotaCheckAllowed), 100);
          })
      );

      const { result } = renderHook(() => useQuotaCheck('form-123'));

      expect(result.current.checking).toBe(false);

      act(() => {
        result.current.checkBeforeSubmit();
      });

      // Should be checking immediately
      expect(result.current.checking).toBe(true);

      await waitFor(() => {
        expect(result.current.checking).toBe(false);
      });
    });
  });
});

describe('Quota warning preference helpers', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('sets "don\'t show again" preference', () => {
    setQuotaWarningPreference(true);
    expect(localStorage.getItem('quotaWarning_dontShowAgain')).toBe('true');
  });

  it('removes preference when set to false', () => {
    setQuotaWarningPreference(true);
    expect(localStorage.getItem('quotaWarning_dontShowAgain')).toBe('true');

    setQuotaWarningPreference(false);
    expect(localStorage.getItem('quotaWarning_dontShowAgain')).toBeNull();
  });

  it('gets preference correctly', () => {
    expect(getQuotaWarningPreference()).toBe(false);

    setQuotaWarningPreference(true);
    expect(getQuotaWarningPreference()).toBe(true);
  });

  it('clears preference', () => {
    setQuotaWarningPreference(true);
    expect(getQuotaWarningPreference()).toBe(true);

    clearQuotaWarningPreference();
    expect(getQuotaWarningPreference()).toBe(false);
  });
});
