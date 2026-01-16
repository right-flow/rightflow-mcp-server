/**
 * ResponsesPage Tests (Phase 4)
 * Tests for viewing and managing form responses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ResponsesPage } from './ResponsesPage';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    isSignedIn: true,
    isLoaded: true,
    user: {
      id: 'test-user-123',
      primaryEmailAddress: { id: 'test@example.com' },
    },
  }),
  UserButton: () => <div>User Button</div>,
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ formId: 'test-form-123' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock fetch for API calls
global.fetch = vi.fn();

describe('ResponsesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading state while fetching responses', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(() => {}) // Never resolves - keeps loading
      );

      render(
        <BrowserRouter>
          <ResponsesPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no responses exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ responses: [], count: 0 }),
      });

      render(
        <BrowserRouter>
          <ResponsesPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/no responses yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('with responses', () => {
    const mockResponses = [
      {
        id: 'response-1',
        formId: 'test-form-123',
        data: { name: 'John Doe', email: 'john@example.com' },
        submittedAt: new Date('2024-01-15T10:30:00Z'),
        submitterIp: '192.168.1.1',
      },
      {
        id: 'response-2',
        formId: 'test-form-123',
        data: { name: 'Jane Smith', email: 'jane@example.com' },
        submittedAt: new Date('2024-01-15T11:00:00Z'),
        submitterIp: '192.168.1.2',
      },
    ];

    beforeEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ responses: mockResponses, count: 2 }),
      });
    });

    it('displays response count', async () => {
      render(
        <BrowserRouter>
          <ResponsesPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/2 responses/i)).toBeInTheDocument();
      });
    });

    it('displays response list', async () => {
      render(
        <BrowserRouter>
          <ResponsesPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('shows export button', async () => {
      render(
        <BrowserRouter>
          <ResponsesPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('displays error message when fetch fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <BrowserRouter>
          <ResponsesPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('displays error message when response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      render(
        <BrowserRouter>
          <ResponsesPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load responses/i)).toBeInTheDocument();
      });
    });
  });
});
