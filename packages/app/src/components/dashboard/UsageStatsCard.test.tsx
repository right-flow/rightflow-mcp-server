/**
 * UsageStatsCard Component Tests (TDD)
 * Tests with mocked React Query to avoid version conflicts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserTier } from '@/services/access-control/AccessControl';

// Mock React Query completely to avoid monorepo version conflicts
const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => mockUseQuery(options),
  QueryClient: vi.fn(),
  QueryClientProvider: vi.fn(({ children }: any) => children),
}));

// Import component AFTER mocking React Query
import { UsageStatsCard } from './UsageStatsCard';

describe('UsageStatsCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FREE Tier Display', () => {
    it('should display forms count and limit for FREE tier', () => {
      mockUseQuery.mockReturnValue({
        data: { formsCount: 5, submissionsCount: 50 },
        isLoading: false,
        error: null,
      });

      render(<UsageStatsCard userId="test-user" tier={UserTier.FREE} />);

      expect(screen.getByText('טפסים')).toBeInTheDocument();
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
    });

    it('should display submissions count and limit for FREE tier', () => {
      mockUseQuery.mockReturnValue({
        data: { formsCount: 5, submissionsCount: 75 },
        isLoading: false,
        error: null,
      });

      render(<UsageStatsCard userId="test-user" tier={UserTier.FREE} />);

      expect(screen.getByText('הגשות')).toBeInTheDocument();
      expect(screen.getByText('75 / 100')).toBeInTheDocument();
    });

    it('should display progress bars for FREE tier', () => {
      mockUseQuery.mockReturnValue({
        data: { formsCount: 5, submissionsCount: 75 },
        isLoading: false,
        error: null,
      });

      const { container } = render(
        <UsageStatsCard userId="test-user" tier={UserTier.FREE} />
      );

      const progressBars = container.querySelectorAll('[role="progressbar"]');
      expect(progressBars).toHaveLength(2);
    });
  });

  describe('PRO Tier Display', () => {
    it('should display infinity symbol for PRO tier forms', () => {
      mockUseQuery.mockReturnValue({
        data: { formsCount: 50, submissionsCount: 1000 },
        isLoading: false,
        error: null,
      });

      render(<UsageStatsCard userId="test-user" tier={UserTier.PRO} />);

      expect(screen.getByText(/50 \/ ∞/)).toBeInTheDocument();
    });

    it('should display infinity symbol for PRO tier submissions', () => {
      mockUseQuery.mockReturnValue({
        data: { formsCount: 50, submissionsCount: 1000 },
        isLoading: false,
        error: null,
      });

      render(<UsageStatsCard userId="test-user" tier={UserTier.PRO} />);

      expect(screen.getByText(/1000 \/ ∞/)).toBeInTheDocument();
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate 50% usage correctly', () => {
      mockUseQuery.mockReturnValue({
        data: { formsCount: 5, submissionsCount: 50 },
        isLoading: false,
        error: null,
      });

      const { container } = render(
        <UsageStatsCard userId="test-user" tier={UserTier.FREE} />
      );

      const progressBars = container.querySelectorAll('[role="progressbar"]');
      const formsProgress = progressBars[0].querySelector('div');

      expect(formsProgress).toHaveStyle({ width: '50%' });
    });

    it('should calculate 80% usage correctly', () => {
      mockUseQuery.mockReturnValue({
        data: { formsCount: 8, submissionsCount: 80 },
        isLoading: false,
        error: null,
      });

      const { container } = render(
        <UsageStatsCard userId="test-user" tier={UserTier.FREE} />
      );

      const progressBars = container.querySelectorAll('[role="progressbar"]');
      const formsProgress = progressBars[0].querySelector('div');
      const submissionsProgress = progressBars[1].querySelector('div');

      expect(formsProgress).toHaveStyle({ width: '80%' });
      expect(submissionsProgress).toHaveStyle({ width: '80%' });
    });

    it('should handle 100% usage (at limit)', () => {
      mockUseQuery.mockReturnValue({
        data: { formsCount: 10, submissionsCount: 100 },
        isLoading: false,
        error: null,
      });

      const { container } = render(
        <UsageStatsCard userId="test-user" tier={UserTier.FREE} />
      );

      const progressBars = container.querySelectorAll('[role="progressbar"]');
      const formsProgress = progressBars[0].querySelector('div');

      expect(formsProgress).toHaveStyle({ width: '100%' });
    });
  });

  describe('Loading State', () => {
    it('should show 0 counts while data is loading', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<UsageStatsCard userId="test-user" tier={UserTier.FREE} />);

      expect(screen.getByText('0 / 10')).toBeInTheDocument();
      expect(screen.getByText('0 / 100')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show 0 counts on error', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('API Error'),
      });

      render(<UsageStatsCard userId="test-user" tier={UserTier.FREE} />);

      expect(screen.getByText('0 / 10')).toBeInTheDocument();
      expect(screen.getByText('0 / 100')).toBeInTheDocument();
    });
  });
});
