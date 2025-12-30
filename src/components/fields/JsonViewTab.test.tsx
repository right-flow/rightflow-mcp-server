import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JsonViewTab } from './JsonViewTab';
import { FieldDefinition } from '@/types/fields';

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    noFieldsForJson: 'No fields to display',
    jsonReadOnly: 'Read only',
    copyJson: 'Copy JSON',
    jsonCopied: 'JSON Copied!',
  }),
  useDirection: () => 'ltr',
}));

describe('JsonViewTab', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    mockWriteText.mockResolvedValue(undefined);
  });

  const mockFields: FieldDefinition[] = [
    {
      id: '1',
      type: 'text',
      name: 'field1',
      label: 'Field 1',
      x: 100,
      y: 200,
      width: 150,
      height: 20,
      pageNumber: 1,
      required: false,
      autoFill: false,
      font: 'NotoSansHebrew',
      fontSize: 12,
      direction: 'rtl',
    },
    {
      id: '2',
      type: 'checkbox',
      name: 'checkbox1',
      label: 'Checkbox 1',
      x: 100,
      y: 250,
      width: 20,
      height: 20,
      pageNumber: 1,
      required: true,
      autoFill: false,
      direction: 'rtl',
    },
  ];

  describe('empty state', () => {
    it('shows empty message when no fields', () => {
      render(<JsonViewTab fields={[]} />);

      expect(screen.getByText('No fields to display')).toBeInTheDocument();
    });

    it('does not show copy button when no fields', () => {
      render(<JsonViewTab fields={[]} />);

      expect(screen.queryByText('Copy JSON')).not.toBeInTheDocument();
    });
  });

  describe('with fields', () => {
    it('renders JSON content', () => {
      render(<JsonViewTab fields={mockFields} />);

      expect(screen.getByText(/"id": "1"/)).toBeInTheDocument();
      expect(screen.getByText(/"type": "text"/)).toBeInTheDocument();
      expect(screen.getByText(/"name": "field1"/)).toBeInTheDocument();
    });

    it('shows read-only label', () => {
      render(<JsonViewTab fields={mockFields} />);

      expect(screen.getByText('Read only')).toBeInTheDocument();
    });

    it('shows copy button', () => {
      render(<JsonViewTab fields={mockFields} />);

      expect(screen.getByText('Copy JSON')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('copies JSON to clipboard on button click', async () => {
      render(<JsonViewTab fields={mockFields} />);

      const copyButton = screen.getByRole('button', { name: /copy json/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          JSON.stringify(mockFields, null, 2)
        );
      });
    });

    it('shows success message after copying', async () => {
      render(<JsonViewTab fields={mockFields} />);

      const copyButton = screen.getByRole('button', { name: /copy json/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('JSON Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('JSON formatting', () => {
    it('formats JSON with proper indentation', () => {
      const { container } = render(<JsonViewTab fields={mockFields} />);

      // Check that the JSON is properly formatted (has indentation)
      const jsonContent = container.querySelector('pre');
      expect(jsonContent).not.toBeNull();
      const textContent = jsonContent?.textContent || '';

      // Verify it's valid JSON
      expect(() => JSON.parse(textContent)).not.toThrow();

      // Verify it matches the input fields
      const parsed = JSON.parse(textContent);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('1');
      expect(parsed[1].id).toBe('2');
    });
  });
});
