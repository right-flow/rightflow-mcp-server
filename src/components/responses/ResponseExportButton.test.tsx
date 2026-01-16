/**
 * ResponseExportButton Tests (Phase 4)
 * Tests for exporting responses as CSV/JSON
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponseExportButton } from './ResponseExportButton';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-123',
      primaryEmailAddress: { id: 'test@example.com' },
    },
  }),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock createElement and appendChild for download link
const mockClick = vi.fn();
const mockLink = {
  href: '',
  download: '',
  click: mockClick,
};
vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

describe('ResponseExportButton', () => {
  const mockFormId = 'test-form-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('button rendering', () => {
    it('renders export button', () => {
      render(<ResponseExportButton formId={mockFormId} />);

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('shows dropdown when clicked', async () => {
      render(<ResponseExportButton formId={mockFormId} />);

      const button = screen.getByRole('button', { name: /export/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/csv/i)).toBeInTheDocument();
        expect(screen.getByText(/json/i)).toBeInTheDocument();
      });
    });
  });

  describe('CSV export', () => {
    it('downloads CSV file when CSV option clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => '"Name","Email"\n"John","john@example.com"',
      });

      render(<ResponseExportButton formId={mockFormId} />);

      const button = screen.getByRole('button', { name: /export/i });
      fireEvent.click(button);

      const csvOption = await screen.findByText(/csv/i);
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/responses?formId=${mockFormId}&export=csv`),
          expect.any(Object)
        );
      });

      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled();
      });
    });

    it('sets correct filename for CSV download', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => '"Name","Email"\n"John","john@example.com"',
      });

      render(<ResponseExportButton formId={mockFormId} />);

      const button = screen.getByRole('button', { name: /export/i });
      fireEvent.click(button);

      const csvOption = await screen.findByText(/csv/i);
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(mockLink.download).toMatch(/responses.*\.csv$/);
      });
    });
  });

  describe('JSON export', () => {
    it('downloads JSON file when JSON option clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => '[{"name":"John","email":"john@example.com"}]',
      });

      render(<ResponseExportButton formId={mockFormId} />);

      const button = screen.getByRole('button', { name: /export/i });
      fireEvent.click(button);

      const jsonOption = await screen.findByText(/json/i);
      fireEvent.click(jsonOption);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/responses?formId=${mockFormId}&export=json`),
          expect.any(Object)
        );
      });

      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled();
      });
    });

    it('sets correct filename for JSON download', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => '[{"name":"John"}]',
      });

      render(<ResponseExportButton formId={mockFormId} />);

      const button = screen.getByRole('button', { name: /export/i });
      fireEvent.click(button);

      const jsonOption = await screen.findByText(/json/i);
      fireEvent.click(jsonOption);

      await waitFor(() => {
        expect(mockLink.download).toMatch(/responses.*\.json$/);
      });
    });
  });

  describe('error handling', () => {
    it('shows error message when export fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<ResponseExportButton formId={mockFormId} />);

      const button = screen.getByRole('button', { name: /export/i });
      fireEvent.click(button);

      const csvOption = await screen.findByText(/csv/i);
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });

    it('shows error message when response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      render(<ResponseExportButton formId={mockFormId} />);

      const button = screen.getByRole('button', { name: /export/i });
      fireEvent.click(button);

      const csvOption = await screen.findByText(/csv/i);
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading state during export', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(() => {}) // Never resolves - keeps loading
      );

      render(<ResponseExportButton formId={mockFormId} />);

      const button = screen.getByRole('button', { name: /export/i });
      fireEvent.click(button);

      const csvOption = await screen.findByText(/csv/i);
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(screen.getByText(/exporting/i)).toBeInTheDocument();
      });
    });
  });
});
