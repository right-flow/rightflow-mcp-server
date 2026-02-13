// InvoiceTable Component
// Created: 2026-02-05
// Purpose: Display invoice history with download and status

import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceStatus } from '../../../api/types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { useTranslation, useDirection } from '../../../i18n';

interface InvoiceTableProps {
  invoices: Invoice[];
  loading?: boolean;
  onDownload?: (invoice: Invoice) => void;
  className?: string;
}

type SortField = 'invoiceNumber' | 'issuedAt' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * Invoice table component
 * Displays invoice history with sorting, filtering, and download
 */
export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  loading = false,
  onDownload,
  className = '',
}) => {
  const t = useTranslation();
  const direction = useDirection();
  const isRtl = direction === 'rtl';
  const locale = isRtl ? 'he-IL' : 'en-US';

  // IMPORTANT: All hooks must be called BEFORE any conditional returns
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'issuedAt', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  // Filter invoices by status (called even during loading/empty states)
  const filteredInvoices = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    if (statusFilter === 'all') return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  // Sort invoices (called even during loading/empty states)
  const sortedInvoices = useMemo(() => {
    if (filteredInvoices.length === 0) return [];

    const sorted = [...filteredInvoices];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'invoiceNumber':
          aValue = a.invoiceNumber;
          bValue = b.invoiceNumber;
          break;
        case 'issuedAt':
          aValue = new Date(a.issuedAt);
          bValue = new Date(b.issuedAt);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [filteredInvoices, sortConfig]);

  // NOW we can do conditional returns AFTER all hooks are called

  // Loading skeleton
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
        <div className="animate-pulse p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!invoices || invoices.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`} dir={direction}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t['billing.invoice.title']}</h2>
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">{t['billing.invoice.noInvoices']}</p>
        </div>
      </div>
    );
  }

  // Toggle sort
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort indicator
  const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortConfig.field !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Status badge
  const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
    const statusConfig: Record<InvoiceStatus, { labelKey: string; className: string }> = {
      paid: { labelKey: 'billing.invoice.statusPaid', className: 'bg-green-100 text-green-800' },
      pending: { labelKey: 'billing.invoice.statusPending', className: 'bg-yellow-100 text-yellow-800' },
      failed: { labelKey: 'billing.invoice.statusFailed', className: 'bg-red-100 text-red-800' },
      refunded: { labelKey: 'billing.invoice.statusRefunded', className: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {t[config.labelKey as keyof typeof t] as string}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: Date): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`} dir={direction}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t['billing.invoice.title']}</h2>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t['billing.invoice.filter']}:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t['billing.invoice.allStatuses']}</option>
              <option value="paid">{t['billing.invoice.statusPaid']}</option>
              <option value="pending">{t['billing.invoice.statusPending']}</option>
              <option value="failed">{t['billing.invoice.statusFailed']}</option>
              <option value="refunded">{t['billing.invoice.statusRefunded']}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('invoiceNumber')}
              >
                <div className="flex items-center gap-2">
                  <span>{t['billing.invoice.invoiceNumber']}</span>
                  <SortIndicator field="invoiceNumber" />
                </div>
              </th>
              <th
                scope="col"
                className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('issuedAt')}
              >
                <div className="flex items-center gap-2">
                  <span>{t['billing.invoice.date']}</span>
                  <SortIndicator field="issuedAt" />
                </div>
              </th>
              <th
                scope="col"
                className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-2">
                  <span>{t['billing.invoice.amount']}</span>
                  <SortIndicator field="amount" />
                </div>
              </th>
              <th
                scope="col"
                className={`px-6 py-3 ${isRtl ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  <span>{t['billing.invoice.status']}</span>
                  <SortIndicator field="status" />
                </div>
              </th>
              <th scope="col" className={`px-6 py-3 ${isRtl ? 'text-left' : 'text-right'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                {t['billing.invoice.actions']}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedInvoices.map((invoice, index) => (
              <tr key={invoice.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(invoice.issuedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'} text-sm font-medium`}>
                  {invoice.downloadUrl && onDownload && (
                    <button
                      onClick={() => onDownload(invoice)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      {t['billing.invoice.download']}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty filtered state */}
      {sortedInvoices.length === 0 && statusFilter !== 'all' && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">{(t['billing.invoice.noFilteredInvoices'] as string).replace('{status}', t[`billing.invoice.status${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}` as keyof typeof t] as string)}</p>
          <button
            onClick={() => setStatusFilter('all')}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            {t['billing.invoice.clearFilter']}
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoiceTable;
