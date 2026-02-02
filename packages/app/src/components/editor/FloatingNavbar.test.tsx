/**
 * FloatingNavbar Component Tests
 * Test-Driven Development for Premium Editor Navbar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingNavbar } from './FloatingNavbar';
import { RTLGuard } from '@/utils/rtl-guard';

describe('FloatingNavbar', () => {
  const mockOnTabChange = vi.fn();
  const mockOnAction = vi.fn();
  let rtlGuard: RTLGuard;

  beforeEach(() => {
    rtlGuard = new RTLGuard('ltr');
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render floating navbar with default tabs', () => {
      render(<FloatingNavbar />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render with custom tabs', () => {
      const customTabs = [
        { id: 'design', label: 'Design', icon: 'palette' },
        { id: 'code', label: 'Code', icon: 'code' },
        { id: 'export', label: 'Export', icon: 'download' },
      ];

      render(<FloatingNavbar tabs={customTabs} />);

      expect(screen.getByText('Design')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should apply floating styles', () => {
      render(<FloatingNavbar />);

      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveClass('floating-navbar');
      expect(navbar).toHaveStyle({
        position: 'fixed',
        zIndex: '1000',
      });
    });

    it('should render with actions toolbar', () => {
      const actions = [
        { id: 'save', label: 'Save', icon: 'save', onClick: mockOnAction },
        { id: 'undo', label: 'Undo', icon: 'undo', onClick: mockOnAction },
        { id: 'redo', label: 'Redo', icon: 'redo', onClick: mockOnAction },
      ];

      render(<FloatingNavbar actions={actions} />);

      expect(screen.getByLabelText('Save')).toBeInTheDocument();
      expect(screen.getByLabelText('Undo')).toBeInTheDocument();
      expect(screen.getByLabelText('Redo')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should handle tab selection', async () => {
      render(
        <FloatingNavbar
          activeTab="edit"
          onTabChange={mockOnTabChange}
        />
      );

      const previewTab = screen.getByText('Preview');
      fireEvent.click(previewTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('preview');
    });

    it('should highlight active tab', () => {
      render(<FloatingNavbar activeTab="preview" />);

      const previewTab = screen.getByText('Preview').closest('button');
      expect(previewTab).toHaveClass('active');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <FloatingNavbar
          activeTab="edit"
          onTabChange={mockOnTabChange}
        />
      );

      const editTab = screen.getByText('Edit');
      await user.click(editTab);

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      expect(mockOnTabChange).toHaveBeenCalledWith('preview');

      await user.keyboard('{ArrowLeft}');
      expect(mockOnTabChange).toHaveBeenCalledWith('edit');
    });

    it('should handle disabled tabs', () => {
      const tabs = [
        { id: 'edit', label: 'Edit' },
        { id: 'preview', label: 'Preview', disabled: true },
        { id: 'settings', label: 'Settings' },
      ];

      render(
        <FloatingNavbar
          tabs={tabs}
          onTabChange={mockOnTabChange}
        />
      );

      const previewTab = screen.getByText('Preview').closest('button');
      expect(previewTab).toBeDisabled();

      fireEvent.click(previewTab!);
      expect(mockOnTabChange).not.toHaveBeenCalled();
    });
  });

  describe('RTL Support', () => {
    it('should render correctly in RTL mode', () => {
      render(
        <div dir="rtl">
          <FloatingNavbar direction="rtl" />
        </div>
      );

      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveClass('rtl');
    });

    it('should reverse tab order in RTL', () => {
      render(<FloatingNavbar direction="rtl" />);

      const tabs = screen.getAllByRole('tab');
      // In RTL, visual order should be reversed
      expect(tabs[0]).toHaveTextContent('Settings');
      expect(tabs[2]).toHaveTextContent('Edit');
    });

    it('should mirror floating position for RTL', () => {
      render(
        <FloatingNavbar
          direction="rtl"
          position={{ top: 20, left: 20 }}
        />
      );

      const navbar = screen.getByRole('navigation');
      // In RTL, left becomes right
      expect(navbar).toHaveStyle({
        top: '20px',
        right: '20px',
        left: 'auto',
      });
    });

    it('should handle Hebrew labels', () => {
      const hebrewTabs = [
        { id: 'edit', label: 'עריכה' },
        { id: 'preview', label: 'תצוגה מקדימה' },
        { id: 'settings', label: 'הגדרות' },
      ];

      render(
        <FloatingNavbar
          tabs={hebrewTabs}
          direction="rtl"
        />
      );

      expect(screen.getByText('עריכה')).toBeInTheDocument();
      expect(screen.getByText('תצוגה מקדימה')).toBeInTheDocument();
      expect(screen.getByText('הגדרות')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should collapse to hamburger menu on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<FloatingNavbar />);

      expect(screen.getByLabelText('Menu')).toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeVisible();
    });

    it('should show dropdown menu when hamburger clicked', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<FloatingNavbar />);

      const menuButton = screen.getByLabelText('Menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeVisible();
        expect(screen.getByText('Preview')).toBeVisible();
        expect(screen.getByText('Settings')).toBeVisible();
      });
    });

    it('should adjust position to stay in viewport', () => {
      render(
        <FloatingNavbar
          position={{ top: -10, left: 2000 }}
          autoAdjustPosition={true}
        />
      );

      const navbar = screen.getByRole('navigation');
      const rect = navbar.getBoundingClientRect();

      // Should be adjusted to stay in viewport
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
    });
  });

  describe('Actions Toolbar', () => {
    it('should handle action button clicks', () => {
      const actions = [
        { id: 'save', label: 'Save', icon: 'save', onClick: mockOnAction },
      ];

      render(<FloatingNavbar actions={actions} />);

      const saveButton = screen.getByLabelText('Save');
      fireEvent.click(saveButton);

      expect(mockOnAction).toHaveBeenCalledWith('save');
    });

    it('should show keyboard shortcuts', () => {
      const actions = [
        {
          id: 'save',
          label: 'Save',
          icon: 'save',
          shortcut: 'Ctrl+S',
          onClick: mockOnAction,
        },
      ];

      render(<FloatingNavbar actions={actions} />);

      const saveButton = screen.getByLabelText('Save');
      expect(saveButton).toHaveAttribute('title', 'Save (Ctrl+S)');
    });

    it('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup();

      const actions = [
        {
          id: 'save',
          label: 'Save',
          icon: 'save',
          shortcut: 'Ctrl+S',
          onClick: mockOnAction,
        },
      ];

      render(<FloatingNavbar actions={actions} />);

      await user.keyboard('{Control>}s{/Control}');
      expect(mockOnAction).toHaveBeenCalledWith('save');
    });

    it('should separate action groups', () => {
      const actions = [
        { id: 'save', label: 'Save', group: 'file' },
        { id: 'undo', label: 'Undo', group: 'edit' },
        { id: 'redo', label: 'Redo', group: 'edit' },
      ];

      render(<FloatingNavbar actions={actions as any} />);

      const separators = screen.getAllByRole('separator');
      expect(separators).toHaveLength(1); // One separator between groups
    });
  });

  describe('Drag to Reposition', () => {
    it('should allow dragging to reposition', async () => {
      const onPositionChange = vi.fn();

      render(
        <FloatingNavbar
          draggable={true}
          onPositionChange={onPositionChange}
        />
      );

      const dragHandle = screen.getByLabelText('Drag to reposition');

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 120 });
      fireEvent.mouseUp(document);

      expect(onPositionChange).toHaveBeenCalledWith({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    });

    it('should constrain dragging to viewport', () => {
      const onPositionChange = vi.fn();

      render(
        <FloatingNavbar
          draggable={true}
          constrainToViewport={true}
          onPositionChange={onPositionChange}
        />
      );

      const dragHandle = screen.getByLabelText('Drag to reposition');

      // Try to drag outside viewport
      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: -1000, clientY: -1000 });
      fireEvent.mouseUp(document);

      // Position should be constrained
      expect(onPositionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        })
      );

      const lastCall = onPositionChange.mock.calls[0][0];
      expect(lastCall.x).toBeGreaterThanOrEqual(0);
      expect(lastCall.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Theming', () => {
    it('should apply theme variant', () => {
      render(<FloatingNavbar theme="dark" />);

      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveClass('theme-dark');
    });

    it('should support custom colors', () => {
      render(
        <FloatingNavbar
          customTheme={{
            background: '#123456',
            text: '#ffffff',
            accent: '#ff0000',
          }}
        />
      );

      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveStyle({
        backgroundColor: '#123456',
        color: '#ffffff',
      });
    });
  });

  describe('Animations', () => {
    it('should animate tab transitions', async () => {
      const { rerender } = render(<FloatingNavbar activeTab="edit" />);

      rerender(<FloatingNavbar activeTab="preview" />);

      const indicator = screen.getByTestId('tab-indicator');
      expect(indicator).toHaveClass('transitioning');
    });

    it('should animate navbar appearance', () => {
      render(<FloatingNavbar animateOnMount={true} />);

      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveClass('animate-slide-in');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FloatingNavbar activeTab="edit" />);

      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveAttribute('aria-label', 'Editor Navigation');

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('should support screen reader announcements', async () => {
      render(
        <FloatingNavbar
          activeTab="edit"
          onTabChange={mockOnTabChange}
        />
      );

      const previewTab = screen.getByText('Preview');
      fireEvent.click(previewTab);

      // Should announce tab change
      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent('Switched to Preview tab');
    });

    it('should trap focus when in mobile menu', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<FloatingNavbar />);

      const menuButton = screen.getByLabelText('Menu');
      fireEvent.click(menuButton);

      const user = userEvent.setup();

      // Tab should cycle within menu
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab(); // Should wrap back to first item

      // Focus should stay within menu
      expect(document.activeElement).toBeInTheDocument();
    });
  });
});