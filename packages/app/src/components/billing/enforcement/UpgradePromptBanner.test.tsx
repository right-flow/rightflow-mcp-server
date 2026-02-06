// UpgradePromptBanner Component Tests
// Created: 2026-02-05
// Purpose: Test upgrade prompt banner component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpgradePromptBanner } from './UpgradePromptBanner';
import { QuotaStatus } from '../../../api/types';

const mockQuotaStatus: QuotaStatus = {
  formsUsed: 5,
  formsLimit: 10,
  submissionsThisMonth: 50,
  submissionsLimit: 100,
  storageUsedMB: 250,
  storageLimitMB: 1000,
};

describe('UpgradePromptBanner', () => {
  const mockOnUpgrade = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('does not render when quotaStatus is null', () => {
      render(<UpgradePromptBanner quotaStatus={null} onUpgrade={mockOnUpgrade} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not render when all quotas are under 70%', () => {
      render(<UpgradePromptBanner quotaStatus={mockQuotaStatus} onUpgrade={mockOnUpgrade} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders when any quota is >= 70%', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8, // 80%
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders when any quota is >= 90%', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // 100%
      };

      render(<UpgradePromptBanner quotaStatus={criticalQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('does not render after dismissed', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Severity Levels', () => {
    it('shows warning style for 70-90% usage', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8, // 80%
      };

      const { container } = render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      const banner = container.querySelector('.bg-yellow-500');
      expect(banner).toBeInTheDocument();
    });

    it('shows critical style for >= 90% usage', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // 100%
      };

      const { container } = render(<UpgradePromptBanner quotaStatus={criticalQuota} onUpgrade={mockOnUpgrade} />);

      const banner = container.querySelector('.bg-red-600');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Message Content', () => {
    it('shows single quota warning message', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8, // 80%
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText(/using over 70% of your forms quota/i)).toBeInTheDocument();
    });

    it('shows multiple quotas warning message', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8, // 80%
        submissionsThisMonth: 85, // 85%
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText(/approaching quota limits for forms, submissions/i)).toBeInTheDocument();
    });

    it('shows single quota critical message', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // 100%
      };

      render(<UpgradePromptBanner quotaStatus={criticalQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText(/your forms quota has been reached/i)).toBeInTheDocument();
    });

    it('shows multiple quotas critical message', () => {
      const criticalQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // 100%
        submissionsThisMonth: 100, // 100%
      };

      render(<UpgradePromptBanner quotaStatus={criticalQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText(/reached your quota limits for forms, submissions/i)).toBeInTheDocument();
    });
  });

  describe('Critical Priority', () => {
    it('prioritizes critical over warning when both exist', () => {
      const mixedQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // 100% - critical
        submissionsThisMonth: 80, // 80% - warning
        storageUsedMB: 750, // 75% - warning
      };

      render(<UpgradePromptBanner quotaStatus={mixedQuota} onUpgrade={mockOnUpgrade} />);

      // Should show critical message, not warning
      expect(screen.getByText(/quota has been reached/i)).toBeInTheDocument();
      expect(screen.queryByText(/approaching/i)).not.toBeInTheDocument();
    });

    it('shows critical styling when both critical and warning exist', () => {
      const mixedQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 10, // critical
        submissionsThisMonth: 80, // warning
      };

      const { container } = render(<UpgradePromptBanner quotaStatus={mixedQuota} onUpgrade={mockOnUpgrade} />);

      const banner = container.querySelector('.bg-red-600');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Unlimited Quotas', () => {
    it('does not trigger banner for unlimited quotas', () => {
      const unlimitedQuota: QuotaStatus = {
        formsUsed: 1000,
        formsLimit: -1,
        submissionsThisMonth: 5000,
        submissionsLimit: -1,
        storageUsedMB: 10000,
        storageLimitMB: -1,
      };

      render(<UpgradePromptBanner quotaStatus={unlimitedQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('only considers limited quotas for warning', () => {
      const mixedQuota: QuotaStatus = {
        formsUsed: 8, // 80% of 10
        formsLimit: 10,
        submissionsThisMonth: 10000, // unlimited
        submissionsLimit: -1,
        storageUsedMB: 5000, // unlimited
        storageLimitMB: -1,
      };

      render(<UpgradePromptBanner quotaStatus={mixedQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText(/forms quota/i)).toBeInTheDocument();
      expect(screen.queryByText(/submissions/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/storage/i)).not.toBeInTheDocument();
    });
  });

  describe('Position', () => {
    it('defaults to top position', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      const { container } = render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      const banner = container.querySelector('.top-0');
      expect(banner).toBeInTheDocument();
    });

    it('renders at bottom when position="bottom"', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      const { container } = render(
        <UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} position="bottom" />
      );

      const banner = container.querySelector('.bottom-0');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Dismissible', () => {
    it('shows dismiss button by default', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByRole('button', { name: /dismiss banner/i })).toBeInTheDocument();
    });

    it('hides dismiss button when dismissible is false', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} dismissible={false} />);

      expect(screen.queryByRole('button', { name: /dismiss banner/i })).not.toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button clicked', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('hides banner after dismiss', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Upgrade Button', () => {
    it('shows upgrade button', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByRole('button', { name: /upgrade plan/i })).toBeInTheDocument();
    });

    it('calls onUpgrade when upgrade button clicked', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      const upgradeButton = screen.getByRole('button', { name: /upgrade plan/i });
      fireEvent.click(upgradeButton);

      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      const { container } = render(
        <UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} className="custom-class" />
      );

      const banner = container.querySelector('.custom-class');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });

    it('has accessible dismiss button', () => {
      const warningQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 8,
      };

      render(<UpgradePromptBanner quotaStatus={warningQuota} onUpgrade={mockOnUpgrade} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss banner');
    });
  });

  describe('Edge Cases', () => {
    it('handles exactly 70% usage', () => {
      const exactQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 7, // exactly 70%
      };

      render(<UpgradePromptBanner quotaStatus={exactQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('handles exactly 90% usage', () => {
      const exactQuota: QuotaStatus = {
        ...mockQuotaStatus,
        formsUsed: 9, // exactly 90%
      };

      render(<UpgradePromptBanner quotaStatus={exactQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/quota has been reached/i)).toBeInTheDocument();
    });

    it('handles all three quotas at different levels', () => {
      const mixedQuota: QuotaStatus = {
        formsUsed: 10, // 100% - critical
        formsLimit: 10,
        submissionsThisMonth: 85, // 85% - warning
        submissionsLimit: 100,
        storageUsedMB: 950, // 95% - critical
        storageLimitMB: 1000,
      };

      render(<UpgradePromptBanner quotaStatus={mixedQuota} onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText(/forms, storage/i)).toBeInTheDocument();
    });
  });
});
