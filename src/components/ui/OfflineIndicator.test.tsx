/**
 * Tests for OfflineIndicator Component
 * Displays network status and sync queue information
 * Supports Hebrew RTL and Dark/Light mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    online: 'מחובר',
    offline: 'לא מחובר',
    syncing: 'מסנכרן...',
    pendingItems: 'פריטים בהמתנה',
    syncNow: 'סנכרן עכשיו',
    syncError: 'שגיאת סנכרון',
    lastSynced: 'סונכרן לאחרונה',
    noConnection: 'אין חיבור לאינטרנט',
    connectionRestored: 'החיבור שוחזר',
    itemsWaitingToSync: 'פריטים ממתינים לסנכרון',
  }),
  useDirection: () => 'rtl',
}));

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Online Status Display', () => {
    it('should display online status when connected', () => {
      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
        />
      );

      expect(screen.getByText('מחובר')).toBeInTheDocument();
    });

    it('should display offline status when disconnected', () => {
      render(
        <OfflineIndicator
          isOnline={false}
          isSyncing={false}
          queueSize={0}
        />
      );

      expect(screen.getByText('לא מחובר')).toBeInTheDocument();
    });

    it('should display syncing status', () => {
      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={true}
          queueSize={5}
        />
      );

      expect(screen.getByText('מסנכרן...')).toBeInTheDocument();
    });
  });

  describe('Queue Size Display', () => {
    it('should display pending items count when queue has items', () => {
      render(
        <OfflineIndicator
          isOnline={false}
          isSyncing={false}
          queueSize={3}
        />
      );

      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it('should not display queue count when queue is empty', () => {
      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
        />
      );

      // Should not show any number for empty queue
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Sync Button', () => {
    it('should show sync button when there are pending items and online', () => {
      const onSyncClick = vi.fn();

      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={2}
          onSyncClick={onSyncClick}
        />
      );

      const syncButton = screen.getByRole('button', { name: /סנכרן/i });
      expect(syncButton).toBeInTheDocument();
    });

    it('should call onSyncClick when sync button is clicked', () => {
      const onSyncClick = vi.fn();

      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={2}
          onSyncClick={onSyncClick}
        />
      );

      const syncButton = screen.getByRole('button', { name: /סנכרן/i });
      fireEvent.click(syncButton);

      expect(onSyncClick).toHaveBeenCalledTimes(1);
    });

    it('should disable sync button when offline', () => {
      const onSyncClick = vi.fn();

      render(
        <OfflineIndicator
          isOnline={false}
          isSyncing={false}
          queueSize={2}
          onSyncClick={onSyncClick}
        />
      );

      const syncButton = screen.queryByRole('button', { name: /סנכרן/i });
      if (syncButton) {
        expect(syncButton).toBeDisabled();
      }
    });

    it('should disable sync button while syncing', () => {
      const onSyncClick = vi.fn();

      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={true}
          queueSize={2}
          onSyncClick={onSyncClick}
        />
      );

      const syncButton = screen.queryByRole('button', { name: /סנכרן/i });
      if (syncButton) {
        expect(syncButton).toBeDisabled();
      }
    });
  });

  describe('Error Display', () => {
    it('should display sync error when present', () => {
      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={1}
          syncError="שגיאה בסנכרון הנתונים"
        />
      );

      expect(screen.getByText('שגיאה בסנכרון הנתונים')).toBeInTheDocument();
    });
  });

  describe('RTL Support', () => {
    it('should render with RTL direction', () => {
      const { container } = render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
        />
      );

      expect(container.firstChild).toHaveAttribute('dir', 'rtl');
    });

    it('should display Hebrew text correctly', () => {
      render(
        <OfflineIndicator
          isOnline={false}
          isSyncing={false}
          queueSize={5}
        />
      );

      // Check that Hebrew text is displayed
      expect(screen.getByText('לא מחובר')).toBeInTheDocument();
    });
  });

  describe('Dark/Light Mode Support', () => {
    it('should use CSS variables for colors (no hardcoded colors)', () => {
      const { container } = render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
        />
      );

      // Check that the component uses Tailwind CSS variable classes
      const elements = container.querySelectorAll('[class*="bg-"]');
      elements.forEach((el) => {
        const className = el.className;
        // Should use semantic colors like bg-background, bg-muted, etc.
        // Not hardcoded colors like bg-gray-500, bg-blue-600
        expect(className).not.toMatch(/bg-(red|blue|green|gray|slate)-\d{3}/);
      });
    });

    it('should use semantic text colors', () => {
      const { container } = render(
        <OfflineIndicator
          isOnline={false}
          isSyncing={false}
          queueSize={3}
        />
      );

      const elements = container.querySelectorAll('[class*="text-"]');
      elements.forEach((el) => {
        const className = el.className;
        // Should use semantic colors
        expect(className).not.toMatch(/text-(red|blue|green|gray|slate)-\d{3}/);
      });
    });
  });

  describe('Visual States', () => {
    it('should show success indicator when online with empty queue', () => {
      const { container } = render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
        />
      );

      // Should have a green/success indicator
      expect(container.querySelector('[class*="success"], [class*="green"]') ||
             container.querySelector('[data-status="online"]')).toBeTruthy();
    });

    it('should show warning indicator when offline', () => {
      const { container } = render(
        <OfflineIndicator
          isOnline={false}
          isSyncing={false}
          queueSize={0}
        />
      );

      // Should have a warning/offline indicator
      expect(container.querySelector('[class*="warning"], [class*="destructive"]') ||
             container.querySelector('[data-status="offline"]')).toBeTruthy();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode when specified', () => {
      const { container } = render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
          compact={true}
        />
      );

      // In compact mode, should have smaller dimensions
      expect(container.firstChild).toHaveClass('compact');
    });

    it('should show only icon in compact mode', () => {
      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
          compact={true}
        />
      );

      // In compact mode, text should not be visible
      expect(screen.queryByText('מחובר')).not.toBeInTheDocument();
    });
  });

  describe('Last Sync Time', () => {
    it('should display last sync time when provided', () => {
      const lastSyncTime = new Date('2024-01-15T10:30:00').toISOString();

      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
          lastSyncTime={lastSyncTime}
        />
      );

      // Should display some indication of last sync time
      expect(screen.getByText(/סונכרן לאחרונה/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label for screen readers', () => {
      render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
        />
      );

      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', () => {
      const { rerender } = render(
        <OfflineIndicator
          isOnline={true}
          isSyncing={false}
          queueSize={0}
        />
      );

      // Rerender with offline status
      rerender(
        <OfflineIndicator
          isOnline={false}
          isSyncing={false}
          queueSize={0}
        />
      );

      // Should have aria-live for announcements
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });
  });
});
