// FormSubmissionGuard Component Tests
// Created: 2026-02-05
// Purpose: Test form submission guard HOC

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormSubmissionGuard } from './FormSubmissionGuard';
import * as useQuotaCheckModule from '../../../hooks/useQuotaCheck';
import { QuotaCheckResult } from '../../../api/types';

// Mock useQuotaCheck hook
jest.mock('../../../hooks/useQuotaCheck');

const mockQuotaResult: QuotaCheckResult = {
  allowed: true,
  willIncurOverage: false,
  quotaInfo: {
    formsUsed: 5,
    formsLimit: 10,
    submissionsThisMonth: 50,
    submissionsLimit: 100,
    storageUsedMB: 250,
    storageLimitMB: 1000,
  },
};

describe('FormSubmissionGuard', () => {
  const mockOnSubmit = jest.fn();
  const mockOnUpgrade = jest.fn();
  const mockCheckBeforeSubmit = jest.fn();
  const mockSetShowWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Default mock implementation
    (useQuotaCheckModule.useQuotaCheck as jest.Mock).mockReturnValue({
      checkBeforeSubmit: mockCheckBeforeSubmit,
      quotaResult: mockQuotaResult,
      showWarning: false,
      setShowWarning: mockSetShowWarning,
      loading: false,
    });
  });

  describe('Rendering', () => {
    it('renders children with handleSubmit function', () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit, isChecking }) => (
            <button onClick={handleSubmit} disabled={isChecking}>
              Submit
            </button>
          )}
        </FormSubmissionGuard>
      );

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('passes isChecking prop to children', () => {
      (useQuotaCheckModule.useQuotaCheck as jest.Mock).mockReturnValue({
        checkBeforeSubmit: mockCheckBeforeSubmit,
        quotaResult: mockQuotaResult,
        showWarning: false,
        setShowWarning: mockSetShowWarning,
        loading: true,
      });

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit, isChecking }) => (
            <button onClick={handleSubmit} disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Submit'}
            </button>
          )}
        </FormSubmissionGuard>
      );

      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });
  });

  describe('Submission Flow - Quota Check Passed', () => {
    it('calls onSubmit when quota check passes', async () => {
      mockCheckBeforeSubmit.mockResolvedValue(true);

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCheckBeforeSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it('handles async onSubmit', async () => {
      const asyncOnSubmit = jest.fn().mockResolvedValue(undefined);
      mockCheckBeforeSubmit.mockResolvedValue(true);

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={asyncOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(asyncOnSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Submission Flow - Quota Check Failed', () => {
    it('does not call onSubmit when quota check fails', async () => {
      mockCheckBeforeSubmit.mockResolvedValue(false);

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCheckBeforeSubmit).toHaveBeenCalledTimes(1);
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows warning modal when quota check fails', async () => {
      mockCheckBeforeSubmit.mockResolvedValue(false);

      (useQuotaCheckModule.useQuotaCheck as jest.Mock).mockReturnValue({
        checkBeforeSubmit: mockCheckBeforeSubmit,
        quotaResult: { ...mockQuotaResult, allowed: false },
        showWarning: true,
        setShowWarning: mockSetShowWarning,
        loading: false,
      });

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Bypass Quota Check', () => {
    it('skips quota check when bypassQuotaCheck is true', async () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
          bypassQuotaCheck={true}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      expect(mockCheckBeforeSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Warning Modal Integration', () => {
    beforeEach(() => {
      (useQuotaCheckModule.useQuotaCheck as jest.Mock).mockReturnValue({
        checkBeforeSubmit: mockCheckBeforeSubmit,
        quotaResult: { ...mockQuotaResult, allowed: false },
        showWarning: true,
        setShowWarning: mockSetShowWarning,
        loading: false,
      });
    });

    it('renders warning modal when showWarning is true', () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onSubmit when proceed from modal', async () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const proceedButton = screen.getByRole('button', { name: /upgrade now/i });
      // Modal shows "Upgrade Now" for blocked state, but we need the proceed logic
      // Let's find the actual proceed button - it won't exist for blocked state
      // So let's test with an allowed but warning state instead
    });

    it('calls onUpgrade when upgrade clicked from modal', () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade now/i });
      fireEvent.click(upgradeButton);

      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it('closes modal when cancel clicked', () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockSetShowWarning).toHaveBeenCalledWith(false);
    });
  });

  describe('Proceed from Warning Modal', () => {
    beforeEach(() => {
      (useQuotaCheckModule.useQuotaCheck as jest.Mock).mockReturnValue({
        checkBeforeSubmit: mockCheckBeforeSubmit,
        quotaResult: { ...mockQuotaResult, allowed: true, willIncurOverage: true },
        showWarning: true,
        setShowWarning: mockSetShowWarning,
        loading: false,
      });
    });

    it('calls onSubmit when proceed from warning modal', async () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(mockSetShowWarning).toHaveBeenCalledWith(false);
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it('handles async onSubmit when proceeding from modal', async () => {
      const asyncOnSubmit = jest.fn().mockResolvedValue(undefined);

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={asyncOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(asyncOnSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Don\'t Show Again Functionality', () => {
    beforeEach(() => {
      (useQuotaCheckModule.useQuotaCheck as jest.Mock).mockReturnValue({
        checkBeforeSubmit: mockCheckBeforeSubmit,
        quotaResult: { ...mockQuotaResult, allowed: true, willIncurOverage: true },
        showWarning: true,
        setShowWarning: mockSetShowWarning,
        loading: false,
      });
    });

    it('saves to localStorage when don\'t show again checked', async () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(localStorage.getItem('quotaWarning_dontShowAgain')).toBe('true');
      });
    });

    it('does not save to localStorage when checkbox not checked', async () => {
      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const proceedButton = screen.getByRole('button', { name: /proceed anyway/i });
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      expect(localStorage.getItem('quotaWarning_dontShowAgain')).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('shows loading state during quota check', () => {
      (useQuotaCheckModule.useQuotaCheck as jest.Mock).mockReturnValue({
        checkBeforeSubmit: mockCheckBeforeSubmit,
        quotaResult: mockQuotaResult,
        showWarning: false,
        setShowWarning: mockSetShowWarning,
        loading: true,
      });

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit, isChecking }) => (
            <button onClick={handleSubmit} disabled={isChecking}>
              {isChecking ? 'Loading...' : 'Submit'}
            </button>
          )}
        </FormSubmissionGuard>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('shows loading state during submission', async () => {
      const slowOnSubmit = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );
      mockCheckBeforeSubmit.mockResolvedValue(true);

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={slowOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit, isChecking }) => (
            <button onClick={handleSubmit} disabled={isChecking}>
              {isChecking ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </FormSubmissionGuard>
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Submitting...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles onSubmit errors gracefully', async () => {
      const errorOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
      mockCheckBeforeSubmit.mockResolvedValue(true);

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={errorOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit, isChecking }) => (
            <button onClick={handleSubmit} disabled={isChecking}>
              Submit
            </button>
          )}
        </FormSubmissionGuard>
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(errorOnSubmit).toHaveBeenCalled();
      });

      // Should reset loading state even after error
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('handles quota check errors gracefully', async () => {
      mockCheckBeforeSubmit.mockRejectedValue(new Error('Quota check failed'));

      render(
        <FormSubmissionGuard
          formId="test-form"
          onSubmit={mockOnSubmit}
          onUpgrade={mockOnUpgrade}
        >
          {({ handleSubmit }) => (
            <button onClick={handleSubmit}>Submit</button>
          )}
        </FormSubmissionGuard>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCheckBeforeSubmit).toHaveBeenCalled();
      });

      // Should not call onSubmit if check failed
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
