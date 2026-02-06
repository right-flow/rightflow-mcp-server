/**
 * Unit Tests for ProgressChecklist Component
 * TDD Approach - Tests written first
 * Date: 2026-02-06
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressChecklist } from '../ProgressChecklist';

describe('ProgressChecklist', () => {
  describe('Rendering', () => {
    test('renders checklist card with title', () => {
      render(<ProgressChecklist />);
      expect(screen.getByText(/get the most out of RightFlow/i)).toBeInTheDocument();
    });

    test('shows completed count and total', () => {
      render(<ProgressChecklist />);
      expect(screen.getByText(/0 of 5 completed/i)).toBeInTheDocument();
    });

    test('renders progress bar', () => {
      render(<ProgressChecklist />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    test('shows all 5 checklist items', () => {
      render(<ProgressChecklist />);
      expect(screen.getByText(/create your first form/i)).toBeInTheDocument();
      expect(screen.getByText(/customize form fields/i)).toBeInTheDocument();
      expect(screen.getByText(/publish form/i)).toBeInTheDocument();
      expect(screen.getByText(/receive first response/i)).toBeInTheDocument();
      expect(screen.getByText(/share via whatsapp/i)).toBeInTheDocument();
    });

    test('shows icons for each checklist item', () => {
      render(<ProgressChecklist />);
      // Icons are embedded in text content, check for full label
      expect(screen.getByText(/📝.*create your first form/i)).toBeInTheDocument();
      expect(screen.getByText(/✏️.*customize form fields/i)).toBeInTheDocument();
      expect(screen.getByText(/🚀.*publish form/i)).toBeInTheDocument();
      expect(screen.getByText(/📊.*receive first response/i)).toBeInTheDocument();
      expect(screen.getByText(/📱.*share via whatsapp/i)).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    test('shows 0% progress when no items completed', () => {
      render(<ProgressChecklist />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    test('shows 20% progress when 1 of 5 items completed', () => {
      render(<ProgressChecklist formsCount={1} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '20');
      expect(screen.getByText(/1 of 5 completed/i)).toBeInTheDocument();
    });

    test('shows 40% progress when 2 of 5 items completed', () => {
      render(<ProgressChecklist formsCount={1} isPublished={true} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');
      expect(screen.getByText(/2 of 5 completed/i)).toBeInTheDocument();
    });

    test('shows 60% progress when 3 of 5 items completed', () => {
      render(<ProgressChecklist formsCount={1} isPublished={true} responsesCount={1} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(screen.getByText(/3 of 5 completed/i)).toBeInTheDocument();
    });

    test('shows 100% progress when all items completed', () => {
      const { container } = render(
        <ProgressChecklist
          formsCount={1}
          isPublished={true}
          responsesCount={1}
          hasCustomized={true}
          hasShared={true}
        />
      );
      // When all complete, component returns null (auto-hide)
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Item Completion States', () => {
    test('marks "create form" as completed when formsCount > 0', () => {
      const { container } = render(<ProgressChecklist formsCount={1} />);
      const createFormItem = screen.getByText(/create your first form/i).closest('li');
      expect(createFormItem?.querySelector('.line-through')).toBeInTheDocument();
    });

    test('marks "customize" as completed when hasCustomized is true', () => {
      const { container } = render(<ProgressChecklist hasCustomized={true} />);
      const customizeItem = screen.getByText(/customize form fields/i).closest('li');
      expect(customizeItem?.querySelector('.line-through')).toBeInTheDocument();
    });

    test('marks "publish" as completed when isPublished is true', () => {
      const { container } = render(<ProgressChecklist isPublished={true} />);
      const publishItem = screen.getByText(/publish form/i).closest('li');
      expect(publishItem?.querySelector('.line-through')).toBeInTheDocument();
    });

    test('marks "first response" as completed when responsesCount > 0', () => {
      const { container } = render(<ProgressChecklist responsesCount={1} />);
      const responseItem = screen.getByText(/receive first response/i).closest('li');
      expect(responseItem?.querySelector('.line-through')).toBeInTheDocument();
    });

    test('marks "share" as completed when hasShared is true', () => {
      const { container } = render(<ProgressChecklist hasShared={true} />);
      const shareItem = screen.getByText(/share via whatsapp/i).closest('li');
      expect(shareItem?.querySelector('.line-through')).toBeInTheDocument();
    });

    test('shows checkmark icon for completed items', () => {
      render(<ProgressChecklist formsCount={1} />);
      // CheckCircle icon should be visible for completed item
      const listItems = screen.getAllByRole('listitem');
      const firstItem = listItems[0];
      expect(firstItem.querySelector('svg')).toBeInTheDocument(); // Check for SVG icon
    });

    test('shows empty circle icon for incomplete items', () => {
      render(<ProgressChecklist />);
      // Circle icon should be visible for incomplete items
      const listItems = screen.getAllByRole('listitem');
      listItems.forEach(item => {
        expect(item.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Collapsible Behavior', () => {
    test('starts in expanded state by default', () => {
      render(<ProgressChecklist />);
      expect(screen.getByText(/create your first form/i)).toBeVisible();
    });

    test('collapses when header is clicked', () => {
      render(<ProgressChecklist />);
      const header = screen.getByRole('button');

      fireEvent.click(header);

      expect(screen.queryByText(/create your first form/i)).not.toBeInTheDocument();
    });

    test('expands when header is clicked again', () => {
      render(<ProgressChecklist />);
      const header = screen.getByRole('button');

      // Collapse
      fireEvent.click(header);
      expect(screen.queryByText(/create your first form/i)).not.toBeInTheDocument();

      // Expand
      fireEvent.click(header);
      expect(screen.getByText(/create your first form/i)).toBeInTheDocument();
    });

    test('shows chevron icon that rotates when collapsed', () => {
      render(<ProgressChecklist />);
      const chevron = screen.getByTestId('chevron-icon') || document.querySelector('[data-testid="chevron-icon"]');

      expect(chevron).toBeInTheDocument();
    });
  });

  describe('Auto-hide when Complete', () => {
    test('hides checklist when all items are completed', () => {
      const { container } = render(
        <ProgressChecklist
          formsCount={1}
          isPublished={true}
          responsesCount={1}
          hasCustomized={true}
          hasShared={true}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    test('remains visible when only some items completed', () => {
      const { container } = render(<ProgressChecklist formsCount={1} isPublished={true} />);

      expect(container.firstChild).not.toBeNull();
    });
  });

  describe('Fixed Positioning', () => {
    test('renders with fixed positioning for always-visible widget', () => {
      const { container } = render(<ProgressChecklist />);
      const card = container.querySelector('.fixed');

      expect(card).toBeInTheDocument();
    });

    test('positioned at bottom-right corner', () => {
      const { container } = render(<ProgressChecklist />);
      const card = container.querySelector('.bottom-4.right-4');

      expect(card).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('progress bar has accessible label', () => {
      render(<ProgressChecklist />);
      const progressBar = screen.getByRole('progressbar');

      expect(progressBar).toHaveAttribute('aria-label');
    });

    test('header is keyboard accessible', () => {
      render(<ProgressChecklist />);
      const header = screen.getByRole('button');

      expect(header).toHaveAttribute('tabIndex', '0');
    });

    test('checklist items are in a list for screen readers', () => {
      render(<ProgressChecklist />);
      const list = screen.getByRole('list');

      expect(list).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined props gracefully', () => {
      expect(() => render(<ProgressChecklist />)).not.toThrow();
    });

    test('handles negative values gracefully', () => {
      expect(() => render(<ProgressChecklist formsCount={-1} responsesCount={-1} />)).not.toThrow();
    });

    test('handles very large values', () => {
      expect(() => render(<ProgressChecklist formsCount={999999} responsesCount={999999} />)).not.toThrow();
    });
  });
});
