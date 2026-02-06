/**
 * Unit Tests for SmartUpgradeManager Component
 * TDD Approach - Tests written first
 * Date: 2026-02-06
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SmartUpgradeManager } from '../SmartUpgradeManager';
import { useUser } from '@clerk/clerk-react';

// Mock Clerk's useUser hook
vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SmartUpgradeManager', () => {
  const mockUser = {
    id: 'user_123',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
    organizationMemberships: [
      {
        organization: {
          id: 'org_123',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    (useUser as any).mockReturnValue({ user: mockUser, isLoaded: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    test('shows nothing when user is not loaded', () => {
      (useUser as any).mockReturnValue({ user: null, isLoaded: false });
      const { container } = render(<SmartUpgradeManager />);
      expect(container.firstChild).toBeNull();
    });

    test('shows nothing when user has no organization', () => {
      (useUser as any).mockReturnValue({
        user: { ...mockUser, organizationMemberships: [] },
        isLoaded: true,
      });
      const { container } = render(<SmartUpgradeManager />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Quota Warning Trigger (Priority 1)', () => {
    test('shows quota warning at exactly 80% usage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 40, // 80%
            formsCreated: 2,
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/running low on responses/i)).toBeInTheDocument();
      });
    });

    test('shows quota warning at 85% usage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 85, // 85%
            formsCreated: 2,
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/running low on responses/i)).toBeInTheDocument();
      });
    });

    test('shows quota warning at 100% usage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 50, // 100%
            formsCreated: 1,
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/running low on responses/i)).toBeInTheDocument();
      });
    });

    test('does NOT show quota warning at 79% usage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 79, // 79%
            formsCreated: 1,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Power User Trigger (Priority 2)', () => {
    test('shows power user prompt at exactly 5 forms', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 20, // 40% - below quota threshold
            formsCreated: 5,
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/power user/i)).toBeInTheDocument();
      });
    });

    test('shows power user prompt at 10 forms', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 15, // 30%
            formsCreated: 10,
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/power user/i)).toBeInTheDocument();
      });
    });

    test('shows power user prompt at exactly 40 responses', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 40, // 40% - below 80% threshold
            formsCreated: 2, // below 5 forms
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/power user/i)).toBeInTheDocument();
      });
    });

    test('shows power user prompt at 50 responses', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 50, // 50%
            formsCreated: 1,
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/power user/i)).toBeInTheDocument();
      });
    });

    test('does NOT show power user prompt below thresholds (4 forms, 39 responses)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 39, // 39%
            formsCreated: 4,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Hybrid Trigger (Priority 3)', () => {
    test('shows hybrid prompt at exactly 14 days and 3 forms', async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      (useUser as any).mockReturnValue({
        user: { ...mockUser, createdAt: fourteenDaysAgo.toISOString() },
        isLoaded: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 10, // 10% - low usage
            formsCreated: 3,
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
      });
    });

    test('shows hybrid prompt at exactly 14 days and 20 responses', async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      (useUser as any).mockReturnValue({
        user: { ...mockUser, createdAt: fourteenDaysAgo.toISOString() },
        isLoaded: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 20, // 20%
            formsCreated: 1,
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
      });
    });

    test('shows hybrid prompt at 20 days and high engagement', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      (useUser as any).mockReturnValue({
        user: { ...mockUser, createdAt: twentyDaysAgo.toISOString() },
        isLoaded: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 25, // 25%
            formsCreated: 4, // 4 forms (above 3)
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
      });
    });

    test('does NOT show hybrid prompt at 13 days (time threshold not met)', async () => {
      const thirteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
      (useUser as any).mockReturnValue({
        user: { ...mockUser, createdAt: thirteenDaysAgo.toISOString() },
        isLoaded: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 30, // high engagement
            formsCreated: 5,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('does NOT show hybrid prompt at 14+ days but low engagement', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      (useUser as any).mockReturnValue({
        user: { ...mockUser, createdAt: twentyDaysAgo.toISOString() },
        isLoaded: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 15, // 15% - below 20 threshold
            formsCreated: 2, // below 3 threshold
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Trigger Prioritization', () => {
    test('prioritizes quota warning over power user trigger', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 45, // 90% - quota warning threshold
            formsCreated: 10, // power user threshold
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/running low on responses/i)).toBeInTheDocument();
        // Check that power user modal is NOT shown (look for specific modal heading)
        expect(screen.queryByText(/You're a power user!/i)).not.toBeInTheDocument();
      });
    });

    test('prioritizes quota warning over hybrid trigger', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      (useUser as any).mockReturnValue({
        user: { ...mockUser, createdAt: twentyDaysAgo.toISOString() },
        isLoaded: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 42, // 84% - quota warning
            formsCreated: 3, // hybrid trigger engagement
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/running low on responses/i)).toBeInTheDocument();
        // Check that hybrid prompt is NOT shown (look for specific hybrid text)
        expect(screen.queryByText(/Ready to upgrade\?/i)).not.toBeInTheDocument();
      });
    });

    test('prioritizes power user over hybrid trigger', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      (useUser as any).mockReturnValue({
        user: { ...mockUser, createdAt: twentyDaysAgo.toISOString() },
        isLoaded: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 100, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 25, // 25% - below quota threshold
            formsCreated: 5, // power user threshold (also meets hybrid)
          }),
        });

      render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(screen.getByText(/power user/i)).toBeInTheDocument();
      });
    });
  });

  describe('Paid Plans Exclusion', () => {
    test('shows nothing for BASIC plan even with high usage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'BASIC', maxResponses: 1000, maxForms: 10 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 900, // 90% usage
            formsCreated: 8,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('shows nothing for EXPANDED plan', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'EXPANDED', maxResponses: 5000, maxForms: 50 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 4000, // 80%
            formsCreated: 30,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('shows nothing for ENTERPRISE plan', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'ENTERPRISE', maxResponses: Infinity, maxForms: Infinity },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 10000,
            formsCreated: 100,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles subscription fetch error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('handles usage fetch error gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('handles non-ok response for subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('handles non-ok response for usage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles user with no createdAt timestamp', async () => {
      (useUser as any).mockReturnValue({
        user: { ...mockUser, createdAt: undefined },
        isLoaded: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 10,
            formsCreated: 1,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('handles zero responses and zero forms', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 50, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 0,
            formsCreated: 0,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('handles maxResponses of 0 (edge case)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: { name: 'FREE', maxResponses: 0, maxForms: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            responsesUsed: 0,
            formsCreated: 1,
          }),
        });

      const { container } = render(<SmartUpgradeManager />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });
});
