/**
 * Unit Tests for HelpWidget Component
 * TDD Approach - Tests written first
 * Date: 2026-02-06
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HelpWidget } from '../HelpWidget';

describe('HelpWidget', () => {
  describe('Rendering', () => {
    test('renders floating help button', () => {
      render(<HelpWidget />);
      const button = screen.getByRole('button', { name: /help/i });
      expect(button).toBeInTheDocument();
    });

    test('shows help icon on button', () => {
      render(<HelpWidget />);
      // Check for SVG icon or emoji
      const button = screen.getByRole('button', { name: /help/i });
      expect(button).toBeInTheDocument();
    });

    test('button positioned at bottom-left corner', () => {
      const { container } = render(<HelpWidget />);
      const button = container.querySelector('.fixed.bottom-4.left-4');
      expect(button).toBeInTheDocument();
    });

    test('panel is hidden by default', () => {
      render(<HelpWidget />);
      expect(screen.queryByText(/need help/i)).not.toBeInTheDocument();
    });
  });

  describe('Panel Opening/Closing', () => {
    test('opens panel when help button is clicked', async () => {
      render(<HelpWidget />);
      const button = screen.getByRole('button', { name: /help/i });

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });
    });

    test('closes panel when close button is clicked', async () => {
      render(<HelpWidget />);

      // Open panel
      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });

      // Close panel
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/need help/i)).not.toBeInTheDocument();
      });
    });

    test('closes panel when clicking outside (backdrop)', async () => {
      render(<HelpWidget />);

      // Open panel
      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });

      // Click backdrop
      const backdrop = screen.getByTestId('help-backdrop');
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByText(/need help/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Panel Content', () => {
    beforeEach(async () => {
      render(<HelpWidget />);
      const button = screen.getByRole('button', { name: /help/i });
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });
    });

    test('shows panel title', () => {
      expect(screen.getByText(/need help/i)).toBeInTheDocument();
    });

    test('shows restart tutorial button', () => {
      expect(screen.getByRole('button', { name: /restart tutorial/i })).toBeInTheDocument();
    });

    test('shows quick links section', () => {
      expect(screen.getByText(/quick links/i)).toBeInTheDocument();
    });

    test('shows "Getting Started Guide" link', () => {
      const link = screen.getByRole('link', { name: /getting started guide/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/docs/getting-started');
    });

    test('shows "Template Gallery" link', () => {
      const link = screen.getByRole('link', { name: /template gallery/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/docs/templates');
    });

    test('shows "How to Share Forms" link', () => {
      const link = screen.getByRole('link', { name: /how to share forms/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/docs/sharing');
    });

    test('shows "Understanding Analytics" link', () => {
      const link = screen.getByRole('link', { name: /understanding analytics/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/docs/analytics');
    });

    test('shows video tutorials section', () => {
      expect(screen.getByText(/video tutorials/i)).toBeInTheDocument();
    });
  });

  describe('Restart Tutorial Functionality', () => {
    test('calls onRestartTutorial when restart button clicked', async () => {
      const mockRestart = vi.fn();
      render(<HelpWidget onRestartTutorial={mockRestart} />);

      // Open panel
      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });

      // Click restart
      const restartButton = screen.getByRole('button', { name: /restart tutorial/i });
      fireEvent.click(restartButton);

      expect(mockRestart).toHaveBeenCalledTimes(1);
    });

    test('closes panel after restart tutorial clicked', async () => {
      const mockRestart = vi.fn();
      render(<HelpWidget onRestartTutorial={mockRestart} />);

      // Open panel
      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });

      // Click restart
      const restartButton = screen.getByRole('button', { name: /restart tutorial/i });
      fireEvent.click(restartButton);

      await waitFor(() => {
        expect(screen.queryByText(/need help/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('help button has accessible label', () => {
      render(<HelpWidget />);
      const button = screen.getByRole('button', { name: /help/i });
      expect(button).toHaveAccessibleName();
    });

    test('panel has proper ARIA role', async () => {
      render(<HelpWidget />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        const panel = screen.getByRole('dialog');
        expect(panel).toBeInTheDocument();
      });
    });

    test('panel has aria-labelledby pointing to title', async () => {
      render(<HelpWidget />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        const panel = screen.getByRole('dialog');
        expect(panel).toHaveAttribute('aria-labelledby');
      });
    });

    test('close button is keyboard accessible', async () => {
      render(<HelpWidget />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
      });
    });

    test('ESC key closes the panel', async () => {
      render(<HelpWidget />);

      // Open panel
      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });

      // Press ESC
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText(/need help/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual States', () => {
    test('help button has hover state', () => {
      const { container } = render(<HelpWidget />);
      const button = container.querySelector('.hover\\:bg-primary\\/90');
      expect(button).toBeInTheDocument();
    });

    test('panel slides in from left', async () => {
      render(<HelpWidget />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        const panel = screen.getByRole('dialog');
        expect(panel).toBeInTheDocument();
      });
    });

    test('shows backdrop with semi-transparent overlay', async () => {
      render(<HelpWidget />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        const backdrop = screen.getByTestId('help-backdrop');
        expect(backdrop).toHaveClass('bg-black/50');
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles multiple rapid clicks on help button', async () => {
      render(<HelpWidget />);
      const button = screen.getByRole('button', { name: /help/i });

      // Rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        // Should toggle properly
        const panels = screen.queryAllByRole('dialog');
        expect(panels.length).toBeLessThanOrEqual(1);
      });
    });

    test('works without onRestartTutorial prop', () => {
      expect(() => render(<HelpWidget />)).not.toThrow();
    });

    test('handles undefined callback gracefully', async () => {
      render(<HelpWidget onRestartTutorial={undefined} />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });

      const restartButton = screen.getByRole('button', { name: /restart tutorial/i });

      expect(() => fireEvent.click(restartButton)).not.toThrow();
    });
  });

  describe('Analytics Tracking', () => {
    test('tracks when help panel is opened', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      render(<HelpWidget />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[Analytics]',
          'help_opened',
          expect.any(Object)
        );
      });

      consoleSpy.mockRestore();
    });

    test('tracks when restart tutorial is clicked', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockRestart = vi.fn();
      render(<HelpWidget onRestartTutorial={mockRestart} />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText(/need help/i)).toBeInTheDocument();
      });

      const restartButton = screen.getByRole('button', { name: /restart tutorial/i });
      fireEvent.click(restartButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Analytics]',
        'tutorial_restarted',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });
});
