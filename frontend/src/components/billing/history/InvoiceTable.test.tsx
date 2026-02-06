// InvoiceTable Component Tests
// Created: 2026-02-05
// Purpose: Test invoice table component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceTable } from './InvoiceTable';
import { Invoice } from '../../../api/types';

const mockInvoices: Invoice[] = [
  {
    id: '1',
    orgId: 'org-1',
    invoiceNumber: 'INV-2026-001',
    status: 'paid',
    amount: 9900, // 99.00 ILS
    currency: 'ILS',
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-01-31'),
    issuedAt: new Date('2026-01-15'),
    dueAt: new Date('2026-01-30'),
    paidAt: new Date('2026-01-20'),
    paymentMethod: 'credit_card',
    downloadUrl: '/api/invoices/1/download',
    description: 'Basic Plan - January 2026',
  },
  {
    id: '2',
    orgId: 'org-1',
    invoiceNumber: 'INV-2026-002',
    status: 'pending',
    amount: 19900, // 199.00 ILS
    currency: 'ILS',
    periodStart: new Date('2026-02-01'),
    periodEnd: new Date('2026-02-28'),
    issuedAt: new Date('2026-02-01'),
    dueAt: new Date('2026-02-15'),
    paymentMethod: 'credit_card',
    downloadUrl: '/api/invoices/2/download',
    description: 'Expanded Plan - February 2026',
  },
  {
    id: '3',
    orgId: 'org-1',
    invoiceNumber: 'INV-2025-012',
    status: 'failed',
    amount: 9900,
    currency: 'ILS',
    periodStart: new Date('2025-12-01'),
    periodEnd: new Date('2025-12-31'),
    issuedAt: new Date('2025-12-01'),
    dueAt: new Date('2025-12-15'),
    paymentMethod: 'credit_card',
    downloadUrl: '/api/invoices/3/download',
    description: 'Basic Plan - December 2025',
  },
];

describe('InvoiceTable', () => {
  const mockOnDownload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with invoice data', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      expect(screen.getByText('Invoice History')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('shows loading skeleton when loading', () => {
      render(<InvoiceTable invoices={[]} loading={true} />);

      const skeleton = screen.getByRole('generic', { hidden: true });
      expect(skeleton.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows no data state when invoices array is empty', () => {
      render(<InvoiceTable invoices={[]} />);

      expect(screen.getByText('No invoices yet')).toBeInTheDocument();
    });

    it('displays all invoice rows', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const rows = screen.getAllByRole('row');
      // +1 for header row
      expect(rows).toHaveLength(mockInvoices.length + 1);
    });
  });

  describe('Table Headers', () => {
    it('displays all column headers', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      expect(screen.getByText('Invoice #')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('Invoice Data Display', () => {
    it('displays invoice numbers', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
      expect(screen.getByText('INV-2025-012')).toBeInTheDocument();
    });

    it('displays formatted dates', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 1, 2026/)).toBeInTheDocument();
    });

    it('displays formatted amounts', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      expect(screen.getByText(/₪99.00/)).toBeInTheDocument();
      expect(screen.getByText(/₪199.00/)).toBeInTheDocument();
    });

    it('displays status badges', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('shows green badge for paid status', () => {
      const { container } = render(<InvoiceTable invoices={[mockInvoices[0]]} />);

      const badge = screen.getByText('Paid').parentElement;
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-800');
    });

    it('shows yellow badge for pending status', () => {
      const { container } = render(<InvoiceTable invoices={[mockInvoices[1]]} />);

      const badge = screen.getByText('Pending').parentElement;
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
    });

    it('shows red badge for failed status', () => {
      const { container } = render(<InvoiceTable invoices={[mockInvoices[2]]} />);

      const badge = screen.getByText('Failed').parentElement;
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });
  });

  describe('Status Filtering', () => {
    it('shows status filter dropdown', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    });

    it('filters by paid status', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'paid' } });

      expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('INV-2026-002')).not.toBeInTheDocument();
      expect(screen.queryByText('INV-2025-012')).not.toBeInTheDocument();
    });

    it('filters by pending status', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'pending' } });

      expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
      expect(screen.queryByText('INV-2026-001')).not.toBeInTheDocument();
    });

    it('filters by failed status', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'failed' } });

      expect(screen.getByText('INV-2025-012')).toBeInTheDocument();
      expect(screen.queryByText('INV-2026-001')).not.toBeInTheDocument();
    });

    it('shows empty state when no invoices match filter', () => {
      const paidOnlyInvoices = [mockInvoices[0]];
      render(<InvoiceTable invoices={paidOnlyInvoices} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'refunded' } });

      expect(screen.getByText(/no refunded invoices found/i)).toBeInTheDocument();
    });

    it('shows clear filter button when filtered', () => {
      const paidOnlyInvoices = [mockInvoices[0]];
      render(<InvoiceTable invoices={paidOnlyInvoices} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'pending' } });

      const clearButton = screen.getByText(/clear filter/i);
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);
      expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts by date descending by default', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1]; // Skip header
      expect(firstDataRow).toHaveTextContent('INV-2026-002'); // Latest date
    });

    it('sorts by date ascending when clicked', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const dateHeader = screen.getByText('Date').closest('th')!;
      fireEvent.click(dateHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('INV-2025-012'); // Earliest date
    });

    it('sorts by invoice number', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const invoiceHeader = screen.getByText('Invoice #').closest('th')!;
      fireEvent.click(invoiceHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('INV-2025-012'); // Alphabetically first
    });

    it('sorts by amount', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const amountHeader = screen.getByText('Amount').closest('th')!;
      fireEvent.click(amountHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('₪99.00'); // Lowest amount
    });

    it('sorts by status', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      const statusHeader = screen.getByText('Status').closest('th')!;
      fireEvent.click(statusHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent('Failed'); // Alphabetically first
    });
  });

  describe('Download Functionality', () => {
    it('shows download button when downloadUrl exists', () => {
      render(<InvoiceTable invoices={mockInvoices} onDownload={mockOnDownload} />);

      const downloadButtons = screen.getAllByText('Download');
      expect(downloadButtons).toHaveLength(mockInvoices.length);
    });

    it('calls onDownload when download button clicked', () => {
      render(<InvoiceTable invoices={mockInvoices} onDownload={mockOnDownload} />);

      const downloadButtons = screen.getAllByText('Download');
      fireEvent.click(downloadButtons[0]);

      expect(mockOnDownload).toHaveBeenCalledTimes(1);
      expect(mockOnDownload).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('does not show download button when downloadUrl missing', () => {
      const invoicesWithoutUrl = [{ ...mockInvoices[0], downloadUrl: undefined }];
      render(<InvoiceTable invoices={invoicesWithoutUrl} onDownload={mockOnDownload} />);

      expect(screen.queryByText('Download')).not.toBeInTheDocument();
    });

    it('does not show download button when onDownload not provided', () => {
      render(<InvoiceTable invoices={mockInvoices} />);

      expect(screen.queryByText('Download')).not.toBeInTheDocument();
    });
  });

  describe('Alternating Row Colors', () => {
    it('applies alternating background colors', () => {
      const { container } = render(<InvoiceTable invoices={mockInvoices} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveClass('bg-white');
      expect(rows[1]).toHaveClass('bg-gray-50');
      expect(rows[2]).toHaveClass('bg-white');
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      const { container } = render(
        <InvoiceTable invoices={mockInvoices} className="custom-class" />
      );

      const table = container.firstChild;
      expect(table).toHaveClass('custom-class');
    });
  });
});
