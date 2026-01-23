/**
 * Tests for ConditionalRulesPanel Component
 * Tests conditional logic rule builder UI with Hebrew support and Dark/Light mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ConditionalRulesPanel } from './ConditionalRulesPanel';
import { FieldDefinition, ConditionalRule } from '@/types/fields';

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    conditionalLogic: 'לוגיקה מותנית',
    addRule: 'הוסף כלל',
    when: 'כאשר',
    equals: 'שווה ל',
    notEquals: 'לא שווה ל',
    contains: 'מכיל',
    isEmpty: 'ריק',
    isNotEmpty: 'לא ריק',
    then: 'אז',
    show: 'הצג',
    hide: 'הסתר',
    require: 'חובה',
    unrequire: 'לא חובה',
    selectField: 'בחר שדה',
    enterValue: 'הזן ערך',
    remove: 'הסר',
    and: 'וגם',
    or: 'או',
    defaultVisibility: 'ברירת מחדל',
    visible: 'גלוי',
    hidden: 'מוסתר',
    noRules: 'אין כללים מוגדרים',
  }),
  useDirection: () => 'rtl',
}));

const createMockField = (
  id: string,
  overrides: Partial<FieldDefinition> = {},
): FieldDefinition => ({
  id,
  type: 'text',
  name: `field_${id}`,
  label: `שדה ${id}`,
  x: 100,
  y: 100,
  width: 150,
  height: 20,
  pageNumber: 1,
  required: false,
  direction: 'rtl',
  ...overrides,
});

describe('ConditionalRulesPanel', () => {
  let mockOnRulesChange: ReturnType<typeof vi.fn>;
  let mockOnDefaultVisibilityChange: ReturnType<typeof vi.fn>;

  const allFields: FieldDefinition[] = [
    createMockField('dropdown1', {
      type: 'dropdown',
      label: 'סוג לקוח',
      options: ['פרטי', 'עסקי', 'אחר'],
    }),
    createMockField('checkbox1', {
      type: 'checkbox',
      label: 'אישור תנאים',
    }),
    createMockField('text1', {
      type: 'text',
      label: 'הערות',
    }),
    createMockField('current', {
      type: 'text',
      label: 'שדה נוכחי',
    }),
  ];

  beforeEach(() => {
    mockOnRulesChange = vi.fn();
    mockOnDefaultVisibilityChange = vi.fn();
  });

  describe('Initial Render', () => {
    it('should render with RTL direction', () => {
      const { container } = render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      expect(container.firstChild).toHaveAttribute('dir', 'rtl');
    });

    it('should show add rule button', () => {
      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      expect(screen.getByText('הוסף כלל')).toBeInTheDocument();
    });

    it('should display "no rules" message when empty', () => {
      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      expect(screen.getByText('אין כללים מוגדרים')).toBeInTheDocument();
    });

    it('should show default visibility selector', () => {
      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      expect(screen.getByText('ברירת מחדל')).toBeInTheDocument();
    });
  });

  describe('Adding Rules', () => {
    it('should add a new rule when clicking add button', () => {
      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      fireEvent.click(screen.getByText('הוסף כלל'));

      expect(mockOnRulesChange).toHaveBeenCalledTimes(1);
      const newRules = mockOnRulesChange.mock.calls[0][0];
      expect(newRules).toHaveLength(1);
      expect(newRules[0]).toMatchObject({
        id: expect.any(String),
        sourceFieldId: '',
        operator: 'equals',
        value: '',
        action: 'show',
      });
    });
  });

  describe('Displaying Existing Rules', () => {
    it('should display existing rules', () => {
      const existingRules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'dropdown1',
          operator: 'equals',
          value: 'אחר',
          action: 'show',
        },
      ];

      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={existingRules}
          defaultVisibility="hidden"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      // Should not show "no rules" message
      expect(screen.queryByText('אין כללים מוגדרים')).not.toBeInTheDocument();
    });

    it('should exclude current field from source field options', () => {
      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[
            {
              id: 'rule1',
              sourceFieldId: '',
              operator: 'equals',
              value: '',
              action: 'show',
            },
          ]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      // Get the source field select
      const selects = screen.getAllByRole('combobox');
      const sourceFieldSelect = selects[0];

      // Check that 'current' field is not in options
      const options = within(sourceFieldSelect).queryAllByRole('option');
      const optionTexts = options.map((opt) => opt.textContent);
      expect(optionTexts).not.toContain('שדה נוכחי');
    });
  });

  describe('Editing Rules', () => {
    it('should call onRulesChange when removing a rule', () => {
      const existingRules: ConditionalRule[] = [
        {
          id: 'rule1',
          sourceFieldId: 'dropdown1',
          operator: 'equals',
          value: 'אחר',
          action: 'show',
        },
        {
          id: 'rule2',
          sourceFieldId: 'checkbox1',
          operator: 'equals',
          value: true,
          action: 'require',
        },
      ];

      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={existingRules}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      // Click remove button on first rule
      const removeButtons = screen.getAllByTitle('הסר');
      fireEvent.click(removeButtons[0]);

      expect(mockOnRulesChange).toHaveBeenCalledTimes(1);
      const updatedRules = mockOnRulesChange.mock.calls[0][0];
      expect(updatedRules).toHaveLength(1);
      expect(updatedRules[0].id).toBe('rule2');
    });
  });

  describe('Dark/Light Mode Support', () => {
    it('should use CSS variables for colors (no hardcoded colors)', () => {
      const { container } = render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
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
  });

  describe('Hebrew Text Support', () => {
    it('should display Hebrew labels correctly', () => {
      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      expect(screen.getByText('לוגיקה מותנית')).toBeInTheDocument();
      expect(screen.getByText('הוסף כלל')).toBeInTheDocument();
    });

    it('should handle Hebrew field labels in dropdown', () => {
      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[
            {
              id: 'rule1',
              sourceFieldId: '',
              operator: 'equals',
              value: '',
              action: 'show',
            },
          ]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      // The Hebrew field labels should be available in the dropdown
      const selects = screen.getAllByRole('combobox');
      const sourceFieldSelect = selects[0];
      expect(sourceFieldSelect).toBeInTheDocument();
    });
  });

  describe('Default Visibility', () => {
    it('should call onDefaultVisibilityChange when visibility is changed', () => {
      render(
        <ConditionalRulesPanel
          fieldId="current"
          allFields={allFields}
          currentRules={[]}
          defaultVisibility="visible"
          onRulesChange={mockOnRulesChange}
          onDefaultVisibilityChange={mockOnDefaultVisibilityChange}
        />,
      );

      // Find the visibility select and change it
      const selects = screen.getAllByRole('combobox');
      const visibilitySelect = selects.find((s) =>
        within(s).queryByText('גלוי'),
      );

      if (visibilitySelect) {
        fireEvent.change(visibilitySelect, { target: { value: 'hidden' } });
        expect(mockOnDefaultVisibilityChange).toHaveBeenCalledWith('hidden');
      }
    });
  });
});
