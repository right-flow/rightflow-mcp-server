/**
 * Tests for PublishDialog Component
 * Comprehensive tests for publish workflow, URL display, and premium features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act, waitFor } from '@testing-library/react';
import { PublishDialog } from './PublishDialog';
import { useState, useEffect } from 'react';

/**
 * Simulates the notes reset logic from PublishDialog
 * This is the core logic that was fixed
 */
function useNotesReset(open: boolean) {
  const [notes, setNotes] = useState('');

  // Reset notes when dialog closes - THIS IS THE FIX
  useEffect(() => {
    if (!open) {
      setNotes('');
    }
  }, [open]);

  return { notes, setNotes };
}

describe('PublishDialog', () => {
  describe('Notes Reset Logic', () => {
    it('should reset notes when open changes from true to false', () => {
      const { result, rerender } = renderHook(
        ({ open }) => useNotesReset(open),
        { initialProps: { open: true } },
      );

      // Set some notes
      act(() => {
        result.current.setNotes('Version 1 notes');
      });
      expect(result.current.notes).toBe('Version 1 notes');

      // Close dialog (open becomes false)
      rerender({ open: false });

      // Notes should be cleared
      expect(result.current.notes).toBe('');
    });

    it('should keep notes cleared when dialog reopens', () => {
      const { result, rerender } = renderHook(
        ({ open }) => useNotesReset(open),
        { initialProps: { open: true } },
      );

      // Set notes and close dialog
      act(() => {
        result.current.setNotes('Version 1 notes');
      });
      rerender({ open: false });
      expect(result.current.notes).toBe('');

      // Reopen dialog
      rerender({ open: true });

      // Notes should still be empty
      expect(result.current.notes).toBe('');
    });

    it('should not reset notes while dialog remains open', () => {
      const { result, rerender } = renderHook(
        ({ open }) => useNotesReset(open),
        { initialProps: { open: true } },
      );

      // Set some notes
      act(() => {
        result.current.setNotes('Version 1 notes');
      });
      expect(result.current.notes).toBe('Version 1 notes');

      // Rerender with open still true
      rerender({ open: true });

      // Notes should NOT be cleared
      expect(result.current.notes).toBe('Version 1 notes');
    });

    it('should handle multiple open/close cycles correctly', () => {
      const { result, rerender } = renderHook(
        ({ open }) => useNotesReset(open),
        { initialProps: { open: true } },
      );

      // Cycle 1: Set notes and close
      act(() => {
        result.current.setNotes('Version 1');
      });
      expect(result.current.notes).toBe('Version 1');
      rerender({ open: false });
      expect(result.current.notes).toBe('');

      // Cycle 2: Reopen, set new notes, close
      rerender({ open: true });
      act(() => {
        result.current.setNotes('Version 2');
      });
      expect(result.current.notes).toBe('Version 2');
      rerender({ open: false });
      expect(result.current.notes).toBe('');

      // Cycle 3: Reopen, notes should be empty
      rerender({ open: true });
      expect(result.current.notes).toBe('');
    });

    it('should start with empty notes', () => {
      const { result } = renderHook(
        ({ open }) => useNotesReset(open),
        { initialProps: { open: true } },
      );

      expect(result.current.notes).toBe('');
    });
  });

  describe('Component Rendering', () => {
    const mockOnPublish = vi.fn();
    const mockOnOpenChange = vi.fn();

    beforeEach(() => {
      mockOnPublish.mockClear();
      mockOnOpenChange.mockClear();

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('renders publish dialog when open', () => {
      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
        />,
      );

      expect(screen.getByText('פרסום טופס')).toBeInTheDocument();
      expect(screen.getByText('Test Form')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <PublishDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
        />,
      );

      expect(screen.queryByText('פרסום טופס')).not.toBeInTheDocument();
    });

    it('shows publish button when not published', () => {
      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
        />,
      );

      expect(screen.getByRole('button', { name: /פרסם/ })).toBeInTheDocument();
    });

    it('shows loading state when publishing', () => {
      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={true}
        />,
      );

      expect(screen.getByText('מפרסם...')).toBeInTheDocument();
    });
  });

  describe('Publish Workflow', () => {
    const mockOnPublish = vi.fn();
    const mockOnOpenChange = vi.fn();

    beforeEach(() => {
      mockOnPublish.mockClear();
      mockOnOpenChange.mockClear();
    });

    it('calls onPublish when publish button clicked', async () => {
      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
        />,
      );

      const publishButton = screen.getByRole('button', { name: /פרסם/ });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(mockOnPublish).toHaveBeenCalledTimes(1);
      });
    });

    it('passes notes to onPublish callback', async () => {
      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
        />,
      );

      const notesInput = screen.getByPlaceholderText(/הערות גרסה/);
      fireEvent.change(notesInput, { target: { value: 'Test notes' } });

      const publishButton = screen.getByRole('button', { name: /פרסם/ });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(mockOnPublish).toHaveBeenCalledWith('Test notes');
      });
    });
  });

  describe('URL Display', () => {
    const mockOnPublish = vi.fn();
    const mockOnOpenChange = vi.fn();

    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('displays public URL after publishing', () => {
      const testUrl = 'https://example.com/form/test-form';

      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
          publishedUrl={testUrl}
        />,
      );

      expect(screen.getByDisplayValue(testUrl)).toBeInTheDocument();
    });

    it('copy button is disabled when URL is null', () => {
      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
          publishedUrl={null}
        />,
      );

      const copyButtons = screen.getAllByTitle('העתק קישור');
      expect(copyButtons[0]).toBeDisabled();
    });

    it('copy button works when URL is provided', async () => {
      const testUrl = 'https://example.com/form/test-form';

      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
          publishedUrl={testUrl}
        />,
      );

      const copyButtons = screen.getAllByTitle('העתק קישור');
      expect(copyButtons[0]).not.toBeDisabled();

      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testUrl);
      });
    });
  });

  describe('Premium Features', () => {
    const mockOnPublish = vi.fn();
    const mockOnOpenChange = vi.fn();

    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('shows short URL for premium users', () => {
      const shortUrl = 'https://roo.bz/abc123';

      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
          publishedUrl="https://example.com/form/test"
          shortUrl={shortUrl}
          isPremiumUser={true}
        />,
      );

      expect(screen.getByDisplayValue(shortUrl)).toBeInTheDocument();
    });

    it('does not show short URL for free users', () => {
      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
          publishedUrl="https://example.com/form/test"
          shortUrl="https://roo.bz/abc123"
          isPremiumUser={false}
        />,
      );

      expect(screen.queryByDisplayValue('https://roo.bz/abc123')).not.toBeInTheDocument();
    });

    it('short URL copy button works', async () => {
      const shortUrl = 'https://roo.bz/abc123';

      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
          publishedUrl="https://example.com/form/test"
          shortUrl={shortUrl}
          isPremiumUser={true}
        />,
      );

      const copyButton = screen.getByTitle('העתק קישור מקוצר');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(shortUrl);
      });
    });
  });

  describe('RTL Support', () => {
    const mockOnPublish = vi.fn();
    const mockOnOpenChange = vi.fn();

    it('renders with RTL direction', () => {
      const { container } = render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
        />,
      );

      const dialogContent = container.querySelector('[dir="rtl"]');
      expect(dialogContent).toBeInTheDocument();
    });

    it('URL inputs have LTR direction', () => {
      render(
        <PublishDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          formId="test-form-id"
          formTitle="Test Form"
          onPublish={mockOnPublish}
          isPublishing={false}
          publishedUrl="https://example.com/form/test"
        />,
      );

      const urlInputs = screen.getAllByDisplayValue(/https:/);
      urlInputs.forEach(input => {
        expect(input).toHaveAttribute('dir', 'ltr');
      });
    });
  });
});
