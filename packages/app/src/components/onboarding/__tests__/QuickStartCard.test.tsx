/**
 * QuickStartCard Component Tests
 * TDD Approach - Tests written first
 * Date: 2026-02-06
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickStartCard } from '../QuickStartCard';

describe('QuickStartCard', () => {
  const mockOnTemplateSelect = vi.fn();
  const mockOnCreateBlank = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders the main heading', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      expect(screen.getByText(/create your first form/i)).toBeInTheDocument();
    });

    test('renders all 4 template cards', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      // Check for template names (Hebrew)
      expect(screen.getByText(/טופס יצירת קשר/i)).toBeInTheDocument();
      expect(screen.getByText(/סקר משוב/i)).toBeInTheDocument();
      expect(screen.getByText(/טופס הרשמה/i)).toBeInTheDocument();
      expect(screen.getByText(/טופס משוב/i)).toBeInTheDocument();
    });

    test('renders template icons', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      // Check for emoji icons
      expect(screen.getByText('📝')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('💬')).toBeInTheDocument();
    });

    test('renders "start from scratch" button', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
    });

    test('renders template descriptions', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      // Check for Hebrew descriptions
      expect(screen.getByText(/איסוף פרטי יצירת קשר/i)).toBeInTheDocument();
      expect(screen.getByText(/איסוף משוב ודירוגים/i)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('calls onTemplateSelect when contact template is clicked', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const contactCard = screen.getByText(/טופס יצירת קשר/i).closest('button');
      fireEvent.click(contactCard!);

      expect(mockOnTemplateSelect).toHaveBeenCalledWith('contact');
      expect(mockOnTemplateSelect).toHaveBeenCalledTimes(1);
    });

    test('calls onTemplateSelect when survey template is clicked', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const surveyCard = screen.getByText(/סקר משוב/i).closest('button');
      fireEvent.click(surveyCard!);

      expect(mockOnTemplateSelect).toHaveBeenCalledWith('survey');
    });

    test('calls onTemplateSelect when registration template is clicked', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const registrationCard = screen.getByText(/טופס הרשמה/i).closest('button');
      fireEvent.click(registrationCard!);

      expect(mockOnTemplateSelect).toHaveBeenCalledWith('registration');
    });

    test('calls onTemplateSelect when feedback template is clicked', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const feedbackCard = screen.getByText(/טופס משוב/i).closest('button');
      fireEvent.click(feedbackCard!);

      expect(mockOnTemplateSelect).toHaveBeenCalledWith('feedback');
    });

    test('calls onCreateBlank when "start from scratch" is clicked', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const startFromScratchButton = screen.getByText(/start from scratch/i);
      fireEvent.click(startFromScratchButton);

      expect(mockOnCreateBlank).toHaveBeenCalledTimes(1);
    });

    test('does not call handlers when component just renders', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      expect(mockOnTemplateSelect).not.toHaveBeenCalled();
      expect(mockOnCreateBlank).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('template cards are keyboard accessible', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const contactCard = screen.getByText(/טופס יצירת קשר/i).closest('button');
      expect(contactCard).toHaveAttribute('type', 'button');
    });

    test('start from scratch button is keyboard accessible', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const startButton = screen.getByText(/start from scratch/i);
      expect(startButton.tagName).toBe('BUTTON');
    });

    test('has proper ARIA labels for screen readers', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const heading = screen.getByText(/create your first form/i);
      expect(heading.tagName).toMatch(/^H[1-6]$/); // Should be a heading tag
    });
  });

  describe('Visual States', () => {
    test('template cards have hover effect classes', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const contactCard = screen.getByText(/טופס יצירת קשר/i).closest('button');
      expect(contactCard).toHaveClass(/hover/i);
    });

    test('renders in a grid layout', () => {
      const { container } = render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles rapid clicks on template cards', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const contactCard = screen.getByText(/טופס יצירת קשר/i).closest('button');

      // Rapid clicks
      fireEvent.click(contactCard!);
      fireEvent.click(contactCard!);
      fireEvent.click(contactCard!);

      expect(mockOnTemplateSelect).toHaveBeenCalledTimes(3);
      expect(mockOnTemplateSelect).toHaveBeenCalledWith('contact');
    });

    test('handles clicks on multiple different templates', () => {
      render(
        <QuickStartCard
          onTemplateSelect={mockOnTemplateSelect}
          onCreateBlank={mockOnCreateBlank}
        />
      );

      const contactCard = screen.getByText(/טופס יצירת קשר/i).closest('button');
      const surveyCard = screen.getByText(/סקר משוב/i).closest('button');

      fireEvent.click(contactCard!);
      fireEvent.click(surveyCard!);

      expect(mockOnTemplateSelect).toHaveBeenCalledTimes(2);
      expect(mockOnTemplateSelect).toHaveBeenNthCalledWith(1, 'contact');
      expect(mockOnTemplateSelect).toHaveBeenNthCalledWith(2, 'survey');
    });
  });
});
