/**
 * TierBadge Component Tests (TDD)
 * Red phase - these tests will fail until we implement the component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierBadge } from './TierBadge';
import { UserTier } from '@/services/access-control/AccessControl';

describe('TierBadge Component', () => {
  describe('Tier Display', () => {
    it('should display FREE badge with correct text and icon', () => {
      render(<TierBadge tier={UserTier.FREE} />);

      const badge = screen.getByText('FREE');
      expect(badge).toBeInTheDocument();

      // Should have Star icon for FREE tier
      const icon = badge.parentElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should display PRO badge with correct text and icon', () => {
      render(<TierBadge tier={UserTier.PRO} />);

      const badge = screen.getByText('PRO');
      expect(badge).toBeInTheDocument();

      // Should have Crown icon for PRO tier
      const icon = badge.parentElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should display ENTERPRISE badge with correct text and icon', () => {
      render(<TierBadge tier={UserTier.ENTERPRISE} />);

      const badge = screen.getByText('ENTERPRISE');
      expect(badge).toBeInTheDocument();

      // Should have Building icon for ENTERPRISE tier
      const icon = badge.parentElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should display GUEST as FREE (fallback)', () => {
      render(<TierBadge tier={UserTier.GUEST} />);

      const badge = screen.getByText('FREE');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply gray styling for FREE tier', () => {
      const { container } = render(<TierBadge tier={UserTier.FREE} />);

      const badge = container.querySelector('.bg-gray-100');
      expect(badge).toBeInTheDocument();
    });

    it('should apply blue styling for PRO tier', () => {
      const { container } = render(<TierBadge tier={UserTier.PRO} />);

      const badge = container.querySelector('.bg-blue-100');
      expect(badge).toBeInTheDocument();
    });

    it('should apply purple styling for ENTERPRISE tier', () => {
      const { container } = render(<TierBadge tier={UserTier.ENTERPRISE} />);

      const badge = container.querySelector('.bg-purple-100');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should support small size', () => {
      render(<TierBadge tier={UserTier.PRO} size="sm" />);

      const badge = screen.getByText('PRO');
      expect(badge).toBeInTheDocument();
    });

    it('should support medium size (default)', () => {
      render(<TierBadge tier={UserTier.PRO} size="md" />);

      const badge = screen.getByText('PRO');
      expect(badge).toBeInTheDocument();
    });

    it('should support large size', () => {
      render(<TierBadge tier={UserTier.PRO} size="lg" />);

      const badge = screen.getByText('PRO');
      expect(badge).toBeInTheDocument();
    });

    it('should default to medium size when not specified', () => {
      render(<TierBadge tier={UserTier.PRO} />);

      const badge = screen.getByText('PRO');
      expect(badge).toBeInTheDocument();
    });
  });
});
