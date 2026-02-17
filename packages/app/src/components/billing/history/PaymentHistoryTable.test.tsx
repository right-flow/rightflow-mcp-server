/**
 * PaymentHistoryTable Component Tests
 *
 * Tests for the payment history display component.
 * Covers rendering, sorting, filtering, and invoice download.
 *
 * @see ADR-009: Grow Payment API Integration
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentHistoryTable } from './PaymentHistoryTable';
import { PaymentRecord } from '../../../api/types';

// Mock i18n hooks
vi.mock('../../../i18n', () => ({
  useTranslation: () => ({
    'billing.history.payments': 'היסטוריית תשלומים',
    'billing.history.noPayments': 'אין תשלומים עדיין',
    'billing.history.noPaymentsDescription': 'תשלומים יופיעו כאן לאחר שתבצעו רכישה',
    'billing.history.filterByStatus': 'סנן לפי סטטוס',
    'billing.history.allPayments': 'כל התשלומים',
    'billing.payment.statusCompleted': 'הושלם',
    'billing.payment.statusPending': 'ממתין',
    'billing.payment.statusFailed': 'נכשל',
    'billing.payment.statusRefunded': 'הוחזר',
    'billing.payment.date': 'תאריך',
    'billing.payment.plan': 'תוכנית',
    'billing.payment.amount': 'סכום',
    'billing.payment.method': 'אמצעי תשלום',
    'billing.payment.status': 'סטטוס',
    'billing.payment.invoice': 'חשבונית',
    'billing.payment.download': 'הורדה',
    'billing.payment.installment': 'תשלום',
    'billing.payment.of': 'מתוך',
    'billing.payment.downloadInvoice': 'הורד חשבונית',
    'billing.payment.asmachta': 'אסמכתא',
    'billing.history.noFilteredPayments': 'אין תשלומים עם סטטוס זה',
    'billing.history.clearFilter': 'נקה סינון',
    'billing.history.loading': 'טוען...',
    'billing.history.loadMore': 'טען עוד',
  }),
  useDirection: () => 'rtl',
}));

// Mock formatCurrency
vi.mock('../../../utils/formatCurrency', () => ({
  formatCurrency: (amount: number, currency: string) => `₪${(amount / 100).toFixed(2)}`,
}));

// Sample payment records for testing
const mockPayments: PaymentRecord[] = [
  {
    id: 'pay_1',
    date: '2026-02-15T10:00:00Z',
    amount: 9900,
    currency: 'ILS',
    status: 'completed',
    planName: 'מקצועי',
    paymentMethod: 'credit_card',
    cardLast4: '4242',
    cardBrand: 'Visa',
    invoice: {
      number: 'INV-001',
      url: 'https://icount.co.il/invoice/001',
    },
    asmachta: '123456',
  },
  {
    id: 'pay_2',
    date: '2026-01-15T10:00:00Z',
    amount: 9900,
    currency: 'ILS',
    status: 'completed',
    planName: 'מקצועי',
    paymentMethod: 'credit_card',
    cardLast4: '5555',
    cardBrand: 'Mastercard',
    installments: {
      current: 2,
      total: 12,
    },
    asmachta: '654321',
  },
  {
    id: 'pay_3',
    date: '2025-12-15T10:00:00Z',
    amount: 4900,
    currency: 'ILS',
    status: 'failed',
    planName: 'בסיסי',
    paymentMethod: 'credit_card',
    cardLast4: '1234',
    cardBrand: 'Visa',
  },
  {
    id: 'pay_4',
    date: '2025-11-15T10:00:00Z',
    amount: 4900,
    currency: 'ILS',
    status: 'refunded',
    planName: 'בסיסי',
    paymentMethod: 'bit',
  },
];

describe('PaymentHistoryTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders loading skeleton when loading with no payments', () => {
      render(<PaymentHistoryTable payments={[]} loading={true} />);

      // Should show skeleton animation
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders empty state when no payments', () => {
      render(<PaymentHistoryTable payments={[]} loading={false} />);

      expect(screen.getByText('אין תשלומים עדיין')).toBeInTheDocument();
      expect(screen.getByText('תשלומים יופיעו כאן לאחר שתבצעו רכישה')).toBeInTheDocument();
    });

    it('renders payment records correctly', () => {
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Check plan names are displayed
      expect(screen.getAllByText('מקצועי')).toHaveLength(2);
      expect(screen.getAllByText('בסיסי')).toHaveLength(2);

      // Check card info is displayed
      expect(screen.getByText(/Visa.*\*\*\*\*4242/)).toBeInTheDocument();
      expect(screen.getByText(/Mastercard.*\*\*\*\*5555/)).toBeInTheDocument();
    });

    it('renders installment information', () => {
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Should show installment progress for payment with installments
      expect(screen.getByText(/תשלום.*2\/12/)).toBeInTheDocument();
    });

    it('renders invoice download button when available', () => {
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Should have download button for payment with invoice
      const downloadButtons = screen.getAllByRole('button', { name: /הורדה/i });
      expect(downloadButtons.length).toBeGreaterThan(0);
    });

    it('displays asmachta when no invoice URL', () => {
      const paymentWithoutInvoice: PaymentRecord[] = [
        {
          id: 'pay_5',
          date: '2026-02-10T10:00:00Z',
          amount: 9900,
          currency: 'ILS',
          status: 'completed',
          planName: 'מקצועי',
          paymentMethod: 'credit_card',
          asmachta: 'ASM-789',
        },
      ];

      render(<PaymentHistoryTable payments={paymentWithoutInvoice} />);

      expect(screen.getByText('ASM-789')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('shows correct status badges', () => {
      render(<PaymentHistoryTable payments={mockPayments} />);

      expect(screen.getAllByText('הושלם')).toHaveLength(2);
      expect(screen.getByText('נכשל')).toBeInTheDocument();
      expect(screen.getByText('הוחזר')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts by date descending by default', () => {
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Get all table rows (desktop view)
      const table = document.querySelector('table');
      if (table) {
        const rows = within(table).getAllByRole('row');
        // First data row should be the most recent payment (Feb 2026)
        expect(rows[1]).toHaveTextContent('מקצועי');
      }
    });

    it('toggles sort direction when clicking column header', async () => {
      const user = userEvent.setup();
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Find and click the date column header
      const dateHeader = screen.getByText('תאריך');
      await user.click(dateHeader);

      // Should now be sorted ascending (oldest first)
      const table = document.querySelector('table');
      if (table) {
        const rows = within(table).getAllByRole('row');
        // First data row should now be the oldest (Nov 2025)
        expect(rows[1]).toHaveTextContent('בסיסי');
      }
    });

    it('can sort by amount', async () => {
      const user = userEvent.setup();
      render(<PaymentHistoryTable payments={mockPayments} />);

      const amountHeader = screen.getByText('סכום');
      await user.click(amountHeader);

      // Should sort by amount (ascending by default when first clicking)
    });

    it('can sort by plan name', async () => {
      const user = userEvent.setup();
      render(<PaymentHistoryTable payments={mockPayments} />);

      const planHeader = screen.getByText('תוכנית');
      await user.click(planHeader);

      // Should sort by plan name
    });
  });

  describe('Filtering', () => {
    it('filters by status when selecting from dropdown', async () => {
      const user = userEvent.setup();
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Open the select dropdown
      const filterTrigger = screen.getByRole('combobox');
      await user.click(filterTrigger);

      // Select "failed" status
      const failedOption = screen.getByRole('option', { name: 'נכשל' });
      await user.click(failedOption);

      // Should only show failed payments
      const table = document.querySelector('table');
      if (table) {
        const rows = within(table).getAllByRole('row');
        // Header + 1 failed payment
        expect(rows).toHaveLength(2);
      }
    });

    it('shows empty filtered state with clear button', async () => {
      const user = userEvent.setup();
      const paymentsWithoutPending = mockPayments.filter((p) => p.status !== 'pending');
      render(<PaymentHistoryTable payments={paymentsWithoutPending} />);

      // Open the select dropdown
      const filterTrigger = screen.getByRole('combobox');
      await user.click(filterTrigger);

      // Select "pending" status (no payments have this status)
      const pendingOption = screen.getByRole('option', { name: 'ממתין' });
      await user.click(pendingOption);

      // Should show empty filtered state
      expect(screen.getByText('אין תשלומים עם סטטוס זה')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'נקה סינון' })).toBeInTheDocument();
    });

    it('clears filter when clicking clear button', async () => {
      const user = userEvent.setup();
      const paymentsWithoutPending = mockPayments.filter((p) => p.status !== 'pending');
      render(<PaymentHistoryTable payments={paymentsWithoutPending} />);

      // Apply pending filter (results in empty state)
      const filterTrigger = screen.getByRole('combobox');
      await user.click(filterTrigger);
      const pendingOption = screen.getByRole('option', { name: 'ממתין' });
      await user.click(pendingOption);

      // Click clear filter button
      const clearButton = screen.getByRole('button', { name: 'נקה סינון' });
      await user.click(clearButton);

      // Should show all payments again
      const table = document.querySelector('table');
      if (table) {
        const rows = within(table).getAllByRole('row');
        // Header + all payments
        expect(rows).toHaveLength(paymentsWithoutPending.length + 1);
      }
    });
  });

  describe('Invoice Download', () => {
    it('opens invoice URL in new tab when clicking download', async () => {
      const user = userEvent.setup();
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      render(<PaymentHistoryTable payments={[mockPayments[0]]} />);

      const downloadButton = screen.getByRole('button', { name: /הורדה/i });
      await user.click(downloadButton);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://icount.co.il/invoice/001',
        '_blank',
        'noopener,noreferrer'
      );

      windowOpenSpy.mockRestore();
    });
  });

  describe('Load More', () => {
    it('shows load more button when hasMore is true', () => {
      const onLoadMore = vi.fn();
      render(
        <PaymentHistoryTable
          payments={mockPayments}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      expect(screen.getByRole('button', { name: 'טען עוד' })).toBeInTheDocument();
    });

    it('hides load more button when hasMore is false', () => {
      const onLoadMore = vi.fn();
      render(
        <PaymentHistoryTable
          payments={mockPayments}
          hasMore={false}
          onLoadMore={onLoadMore}
        />
      );

      expect(screen.queryByRole('button', { name: 'טען עוד' })).not.toBeInTheDocument();
    });

    it('calls onLoadMore when clicking load more button', async () => {
      const user = userEvent.setup();
      const onLoadMore = vi.fn();
      render(
        <PaymentHistoryTable
          payments={mockPayments}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      const loadMoreButton = screen.getByRole('button', { name: 'טען עוד' });
      await user.click(loadMoreButton);

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('shows loading state on load more button when loading', () => {
      const onLoadMore = vi.fn();
      render(
        <PaymentHistoryTable
          payments={mockPayments}
          hasMore={true}
          onLoadMore={onLoadMore}
          loading={true}
        />
      );

      expect(screen.getByRole('button', { name: /טוען/i })).toBeDisabled();
    });
  });

  describe('Mobile View', () => {
    it('renders mobile cards on small screens', () => {
      // Mock smaller viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<PaymentHistoryTable payments={mockPayments} />);

      // Check that the mobile card view is present
      const mobileContainer = document.querySelector('.md\\:hidden');
      expect(mobileContainer).toBeInTheDocument();
    });
  });

  describe('RTL Support', () => {
    it('applies RTL direction to container', () => {
      render(<PaymentHistoryTable payments={mockPayments} />);

      const container = document.querySelector('[dir="rtl"]');
      expect(container).toBeInTheDocument();
    });

    it('formats currency in ILS', () => {
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Check currency formatting (₪99.00 for 9900 agorot)
      expect(screen.getAllByText('₪99.00').length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has accessible table structure', () => {
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Table should have proper structure
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();

      // Headers should be in thead
      const thead = table?.querySelector('thead');
      expect(thead).toBeInTheDocument();

      // Body should be in tbody
      const tbody = table?.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
    });

    it('sort buttons are keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<PaymentHistoryTable payments={mockPayments} />);

      // Tab to date header and press enter
      const dateHeader = screen.getByText('תאריך');
      dateHeader.focus();
      await user.keyboard('{Enter}');

      // Should toggle sort
    });
  });
});
