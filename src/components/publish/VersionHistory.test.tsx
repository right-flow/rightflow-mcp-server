/**
 * Tests for VersionHistory Component
 * Tests version history display, restore functionality, and authentication
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VersionHistory } from './VersionHistory';

// Mock Clerk hooks
vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(),
  useAuth: vi.fn(),
}));

// Import the mocked hooks
import { useUser, useAuth } from '@clerk/clerk-react';

describe('VersionHistory', () => {
  const mockFormId = 'test-form-id';
  const mockOnOpenChange = vi.fn();
  const mockOnRestore = vi.fn();
  const mockGetToken = vi.fn();

  const mockVersions = [
    {
      id: 'v3-id',
      form_id: mockFormId,
      version_number: 3,
      title: 'Test Form',
      description: null,
      fields: [{ id: '1', type: 'text', label: 'Field 3' }],
      stations: [],
      settings: {},
      published_by: 'user-123',
      published_at: new Date('2024-01-15'),
      is_current: true,
      notes: 'Latest version',
      created_at: new Date('2024-01-15'),
    },
    {
      id: 'v2-id',
      form_id: mockFormId,
      version_number: 2,
      title: 'Test Form',
      description: null,
      fields: [{ id: '1', type: 'text', label: 'Field 2' }],
      stations: [],
      settings: {},
      published_by: 'user-123',
      published_at: new Date('2024-01-10'),
      is_current: false,
      notes: 'Added features',
      created_at: new Date('2024-01-10'),
    },
    {
      id: 'v1-id',
      form_id: mockFormId,
      version_number: 1,
      title: 'Test Form',
      description: null,
      fields: [{ id: '1', type: 'text', label: 'Field 1' }],
      stations: [],
      settings: {},
      published_by: 'user-123',
      published_at: new Date('2024-01-01'),
      is_current: false,
      notes: null,
      created_at: new Date('2024-01-01'),
    },
  ];

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnRestore.mockClear();
    mockGetToken.mockClear();

    // Mock useAuth to return getToken
    (useAuth as any).mockReturnValue({
      getToken: mockGetToken,
    });

    // Mock useUser to return a user
    (useUser as any).mockReturnValue({
      user: {
        id: 'test-user-id',
        emailAddress: 'test@example.com',
      },
    });

    // Mock getToken to return a token
    mockGetToken.mockResolvedValue('mock-jwt-token');

    // Mock fetch globally
    global.fetch = vi.fn();

    // Mock window.confirm
    global.confirm = vi.fn();

    // Mock window.prompt
    global.prompt = vi.fn();

    // Mock window.alert
    global.alert = vi.fn();
  });

  describe('Component Rendering', () => {
    it('renders dialog when open', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      expect(screen.getByText('היסטוריית גרסאות')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <VersionHistory
          open={false}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      expect(screen.queryByText('היסטוריית גרסאות')).not.toBeInTheDocument();
    });

    it('shows loading state while fetching versions', () => {
      (global.fetch as any).mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      expect(screen.getByText('טוען גרסאות...')).toBeInTheDocument();
    });

    it('shows empty state when no versions', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: [] }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('אין גרסאות קודמות')).toBeInTheDocument();
      });
    });
  });

  describe('Version List Display', () => {
    it('displays all versions', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('גרסה 1')).toBeInTheDocument();
        expect(screen.getByText('גרסה 2')).toBeInTheDocument();
        expect(screen.getByText('גרסה 3')).toBeInTheDocument();
      });
    });

    it('highlights current version', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('גרסה נוכחית')).toBeInTheDocument();
      });
    });

    it('displays version notes', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Latest version')).toBeInTheDocument();
        expect(screen.getByText('Added features')).toBeInTheDocument();
      });
    });

    it('displays field count', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        const fieldCounts = screen.getAllByText(/1 שדות/);
        expect(fieldCounts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Authentication', () => {
    it('fetches with Authorization header', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/form-versions?formId=${mockFormId}`),
          expect.objectContaining({
            headers: {
              'Authorization': 'Bearer mock-jwt-token',
            },
          }),
        );
      });
    });

    it('shows error when user not authenticated', async () => {
      (useUser as any).mockReturnValue({
        user: null,
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('יש להתחבר כדי לצפות בהיסטוריית גרסאות');
      });
    });
  });

  describe('Version Restoration', () => {
    it('shows restore button for non-current versions', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        const restoreButtons = screen.getAllByText('שחזר');
        // Should have restore buttons for versions 1 and 2 (not version 3 which is current)
        expect(restoreButtons.length).toBe(2);
      });
    });

    it('does not show restore button for current version', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        // Current version (version 3) should not have a restore button
        const version3Element = screen.getByText('גרסה 3').closest('div');
        const restoreButtons = version3Element?.querySelectorAll('button');

        // The only button should be the close button at the bottom
        // Version 3 card should not have restore button
        const hasRestoreButton = Array.from(restoreButtons || []).some(
          btn => btn.textContent?.includes('שחזר'),
        );
        expect(hasRestoreButton).toBe(false);
      });
    });

    it('confirms before restoring', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      (global.confirm as any).mockReturnValue(false); // User cancels

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        const restoreButtons = screen.getAllByText('שחזר');
        fireEvent.click(restoreButtons[0]);
      });

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(mockOnRestore).not.toHaveBeenCalled();
      });
    });

    it('prompts for notes when restoring', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      (global.confirm as any).mockReturnValue(true); // User confirms
      (global.prompt as any).mockReturnValue('Restored notes');

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        const restoreButtons = screen.getAllByText('שחזר');
        fireEvent.click(restoreButtons[0]);
      });

      await waitFor(() => {
        expect(global.prompt).toHaveBeenCalled();
      });
    });

    it('calls onRestore with version number and notes', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      (global.confirm as any).mockReturnValue(true);
      (global.prompt as any).mockReturnValue('Test notes');
      mockOnRestore.mockResolvedValueOnce(undefined);

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        const restoreButtons = screen.getAllByText('שחזר');
        fireEvent.click(restoreButtons[1]); // Click on version 1 (last in list)
      });

      await waitFor(() => {
        expect(mockOnRestore).toHaveBeenCalledWith(1, 'Test notes');
      });
    });

    it('shows success message after restore', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      (global.confirm as any).mockReturnValue(true);
      (global.prompt as any).mockReturnValue('');
      mockOnRestore.mockResolvedValueOnce(undefined);

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        const restoreButtons = screen.getAllByText('שחזר');
        fireEvent.click(restoreButtons[0]);
      });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('שוחזרה בהצלחה'));
      });
    });

    it('handles restore errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      (global.confirm as any).mockReturnValue(true);
      (global.prompt as any).mockReturnValue('');
      mockOnRestore.mockRejectedValueOnce(new Error('Restore failed'));

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        const restoreButtons = screen.getAllByText('שחזר');
        fireEvent.click(restoreButtons[0]);
      });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('שגיאה'));
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error when fetch fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('שגיאה בטעינת היסטוריית גרסאות');
      });
    });

    it('shows error when network fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('שגיאה בטעינת היסטוריית גרסאות');
      });
    });
  });

  describe('RTL Support', () => {
    it('renders with RTL direction', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      const { container } = render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        const dialogContent = container.querySelector('[dir="rtl"]');
        expect(dialogContent).toBeInTheDocument();
      });
    });
  });

  describe('Date Formatting', () => {
    it('displays relative dates in Hebrew', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      render(
        <VersionHistory
          open={true}
          onOpenChange={mockOnOpenChange}
          formId={mockFormId}
          onRestore={mockOnRestore}
        />,
      );

      await waitFor(() => {
        // Should show relative dates like "לפני X ימים"
        // Exact text depends on current date, so we just check something is displayed
        const dateElements = screen.getAllByText(/לפני|לא/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });
  });
});
