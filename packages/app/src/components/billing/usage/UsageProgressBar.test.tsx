// UsageProgressBar Component Tests
// Created: 2026-02-05
// Purpose: Test progress bar component with color coding

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UsageProgressBar } from './UsageProgressBar';

describe('UsageProgressBar', () => {
  describe('Rendering', () => {
    it('renders with basic props', () => {
      render(<UsageProgressBar current={50} limit={100} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('renders with label', () => {
      render(<UsageProgressBar current={50} limit={100} label="Forms" />);

      expect(screen.getByText('Forms')).toBeInTheDocument();
    });

    it('shows percentage by default', () => {
      render(<UsageProgressBar current={50} limit={100} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('hides percentage when showPercentage is false', () => {
      render(<UsageProgressBar current={50} limit={100} showPercentage={false} />);

      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('shows numbers by default', () => {
      render(<UsageProgressBar current={1234} limit={5000} />);

      expect(screen.getByText(/1,234/)).toBeInTheDocument();
      expect(screen.getByText(/5,000/)).toBeInTheDocument();
    });

    it('hides numbers when showNumbers is false', () => {
      render(<UsageProgressBar current={1234} limit={5000} showNumbers={false} />);

      expect(screen.queryByText(/1,234/)).not.toBeInTheDocument();
      expect(screen.queryByText(/5,000/)).not.toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('shows green color for usage under 70%', () => {
      const { container } = render(<UsageProgressBar current={60} limit={100} />);

      const progressFill = container.querySelector('.bg-green-500');
      expect(progressFill).toBeInTheDocument();
      expect(screen.getByText('60%')).toHaveClass('text-green-600');
    });

    it('shows yellow color for usage 70-90%', () => {
      const { container } = render(<UsageProgressBar current={80} limit={100} />);

      const progressFill = container.querySelector('.bg-yellow-500');
      expect(progressFill).toBeInTheDocument();
      expect(screen.getByText('80%')).toHaveClass('text-yellow-600');
    });

    it('shows red color for usage >= 90%', () => {
      const { container } = render(<UsageProgressBar current={95} limit={100} />);

      const progressFill = container.querySelector('.bg-red-500');
      expect(progressFill).toBeInTheDocument();
      expect(screen.getByText('95%')).toHaveClass('text-red-600');
    });
  });

  describe('Warning Messages', () => {
    it('shows "Approaching quota limit" warning at 90-99%', () => {
      render(<UsageProgressBar current={95} limit={100} />);

      expect(screen.getByText('Approaching quota limit')).toBeInTheDocument();
    });

    it('shows "Quota exceeded" warning at 100%', () => {
      render(<UsageProgressBar current={100} limit={100} />);

      expect(screen.getByText('Quota exceeded')).toBeInTheDocument();
    });

    it('shows "Quota exceeded" warning above 100%', () => {
      render(<UsageProgressBar current={120} limit={100} />);

      expect(screen.getByText('Quota exceeded')).toBeInTheDocument();
    });

    it('does not show warning below 90%', () => {
      render(<UsageProgressBar current={85} limit={100} />);

      expect(screen.queryByText(/quota/i)).not.toBeInTheDocument();
    });

    it('does not show warning for unlimited quota', () => {
      render(<UsageProgressBar current={1000} limit={-1} />);

      expect(screen.queryByText(/quota/i)).not.toBeInTheDocument();
    });
  });

  describe('Unlimited Quota', () => {
    it('handles unlimited quota (limit = -1)', () => {
      render(<UsageProgressBar current={1000} limit={-1} />);

      expect(screen.getByText(/Unlimited/)).toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('shows 0% width for unlimited quota', () => {
      const { container } = render(<UsageProgressBar current={1000} limit={-1} />);

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });

    it('does not set aria-valuenow/valuemax for unlimited', () => {
      render(<UsageProgressBar current={1000} limit={-1} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).not.toHaveAttribute('aria-valuenow');
      expect(progressbar).not.toHaveAttribute('aria-valuemax');
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { container } = render(<UsageProgressBar current={50} limit={100} size="sm" />);

      const progressbar = container.querySelector('.h-1\\.5');
      expect(progressbar).toBeInTheDocument();
    });

    it('renders medium size by default', () => {
      const { container } = render(<UsageProgressBar current={50} limit={100} />);

      const progressbar = container.querySelector('.h-2\\.5');
      expect(progressbar).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(<UsageProgressBar current={50} limit={100} size="lg" />);

      const progressbar = container.querySelector('.h-4');
      expect(progressbar).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero current usage', () => {
      render(<UsageProgressBar current={0} limit={100} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('handles zero limit (should not crash)', () => {
      render(<UsageProgressBar current={10} limit={0} />);

      // Should still render (percentage will be Infinity but clamped to 100%)
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('caps percentage at 100% when current > limit', () => {
      const { container } = render(<UsageProgressBar current={150} limit={100} />);

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('formats large numbers with commas', () => {
      render(<UsageProgressBar current={1234567} limit={9999999} />);

      expect(screen.getByText(/1,234,567/)).toBeInTheDocument();
      expect(screen.getByText(/9,999,999/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<UsageProgressBar current={75} limit={100} label="Forms" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Forms');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('uses default aria-label when no label provided', () => {
      render(<UsageProgressBar current={50} limit={100} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Usage progress');
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      const { container } = render(
        <UsageProgressBar current={50} limit={100} className="custom-class" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });
});
