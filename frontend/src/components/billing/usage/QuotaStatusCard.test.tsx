// QuotaStatusCard Component Tests
// Created: 2026-02-05
// Purpose: Test quota status card component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuotaStatusCard } from './QuotaStatusCard';
import { QuotaStatus } from '../../../api/types';

const mockQuotaStatus: QuotaStatus = {
  formsUsed: 5,
  formsLimit: 10,
  submissionsThisMonth: 50,
  submissionsLimit: 100,
  storageUsedMB: 250,
  storageLimitMB: 1000,
};

describe('QuotaStatusCard', () => {
  describe('Rendering', () => {
    it('renders with quota data', () => {
      render(<QuotaStatusCard quotaStatus={mockQuotaStatus} />);

      expect(screen.getByText('Quota Status')).toBeInTheDocument();
      expect(screen.getByText('Forms')).toBeInTheDocument();
      expect(screen.getByText('Submissions (This Month)')).toBeInTheDocument();
      expect(screen.getByText('Storage (MB)')).toBeInTheDocument();
    });

    it('shows loading skeleton when loading', () => {
      render(<QuotaStatusCard quotaStatus={null} loading={true} />);

      const skeleton = screen.getByRole('generic', { hidden: true });
      expect(skeleton.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows no data state when quotaStatus is null', () => {
      render(<QuotaStatusCard quotaStatus={null} />);

      expect(screen.getByText('No quota data available')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('shows "Healthy" status when all quotas under 70%', () => {
      render(<QuotaStatusCard quotaStatus={mockQuotaStatus} />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /healthy/i })).toHaveClass('bg-green-100');
    });

    it('shows "Warning" status when any quota is 70-90%', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8, // 80% of 10
      };

      render(<QuotaStatusCard quotaStatus={warningQuota} />);

      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /warning/i })).toHaveClass('bg-yellow-100');
    });

    it('shows "Critical" status when any quota >= 90%', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // 100% of 10
      };

      render(<QuotaStatusCard quotaStatus={criticalQuota} />);

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /critical/i })).toHaveClass('bg-red-100');
    });
  });

  describe('Progress Bars', () => {
    it('displays all three progress bars', () => {
      render(<QuotaStatusCard quotaStatus={mockQuotaStatus} />);

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars).toHaveLength(3);
    });

    it('shows correct values for forms', () => {
      render(<QuotaStatusCard quotaStatus={mockQuotaStatus} />);

      expect(screen.getByText(/5/)).toBeInTheDocument(); // formsUsed
      expect(screen.getByText(/10/)).toBeInTheDocument(); // formsLimit
    });

    it('shows correct values for submissions', () => {
      render(<QuotaStatusCard quotaStatus={mockQuotaStatus} />);

      expect(screen.getByText(/50/)).toBeInTheDocument(); // submissionsThisMonth
      expect(screen.getByText(/100/)).toBeInTheDocument(); // submissionsLimit
    });

    it('shows correct values for storage', () => {
      render(<QuotaStatusCard quotaStatus={mockQuotaStatus} />);

      expect(screen.getByText(/250/)).toBeInTheDocument(); // storageUsedMB
      expect(screen.getByText(/1,000/)).toBeInTheDocument(); // storageLimitMB
    });
  });

  describe('Unlimited Quota Handling', () => {
    it('handles unlimited forms quota', () => {
      const unlimitedQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsLimit: -1,
      };

      render(<QuotaStatusCard quotaStatus={unlimitedQuota} />);

      expect(screen.getByText(/Unlimited/)).toBeInTheDocument();
    });

    it('does not show critical status for unlimited quotas', () => {
      const unlimitedQuota: QuotaStatus = {
        formsUsed: 1000,
        formsLimit: -1,
        submissionsThisMonth: 5000,
        submissionsLimit: -1,
        storageUsedMB: 10000,
        storageLimitMB: -1,
      };

      render(<QuotaStatusCard quotaStatus={unlimitedQuota} />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.queryByText('Critical')).not.toBeInTheDocument();
    });
  });

  describe('Upgrade Prompts', () => {
    const handleUpgrade = jest.fn();

    beforeEach(() => {
      handleUpgrade.mockClear();
    });

    it('shows critical upgrade prompt when quota >= 90%', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // 100%
      };

      render(<QuotaStatusCard quotaStatus={criticalQuota} onUpgrade={handleUpgrade} />);

      expect(screen.getByText('Quota limit reached')).toBeInTheDocument();
      expect(screen.getByText(/reached or exceeded your quota limits/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade plan/i })).toBeInTheDocument();
    });

    it('calls onUpgrade when critical upgrade button clicked', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10,
      };

      render(<QuotaStatusCard quotaStatus={criticalQuota} onUpgrade={handleUpgrade} />);

      const upgradeButton = screen.getByRole('button', { name: /upgrade plan/i });
      fireEvent.click(upgradeButton);

      expect(handleUpgrade).toHaveBeenCalledTimes(1);
    });

    it('shows warning upgrade prompt when quota 70-90%', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8, // 80%
      };

      render(<QuotaStatusCard quotaStatus={warningQuota} onUpgrade={handleUpgrade} />);

      expect(screen.getByText('Approaching quota limits')).toBeInTheDocument();
      expect(screen.getByText(/using over 70% of your quota/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view plans/i })).toBeInTheDocument();
    });

    it('calls onUpgrade when warning upgrade button clicked', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<QuotaStatusCard quotaStatus={warningQuota} onUpgrade={handleUpgrade} />);

      const viewPlansButton = screen.getByRole('button', { name: /view plans/i });
      fireEvent.click(viewPlansButton);

      expect(handleUpgrade).toHaveBeenCalledTimes(1);
    });

    it('does not show upgrade prompt when onUpgrade not provided', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10,
      };

      render(<QuotaStatusCard quotaStatus={criticalQuota} />);

      expect(screen.queryByText('Quota limit reached')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
    });

    it('does not show upgrade prompt when quota healthy', () => {
      render(<QuotaStatusCard quotaStatus={mockQuotaStatus} onUpgrade={handleUpgrade} />);

      expect(screen.queryByText(/quota limit/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
    });

    it('only shows critical prompt when both warning and critical', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // 100% - critical
        submissionsThisMonth: 80, // 80% - warning
      };

      render(<QuotaStatusCard quotaStatus={criticalQuota} onUpgrade={handleUpgrade} />);

      expect(screen.getByText('Quota limit reached')).toBeInTheDocument();
      expect(screen.queryByText('Approaching quota limits')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Quota Scenarios', () => {
    it('detects critical status from any metric', () => {
      const scenarios = [
        { formsUsed: 10, submissionsThisMonth: 50, storageUsedMB: 250 }, // forms critical
        { formsUsed: 5, submissionsThisMonth: 95, storageUsedMB: 250 }, // submissions critical
        { formsUsed: 5, submissionsThisMonth: 50, storageUsedMB: 950 }, // storage critical
      ];

      scenarios.forEach((overrides) => {
        const quota: QuotaStatus = { ...mockQuotaStatus, ...overrides };
        const { unmount } = render(<QuotaStatusCard quotaStatus={quota} />);
        expect(screen.getByText('Critical')).toBeInTheDocument();
        unmount();
      });
    });

    it('detects warning status from any metric', () => {
      const scenarios = [
        { formsUsed: 8, submissionsThisMonth: 50, storageUsedMB: 250 }, // forms warning
        { formsUsed: 5, submissionsThisMonth: 80, storageUsedMB: 250 }, // submissions warning
        { formsUsed: 5, submissionsThisMonth: 50, storageUsedMB: 750 }, // storage warning
      ];

      scenarios.forEach((overrides) => {
        const quota: QuotaStatus = { ...mockQuotaStatus, ...overrides };
        const { unmount } = render(<QuotaStatusCard quotaStatus={quota} />);
        expect(screen.getByText('Warning')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      const { container } = render(
        <QuotaStatusCard quotaStatus={mockQuotaStatus} className="custom-class" />
      );

      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
    });
  });
});
