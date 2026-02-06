// QuotaWarningModal Component Tests
// Created: 2026-02-05
// Purpose: Test quota warning modal component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuotaWarningModal } from './QuotaWarningModal';
import { QuotaCheckResult } from '../../../api/types';

const mockQuotaResult: QuotaCheckResult = {
  allowed: false,
  reason: 'You have exceeded your forms quota.',
  upgradeRequired: true,
  willIncurOverage: false,
  estimatedOverageCost: 0,
  quotaInfo: {
    formsUsed: 10,
    formsLimit: 10,
    submissionsThisMonth: 50,
    submissionsLimit: 100,
    storageUsedMB: 250,
    storageLimitMB: 1000,
  },
};

describe('QuotaWarningModal', () => {
  const mockOnClose = jest.fn();
  const mockOnProceed = jest.fn();
  const mockOnUpgrade = jest.fn();
  const mockOnDontShowAgainChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Quota Limit Reached')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <QuotaWarningModal
          isOpen={false}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not render when quotaResult is null', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={null}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Modal Types', () => {
    it('shows blocked state when allowed is false', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      expect(screen.getByText('Quota Limit Reached')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade now/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /proceed anyway/i })).not.toBeInTheDocument();
    });

    it('shows overage warning when willIncurOverage is true', () => {
      const overageResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
        willIncurOverage: true,
        estimatedOverageCost: 500, // 5.00 ILS in agorot
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={overageResult}
        />
      );

      expect(screen.getByText('Overage Warning')).toBeInTheDocument();
      expect(screen.getByText(/estimated overage cost/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceed anyway/i })).toBeInTheDocument();
    });

    it('shows warning state when allowed but no overage', () => {
      const warningResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
        willIncurOverage: false,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={warningResult}
        />
      );

      expect(screen.getByText('Quota Warning')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceed anyway/i })).toBeInTheDocument();
    });
  });

  describe('Quota Information Display', () => {
    it('displays forms quota', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      expect(screen.getByText(/Forms:/)).toBeInTheDocument();
      expect(screen.getByText(/10 \/ 10/)).toBeInTheDocument();
    });

    it('displays submissions quota', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      expect(screen.getByText(/Submissions \(This Month\):/)).toBeInTheDocument();
      expect(screen.getByText(/50 \/ 100/)).toBeInTheDocument();
    });

    it('displays storage quota', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      expect(screen.getByText(/Storage:/)).toBeInTheDocument();
      expect(screen.getByText(/250.0 MB \/ 1000 MB/)).toBeInTheDocument();
    });

    it('handles unlimited quotas', () => {
      const unlimitedResult: QuotaCheckResult = {
        ...mockQuotaResult,
        quotaInfo: {
          ...mockQuotaResult.quotaInfo!,
          formsLimit: -1,
          submissionsLimit: -1,
          storageLimitMB: -1,
        },
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={unlimitedResult}
        />
      );

      const unlimitedTexts = screen.getAllByText(/Unlimited/);
      expect(unlimitedTexts.length).toBe(3); // Forms, Submissions, Storage
    });
  });

  describe('Reason Message', () => {
    it('displays custom reason when provided', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      expect(screen.getByText('You have exceeded your forms quota.')).toBeInTheDocument();
    });

    it('shows default message when reason not provided (blocked)', () => {
      const noReasonResult: QuotaCheckResult = {
        ...mockQuotaResult,
        reason: undefined,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={noReasonResult}
        />
      );

      expect(screen.getByText('You have reached your quota limit.')).toBeInTheDocument();
    });

    it('shows default message when reason not provided (allowed)', () => {
      const noReasonResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
        reason: undefined,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={noReasonResult}
        />
      );

      expect(screen.getByText('You are approaching your quota limit.')).toBeInTheDocument();
    });
  });

  describe('Overage Cost Display', () => {
    it('shows overage cost when willIncurOverage and cost > 0', () => {
      const overageResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
        willIncurOverage: true,
        estimatedOverageCost: 1500, // 15.00 ILS
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={overageResult}
        />
      );

      expect(screen.getByText(/estimated overage cost/i)).toBeInTheDocument();
      expect(screen.getByText(/₪15.00/)).toBeInTheDocument();
    });

    it('does not show overage cost when cost is 0', () => {
      const overageResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
        willIncurOverage: true,
        estimatedOverageCost: 0,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={overageResult}
        />
      );

      expect(screen.queryByText(/estimated overage cost/i)).not.toBeInTheDocument();
    });

    it('does not show overage cost when not overage', () => {
      const warningResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
        willIncurOverage: false,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={warningResult}
        />
      );

      expect(screen.queryByText(/estimated overage cost/i)).not.toBeInTheDocument();
    });
  });

  describe('Upgrade Required Message', () => {
    it('shows upgrade required message when upgradeRequired is true', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      expect(screen.getByText(/please upgrade your plan/i)).toBeInTheDocument();
    });

    it('does not show upgrade required message when false', () => {
      const noUpgradeResult: QuotaCheckResult = {
        ...mockQuotaResult,
        upgradeRequired: false,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={noUpgradeResult}
        />
      );

      expect(screen.queryByText(/please upgrade your plan/i)).not.toBeInTheDocument();
    });
  });

  describe('Don\'t Show Again Checkbox', () => {
    it('shows checkbox by default when allowed', () => {
      const allowedResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={allowedResult}
          onDontShowAgainChange={mockOnDontShowAgainChange}
        />
      );

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText(/don't show this warning again/i)).toBeInTheDocument();
    });

    it('does not show checkbox when blocked', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
          onDontShowAgainChange={mockOnDontShowAgainChange}
        />
      );

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('hides checkbox when showDontShowAgain is false', () => {
      const allowedResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={allowedResult}
          showDontShowAgain={false}
        />
      );

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('calls onDontShowAgainChange when proceed with checked box', () => {
      const allowedResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={allowedResult}
          onDontShowAgainChange={mockOnDontShowAgainChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
      fireEvent.click(proceedButton);

      expect(mockOnDontShowAgainChange).toHaveBeenCalledWith(true);
      expect(mockOnProceed).toHaveBeenCalled();
    });
  });

  describe('Button Actions', () => {
    it('calls onClose when close button clicked', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button clicked', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onUpgrade when upgrade button clicked', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade now/i });
      fireEvent.click(upgradeButton);

      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it('calls onProceed when proceed button clicked (allowed)', () => {
      const allowedResult: QuotaCheckResult = {
        ...mockQuotaResult,
        allowed: true,
      };

      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={allowedResult}
        />
      );

      const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
      fireEvent.click(proceedButton);

      expect(mockOnProceed).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', () => {
      const { container } = render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      const backdrop = container.querySelector('.bg-black.bg-opacity-50')!;
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'quota-warning-title');
    });

    it('has accessible close button', () => {
      render(
        <QuotaWarningModal
          isOpen={true}
          onClose={mockOnClose}
          onProceed={mockOnProceed}
          onUpgrade={mockOnUpgrade}
          quotaResult={mockQuotaResult}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });
  });
});
